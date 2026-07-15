import express from 'express';
import {
  getFlows,
  createFlow,
  updateFlow,
  deleteFlow,
  enrollContact,
  getFlowStats
} from '../controllers/flow.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireActiveTenant, requirePlanFeature, requireUserPermission } from '../middleware/access.js';

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireActiveTenant);
router.use(requirePlanFeature('flowBuilder'));
router.use(requireUserPermission('flowBuilder'));

router.get('/', getFlows);
router.post('/', createFlow);
router.put('/:id', updateFlow);
router.delete('/:id', deleteFlow);
router.post('/:id/enroll', enrollContact);
router.get('/:id/stats', getFlowStats);

export default router;
