import Campaign from '../models/Campaign.js';
import Contact from '../models/Contact.js';
import MessageFlow from '../models/MessageFlow.js';
import ContactFlowState from '../models/ContactFlowState.js';
import MessageLog from '../models/MessageLog.js';
import Tenant from '../models/Tenant.js';
import { addCampaignJob, isCampaignJobActive } from './queue.js';
import { sessions, connectToWhatsApp, getMediaOptions } from './whatsapp.js';
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

  // -----------------------------------------------------------------
  // 1. Campaigns & Reminders Loop (Coarse - Runs every 30 seconds)
  // -----------------------------------------------------------------
  setInterval(async () => {
    try {
      const now = new Date();

      // 1a. Process Scheduled Campaigns
      const pendingCampaigns = await Campaign.find({
        status: 'SCHEDULED',
        scheduledAt: { $lte: now }
      });

      for (const campaign of pendingCampaigns) {
        if (isCampaignJobActive(campaign._id)) {
          continue; 
        }

        logger.info(`[Scheduler] Executing scheduled campaign: ${campaign.name} (${campaign._id})`);

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

      // 1b. Process Birthday/Anniversary Reminders
      const reminderTenants = await Tenant.find({
        $or: [
          { 'settings.birthdayReminderEnabled': true },
          { 'settings.anniversaryReminderEnabled': true }
        ]
      });

      for (const tenant of reminderTenants) {
        const tenantTimezone = tenant.settings.timezone || 'UTC';
        let tenantNow;
        try {
          tenantNow = new Date(new Date().toLocaleString('en-US', { timeZone: tenantTimezone }));
        } catch (e) {
          tenantNow = new Date();
        }

        const dateStr = tenantNow.toISOString().split('T')[0]; 
        const currentHourMin = `${String(tenantNow.getHours()).padStart(2, '0')}:${String(tenantNow.getMinutes()).padStart(2, '0')}`;

        // Birthdays
        if (
          tenant.settings.birthdayReminderEnabled &&
          tenant.settings.lastBirthdayRunDate !== dateStr &&
          currentHourMin >= tenant.settings.birthdayReminderTime
        ) {
          logger.info(`[Scheduler] Checking birthdays for tenant ${tenant.name} (${tenant._id})`);
          
          const targetMonth = tenantNow.getMonth() + 1;
          const targetDay = tenantNow.getDate();

          const contactsWithBirthday = await Contact.find({
            tenantId: tenant._id,
            birthday: { $ne: null }
          });

          const matchingContacts = contactsWithBirthday.filter(c => {
            const bdate = new Date(c.birthday);
            return bdate.getMonth() + 1 === targetMonth && bdate.getDate() === targetDay;
          });

          if (matchingContacts.length > 0 && tenant.settings.reminderSessionId) {
            let sock = sessions[tenant.settings.reminderSessionId.toString()];
            if (!sock) {
              try {
                sock = await connectToWhatsApp(tenant._id, tenant.settings.reminderSessionId);
              } catch (err) {
                logger.error(`[Scheduler] Birthday Reminder: WhatsApp session connection failed for tenant ${tenant._id}`);
              }
            }

            if (sock) {
              for (const contact of matchingContacts) {
                try {
                  const formattedJid = `${contact.phone.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
                  const textToSend = interpolateTemplate(tenant.settings.birthdayReminderTemplate, contact);

                  const sentMsg = await sock.sendMessage(formattedJid, { text: textToSend });
                  
                  const savedLog = await MessageLog.create({
                    tenantId: tenant._id,
                    whatsappSessionId: tenant.settings.reminderSessionId,
                    phone: contact.phone,
                    messageText: textToSend,
                    status: 'SENT',
                    direction: 'OUTGOING',
                    messageId: sentMsg.key.id,
                    sentAt: new Date(),
                  });
                  emitToTenant(tenant._id, 'chat-message', savedLog);
                  logger.info(`[Scheduler] Birthday reminder sent to ${contact.name} (${contact.phone})`);
                } catch (msgErr) {
                  logger.error(`[Scheduler] Failed to send birthday reminder to ${contact.name}: ${msgErr.message}`);
                }
              }
            }
          }

          tenant.settings.lastBirthdayRunDate = dateStr;
          await tenant.save();
        }

        // Anniversaries
        if (
          tenant.settings.anniversaryReminderEnabled &&
          tenant.settings.lastAnniversaryRunDate !== dateStr &&
          currentHourMin >= tenant.settings.anniversaryReminderTime
        ) {
          logger.info(`[Scheduler] Checking anniversaries for tenant ${tenant.name} (${tenant._id})`);
          
          const targetMonth = tenantNow.getMonth() + 1;
          const targetDay = tenantNow.getDate();

          const contactsWithAnniversary = await Contact.find({
            tenantId: tenant._id,
            anniversary: { $ne: null }
          });

          const matchingContacts = contactsWithAnniversary.filter(c => {
            const adate = new Date(c.anniversary);
            return adate.getMonth() + 1 === targetMonth && adate.getDate() === targetDay;
          });

          if (matchingContacts.length > 0 && tenant.settings.reminderSessionId) {
            let sock = sessions[tenant.settings.reminderSessionId.toString()];
            if (!sock) {
              try {
                sock = await connectToWhatsApp(tenant._id, tenant.settings.reminderSessionId);
              } catch (err) {
                logger.error(`[Scheduler] Anniversary Reminder: WhatsApp session connection failed for tenant ${tenant._id}`);
              }
            }

            if (sock) {
              for (const contact of matchingContacts) {
                try {
                  const formattedJid = `${contact.phone.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
                  const textToSend = interpolateTemplate(tenant.settings.anniversaryReminderTemplate, contact);

                  const sentMsg = await sock.sendMessage(formattedJid, { text: textToSend });
                  
                  const savedLog = await MessageLog.create({
                    tenantId: tenant._id,
                    whatsappSessionId: tenant.settings.reminderSessionId,
                    phone: contact.phone,
                    messageText: textToSend,
                    status: 'SENT',
                    direction: 'OUTGOING',
                    messageId: sentMsg.key.id,
                    sentAt: new Date(),
                  });
                  emitToTenant(tenant._id, 'chat-message', savedLog);
                  logger.info(`[Scheduler] Anniversary reminder sent to ${contact.name} (${contact.phone})`);
                } catch (msgErr) {
                  logger.error(`[Scheduler] Failed to send anniversary reminder to ${contact.name}: ${msgErr.message}`);
                }
              }
            }
          }

          tenant.settings.lastAnniversaryRunDate = dateStr;
          await tenant.save();
        }
      }

    } catch (err) {
      logger.error(`[Scheduler] Error in campaign/reminder scheduler cycle: ${err.message}`);
    }
  }, 30000); // Check every 30 seconds

  // -----------------------------------------------------------------
  // 2. Message Flow Steps Loop (Fine - Runs every 1 second)
  // -----------------------------------------------------------------
  setInterval(async () => {
    try {
      const now = new Date();
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
          let messageOptions = {};
          
          if (currentStep.mediaUrl) {
            messageOptions = getMediaOptions(currentStep.mediaUrl, textToSend);
          } else {
            messageOptions = { text: textToSend };
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

          // Check if current step requires waiting for interactive branching input
          if (currentStep.isWaitStep && currentStep.branches && currentStep.branches.length > 0) {
            state.status = 'AWAITING_INPUT';
            state.nextExecutionAt = null;
          } else if (currentStep.autoProgress === false) {
            // End of branching path (terminal step)
            state.status = 'COMPLETED';
          } else {
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
      logger.error(`[Scheduler] Error in flow check cycle: ${err.message}`);
    }
  }, 1000); // Check every 1 second
};
