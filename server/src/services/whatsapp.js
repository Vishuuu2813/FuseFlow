import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import { useMongoAuthState } from './mongoAuthState.js';
import WhatsAppSession from '../models/WhatsAppSession.js';
import WhatsAppSessionKey from '../models/WhatsAppSessionKey.js';
import { emitToTenant } from '../socket.js';
import AutoReply from '../models/AutoReply.js';
import Contact from '../models/Contact.js';
import Tenant from '../models/Tenant.js';
import MessageFlow from '../models/MessageFlow.js';
import ContactFlowState from '../models/ContactFlowState.js';
import MessageLog from '../models/MessageLog.js';
import Campaign from '../models/Campaign.js';
import { queryAIResponse } from './ai.js';

// In-memory dictionary of running sockets and timeouts
export const sessions = {};
export const connectionTimeouts = {};

const getMessageText = (msg) => {
  if (!msg.message) return '';
  return (
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.buttonsResponseMessage?.selectedButtonId ||
    msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  );
};

const normalizeReceiptStatus = (status) => {
  if (typeof status === 'string') {
    const normalized = status.toUpperCase();
    if (['READ', 'DELIVERED'].includes(normalized)) return normalized;
    if (normalized.includes('READ')) return 'READ';
    if (normalized.includes('DELIVERY') || normalized.includes('DELIVERED')) return 'DELIVERED';
    return null;
  }

  // Baileys commonly reports numeric ACK states. Values can differ across versions,
  // so only promote the high-confidence delivered/read states.
  if (status >= 4) return 'READ';
  if (status >= 3) return 'DELIVERED';
  return null;
};

const updateMessageDeliveryStatus = async (messageId, receiptStatus) => {
  if (!messageId || !receiptStatus) return;

  const log = await MessageLog.findOne({ messageId });
  if (!log) return;

  const previousStatus = log.status;

  if (receiptStatus === 'READ') {
    log.status = 'READ';
    log.readAt = log.readAt || new Date();
    log.deliveredAt = log.deliveredAt || new Date();
  } else if (receiptStatus === 'DELIVERED' && !['READ', 'DELIVERED'].includes(log.status)) {
    log.status = 'DELIVERED';
    log.deliveredAt = log.deliveredAt || new Date();
  }

  if (log.isModified('status') || log.isModified('readAt') || log.isModified('deliveredAt')) {
    await log.save();
  }

  if (!log.campaignId || previousStatus === log.status) return;

  const inc = {};
  if (receiptStatus === 'DELIVERED' && !['DELIVERED', 'READ'].includes(previousStatus)) {
    inc['stats.delivered'] = 1;
  }
  if (receiptStatus === 'READ' && previousStatus !== 'READ') {
    inc['stats.read'] = 1;
    if (previousStatus === 'SENT') {
      inc['stats.delivered'] = 1;
    }
  }

  if (Object.keys(inc).length > 0) {
    await Campaign.findByIdAndUpdate(log.campaignId, { $inc: inc });
    emitToTenant(log.tenantId, 'message-receipt', {
      campaignId: log.campaignId,
      messageLogId: log._id,
      status: log.status,
      phone: log.phone,
    });
  }
};

