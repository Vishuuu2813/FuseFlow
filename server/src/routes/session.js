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
  upgradePlan,
  clearMessageLogs,
  validateCoupon,
  simulateCheckout,
  getInvoices,
  getAnalytics
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
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB limit (virtually unlimited)
  fileFilter: (req, file, cb) => {
    cb(null, true); // Allow all file types (images, videos, APKs, documents)
  }
});

router.use(authenticate);
router.use(requireTenant);
router.use(requireActiveTenant);

const uploadFields = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]);

router.post('/upload', requireUserPermission('sendMessage'), uploadFields, (req, res) => {
  const uploadedFile = req.files?.file?.[0] || req.files?.image?.[0];
  if (!uploadedFile) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${uploadedFile.filename}`;
  res.json({
    url: fileUrl,
    filename: uploadedFile.originalname,
    mimetype: uploadedFile.mimetype,
    size: uploadedFile.size
  });
});

router.get('/', getSessions);
router.post('/', requireTenantAdminOrPlatformAdmin, createSession);
router.get('/logs', requireUserPermission('messageLogs'), getMessageLogs);
router.delete('/logs/cleanup', requireTenantAdminOrPlatformAdmin, clearMessageLogs);
router.get('/dashboard-stats', getDashboardStats);
router.get('/plans', getAvailablePlans);
router.post('/upgrade-plan', requireTenantAdminOrPlatformAdmin, upgradePlan);
router.post('/validate-coupon', validateCoupon);
router.post('/checkout', requireTenantAdminOrPlatformAdmin, simulateCheckout);
router.get('/invoices', getInvoices);
router.get('/analytics', getAnalytics);
router.post('/:id/send-message', requireUserPermission('sendMessage'), sendSingleMessage);
router.post('/:id/connect', requireTenantAdminOrPlatformAdmin, connectSession);
router.post('/:id/disconnect', requireTenantAdminOrPlatformAdmin, disconnectSession);
router.delete('/:id', requireTenantAdminOrPlatformAdmin, deleteSession);

export default router;
