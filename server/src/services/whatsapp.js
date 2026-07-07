import makeWASocket, { DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import { useMongoAuthState } from './mongoAuthState.js';
import WhatsAppSession from '../models/WhatsAppSession.js';
import WhatsAppSessionKey from '../models/WhatsAppSessionKey.js';
import { emitToTenant } from '../socket.js';
import AutoReply from '../models/AutoReply.js';
import { queryAIResponse } from './ai.js';

// In-memory dictionary of running sockets
export const sessions = {};

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

const handleIncomingMessage = async (tenantId, sessionId, sock, msg) => {
  try {
    const jid = msg.key.remoteJid;
    const text = getMessageText(msg).trim();
    if (!text) return;

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
          await sock.sendMessage(jid, messageOptions);
        } else if (rule.replyMode === 'AI') {
          // Query AI with knowledge base context
          const aiResponse = await queryAIResponse(tenantId, text);
          if (aiResponse) {
            await sock.sendMessage(jid, { text: aiResponse });
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

  const logger = pino({ level: 'silent' });
  const { state, saveCreds } = await useMongoAuthState(tenantId, sessionId);

  const sock = makeWASocket.default({
    auth: state,
    logger,
    printQRInTerminal: false,
    mobile: false,
  });

  sessions[sessionKey] = sock;

  // Track session status updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      await WhatsAppSession.findByIdAndUpdate(sessionId, { status: 'QR', qrCode: qr });
      emitToTenant(tenantId, 'session-update', {
        sessionId,
        status: 'QR',
        qrCode: qr,
      });
    }

    if (connection === 'connecting') {
      await WhatsAppSession.findByIdAndUpdate(sessionId, { status: 'CONNECTING', qrCode: null });
      emitToTenant(tenantId, 'session-update', {
        sessionId,
        status: 'CONNECTING',
      });
    }

    if (connection === 'open') {
      const phone = sock.user.id.split(':')[0];
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
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        delete sessions[sessionKey];
        setTimeout(() => connectToWhatsApp(tenantId, sessionId), 5000);
      } else {
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
