import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, extractMessageContent } from '@whiskeysockets/baileys';
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

export const getMediaOptions = (url, caption) => {
  if (!url) return {};
  const lowerUrl = url.trim().toLowerCase();
  
  if (lowerUrl.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
    const opts = { image: { url } };
    if (caption) opts.caption = caption;
    return opts;
  } else if (lowerUrl.match(/\.(mp4|3gp|m4v|mov|avi)/i)) {
    const opts = { video: { url } };
    if (caption) opts.caption = caption;
    return opts;
  } else if (lowerUrl.endsWith('.apk')) {
    const opts = {
      document: { url },
      fileName: url.substring(url.lastIndexOf('/') + 1) || 'application.apk',
      mimetype: 'application/vnd.android.package-archive'
    };
    if (caption) opts.caption = caption;
    return opts;
  } else {
    // Default to document for other files (e.g. pdf, doc, xlsx)
    const opts = {
      document: { url },
      fileName: url.substring(url.lastIndexOf('/') + 1) || 'document'
    };
    if (caption) opts.caption = caption;
    return opts;
  }
};

// LID → phone number mapping per session (populated by contacts.upsert event)
// e.g. { '120031870476524': '919548033751' }
const lidPhoneMap = {};

const getMessageText = (msg) => {
  if (!msg.message) return '';
  const content = extractMessageContent(msg.message);
  if (!content) return '';
  
  if (content.conversation) return content.conversation;
  if (content.extendedTextMessage?.text) return content.extendedTextMessage.text;
  if (content.buttonsResponseMessage?.selectedButtonId) return content.buttonsResponseMessage.selectedButtonId;
  if (content.listResponseMessage?.singleSelectReply?.selectedRowId) return content.listResponseMessage.singleSelectReply.selectedRowId;
  if (content.imageMessage?.caption) return content.imageMessage.caption;
  if (content.videoMessage?.caption) return content.videoMessage.caption;
  
  if (content.imageMessage) return '[Image]';
  if (content.videoMessage) return '[Video]';
  if (content.audioMessage) return '[Audio]';
  if (content.documentMessage) return '[Document]';
  if (content.stickerMessage) return '[Sticker]';
  if (content.contactMessage || content.contactsArrayMessage) return '[Contact]';
  if (content.locationMessage) return '[Location]';
  
  return '';
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

const getSenderPhone = async (tenantId, msg, sessionKey) => {
  // 1. Check remoteJidAlt first
  let jid = msg.key?.remoteJidAlt || msg.key?.remoteJid || '';
  
  // 2. Check participantAlt if remoteJidAlt is not set
  if (jid.endsWith('@lid') && msg.key?.participantAlt) {
    jid = msg.key.participantAlt;
  }
  
  // 3. Check senderPn
  if (jid.endsWith('@lid') && msg.key?.senderPn) {
    jid = msg.key.senderPn;
  }

  const raw = jid.replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@lid/, '').split(':')[0];

  // 4. Resolve LID using database or memory map
  if (jid.endsWith('@lid')) {
    // A. Check in-memory map
    const sessionMap = lidPhoneMap[sessionKey] || {};
    const resolved = sessionMap[raw];
    if (resolved) {
      console.log(`[WhatsApp] Resolved @lid ${raw} → phone ${resolved} via memory map`);
      return resolved;
    }

    // B. Check Contact database by LID JID
    try {
      const contactByLid = await Contact.findOne({ tenantId, lid: raw });
      if (contactByLid) {
        if (!lidPhoneMap[sessionKey]) lidPhoneMap[sessionKey] = {};
        lidPhoneMap[sessionKey][raw] = contactByLid.phone;
        console.log(`[WhatsApp] Resolved @lid ${raw} → phone ${contactByLid.phone} via Contact DB`);
        return contactByLid.phone;
      }
    } catch (dbErr) {
      console.error(`[WhatsApp] DB error resolving LID:`, dbErr.message);
    }
  }

  return raw;
};

const isValidPhone = (phone) => {
  // Real phone numbers or fallback LID number: 7-20 digits
  return /^\d{7,20}$/.test(phone);
};

