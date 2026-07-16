import express from 'express';
import {
  getAdminStats,
  getAuditLogs,
  getUsers,
  getTenants,
  createUser,
  updateUserStatus,
  updateUserRole,
  updateUserPermissions,
  changeUserPassword,
  deleteUser,
  updateTenantLimits,
  adminChangePassword,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  assignPlanToTenant,
  getTenantUsage,
  getSystemSettings,
  updateSystemSettings,
  getCoupons,
  createCoupon,
  deleteCoupon,
  getTransactions,
  impersonateTenant
} from '../controllers/admin.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply auth & admin validation to all sub-routes
router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', getAdminStats);
router.get('/audit', getAuditLogs);
router.get('/users', getUsers);
router.get('/tenants', getTenants);
router.post('/users', createUser);

router.put('/users/:id/status', updateUserStatus);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/permissions', updateUserPermissions);
router.put('/users/:id/password', changeUserPassword);
router.delete('/users/:id', deleteUser);

router.put('/tenants/:id/limits', updateTenantLimits);
router.put('/change-password', adminChangePassword);

// Plan Routes
router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);
router.put('/tenants/:id/plan', assignPlanToTenant);
router.get('/tenants/:id/usage', getTenantUsage);

// System Settings
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

// Coupon Routes
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.delete('/coupons/:id', deleteCoupon);

// Transaction Routes
router.get('/transactions', getTransactions);

// Tenant Impersonation
router.post('/tenants/:id/impersonate', impersonateTenant);

export default router;
