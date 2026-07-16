import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import WhatsAppSession from '../models/WhatsAppSession.js';
import MessageLog from '../models/MessageLog.js';
import Plan from '../models/Plan.js';
import Contact from '../models/Contact.js';
import AuditLog from '../models/AuditLog.js';
import SystemSettings from '../models/SystemSettings.js';
import Coupon from '../models/Coupon.js';
import Transaction from '../models/Transaction.js';
import { writeAuditLog } from '../services/audit.js';

const isStrongPassword = (password) => {
  return typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password);
};

export const getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTenants = await Tenant.countDocuments();
    const totalSessions = await WhatsAppSession.countDocuments();
    const totalMessages = await MessageLog.countDocuments();

    res.json({
      totalUsers,
      totalTenants,
      totalSessions,
      totalMessages
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .populate('tenantId', 'name companyName plan')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const getTenants = async (req, res, next) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 });
    res.json(tenants);
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const { tenantId, action, page = 1, limit = 50 } = req.query;
    const query = {};

    if (tenantId) query.tenantId = tenantId;
    if (action) query.action = action;

    const safeLimit = Math.min(parseInt(limit, 10) || 50, 200);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('tenantId', 'name plan')
        .populate('actorId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      AuditLog.countDocuments(query)
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, tenantId } = req.body;

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
      passwordHash: password, // pre-save hashes this
      role,
      tenantId: tenantId || null,
      isEmailVerified: true
    });

    await writeAuditLog(req, {
      action: 'ADMIN_USER_CREATED',
      entityType: 'User',
      entityId: newUser._id,
      tenantId: newUser.tenantId || null,
      metadata: { email: newUser.email, role: newUser.role }
    });

    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent Admin self-banning
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot suspend your own account.' });
    }

    user.isActive = isActive;
    await user.save();

    await writeAuditLog(req, {
      action: isActive ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
      entityType: 'User',
      entityId: user._id,
      tenantId: user.tenantId || null,
      metadata: { email: user.email }
    });

    res.json({ message: 'User status updated successfully.', isActive: user.isActive });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.role = role;
    await user.save();

    await writeAuditLog(req, {
      action: 'USER_ROLE_UPDATED',
      entityType: 'User',
      entityId: user._id,
      tenantId: user.tenantId || null,
      metadata: { email: user.email, role }
    });

    res.json({ message: 'User role updated successfully.', role: user.role });
  } catch (error) {
    next(error);
  }
};

export const updateUserPermissions = async (req, res, next) => {
  try {
    const { permissions } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
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
          changedBy: req.user?.name || 'Platform Admin',
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
      action: 'USER_PERMISSIONS_UPDATED',
      entityType: 'User',
      entityId: user._id,
      tenantId: user.tenantId || null,
      metadata: { email: user.email }
    });
    res.json({ message: 'User permissions updated successfully.', permissions: user.permissions, permissionAuditLogs: user.permissionAuditLogs });
  } catch (error) {
    next(error);
  }
};

export const changeUserPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include letters and numbers.' });
    }

    user.passwordHash = password;
    await user.save();

    await writeAuditLog(req, {
      action: 'USER_PASSWORD_RESET',
      entityType: 'User',
      entityId: user._id,
      tenantId: user.tenantId || null,
      metadata: { email: user.email }
    });

    res.json({ message: 'User password reset successfully.' });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    await User.findByIdAndDelete(req.params.id);
    await writeAuditLog(req, {
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: user._id,
      tenantId: user.tenantId || null,
      metadata: { email: user.email }
    });
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const updateTenantLimits = async (req, res, next) => {
  try {
    const { deviceLimit, maxContacts, plan } = req.body;
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found.' });
    }

    if (deviceLimit !== undefined) tenant.limits.maxDevices = deviceLimit;
    if (maxContacts !== undefined) tenant.limits.maxStorageMb = maxContacts; // or other limits mapping
    if (plan !== undefined) tenant.plan = plan;

    await tenant.save();
    await writeAuditLog(req, {
      action: 'TENANT_LIMITS_UPDATED',
      entityType: 'Tenant',
      entityId: tenant._id,
      tenantId: tenant._id,
      metadata: { deviceLimit, maxContacts, plan }
    });
    res.json(tenant);
  } catch (error) {
    next(error);
  }
};

export const adminChangePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: 'New password must be at least 8 characters and include letters and numbers.' });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password.' });
    }

    user.passwordHash = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

