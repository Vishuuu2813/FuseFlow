import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import WhatsAppSession from '../models/WhatsAppSession.js';
import MessageLog from '../models/MessageLog.js';
import bcrypt from 'bcryptjs';

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
      .populate('tenantId', 'companyName plan')
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

export const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent Super Admin self-banning
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

    // Assigning new plain password; model pre-save will auto-hash it.
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

    if (deviceLimit !== undefined) tenant.deviceLimit = deviceLimit;
    if (maxContacts !== undefined) tenant.maxContacts = maxContacts;
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
    
    // Refresh user copy to query passwordHash
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
