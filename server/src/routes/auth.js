import express from 'express';
import {
  signup,
  login,
  refresh,
  logout,
  getProfile,
  adminRegister,
  adminLogin,
  getTenantUsers,
  createTenantUser,
  updateTenantUser,
  updateTenantUserPermissions,
  deleteTenantUser,
  changePassword
} from '../controllers/auth.js';
import { authenticate } from '../middleware/auth.js';
import { requireWorkspaceAdmin } from '../middleware/access.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getProfile);
router.post('/change-password', authenticate, changePassword);

// Admin Auth Routes
router.post('/admin/register', adminRegister);
router.post('/admin/login', adminLogin);

// Workspace Team Management Routes
router.get('/users', authenticate, requireWorkspaceAdmin, getTenantUsers);
router.post('/users', authenticate, requireWorkspaceAdmin, createTenantUser);
router.put('/users/:id', authenticate, requireWorkspaceAdmin, updateTenantUser);
router.put('/users/:id/permissions', authenticate, requireWorkspaceAdmin, updateTenantUserPermissions);
router.delete('/users/:id', authenticate, requireWorkspaceAdmin, deleteTenantUser);

export default router;
