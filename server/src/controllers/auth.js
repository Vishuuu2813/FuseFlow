import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import Plan from '../models/Plan.js';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth.js';
import { writeAuditLog } from '../services/audit.js';
import jwt from 'jsonwebtoken';

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_whatsflow_2026';

const isStrongPassword = (password) => {
  return typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password);
};

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, companyName } = req.body;

    if (!name || !email || !password || !companyName) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include letters and numbers.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    // Check if there is a plan in the database named 'trial'
    const trialPlan = await Plan.findOne({ name: { $regex: /^trial$/i } });

    let maxDevices = 1;
    let maxContacts = 1000;
    let maxMessagesPerMonth = 500;
    let maxAiCredits = 50;
    let maxStorageMb = 100;
    let dailyMessageLimit = 100;

    if (trialPlan) {
      maxDevices = trialPlan.deviceLimit;
      maxContacts = trialPlan.maxContacts || maxContacts;
      maxMessagesPerMonth = trialPlan.maxMessagesPerMonth;
      maxAiCredits = trialPlan.maxAiCredits;
      maxStorageMb = trialPlan.maxStorageMb;
      dailyMessageLimit = trialPlan.dailyMessageLimit || 100;
    }

    const trialValidityDays = trialPlan?.validityDays || 14;
    const planExpiresAt = new Date(Date.now() + trialValidityDays * 24 * 60 * 60 * 1000);

    // 1. Create Tenant (Workspace)
    const newTenant = await Tenant.create({
      name: companyName,
      status: 'trial',
      plan: 'trial',
      planStartDate: new Date(),
      planExpiresAt,
      limits: {
        maxDevices,
        maxContacts,
        maxMessagesPerMonth,
        maxAiCredits,
        maxStorageMb,
        dailyMessageLimit,
        bulkScheduling: true,
        flowBuilder: true,
        aiAutoReply: true,
      },
    });

    // 2. Create Administrator User
    const newUser = await User.create({
      name,
      email,
      passwordHash: password, // Pre-save hook hashes this
      role: 'Admin',
      tenantId: newTenant._id,
      isEmailVerified: false,
    });

    // 3. Issue Tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Save refresh token to user model
    newUser.refreshToken = refreshToken;
    await newUser.save();

    await writeAuditLog(req, {
      action: 'WORKSPACE_SIGNUP',
      entityType: 'Tenant',
      entityId: newTenant._id,
      tenantId: newTenant._id,
      metadata: { userEmail: newUser.email, companyName }
    });

    // Set refresh token in HttpOnly Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: 'Signup successful.',
      accessToken,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        tenantId: newUser.tenantId,
        permissions: newUser.permissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials or inactive user.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (user.tenantId) {
      const tenant = await Tenant.findById(user.tenantId);
      if (tenant) {
        if (tenant.status === 'suspended') {
          return res.status(403).json({
            message: 'Workspace is suspended. Please contact support.',
            code: 'WORKSPACE_SUSPENDED'
          });
        }
        if (tenant.planExpiresAt && new Date(tenant.planExpiresAt).getTime() < Date.now()) {
          return res.status(403).json({
            message: user.role === 'Admin'
              ? 'Workspace subscription has expired. Please renew your plan to login.'
              : 'Workspace subscription has expired. Please ask your administrator to renew.',
            code: 'SUBSCRIPTION_EXPIRED',
            tenantId: tenant._id,
            isAdmin: user.role === 'Admin'
          });
        }
      }
    }

    // Issue Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Update refresh token
    user.refreshToken = refreshToken;
    await user.save();

    req.user = user;
    await writeAuditLog(req, {
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id,
      tenantId: user.tenantId || null
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Login successful.',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided.' });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.refreshToken !== refreshToken || !user.isActive) {
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch (error) {
    return res.status(401).json({ message: 'Session expired. Log in again.' });
  }
};

export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      await User.findByIdAndUpdate(decoded.userId, { $unset: { refreshToken: 1 } });
    }

    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out.' });
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = req.user;
    let tenant = await Tenant.findById(user.tenantId);

    if (tenant && !tenant.limits?.isCustomLimits) {
      const plan = await Plan.findOne({ name: { $regex: new RegExp(`^${tenant.plan}$`, 'i') } });
      if (plan) {
        const needsSync = 
          tenant.limits?.maxDevices !== plan.deviceLimit ||
          tenant.limits?.maxContacts !== (plan.maxContacts || 1000) ||
          tenant.limits?.maxMessagesPerMonth !== plan.maxMessagesPerMonth ||
          tenant.limits?.maxAiCredits !== plan.maxAiCredits ||
          tenant.limits?.maxStorageMb !== plan.maxStorageMb ||
          tenant.limits?.dailyMessageLimit !== (plan.dailyMessageLimit || 100) ||
          tenant.limits?.defaultDelaySeconds !== (plan.defaultDelaySeconds || 5) ||
          tenant.limits?.bulkScheduling !== (plan.bulkScheduling !== false) ||
          tenant.limits?.flowBuilder !== (plan.flowBuilder !== false) ||
          tenant.limits?.aiAutoReply !== (plan.aiAutoReply !== false);

        if (needsSync) {
          tenant.limits = {
            maxDevices: plan.deviceLimit,
            maxContacts: plan.maxContacts || 1000,
            maxMessagesPerMonth: plan.maxMessagesPerMonth,
            maxAiCredits: plan.maxAiCredits,
            maxStorageMb: plan.maxStorageMb,
            dailyMessageLimit: plan.dailyMessageLimit || 100,
            defaultDelaySeconds: plan.defaultDelaySeconds || 5,
            bulkScheduling: plan.bulkScheduling !== false,
            flowBuilder: plan.flowBuilder !== false,
            aiAutoReply: plan.aiAutoReply !== false
          };
          await tenant.save();
        }
      }
    }
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        permissions: user.permissions,
      },
      tenant,
    });
  } catch (error) {
    next(error);
  }
};

