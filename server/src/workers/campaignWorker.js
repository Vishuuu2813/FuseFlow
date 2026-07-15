import Campaign from '../models/Campaign.js';
import MessageLog from '../models/MessageLog.js';
import Contact from '../models/Contact.js';
import MessageTemplate from '../models/MessageTemplate.js';
import Tenant from '../models/Tenant.js';
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

const getUsageWindows = () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return { startOfDay, endOfDay, startOfMonth };
};

const parseSpintax = (text) => {
  if (!text) return '';
  const spintaxPattern = /\{([^{}]+)\}/g;
  let matches;
  let result = text;
  while ((matches = spintaxPattern.exec(result)) !== null) {
    const choices = matches[1].split('|');
    const randomChoice = choices[Math.floor(Math.random() * choices.length)];
    result = result.substring(0, matches.index) + randomChoice + result.substring(matches.index + matches[0].length);
    spintaxPattern.lastIndex = 0;
  }
  return result;
};

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
  return parseSpintax(result);
};

// Core campaign executor running direct loop in-memory
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

    const [sentLikeCount, failedLikeCount, loggedCount] = await Promise.all([
      MessageLog.countDocuments({ campaignId, status: { $in: ['SENT', 'DELIVERED', 'READ'] } }),
      MessageLog.countDocuments({ campaignId, status: 'FAILED' }),
      MessageLog.countDocuments({ campaignId, status: { $in: ['SENT', 'DELIVERED', 'READ', 'FAILED'] } })
    ]);

    let sentCount = Math.max(campaign.stats.sent || 0, sentLikeCount);
    let failedCount = Math.max(campaign.stats.failed || 0, failedLikeCount);
    const startIndex = Math.min(loggedCount, contacts.length);

    campaign.stats.sent = sentCount;
    campaign.stats.failed = failedCount;
    await campaign.save();

    for (let i = startIndex; i < contacts.length; i++) {
      const contact = contacts[i];

      // Check daily limit
      const tenant = await Tenant.findById(tenantId);
      const dailyLimit = tenant?.limits?.dailyMessageLimit || 100;
      const monthlyLimit = tenant?.limits?.maxMessagesPerMonth || 500;
      const { startOfDay, endOfDay, startOfMonth } = getUsageWindows();

      const sentToday = await MessageLog.countDocuments({
        tenantId,
        status: 'SENT',
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      if (sentToday >= dailyLimit) {
        logger.info(`Campaign ${campaignId} paused: daily message limit of ${dailyLimit} reached.`);
        campaign.status = 'PAUSED';
        await campaign.save();
        
        emitToTenant(tenantId, 'campaign-progress', {
          campaignId,
          stats: {
            total: contacts.length,
            sent: sentCount,
            failed: failedCount,
          },
          status: 'PAUSED',
          error: `Daily message quota of ${dailyLimit} exceeded.`
        });
        return;
      }

      const sentThisMonth = await MessageLog.countDocuments({
        tenantId,
        status: 'SENT',
        createdAt: { $gte: startOfMonth }
      });

      if (sentThisMonth >= monthlyLimit) {
        logger.info(`Campaign ${campaignId} paused: monthly message limit of ${monthlyLimit} reached.`);
        campaign.status = 'PAUSED';
        await campaign.save();

        emitToTenant(tenantId, 'campaign-progress', {
          campaignId,
          stats: {
            total: contacts.length,
            sent: sentCount,
            failed: failedCount,
          },
          status: 'PAUSED',
          error: `Monthly message quota of ${monthlyLimit} exceeded.`
        });
        return;
      }

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

      const existingLog = await MessageLog.findOne({
        campaignId,
        phone: contact.phone,
        status: { $in: ['SENT', 'DELIVERED', 'READ'] }
      }).select('_id status');

      if (existingLog) {
        continue;
      }

      if (contact.consent?.optIn === false) {
        failedCount++;
        await MessageLog.create({
          tenantId,
          campaignId,
          whatsappSessionId,
          phone: contact.phone,
          messageText: textToSend,
          mediaUrl,
          status: 'FAILED',
          errorReason: 'Contact opted out of messages.',
        });

        campaign.stats.sent = sentCount;
        campaign.stats.failed = failedCount;
        await campaign.save();
        continue;
      }

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
        
        const savedLog = await MessageLog.create({
          tenantId,
          campaignId,
          whatsappSessionId,
          phone: contact.phone,
          messageText: textToSend,
          mediaUrl,
          status: 'SENT',
          direction: 'OUTGOING',
          messageId: sentMsg.key.id,
          sentAt: new Date(),
        });
        emitToTenant(tenantId, 'chat-message', savedLog);

        await Tenant.findByIdAndUpdate(tenantId, {
          $inc: { 'usage.messagesSentThisMonth': 1 }
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

      // Dynamic message dispatch delay configured by user or tenant plan limits
      const spacingSeconds = Math.max(
        campaign.delaySeconds || tenant?.limits?.defaultDelaySeconds || 5,
        tenant?.limits?.minimumDelaySeconds || 3
      );
      const jitterMs = Math.floor(Math.random() * 1500);
      const msgDelay = spacingSeconds * 1000 + jitterMs;
      await delay(msgDelay);
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
