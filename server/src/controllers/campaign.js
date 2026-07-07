import Campaign from '../models/Campaign.js';
import Contact from '../models/Contact.js';
import MessageLog from '../models/MessageLog.js';
import { addCampaignJob, cancelCampaignJob } from '../services/queue.js';

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
    const { name, whatsappSessionId, templateId, messageText, mediaUrl } = req.body;

    if (!name || !whatsappSessionId) {
      return res.status(400).json({ message: 'Campaign name and WhatsApp session are required.' });
    }

    const campaign = await Campaign.create({
      tenantId: req.tenantId,
      name,
      whatsappSessionId,
      templateId: templateId || null,
      messageText: messageText || '',
      mediaUrl: mediaUrl || '',
      status: 'DRAFT',
    });

    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
};

export const startCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found.' });
    }

    if (campaign.status === 'RUNNING') {
      return res.status(400).json({ message: 'Campaign is already running.' });
    }

    // Retrieve contacts
    const contacts = await Contact.find({ tenantId: req.tenantId });
    if (contacts.length === 0) {
      return res.status(400).json({ message: 'No contacts found to dispatch. Import contacts first.' });
    }

    const contactIds = contacts.map((c) => c._id);
    
    // Update stats
    campaign.stats.total = contacts.length;
    campaign.status = 'SCHEDULED';
    await campaign.save();

    // Trigger BullMQ job
    await addCampaignJob(campaign._id, {
      campaignId: campaign._id,
      tenantId: req.tenantId,
      whatsappSessionId: campaign.whatsappSessionId,
      contactIds,
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

    res.json({ message: 'Campaign paused successfully.', campaign });
  } catch (error) {
    next(error);
  }
};

export const resumeCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found.' });
    }

    if (campaign.status !== 'PAUSED') {
      return res.status(400).json({ message: 'Campaign is not paused.' });
    }

    const contacts = await Contact.find({ tenantId: req.tenantId });
    const contactIds = contacts.map((c) => c._id);

    campaign.status = 'SCHEDULED';
    await campaign.save();

    // Re-queue the job starting progress calculation
    await addCampaignJob(campaign._id, {
      campaignId: campaign._id,
      tenantId: req.tenantId,
      whatsappSessionId: campaign.whatsappSessionId,
      contactIds,
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