const handleIncomingMessage = async (tenantId, sessionId, sock, msg) => {
  try {
    const jid = msg.key.remoteJid;
    if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') return;

    const text = getMessageText(msg).trim();
    if (!text) return;

    const sessionKey = sessionId.toString();
    let phone = await getSenderPhone(tenantId, msg, sessionKey);

    // If still invalid length or pattern, skip
    if (!isValidPhone(phone)) {
      console.log(`[WhatsApp] Skipping message with invalid JID format: ${jid} (extracted: ${phone})`);
      return;
    }
    const normalizedText = text.toLowerCase().trim();

    // Ensure contact exists
    let contact = await Contact.findOne({ tenantId, phone });
    const isLidJid = jid.endsWith('@lid');
    const lidNum = isLidJid ? jid.replace('@lid', '').split(':')[0] : null;

    if (!contact) {
      contact = await Contact.create({
        tenantId,
        phone,
        name: msg.pushName || 'New Contact',
        stage: 'lead',
        lid: lidNum,
      });
      console.log(`[WhatsApp] Created new contact. Phone: ${phone} | LID: ${lidNum}`);
    } else if (lidNum && contact.lid !== lidNum) {
      contact.lid = lidNum;
      await contact.save();
      console.log(`[WhatsApp] Updated contact LID mapping. Phone: ${phone} | LID: ${lidNum}`);
    }

    // Save incoming message log
    const savedIncomingLog = await MessageLog.create({
      tenantId,
      whatsappSessionId: sessionId,
      phone,
      messageText: text,
      status: 'RECEIVED',
      direction: 'INCOMING',
      messageId: msg.key.id,
      sentAt: new Date(),
    });

    // Notify room of new incoming message
    emitToTenant(tenantId, 'chat-message', savedIncomingLog);

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
      // 1. Check if contact is currently in a flow and awaiting interactive input
      const contact = await Contact.findOne({ tenantId, phone });
      if (contact) {
        const activeState = await ContactFlowState.findOne({
          tenantId,
          contactId: contact._id,
          status: 'AWAITING_INPUT'
        });

        if (activeState) {
          const flow = await MessageFlow.findOne({ _id: activeState.flowId, tenantId, isActive: true });
          if (flow) {
            const currentStep = flow.steps[activeState.currentStepIndex];
            if (currentStep && currentStep.isWaitStep) {
              const matchedBranch = currentStep.branches?.find(branch =>
                branch.keywords?.some(kw => normalizedText === kw.toLowerCase().trim() || normalizedText.includes(kw.toLowerCase().trim()))
              );

              if (matchedBranch) {
                const targetIdx = flow.steps.findIndex(s => s.stepNumber === matchedBranch.targetStepNumber);
                if (targetIdx !== -1) {
                  activeState.currentStepIndex = targetIdx;
                  activeState.status = 'RUNNING';
                  activeState.nextExecutionAt = new Date();
                  await activeState.save();
                  console.log(`[Flow] Contact +${phone} branched to step ${matchedBranch.targetStepNumber} via input "${normalizedText}"`);
                  return; // intercept and return
                }
              }
            }
          }
        }
      }

      // 2. Find active flow matching the incoming keyword as a new trigger
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
    // Sort by specificity: longest keyword first so "hello sir send me scanner" 
    // wins over "hello sir" when both CONTAINS rules exist.
    const rules = await AutoReply.find({ tenantId, isActive: true });
    const sortedRules = rules.slice().sort((a, b) => {
      const maxLenA = Math.max(...a.keywords.map(k => k.length));
      const maxLenB = Math.max(...b.keywords.map(k => k.length));
      return maxLenB - maxLenA; // longer = more specific = higher priority
    });
    
    for (const rule of sortedRules) {
      let matched = false;
      
      for (const keyword of rule.keywords) {
        const kw = keyword.toLowerCase().trim();
        const incomingText = text.toLowerCase().trim();
        
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
          // Send static response (handles image, video, document, apk, or fallback text)
          let messageOptions = {};
          if (rule.mediaUrl) {
            messageOptions = getMediaOptions(rule.mediaUrl, rule.replyText);
          } else {
            messageOptions = { text: rule.replyText };
          }
          const sentMsg = await sock.sendMessage(jid, messageOptions);
          const savedLog = await MessageLog.create({
            tenantId,
            whatsappSessionId: sessionId,
            phone,
            messageText: rule.replyText,
            mediaUrl: rule.mediaUrl,
            status: 'SENT',
            direction: 'OUTGOING',
            messageId: sentMsg?.key?.id,
            sentAt: new Date(),
          });
          emitToTenant(tenantId, 'chat-message', savedLog);
        } else if (rule.replyMode === 'AI') {
          // Query AI with knowledge base context
          const aiResponse = await queryAIResponse(tenantId, text);
          if (aiResponse) {
            const sentMsg = await sock.sendMessage(jid, { text: aiResponse });
            const savedLog = await MessageLog.create({
              tenantId,
              whatsappSessionId: sessionId,
              phone,
              messageText: aiResponse,
              status: 'SENT',
              direction: 'OUTGOING',
              messageId: sentMsg?.key?.id,
              sentAt: new Date(),
            });
            emitToTenant(tenantId, 'chat-message', savedLog);
          }
        }
        break; // Trigger first match only
      }
    }
  } catch (error) {
    // Log errors instead of failing silently - helps debug message delivery issues
    console.error(`[WhatsApp] Error in handleIncomingMessage:`, error.message);
  }
};

