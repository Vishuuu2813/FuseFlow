import express from 'express';
import {
  getAdminStats,
  getUsers,
  getTenants,
  createUser,
  updateUserStatus,
  updateUserRole,
  changeUserPassword,
  deleteUser,
  updateTenantLimits,
  adminChangePassword
} from '../controllers/admin.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply auth & admin validation to all sub-routes
router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.get('/tenants', getTenants);
router.post('/users', createUser);

router.put('/users/:id/status', updateUserStatus);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/password', changeUserPassword);
router.delete('/users/:id', deleteUser);

router.put('/tenants/:id/limits', updateTenantLimits);
router.put('/change-password', adminChangePassword);

export default router;