const handleIncomingMessage = async (tenantId, sessionId, sock, msg) => {
  try {
    const jid = msg.key.remoteJid;
    const text = getMessageText(msg).trim();
    if (!text) return;

    const phone = jid.split('@')[0];
    const normalizedText = text.toLowerCase().trim();

    if (['stop', 'unsubscribe', 'opt out', 'optout'].includes(normalizedText)) {
      await Contact.findOneAndUpdate(
        { tenantId, phone },
        {
          $set: {
            name: msg.pushName || 'New Contact',
            phone,
            stage: 'lead',
            'consent.optIn': false,
            'consent.optedOutAt': new Date(),
            'consent.optOutReason': 'User sent opt-out keyword'
          },
          $setOnInsert: {
            tenantId,
            'consent.optInSource': 'incoming',
            'consent.consentedAt': new Date()
          }
        },
        { upsert: true, new: true }
      );
      await sock.sendMessage(jid, { text: 'You have been unsubscribed and will no longer receive automated messages from us.' });
      return;
    }

    // Check plan feature limits for flowBuilder
    const tenant = await Tenant.findById(tenantId);
    const hasFlowBuilder = tenant && tenant.limits && tenant.limits.flowBuilder !== false;

    if (hasFlowBuilder) {
      // Find active flow matching the incoming keyword
      const matchedFlow = await MessageFlow.findOne({
        tenantId,
        isActive: true,
        triggerKeywords: normalizedText
      });

      if (matchedFlow && matchedFlow.steps && matchedFlow.steps.length > 0) {
        // Find or create contact
        let contact = await Contact.findOne({ tenantId, phone });
        if (!contact) {
          contact = await Contact.create({
            tenantId,
            name: msg.pushName || 'New Contact',
            phone,
            stage: 'lead'
          });
        }

        // Enroll contact in flow if not already enrolled (or restart completed/failed flow states)
        const existingState = await ContactFlowState.findOne({ contactId: contact._id, flowId: matchedFlow._id });
        if (!existingState) {
          const firstStepDelay = matchedFlow.steps[0]?.delaySeconds || 0;
          await ContactFlowState.create({
            tenantId,
            contactId: contact._id,
            flowId: matchedFlow._id,
            currentStepIndex: 0,
            nextExecutionAt: new Date(Date.now() + firstStepDelay * 1000),
            status: 'RUNNING'
          });
          console.log(`[Flow] Enrolled contact +${phone} into flow "${matchedFlow.name}"`);
          return; // Skip standard auto-reply execution
        } else if (existingState.status !== 'RUNNING') {
          // Restart flow
          const firstStepDelay = matchedFlow.steps[0]?.delaySeconds || 0;
          existingState.currentStepIndex = 0;
          existingState.nextExecutionAt = new Date(Date.now() + firstStepDelay * 1000);
          existingState.status = 'RUNNING';
          await existingState.save();
          console.log(`[Flow] Re-enrolled contact +${phone} into flow "${matchedFlow.name}"`);
          return;
        }
      }
    }

    // Search for matching keyword auto-replies
    const rules = await AutoReply.find({ tenantId, isActive: true });
    
    for (const rule of rules) {
      let matched = false;
      
      for (const keyword of rule.keywords) {
        const kw = keyword.toLowerCase().trim();
        const incomingText = text.toLowerCase();
        
        if (rule.matchType === 'EXACT' && incomingText === kw) {
          matched = true;
          break;
        } else if (rule.matchType === 'CONTAINS' && incomingText.includes(kw)) {
          matched = true;
          break;
        }
      }

      if (matched) {
        if (rule.replyMode === 'STATIC') {
          // Send static text response
          const messageOptions = { text: rule.replyText };
          if (rule.mediaUrl) {
            messageOptions.image = { url: rule.mediaUrl };
          }
          const sentMsg = await sock.sendMessage(jid, messageOptions);
          await MessageLog.create({
            tenantId,
            whatsappSessionId: sessionId,
            phone,
            messageText: rule.replyText,
            mediaUrl: rule.mediaUrl,
            status: 'SENT',
            messageId: sentMsg?.key?.id,
            sentAt: new Date(),
          });
        } else if (rule.replyMode === 'AI') {
          // Query AI with knowledge base context
          const aiResponse = await queryAIResponse(tenantId, text);
          if (aiResponse) {
            const sentMsg = await sock.sendMessage(jid, { text: aiResponse });
            await MessageLog.create({
              tenantId,
              whatsappSessionId: sessionId,
              phone,
              messageText: aiResponse,
              status: 'SENT',
              messageId: sentMsg?.key?.id,
              sentAt: new Date(),
            });
          }
        }
        break; // Trigger first match only
      }
    }
  } catch (error) {
    // Fail silently in message trigger to avoid crashing thread
  }
};