export const adminRegister = async (req, res, next) => {
  try {
    const { name, email, password, signupCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include letters and numbers.' });
    }

    if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SIGNUP_CODE) {
      return res.status(503).json({ message: 'Admin registration is not configured.' });
    }

    const envSignupCode = process.env.ADMIN_SIGNUP_CODE || 'whatsflow_admin_secret_2026';
    if (signupCode !== envSignupCode) {
      return res.status(400).json({ message: 'Invalid admin registration secret code.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    const newUser = await User.create({
      name,
      email,
      passwordHash: password,
      role: 'Admin',
      tenantId: null,
      isEmailVerified: true
    });

    await writeAuditLog(req, {
      action: 'PLATFORM_ADMIN_REGISTERED',
      entityType: 'User',
      entityId: newUser._id,
      metadata: { email: newUser.email }
    });

    res.status(201).json({
      message: 'Admin registered successfully. Proceed to login.',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    next(error);
  }
};

export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials or inactive user.' });
    }

    if (user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. You do not have administrative privileges.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    req.user = user;
    await writeAuditLog(req, {
      action: 'ADMIN_LOGIN',
      entityType: 'User',
      entityId: user._id,
      tenantId: user.tenantId || null
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Admin login successful.',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      }
    });
  } catch (error) {
    next(error);
  }
};

// Workspace Users Management
export const getTenantUsers = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Global Admins do not belong to a workspace.' });
    }

    const users = await User.find({ tenantId }).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const createTenantUser = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Global Admins cannot create tenant users.' });
    }

    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required.' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include letters and numbers.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    const newUser = await User.create({
      name,
      email,
      passwordHash: password,
      role,
      tenantId,
      isEmailVerified: true
    });

    await writeAuditLog(req, {
      action: 'WORKSPACE_USER_CREATED',
      entityType: 'User',
      entityId: newUser._id,
      tenantId,
      metadata: { email: newUser.email, role: newUser.role }
    });

    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
};

