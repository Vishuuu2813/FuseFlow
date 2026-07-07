import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import WhatsAppSession from '../models/WhatsAppSession.js';
import MessageLog from '../models/MessageLog.js';
import Plan from '../models/Plan.js';

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

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, tenantId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required.' });
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

    res.json({ message: 'User role updated successfully.', role: user.role });
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

    user.passwordHash = password;
    await user.save();

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
    res.json(tenant);
  } catch (error) {
    next(error);
  }
};

export const adminChangePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id);
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
    const { name, price, deviceLimit, maxContacts, maxMessagesPerMonth, maxAiCredits, maxStorageMb } = req.body;

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
      maxStorageMb
    });

    res.status(201).json(newPlan);
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const { name, price, deviceLimit, maxContacts, maxMessagesPerMonth, maxAiCredits, maxStorageMb } = req.body;
    
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found.' });
    }

    if (name) plan.name = name;
    if (price !== undefined) plan.price = price;
    if (deviceLimit !== undefined) plan.deviceLimit = deviceLimit;
    if (maxContacts !== undefined) plan.maxContacts = maxContacts;
    if (maxMessagesPerMonth !== undefined) plan.maxMessagesPerMonth = maxMessagesPerMonth;
    if (maxAiCredits !== undefined) plan.maxAiCredits = maxAiCredits;
    if (maxStorageMb !== undefined) plan.maxStorageMb = maxStorageMb;

    await plan.save();
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
    res.json({ message: 'Plan deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const assignPlanToTenant = async (req, res, next) => {
  try {
    const { planId } = req.body;
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found.' });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found.' });
    }

    // Apply plan name and limits to the tenant
    tenant.plan = plan.name;
    tenant.limits = {
      maxDevices: plan.deviceLimit,
      maxMessagesPerMonth: plan.maxMessagesPerMonth,
      maxAiCredits: plan.maxAiCredits,
      maxStorageMb: plan.maxStorageMb
    };

    await tenant.save();
    res.json(tenant);
  } catch (error) {
    next(error);
  }
};
