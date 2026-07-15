import Campaign from '../models/Campaign.js';
import Contact from '../models/Contact.js';
import MessageFlow from '../models/MessageFlow.js';
import ContactFlowState from '../models/ContactFlowState.js';
import MessageLog from '../models/MessageLog.js';
import { addCampaignJob, isCampaignJobActive } from './queue.js';
import { sessions, connectToWhatsApp } from './whatsapp.js';
import { emitToTenant } from '../socket.js';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const interpolateTemplate = (text, contact) => {
  if (!text) return '';
  return text.replace(/\{\{name\}\}/gi, contact.name || 'Customer');
};

export const initScheduler = () => {
  logger.info('[Scheduler] Initializing global scheduling worker...');

  (async () => {
    try {
      const result = await Campaign.updateMany(
        { status: 'RUNNING' },
        { $set: { status: 'PAUSED' } }
      );
      if (result.modifiedCount > 0) {
        logger.warn(`[Scheduler] Recovered ${result.modifiedCount} running campaign(s) as PAUSED after server startup.`);
      }
    } catch (error) {
      logger.error(`[Scheduler] Startup recovery failed: ${error.message}`);
    }
  })();

  // Run checks every 30 seconds
  setInterval(async () => {
    try {
      const now = new Date();

      // -----------------------------------------------------------------
      // 1. Process Scheduled Campaigns
      // -----------------------------------------------------------------
      const pendingCampaigns = await Campaign.find({
        status: 'SCHEDULED',
        scheduledAt: { $lte: now }
      });

      for (const campaign of pendingCampaigns) {
        if (isCampaignJobActive(campaign._id)) {
          continue; // Already executing/scheduled in-memory
        }

        logger.info(`[Scheduler] Executing scheduled campaign: ${campaign.name} (${campaign._id})`);

        // Resolve targeted contacts
        let query = { tenantId: campaign.tenantId };
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
        if (contacts.length > 0) {
          const contactIds = contacts.map((c) => c._id);
          campaign.stats.total = contacts.length;
          campaign.status = 'RUNNING';
          await campaign.save();

          await addCampaignJob(campaign._id, {
            campaignId: campaign._id,
            tenantId: campaign.tenantId,
            whatsappSessionId: campaign.whatsappSessionId,
            contactIds,
          });
        } else {
          campaign.status = 'FAILED';
          await campaign.save();
          logger.warn(`[Scheduler] Scheduled campaign ${campaign._id} has no matching contacts.`);
        }
      }

      // -----------------------------------------------------------------
      // 2. Process Scheduled Flows
      // -----------------------------------------------------------------
      const pendingFlowStates = await ContactFlowState.find({
        status: 'RUNNING',
        nextExecutionAt: { $lte: now }
      });

      for (const state of pendingFlowStates) {
        try {
          const flow = await MessageFlow.findById(state.flowId);
          const contact = await Contact.findById(state.contactId);

          if (!flow || !contact || !flow.isActive) {
            state.status = 'FAILED';
            await state.save();
            continue;
          }

          const currentStep = flow.steps[state.currentStepIndex];
          if (!currentStep) {
            state.status = 'COMPLETED';
            await state.save();
            continue;
          }

          logger.info(`[Scheduler] Sending flow step for ${contact.name} - Flow: ${flow.name}, Step: ${currentStep.stepNumber}`);

          // Send message
          let sock = sessions[flow.whatsappSessionId.toString()];
          if (!sock) {
            sock = await connectToWhatsApp(state.tenantId, flow.whatsappSessionId);
          }

          const formattedJid = `${contact.phone.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
          const textToSend = interpolateTemplate(currentStep.messageText, contact);
          const messageOptions = {};
          
          if (currentStep.mediaUrl) {
            messageOptions.image = { url: currentStep.mediaUrl };
            messageOptions.caption = textToSend;
          } else {
            messageOptions.text = textToSend;
          }

          const sentMsg = await sock.sendMessage(formattedJid, messageOptions);

          // Log step
          state.logs.push({
            stepIndex: state.currentStepIndex,
            sentAt: new Date(),
            status: 'SENT'
          });

          // Log in MessageLog
          const savedLog = await MessageLog.create({
            tenantId: state.tenantId,
            whatsappSessionId: flow.whatsappSessionId,
            phone: contact.phone,
            messageText: textToSend,
            mediaUrl: currentStep.mediaUrl,
            status: 'SENT',
            direction: 'OUTGOING',
            messageId: sentMsg.key.id,
            sentAt: new Date(),
          });
          emitToTenant(state.tenantId, 'chat-message', savedLog);

          // Move to next step or complete
          const nextStepIndex = state.currentStepIndex + 1;
          if (nextStepIndex < flow.steps.length) {
            const nextStep = flow.steps[nextStepIndex];
            const nextDelaySeconds = nextStep.delaySeconds || 0;
            
            state.currentStepIndex = nextStepIndex;
            state.nextExecutionAt = new Date(Date.now() + nextDelaySeconds * 1000);
            state.status = 'RUNNING';
          } else {
            state.status = 'COMPLETED';
          }

          await state.save();
        } catch (stepError) {
          logger.error(`[Scheduler] Flow execution step failed: ${stepError.message}`);
          state.logs.push({
            stepIndex: state.currentStepIndex,
            sentAt: new Date(),
            status: 'FAILED',
            error: stepError.message
          });
          state.status = 'FAILED';
          await state.save();
        }
      }

    } catch (err) {
      logger.error(`[Scheduler] Error in scheduler cycle: ${err.message}`);
    }
  }, 30000); // Check every 30 seconds
};
