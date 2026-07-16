import express from 'express';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
} from '../controllers/template.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireActiveTenant } from '../middleware/access.js';

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireActiveTenant);

router.get('/', getTemplates);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

export default router;