// Plan CRUD Endpoints
export const getPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });
    res.json(plans);
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (req, res, next) => {
  try {
    const { name, price, deviceLimit, maxContacts, maxMessagesPerMonth, maxAiCredits, maxStorageMb, dailyMessageLimit, defaultDelaySeconds, validityDays, bulkScheduling, flowBuilder, aiAutoReply } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ message: 'Plan name and price are required.' });
    }

    const existingPlan = await Plan.findOne({ name });
    if (existingPlan) {
      return res.status(400).json({ message: 'Plan name must be unique.' });
    }

    const newPlan = await Plan.create({
      name,
      price,
      deviceLimit,
      maxContacts,
      maxMessagesPerMonth,
      maxAiCredits,
      maxStorageMb,
      dailyMessageLimit: dailyMessageLimit !== undefined ? dailyMessageLimit : 100,
      defaultDelaySeconds: defaultDelaySeconds !== undefined ? defaultDelaySeconds : 5,
      validityDays: validityDays !== undefined ? validityDays : 30,
      bulkScheduling: bulkScheduling !== undefined ? bulkScheduling : true,
      flowBuilder: flowBuilder !== undefined ? flowBuilder : true,
      aiAutoReply: aiAutoReply !== undefined ? aiAutoReply : true
    });

    await writeAuditLog(req, {
      action: 'PLAN_CREATED',
      entityType: 'Plan',
      entityId: newPlan._id,
      metadata: { name: newPlan.name, price: newPlan.price }
    });

    // Propagate limits to all existing tenants on this plan (e.g. trial) who do not have custom limits override
    await Tenant.updateMany(
      { 
        plan: { $regex: new RegExp(`^${newPlan.name}$`, 'i') },
        $or: [
          { 'limits.isCustomLimits': { $exists: false } },
          { 'limits.isCustomLimits': false }
        ]
      },
      {
        $set: {
          'limits.maxDevices': newPlan.deviceLimit,
          'limits.maxContacts': newPlan.maxContacts || 1000,
          'limits.maxMessagesPerMonth': newPlan.maxMessagesPerMonth,
          'limits.maxAiCredits': newPlan.maxAiCredits,
          'limits.maxStorageMb': newPlan.maxStorageMb,
          'limits.dailyMessageLimit': newPlan.dailyMessageLimit || 100,
          'limits.defaultDelaySeconds': newPlan.defaultDelaySeconds || 5,
          'limits.bulkScheduling': newPlan.bulkScheduling !== false,
          'limits.flowBuilder': newPlan.flowBuilder !== false,
          'limits.aiAutoReply': newPlan.aiAutoReply !== false
        }
      }
    );

    res.status(201).json(newPlan);
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const { name, price, deviceLimit, maxContacts, maxMessagesPerMonth, maxAiCredits, maxStorageMb, dailyMessageLimit, defaultDelaySeconds, validityDays, bulkScheduling, flowBuilder, aiAutoReply } = req.body;
    
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found.' });
    }

    const oldName = plan.name;

    if (name) plan.name = name;
    if (price !== undefined) plan.price = price;
    if (deviceLimit !== undefined) plan.deviceLimit = deviceLimit;
    if (maxContacts !== undefined) plan.maxContacts = maxContacts;
    if (maxMessagesPerMonth !== undefined) plan.maxMessagesPerMonth = maxMessagesPerMonth;
    if (maxAiCredits !== undefined) plan.maxAiCredits = maxAiCredits;
    if (maxStorageMb !== undefined) plan.maxStorageMb = maxStorageMb;
    if (dailyMessageLimit !== undefined) plan.dailyMessageLimit = dailyMessageLimit;
    if (defaultDelaySeconds !== undefined) plan.defaultDelaySeconds = defaultDelaySeconds;
    if (validityDays !== undefined) plan.validityDays = validityDays;
    if (bulkScheduling !== undefined) plan.bulkScheduling = bulkScheduling;
    if (flowBuilder !== undefined) plan.flowBuilder = flowBuilder;
    if (aiAutoReply !== undefined) plan.aiAutoReply = aiAutoReply;

    await plan.save();
    await writeAuditLog(req, {
      action: 'PLAN_UPDATED',
      entityType: 'Plan',
      entityId: plan._id,
      metadata: { name: plan.name }
    });

    // Propagate limits to all tenants on this plan
    const updateObj = {
      $set: {
        'limits.maxDevices': plan.deviceLimit,
        'limits.maxContacts': plan.maxContacts || 1000,
        'limits.maxMessagesPerMonth': plan.maxMessagesPerMonth,
        'limits.maxAiCredits': plan.maxAiCredits,
        'limits.maxStorageMb': plan.maxStorageMb,
        'limits.dailyMessageLimit': plan.dailyMessageLimit || 100,
        'limits.defaultDelaySeconds': plan.defaultDelaySeconds || 5,
        'limits.bulkScheduling': plan.bulkScheduling !== false,
        'limits.flowBuilder': plan.flowBuilder !== false,
        'limits.aiAutoReply': plan.aiAutoReply !== false
      }
    };
    if (name) {
      updateObj.$set.plan = plan.name;
    }

    await Tenant.updateMany({ 
      plan: { $regex: new RegExp(`^${oldName}$`, 'i') },
      $or: [
        { 'limits.isCustomLimits': { $exists: false } },
        { 'limits.isCustomLimits': false }
      ]
    }, updateObj);

    res.json(plan);
  } catch (error) {
    next(error);
  }
};