export const connectToWhatsApp = async (tenantId, sessionId) => {
  const sessionKey = sessionId.toString();
  if (sessions[sessionKey]) {
    return sessions[sessionKey];
  }

  // Set connection/pairing timeout (e.g. 2 minutes)
  if (connectionTimeouts[sessionKey]) {
    clearTimeout(connectionTimeouts[sessionKey]);
  }
  connectionTimeouts[sessionKey] = setTimeout(async () => {
    const session = await WhatsAppSession.findById(sessionId);
    if (session && session.status !== 'CONNECTED') {
      console.log(`[WhatsApp] Connection timeout reached for session ${sessionId}. Resetting status to DISCONNECTED.`);
      await disconnectWhatsApp(sessionId);
      await WhatsAppSession.findByIdAndUpdate(sessionId, {
        status: 'DISCONNECTED',
        qrCode: null,
      });
      emitToTenant(tenantId, 'session-update', {
        sessionId,
        status: 'DISCONNECTED',
      });
    }
  }, 120000); // 2 minutes

  const logger = pino({ level: 'info' });
  const { state, saveCreds } = await useMongoAuthState(tenantId, sessionId);

  let version = [2, 3000, 1017531287]; // recent fallback
  try {
    const { version: latestVersion } = await fetchLatestBaileysVersion();
    version = latestVersion;
    console.log(`[WhatsApp] Using dynamic client version: ${version.join('.')}`);
  } catch (err) {
    console.log('[WhatsApp] Failed to fetch latest Baileys version, using recent fallback.');
  }

  const makeSocket = makeWASocket.default || makeWASocket;
  const sock = makeSocket({
    auth: state,
    logger,
    version,
    printQRInTerminal: false,
    mobile: false,
  });

  sessions[sessionKey] = sock;

  // Track session status updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[WhatsApp] QR Code generated for session: ${sessionId}`);
      await WhatsAppSession.findByIdAndUpdate(sessionId, { status: 'QR', qrCode: qr });
      emitToTenant(tenantId, 'session-update', {
        sessionId,
        status: 'QR',
        qrCode: qr,
      });
    }

    if (connection === 'connecting') {
      console.log(`[WhatsApp] Session ${sessionId} is connecting...`);
      await WhatsAppSession.findByIdAndUpdate(sessionId, { status: 'CONNECTING', qrCode: null });
      emitToTenant(tenantId, 'session-update', {
        sessionId,
        status: 'CONNECTING',
      });
    }

    if (connection === 'open') {
      // Clear timeout upon successful connection
      if (connectionTimeouts[sessionKey]) {
        clearTimeout(connectionTimeouts[sessionKey]);
        delete connectionTimeouts[sessionKey];
      }
      const phone = sock.user.id.split(':')[0];
      console.log(`[WhatsApp] Session ${sessionId} connected successfully. Phone: ${phone}`);
      await WhatsAppSession.findByIdAndUpdate(sessionId, {
        status: 'CONNECTED',
        phone,
        qrCode: null,
      });
      emitToTenant(tenantId, 'session-update', {
        sessionId,
        status: 'CONNECTED',
        phone,
      });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const message = lastDisconnect?.error?.message || '';
      console.log(`[WhatsApp] Session ${sessionId} closed. Status code: ${statusCode}. Message: ${message}`);

      // Clear credentials if the session is bad, logged out, or unauthorized
      // Do NOT clear if status code is 515 (restart required after successful QR scan registration)
      const isRestartRequired = statusCode === 515 || message.includes('restart required');
      const shouldClearCredentials =
        !isRestartRequired && (
          statusCode === DisconnectReason.loggedOut ||
          statusCode === DisconnectReason.badSession ||
          statusCode === 401 ||
          statusCode === 403 ||
          statusCode === 411 ||
          (message.includes('Stream Errored') && !message.includes('restart required')) ||
          message.includes('Unauthorized') ||
          message.includes('login')
        );

      if (shouldClearCredentials) {
        // Clear timeout
        if (connectionTimeouts[sessionKey]) {
          clearTimeout(connectionTimeouts[sessionKey]);
          delete connectionTimeouts[sessionKey];
        }
        console.log(`[WhatsApp] Clearing corrupt credentials for session ${sessionId}`);
        await WhatsAppSession.findByIdAndUpdate(sessionId, {
          status: 'DISCONNECTED',
          qrCode: null,
          creds: null,
        });
        await WhatsAppSessionKey.deleteMany({ sessionId });
        delete sessions[sessionKey];
        emitToTenant(tenantId, 'session-update', {
          sessionId,
          status: 'DISCONNECTED',
        });
      } else {
        // Network failure or connection restart (like 515 after scan)
        delete sessions[sessionKey];
        const retryCount = isRestartRequired ? 0 : (sock.retryCount || 0) + 1;
        
        if (isRestartRequired) {
          console.log(`[WhatsApp] Session ${sessionId} QR code scanned successfully! Restarting connection...`);
          // Set status to CONNECTING immediately in database and emit it
          await WhatsAppSession.findByIdAndUpdate(sessionId, {
            status: 'CONNECTING',
            qrCode: null,
          });
          emitToTenant(tenantId, 'session-update', {
            sessionId,
            status: 'CONNECTING',
          });
        }

        if (retryCount <= 5 || isRestartRequired) {
          console.log(`[WhatsApp] Reconnecting session ${sessionId}${isRestartRequired ? ' (Restart Required)' : ` (Attempt ${retryCount}/5)`}...`);
          const newSock = await connectToWhatsApp(tenantId, sessionId);
          if (newSock) {
            newSock.retryCount = isRestartRequired ? 0 : retryCount;
          }
        } else {
          // Clear timeout
          if (connectionTimeouts[sessionKey]) {
            clearTimeout(connectionTimeouts[sessionKey]);
            delete connectionTimeouts[sessionKey];
          }
          console.log(`[WhatsApp] Max reconnection attempts reached for session ${sessionId}. Resetting session.`);
          await WhatsAppSession.findByIdAndUpdate(sessionId, {
            status: 'DISCONNECTED',
            qrCode: null,
          });
          emitToTenant(tenantId, 'session-update', {
            sessionId,
            status: 'DISCONNECTED',
          });
        }
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Handle incoming messages
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type === 'notify') {
      for (const msg of m.messages) {
        if (!msg.key.fromMe && msg.message) {
          await handleIncomingMessage(tenantId, sessionId, sock, msg);
        }
      }
    }
  });

  sock.ev.on('messages.update', async (updates) => {
    for (const item of updates) {
      const messageId = item.key?.id;
      const receiptStatus = normalizeReceiptStatus(item.update?.status);
      if (messageId && receiptStatus) {
        await updateMessageDeliveryStatus(messageId, receiptStatus);
      }
    }
  });

  return sock;
};

// Graceful session cleanup
export const disconnectWhatsApp = async (sessionId) => {
  const sessionKey = sessionId.toString();
  const sock = sessions[sessionKey];
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {
      // already logged out
    }
    delete sessions[sessionKey];
  }
};