export const updateTenantUser = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { role, isActive } = req.body;

    const user = await User.findOne({ _id: req.params.id, tenantId });
    if (!user) {
      return res.status(404).json({ message: 'User not found in this workspace.' });
    }

    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    await writeAuditLog(req, {
      action: 'WORKSPACE_USER_UPDATED',
      entityType: 'User',
      entityId: user._id,
      tenantId,
      metadata: { email: user.email, role: user.role, isActive: user.isActive }
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateTenantUserPermissions = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { permissions } = req.body;

    const user = await User.findOne({ _id: req.params.id, tenantId });
    if (!user) {
      return res.status(404).json({ message: 'User not found in this workspace.' });
    }

    const prevPerms = JSON.parse(JSON.stringify(user.permissions || {}));
    const auditEntries = [];

    user.permissions = {
      sendMessage: permissions?.sendMessage !== false,
      sendMessageNote: permissions?.sendMessageNote || '',
      sendMessageExpiresAt: permissions?.sendMessageExpiresAt ? new Date(permissions.sendMessageExpiresAt) : null,

      bulkScheduling: permissions?.bulkScheduling !== false,
      bulkSchedulingNote: permissions?.bulkSchedulingNote || '',
      bulkSchedulingExpiresAt: permissions?.bulkSchedulingExpiresAt ? new Date(permissions.bulkSchedulingExpiresAt) : null,

      smartBroadcast: permissions?.smartBroadcast !== false,
      smartBroadcastNote: permissions?.smartBroadcastNote || '',
      smartBroadcastExpiresAt: permissions?.smartBroadcastExpiresAt ? new Date(permissions.smartBroadcastExpiresAt) : null,

      flowBuilder: permissions?.flowBuilder !== false,
      flowBuilderNote: permissions?.flowBuilderNote || '',
      flowBuilderExpiresAt: permissions?.flowBuilderExpiresAt ? new Date(permissions.flowBuilderExpiresAt) : null,

      aiAutoReply: permissions?.aiAutoReply !== false,
      aiAutoReplyNote: permissions?.aiAutoReplyNote || '',
      aiAutoReplyExpiresAt: permissions?.aiAutoReplyExpiresAt ? new Date(permissions.aiAutoReplyExpiresAt) : null,

      messageLogs: permissions?.messageLogs !== false,
      messageLogsNote: permissions?.messageLogsNote || '',
      messageLogsExpiresAt: permissions?.messageLogsExpiresAt ? new Date(permissions.messageLogsExpiresAt) : null,

      contacts: permissions?.contacts !== false,
      contactsNote: permissions?.contactsNote || '',
      contactsExpiresAt: permissions?.contactsExpiresAt ? new Date(permissions.contactsExpiresAt) : null,

      kb: permissions?.kb !== false,
      kbNote: permissions?.kbNote || '',
      kbExpiresAt: permissions?.kbExpiresAt ? new Date(permissions.kbExpiresAt) : null
    };

    const keys = [
      'sendMessage',
      'bulkScheduling',
      'smartBroadcast',
      'flowBuilder',
      'aiAutoReply',
      'messageLogs',
      'contacts',
      'kb'
    ];

    keys.forEach(k => {
      const isAllowed = user.permissions[k];
      const prevAllowed = prevPerms[k] !== false;
      if (isAllowed !== prevAllowed) {
        auditEntries.push({
          changedBy: req.user?.name || 'Workspace Admin',
          action: `${isAllowed ? 'UNLOCKED' : 'LOCKED'} access to ${k.replace(/([A-Z])/g, ' $1')}`,
          note: user.permissions[`${k}Note`] || 'State updated',
          timestamp: new Date()
        });
      }
    });

    if (auditEntries.length > 0) {
      if (!user.permissionAuditLogs) user.permissionAuditLogs = [];
      user.permissionAuditLogs.push(...auditEntries);
    }

    await user.save();
    await writeAuditLog(req, {
      action: 'WORKSPACE_USER_PERMISSIONS_UPDATED',
      entityType: 'User',
      entityId: user._id,
      tenantId,
      metadata: { email: user.email }
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const deleteTenantUser = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const user = await User.findOne({ _id: req.params.id, tenantId });
    if (!user) {
      return res.status(404).json({ message: 'User not found in this workspace.' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot remove yourself.' });
    }

    await User.findByIdAndDelete(req.params.id);
    await writeAuditLog(req, {
      action: 'WORKSPACE_USER_DELETED',
      entityType: 'User',
      entityId: user._id,
      tenantId,
      metadata: { email: user.email }
    });
    res.json({ message: 'User removed from workspace.' });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new passwords are required.' });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: 'New password must be at least 8 characters and include letters and numbers.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password.' });
    }

    user.passwordHash = newPassword;
    await user.save();

    await writeAuditLog(req, {
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user._id,
      tenantId: user.tenantId || null
    });

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getPublicPlans = async (req, res, next) => {
  try {
    // Filter out trial plan for renewals (only return plans where price > 0 and name is not trial)
    const plans = await Plan.find({
      name: { $ne: 'trial' },
      price: { $gt: 0 }
    }).sort({ price: 1 });
    res.json(plans);
  } catch (error) {
    next(error);
  }
};

export const renewPlan = async (req, res, next) => {
  try {
    const { email, password, planId } = req.body;

    if (!email || !password || !planId) {
      return res.status(400).json({ message: 'Email, password, and plan selection are required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only workspace administrators can renew or upgrade the subscription.' });
    }

    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    if (planId === 'virtual-trial-id') {
      return res.status(400).json({ message: 'Trial plan is not eligible for renewal. Please choose a paid subscription plan.' });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Selected plan not found.' });
    }

    if (plan.name.toLowerCase() === 'trial' || plan.price === 0) {
      return res.status(400).json({ message: 'Trial plan is not eligible for renewal. Please choose a paid subscription plan.' });
    }

    tenant.plan = plan.name;
    tenant.limits = {
      maxDevices: plan.deviceLimit,
      maxContacts: plan.maxContacts || 1000,
      maxMessagesPerMonth: plan.maxMessagesPerMonth,
      maxAiCredits: plan.maxAiCredits,
      maxStorageMb: plan.maxStorageMb,
      dailyMessageLimit: plan.dailyMessageLimit || 100,
      defaultDelaySeconds: plan.defaultDelaySeconds || 5,
      bulkScheduling: plan.bulkScheduling !== false,
      flowBuilder: plan.flowBuilder !== false,
      aiAutoReply: plan.aiAutoReply !== false
    };

    tenant.planStartDate = new Date();
    const days = plan.validityDays || 30;
    tenant.planExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    tenant.status = 'active';

    await tenant.save();

    req.user = user;
    await writeAuditLog(req, {
      action: 'TENANT_PLAN_RENEWED_ON_LOGIN',
      entityType: 'Tenant',
      entityId: tenant._id,
      tenantId: tenant._id,
      metadata: { plan: plan.name, planExpiresAt: tenant.planExpiresAt }
    });

    res.json({ message: 'Plan renewed successfully. You can now login.', tenant });
  } catch (error) {
    next(error);
  }
};