export const deletePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found.' });
    }

    await Plan.findByIdAndDelete(req.params.id);
    await writeAuditLog(req, {
      action: 'PLAN_DELETED',
      entityType: 'Plan',
      entityId: plan._id,
      metadata: { name: plan.name }
    });
    res.json({ message: 'Plan deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const assignPlanToTenant = async (req, res, next) => {
  try {
    const { planId, planStartDate, planExpiresAt, extraDays, customLimits } = req.body;
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found.' });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found.' });
    }

    const isCustom = customLimits && (
      (customLimits.maxDevices !== undefined && parseInt(customLimits.maxDevices) !== plan.deviceLimit) ||
      (customLimits.maxContacts !== undefined && parseInt(customLimits.maxContacts) !== (plan.maxContacts || 1000)) ||
      (customLimits.maxMessagesPerMonth !== undefined && parseInt(customLimits.maxMessagesPerMonth) !== plan.maxMessagesPerMonth) ||
      (customLimits.maxAiCredits !== undefined && parseInt(customLimits.maxAiCredits) !== plan.maxAiCredits) ||
      (customLimits.maxStorageMb !== undefined && parseInt(customLimits.maxStorageMb) !== plan.maxStorageMb) ||
      (customLimits.dailyMessageLimit !== undefined && parseInt(customLimits.dailyMessageLimit) !== (plan.dailyMessageLimit || 100)) ||
      (customLimits.defaultDelaySeconds !== undefined && parseInt(customLimits.defaultDelaySeconds) !== (plan.defaultDelaySeconds || 5))
    );

    // Apply plan name and limits to the tenant, checking for custom limits override
    tenant.plan = plan.name;
    tenant.limits = {
      maxDevices: customLimits?.maxDevices !== undefined ? parseInt(customLimits.maxDevices) : plan.deviceLimit,
      maxContacts: customLimits?.maxContacts !== undefined ? parseInt(customLimits.maxContacts) : (plan.maxContacts || 1000),
      maxMessagesPerMonth: customLimits?.maxMessagesPerMonth !== undefined ? parseInt(customLimits.maxMessagesPerMonth) : plan.maxMessagesPerMonth,
      maxAiCredits: customLimits?.maxAiCredits !== undefined ? parseInt(customLimits.maxAiCredits) : plan.maxAiCredits,
      maxStorageMb: customLimits?.maxStorageMb !== undefined ? parseInt(customLimits.maxStorageMb) : plan.maxStorageMb,
      dailyMessageLimit: customLimits?.dailyMessageLimit !== undefined ? parseInt(customLimits.dailyMessageLimit) : (plan.dailyMessageLimit || 100),
      defaultDelaySeconds: customLimits?.defaultDelaySeconds !== undefined ? parseInt(customLimits.defaultDelaySeconds) : (plan.defaultDelaySeconds || 5),
      bulkScheduling: customLimits?.bulkScheduling !== undefined ? !!customLimits.bulkScheduling : (plan.bulkScheduling !== undefined ? plan.bulkScheduling : true),
      flowBuilder: customLimits?.flowBuilder !== undefined ? !!customLimits.flowBuilder : (plan.flowBuilder !== undefined ? plan.flowBuilder : true),
      aiAutoReply: customLimits?.aiAutoReply !== undefined ? !!customLimits.aiAutoReply : (plan.aiAutoReply !== undefined ? plan.aiAutoReply : true),
      isCustomLimits: !!isCustom
    };

    // Calculate start date
    if (planStartDate) {
      tenant.planStartDate = new Date(planStartDate);
    } else if (!tenant.planStartDate) {
      tenant.planStartDate = new Date();
    }

    // Calculate expiration date
    if (planExpiresAt) {
      tenant.planExpiresAt = new Date(planExpiresAt);
    } else {
      const days = plan.validityDays || 30;
      tenant.planExpiresAt = new Date(new Date(tenant.planStartDate).getTime() + days * 24 * 60 * 60 * 1000);
    }

    // Handle extra days extension
    if (extraDays && !isNaN(extraDays)) {
      const currentExpiry = tenant.planExpiresAt ? new Date(tenant.planExpiresAt).getTime() : Date.now();
      tenant.planExpiresAt = new Date(currentExpiry + parseInt(extraDays) * 24 * 60 * 60 * 1000);
    }

    await tenant.save();
    await writeAuditLog(req, {
      action: 'TENANT_PLAN_ASSIGNED',
      entityType: 'Tenant',
      entityId: tenant._id,
      tenantId: tenant._id,
      metadata: { plan: plan.name, planExpiresAt: tenant.planExpiresAt }
    });
    res.json(tenant);
  } catch (error) {
    next(error);
  }
};

