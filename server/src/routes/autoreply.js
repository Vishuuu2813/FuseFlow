import express from 'express';
import { getRules, createRule, updateRule, deleteRule } from '../controllers/autoreply.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireActiveTenant, requirePlanFeature, requireUserPermission } from '../middleware/access.js';

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireActiveTenant);
router.use(requirePlanFeature('aiAutoReply'));
router.use(requireUserPermission('aiAutoReply'));

router.get('/', getRules);
router.post('/', createRule);
router.put('/:id', updateRule);
router.delete('/:id', deleteRule);

export default router;
