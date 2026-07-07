import express from 'express';
import {
  getSessions,
  createSession,
  connectSession,
  disconnectSession,
  deleteSession
} from '../controllers/session.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', getSessions);
router.post('/', createSession);
router.post('/:id/connect', connectSession);
router.post('/:id/disconnect', disconnectSession);
router.delete('/:id', deleteSession);

export default router;