export const getTenantUsage = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found.' });
    }

    // active sessions
    const activeSessionsCount = await WhatsAppSession.countDocuments({
      tenantId: tenant._id,
      status: 'CONNECTED'
    });
    const totalSessionsCount = await WhatsAppSession.countDocuments({
      tenantId: tenant._id
    });

    // contacts
    const contactsCount = await Contact.countDocuments({ tenantId: tenant._id });

    // daily/monthly sent messages
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const sentToday = await MessageLog.countDocuments({
      tenantId: tenant._id,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'SENT'
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const sentThisMonth = await MessageLog.countDocuments({
      tenantId: tenant._id,
      createdAt: { $gte: startOfMonth },
      status: 'SENT'
    });

    res.json({
      tenant,
      usage: {
        activeDevices: activeSessionsCount,
        totalDevices: totalSessionsCount,
        contactsCount,
        sentToday,
        sentThisMonth
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSystemSettings = async (req, res, next) => {
  try {
    const settings = await SystemSettings.getOrCreate();
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateSystemSettings = async (req, res, next) => {
  try {
    const settings = await SystemSettings.getOrCreate();
    
    const fields = [
      'smtpHost', 'smtpPort', 'smtpSecure', 'smtpUser', 'smtpPass', 'smtpFrom',
      'gatewayMaxRetries', 'gatewayDelayMin', 'gatewayDelayMax',
      'openaiKey', 'openaiModel',
      'siteTitle', 'supportEmail', 'logoUrl', 'enableWhiteLabeling'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    await settings.save();
    
    await writeAuditLog(req, {
      action: 'SYSTEM_SETTINGS_UPDATED',
      entityType: 'SystemSettings',
      entityId: settings._id,
      metadata: { fieldsUpdated: Object.keys(req.body) }
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// Coupons CRUD for Admin
export const getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    next(error);
  }
};

export const createCoupon = async (req, res, next) => {
  try {
    const { code, discountType, discountValue, maxUses, expiresAt } = req.body;
    if (!code || !discountType || discountValue === undefined || !expiresAt) {
      return res.status(400).json({ message: 'All coupon fields are required.' });
    }

    const uppercaseCode = code.toUpperCase();
    const existing = await Coupon.findOne({ code: uppercaseCode });
    if (existing) {
      return res.status(400).json({ message: 'A coupon with this code already exists.' });
    }

    const coupon = await Coupon.create({
      code: uppercaseCode,
      discountType,
      discountValue,
      maxUses: maxUses || 100,
      expiresAt: new Date(expiresAt),
      active: true
    });

    await writeAuditLog(req, {
      action: 'COUPON_CREATED',
      entityType: 'Coupon',
      entityId: coupon._id,
      metadata: { code: coupon.code, discountValue: coupon.discountValue }
    });

    res.status(201).json(coupon);
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found.' });
    }

    await writeAuditLog(req, {
      action: 'COUPON_DELETED',
      entityType: 'Coupon',
      entityId: coupon._id,
      metadata: { code: coupon.code }
    });

    res.json({ message: 'Coupon deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// System Transactions view for Admin
export const getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find()
      .populate('tenantId', 'name')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

export const impersonateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find the first Admin user of that tenant
    const adminUser = await User.findOne({ tenantId: id, role: 'Admin' });
    if (!adminUser) {
      return res.status(404).json({ message: 'No administrator user found for this tenant.' });
    }

    // Generate tokens for this user
    const { generateAccessToken, generateRefreshToken } = await import('../middleware/auth.js');
    const accessToken = generateAccessToken(adminUser);
    const refreshToken = generateRefreshToken(adminUser);

    adminUser.refreshToken = refreshToken;
    await adminUser.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Impersonation successful.',
      accessToken,
      user: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        tenantId: adminUser.tenantId,
        permissions: adminUser.permissions,
        isImpersonated: true
      }
    });
  } catch (error) {
    next(error);
  }
};
