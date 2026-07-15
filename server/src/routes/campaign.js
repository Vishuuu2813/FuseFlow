import express from 'express';
import {
  getCampaigns,
  createCampaign,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  getCampaignLogs
} from '../controllers/campaign.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireActiveTenant, requirePlanFeature, requireUserPermission } from '../middleware/access.js';

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireActiveTenant);
router.use(requirePlanFeature('bulkScheduling'));
router.use(requireUserPermission('bulkScheduling'));

router.get('/', getCampaigns);
router.post('/', createCampaign);
router.post('/:id/start', startCampaign);
router.post('/:id/pause', pauseCampaign);
router.post('/:id/resume', resumeCampaign);
router.get('/:id/logs', getCampaignLogs);

export default router;
