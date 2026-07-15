import express from 'express';
import { getKB, getKBDetails, createKB, deleteKB } from '../controllers/kb.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireActiveTenant, requireUserPermission } from '../middleware/access.js';

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireActiveTenant);
router.use(requireUserPermission('kb'));

router.get('/', getKB);
router.get('/:id', getKBDetails);
router.post('/', createKB);
router.delete('/:id', deleteKB);

export default router;