export const connectToWhatsApp = async (tenantId, sessionId) => {
  const sessionKey = sessionId.toString();
  if (sessions[sessionKey]) {
    return sessions[sessionKey];
  }

  const sessionExists = await WhatsAppSession.findById(sessionId);
  if (!sessionExists) {
    console.log(`[WhatsApp] Session ${sessionId} not found in database. Skipping connection.`);
    return null;
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
    patchMessageBeforeSending: (message) => {
      const requiresPatch = !!(
        message.buttonsMessage || 
        message.templateMessage ||
        message.listMessage ||
        message.interactiveMessage
      );
      if (requiresPatch) {
        message = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadataVersion: 2,
                deviceListMetadata: {},
              },
              ...message
            }
          }
        };
      }
      return message;
    }
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
          try {
            const newSock = await connectToWhatsApp(tenantId, sessionId);
            if (newSock) {
              newSock.retryCount = isRestartRequired ? 0 : retryCount;
            }
          } catch (err) {
            console.error(`[WhatsApp] Failed to reconnect session ${sessionId}:`, err.message);
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

  // Build LID ↔ phone mapping so that @lid incoming messages can be resolved to real phone numbers
  const buildLidMapping = async (contacts) => {
    if (contacts && contacts.length > 0) {
      console.log(`[WhatsApp] buildLidMapping sync batch size: ${contacts.length}. Sample contact:`, JSON.stringify(contacts[0]));
    }
    for (const contact of contacts) {
      const id = contact.id || '';
      const lid = contact.lid || '';
      if (id.endsWith('@s.whatsapp.net') && lid) {
        const phone = id.replace('@s.whatsapp.net', '').split(':')[0];
        const lidNum = lid.replace('@lid', '').split(':')[0];
        if (phone && lidNum) {
          if (!lidPhoneMap[sessionKey]) lidPhoneMap[sessionKey] = {};
          lidPhoneMap[sessionKey][lidNum] = phone;
          console.log(`[WhatsApp] LID mapped: ${lidNum} → ${phone}`);

          try {
            // 1. Update/set LID on the contact with the real phone number
            await Contact.updateOne(
              { tenantId, phone },
              { $set: { lid: lidNum } }
            );

            // 2. If a contact was accidentally created using the LID, delete it
            await Contact.deleteOne({ tenantId, phone: lidNum });

            // 3. Migrate any message logs that were saved under the LID to the real phone number
            const updateResult = await MessageLog.updateMany(
              { tenantId, phone: lidNum },
              { $set: { phone: phone } }
            );
            if (updateResult.modifiedCount > 0) {
              console.log(`[WhatsApp] Migrated ${updateResult.modifiedCount} message logs from LID ${lidNum} to phone ${phone}`);
            }
          } catch (dbErr) {
            console.error(`[WhatsApp] DB error in buildLidMapping:`, dbErr.message);
          }
        }
      }
    }
  };

  sock.ev.on('contacts.upsert', buildLidMapping);
  sock.ev.on('contacts.update', buildLidMapping);

  // Handle incoming messages
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type === 'notify') {
      for (const msg of m.messages) {
        if (!msg.key.fromMe && msg.message) {
          console.log(`[WhatsApp][IncomingMessage] Full message object details:`, JSON.stringify(msg, null, 2));
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
