import { Worker } from 'bullmq';
import { redisConnection, getRedisStatus } from '../config/redis.js';
import Campaign from '../models/Campaign.js';
import MessageLog from '../models/MessageLog.js';
import Contact from '../models/Contact.js';
import MessageTemplate from '../models/MessageTemplate.js';
import { sessions, connectToWhatsApp } from '../services/whatsapp.js';
import { emitToTenant } from '../socket.js';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const interpolateTemplate = (text, contact) => {
  if (!text) return '';
  let result = text;
  // Replace name placeholders
  result = result.replace(/\{\{name\}\}/gi, contact.name || 'Customer');
  
  // Replace custom variables
  if (contact.variables) {
    for (const key of contact.variables.keys()) {
      const val = contact.variables.get(key) || '';
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      result = result.replace(regex, val);
    }
  }
  return result;
};

// Extracted campaign executor callable by both BullMQ worker and local in-memory fallback
export const executeCampaignLogic = async (data) => {
  const { campaignId, tenantId, whatsappSessionId, contactIds } = data;

  try {
    // 1. Fetch campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign || campaign.status === 'PAUSED' || campaign.status === 'COMPLETED') {
      return;
    }

    campaign.status = 'RUNNING';
    await campaign.save();

    // 2. Resolve WhatsApp session
    let sock = sessions[whatsappSessionId.toString()];
    if (!sock) {
      try {
        sock = await connectToWhatsApp(tenantId, whatsappSessionId);
      } catch (err) {
        campaign.status = 'FAILED';
        await campaign.save();
        logger.error(`Campaign Worker: WhatsApp session connection failed for session ${whatsappSessionId}`);
        return;
      }
    }

    // Check status
    const sessionInfo = await sock.user;
    if (!sessionInfo) {
      campaign.status = 'FAILED';
      await campaign.save();
      return;
    }

    // 3. Fetch contacts
    const contacts = await Contact.find({ _id: { $in: contactIds } });
    let template = null;
    if (campaign.templateId) {
      template = await MessageTemplate.findById(campaign.templateId);
    }

    let sentCount = campaign.stats.sent;
    let failedCount = campaign.stats.failed;
    const startIndex = sentCount + failedCount;

    for (let i = startIndex; i < contacts.length; i++) {
      const contact = contacts[i];

      // Check if paused mid-run
      const currentCampaign = await Campaign.findById(campaignId);
      if (!currentCampaign || currentCampaign.status === 'PAUSED') {
        logger.info(`Campaign ${campaignId} was paused/cancelled. Stopping worker loop.`);
        return;
      }

      const formattedJid = `${contact.phone.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
      let textToSend = campaign.messageText || '';
      let mediaUrl = campaign.mediaUrl || '';
      
      if (template) {
        textToSend = template.body;
        mediaUrl = template.mediaUrl || '';
      }

      textToSend = interpolateTemplate(textToSend, contact);

      try {
        const messageOptions = {};
        
        if (template && template.type === 'BUTTONS') {
          messageOptions.text = textToSend;
          if (template.footer) messageOptions.footer = template.footer;
        } else {
          messageOptions.text = textToSend;
        }

        if (mediaUrl) {
          messageOptions.image = { url: mediaUrl };
          messageOptions.caption = textToSend;
          delete messageOptions.text;
        }

        const sentMsg = await sock.sendMessage(formattedJid, messageOptions);
        sentCount++;
        
        await MessageLog.create({
          tenantId,
          campaignId,
          whatsappSessionId,
          phone: contact.phone,
          messageText: textToSend,
          mediaUrl,
          status: 'SENT',
          messageId: sentMsg.key.id,
          sentAt: new Date(),
        });
      } catch (error) {
        failedCount++;
        
        await MessageLog.create({
          tenantId,
          campaignId,
          whatsappSessionId,
          phone: contact.phone,
          messageText: textToSend,
          mediaUrl,
          status: 'FAILED',
          errorReason: error.message,
        });
      }

      campaign.stats.sent = sentCount;
      campaign.stats.failed = failedCount;
      await campaign.save();

      emitToTenant(tenantId, 'campaign-progress', {
        campaignId,
        stats: {
          total: contacts.length,
          sent: sentCount,
          failed: failedCount,
        },
        status: 'RUNNING',
      });

      // Anti-ban spacing delay
      const randomDelay = Math.floor(Math.random() * 3000) + 5000;
      await delay(randomDelay);
    }

    campaign.status = 'COMPLETED';
    await campaign.save();

    emitToTenant(tenantId, 'campaign-progress', {
      campaignId,
      stats: {
        total: contacts.length,
        sent: sentCount,
        failed: failedCount,
      },
      status: 'COMPLETED',
    });
  } catch (err) {
    logger.error(`Error in executeCampaignLogic: ${err.message}`);
  }
};

export const initCampaignWorker = () => {
  if (!getRedisStatus()) {
    logger.warn('Redis is offline. Skipping BullMQ Worker initialization (local in-memory fallback active).');
    return null;
  }

  try {
    const worker = new Worker(
      'campaignQueue',
      async (job) => {
        await executeCampaignLogic(job.data);
      },
      {
        connection: redisConnection,
        concurrency: 2,
      }
    );

    worker.on('failed', (job, err) => {
      logger.error(`Campaign Job ${job.id} failed with error: ${err.message}`);
    });

    return worker;
  } catch (err) {
    logger.error(`Failed to initialize BullMQ Campaign Worker: ${err.message}`);
    return null;
  }
};
