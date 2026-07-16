import Campaign from '../models/Campaign.js';
import Contact from '../models/Contact.js';
import MessageLog from '../models/MessageLog.js';
import Tenant from '../models/Tenant.js';
import WhatsAppSession from '../models/WhatsAppSession.js';
import { addCampaignJob, cancelCampaignJob } from '../services/queue.js';
import { writeAuditLog } from '../services/audit.js';

export const getCampaigns = async (req, res, next) => {
  try {
    const campaigns = await Campaign.find({ tenantId: req.tenantId })
      .populate('templateId', 'name')
      .populate('whatsappSessionId', 'sessionName')
      .sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
};

export const createCampaign = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenantId);
    if (tenant && tenant.limits && tenant.limits.bulkScheduling === false) {
      return res.status(403).json({ message: 'Bulk Scheduling is disabled for your plan. Please upgrade.' });
    }

    const { name, whatsappSessionId, templateId, messageText, mediaUrl, mediaAttachments, delaySeconds, targetCriteria, scheduledAt, buttons } = req.body;

    if (!name || !whatsappSessionId || !messageText) {
      return res.status(400).json({ message: 'Campaign name, WhatsApp session, and message text are required.' });
    }

    const session = await WhatsAppSession.findOne({ _id: whatsappSessionId, tenantId: req.tenantId });
    if (!session) {
      return res.status(404).json({ message: 'WhatsApp session not found in this workspace.' });
    }

    const safeDelaySeconds = Math.min(Math.max(parseInt(delaySeconds, 10) || tenant?.limits?.defaultDelaySeconds || 5, tenant?.limits?.minimumDelaySeconds || 3), 300);

    const campaign = await Campaign.create({
      tenantId: req.tenantId,
      name,
      whatsappSessionId,
      templateId: templateId || null,
      messageText: messageText || '',
      mediaUrl: mediaUrl || '',
      mediaAttachments: mediaAttachments || [],
      delaySeconds: safeDelaySeconds,
      targetCriteria: targetCriteria || { type: 'ALL' },
      status: 'DRAFT',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      buttons: buttons || [],
    });

    await writeAuditLog(req, {
      action: 'CAMPAIGN_CREATED',
      entityType: 'Campaign',
      entityId: campaign._id,
      metadata: { name: campaign.name, targetType: campaign.targetCriteria?.type }
    });

    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
};

export const startCampaign = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenantId);
    if (tenant && tenant.limits && tenant.limits.bulkScheduling === false) {
      return res.status(403).json({ message: 'Bulk Scheduling is disabled for your plan. Please upgrade.' });
    }

    const campaign = await Campaign.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found.' });
    }

    if (campaign.status === 'RUNNING') {
      return res.status(400).json({ message: 'Campaign is already running.' });
    }

    // Retrieve contacts based on target criteria
    let query = { tenantId: req.tenantId };
    if (campaign.targetCriteria) {
      const { type, stage, tag, contactIds } = campaign.targetCriteria;
      if (type === 'STAGE' && stage) {
        query.stage = stage;
      } else if (type === 'TAG' && tag) {
        query.tags = tag;
      } else if (type === 'MANUAL' && contactIds && contactIds.length > 0) {
        query._id = { $in: contactIds };
      }
    }

    const contacts = await Contact.find(query);
    if (contacts.length === 0) {
      return res.status(400).json({ message: 'No contacts found matching the target criteria.' });
    }

    const contactIds = contacts.map((c) => c._id);
    
    // Update stats
    campaign.stats.total = contacts.length;
    campaign.status = 'SCHEDULED';
    await campaign.save();

    // Trigger job
    await addCampaignJob(campaign._id, {
      campaignId: campaign._id,
      tenantId: req.tenantId,
      whatsappSessionId: campaign.whatsappSessionId,
      contactIds,
      scheduledAt: campaign.scheduledAt,
    });

    await writeAuditLog(req, {
      action: 'CAMPAIGN_STARTED',
      entityType: 'Campaign',
      entityId: campaign._id,
      metadata: { name: campaign.name, total: contacts.length, scheduledAt: campaign.scheduledAt }
    });

    res.json({ message: 'Campaign scheduled.', campaign });
  } catch (error) {
    next(error);
  }
};

export const pauseCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found.' });
    }

    if (campaign.status !== 'RUNNING' && campaign.status !== 'SCHEDULED') {
      return res.status(400).json({ message: 'Campaign is not active.' });
    }

    // Mark as paused in DB (worker loops check this state)
    campaign.status = 'PAUSED';
    await campaign.save();

    // Remove job from BullMQ queue
    await cancelCampaignJob(campaign._id);

    await writeAuditLog(req, {
      action: 'CAMPAIGN_PAUSED',
      entityType: 'Campaign',
      entityId: campaign._id,
      metadata: { name: campaign.name }
    });

    res.json({ message: 'Campaign paused successfully.', campaign });
  } catch (error) {
    next(error);
  }
};

export const resumeCampaign = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenantId);
    if (tenant && tenant.limits && tenant.limits.bulkScheduling === false) {
      return res.status(403).json({ message: 'Bulk Scheduling is disabled for your plan. Please upgrade.' });
    }

    const campaign = await Campaign.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found.' });
    }

    if (campaign.status !== 'PAUSED') {
      return res.status(400).json({ message: 'Campaign is not paused.' });
    }

    let query = { tenantId: req.tenantId };
    if (campaign.targetCriteria) {
      const { type, stage, tag, contactIds } = campaign.targetCriteria;
      if (type === 'STAGE' && stage) {
        query.stage = stage;
      } else if (type === 'TAG' && tag) {
        query.tags = tag;
      } else if (type === 'MANUAL' && contactIds && contactIds.length > 0) {
        query._id = { $in: contactIds };
      }
    }

    const contacts = await Contact.find(query);
    const contactIds = contacts.map((c) => c._id);

    campaign.status = 'SCHEDULED';
    await campaign.save();

    // Re-queue the job starting progress calculation
    await addCampaignJob(campaign._id, {
      campaignId: campaign._id,
      tenantId: req.tenantId,
      whatsappSessionId: campaign.whatsappSessionId,
      contactIds,
      scheduledAt: campaign.scheduledAt,
    });

    await writeAuditLog(req, {
      action: 'CAMPAIGN_RESUMED',
      entityType: 'Campaign',
      entityId: campaign._id,
      metadata: { name: campaign.name, total: contacts.length }
    });

    res.json({ message: 'Campaign resumed successfully.', campaign });
  } catch (error) {
    next(error);
  }
};

export const getCampaignLogs = async (req, res, next) => {
  try {
    const logs = await MessageLog.find({
      tenantId: req.tenantId,
      campaignId: req.params.id,
    }).sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    next(error);
  }
};
