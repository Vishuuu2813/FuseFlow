import express from 'express';
import { signup, login, refresh, logout, getProfile, adminRegister, adminLogin } from '../controllers/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getProfile);

// Admin Auth Routes
router.post('/admin/register', adminRegister);
router.post('/admin/login', adminLogin);

export default router;
