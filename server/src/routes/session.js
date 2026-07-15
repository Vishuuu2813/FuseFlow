import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {
  getSessions,
  createSession,
  connectSession,
  disconnectSession,
  deleteSession,
  sendSingleMessage,
  getMessageLogs,
  getDashboardStats,
  getAvailablePlans,
  upgradePlan
} from '../controllers/session.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireActiveTenant, requireTenantAdminOrPlatformAdmin, requireUserPermission } from '../middleware/access.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 }, // 300 KB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedExtension = /\.(jpe?g|png|webp|gif)$/i.test(file.originalname);

    if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtension) {
      return cb(new Error('Only JPG, PNG, WEBP, or GIF images up to 300 KB are allowed.'));
    }

    cb(null, true);
  }
});

router.use(authenticate);
router.use(requireTenant);
router.use(requireActiveTenant);

router.post('/upload', requireUserPermission('sendMessage'), upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded or file exceeds 300 KB limit.' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

router.get('/', getSessions);
router.post('/', requireTenantAdminOrPlatformAdmin, createSession);
router.get('/logs', requireUserPermission('messageLogs'), getMessageLogs);
router.get('/dashboard-stats', getDashboardStats);
router.get('/plans', getAvailablePlans);
router.post('/upgrade-plan', requireTenantAdminOrPlatformAdmin, upgradePlan);
router.post('/:id/send-message', requireUserPermission('sendMessage'), sendSingleMessage);
router.post('/:id/connect', requireTenantAdminOrPlatformAdmin, connectSession);
router.post('/:id/disconnect', requireTenantAdminOrPlatformAdmin, disconnectSession);
router.delete('/:id', requireTenantAdminOrPlatformAdmin, deleteSession);

export default router;
