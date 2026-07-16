import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import MessageLog from '../models/MessageLog.js';
import Contact from '../models/Contact.js';
import WhatsAppSession from '../models/WhatsAppSession.js';
import { sessions, connectToWhatsApp } from '../services/whatsapp.js';
import { emitToTenant } from '../socket.js';

const router = express.Router();

// 1. Get list of active chats (contacts who have messages) with their last message
router.get('/contacts', authenticate, requireTenant, async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { includeArchived = 'false' } = req.query;

    // Use aggregation to group by phone, get the last message and timestamp
    const activeChats = await MessageLog.aggregate([
      { $match: { tenantId } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$phone',
          lastMessage: { $first: '$messageText' },
          lastMessageAt: { $first: '$createdAt' },
          lastDirection: { $first: '$direction' },
          lastStatus: { $first: '$status' },
          sessionId: { $first: '$whatsappSessionId' },
        },
      },
    ]);

    // Populate contact details if they exist in Contact model
    let populatedChats = await Promise.all(
      activeChats.map(async (chat) => {
        const contact = await Contact.findOne({ tenantId, phone: chat._id });
        return {
          phone: chat._id,
          name: contact ? contact.name : 'Unknown Contact',
          stage: contact ? contact.stage : 'lead',
          tags: contact ? contact.tags : [],
          labels: contact ? contact.labels : [],
          lastMessage: chat.lastMessage,
          lastMessageAt: chat.lastMessageAt,
          lastDirection: chat.lastDirection,
          lastStatus: chat.lastStatus,
          sessionId: chat.sessionId,
          isPinned: contact ? contact.isPinned : false,
          isArchived: contact ? contact.isArchived : false,
          isMuted: contact ? contact.isMuted : false,
          mutedUntil: contact ? contact.mutedUntil : null,
          assignedAgentId: contact ? contact.assignedAgentId : null,
        };
      })
    );

    // Filter chats based on includeArchived
    if (includeArchived === 'true') {
      populatedChats = populatedChats.filter(chat => chat.isArchived);
    } else {
      populatedChats = populatedChats.filter(chat => !chat.isArchived);
    }

    // Sort: active tab sorts pinned first; archived tab sorts by time only
    populatedChats.sort((a, b) => {
      if (includeArchived !== 'true') {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    });

    res.json(populatedChats);
  } catch (error) {
    next(error);
  }
});

// 2. Get message history for a specific phone number
router.get('/messages/:phone', authenticate, requireTenant, async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const phone = req.params.phone;

    const messages = await MessageLog.find({ tenantId, phone })
      .sort({ createdAt: 1 })
      .limit(100);

    res.json(messages);
  } catch (error) {
    next(error);
  }
});

// 3. Send a message manually from the live chat
router.post('/send', authenticate, requireTenant, async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { phone, messageText, mediaUrl, mediaType } = req.body;

    if (!phone || !messageText) {
      return res.status(400).json({ message: 'Phone number and message text are required.' });
    }

    // Clean phone number - digits only
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    // Find the active WhatsApp session for this tenant
    const activeSession = await WhatsAppSession.findOne({ tenantId, status: 'CONNECTED' });
    if (!activeSession) {
      return res.status(400).json({ message: 'No connected WhatsApp session found. Please connect first.' });
    }

    let sock = sessions[activeSession._id.toString()];
    if (!sock) {
      sock = await connectToWhatsApp(tenantId, activeSession._id);
    }

    if (!sock) {
      return res.status(503).json({ message: 'WhatsApp socket is not available. Please reconnect.' });
    }

    // Find the contact to check if they have a mapped LID
    const contact = await Contact.findOne({ tenantId, phone: cleanPhone });
    
    let formattedJid;
    if (contact && contact.lid) {
      formattedJid = `${contact.lid}@lid`;
      console.log(`[Chat] Sending reply using LID JID: ${formattedJid} for phone ${cleanPhone}`);
    } else {
      formattedJid = `${cleanPhone}@s.whatsapp.net`;
      console.log(`[Chat] Sending reply using standard phone JID: ${formattedJid}`);
    }

    const messageOptions = {};

    if (mediaUrl) {
      messageOptions.image = { url: mediaUrl };
      messageOptions.caption = messageText;
    } else {
      messageOptions.text = messageText;
    }

    let sentMsgId = null;
    try {
      const sentMsg = await sock.sendMessage(formattedJid, messageOptions);
      sentMsgId = sentMsg?.key?.id;
    } catch (sendErr) {
      console.error(`[Chat] Failed to send message to ${formattedJid}:`, sendErr.message);
      return res.status(500).json({ message: `Failed to send: ${sendErr.message}` });
    }

    const savedLog = await MessageLog.create({
      tenantId,
      whatsappSessionId: activeSession._id,
      phone: cleanPhone,
      messageText,
      mediaUrl,
      mediaType: mediaType || (mediaUrl ? 'image' : 'text'),
      status: 'SENT',
      direction: 'OUTGOING',
      messageId: sentMsgId,
      sentAt: new Date(),
    });

    // Real-time broadcast
    emitToTenant(tenantId, 'chat-message', savedLog);

    // Also update/upsert contact to make sure they are in the database
    if (!contact) {
      await Contact.create({
        tenantId,
        phone: cleanPhone,
        name: 'New Contact',
        stage: 'lead',
      });
    }

    res.json(savedLog);
  } catch (error) {
    next(error);
  }
});

// 4. Star/Unstar a message
router.put('/message/:messageId/star', authenticate, requireTenant, async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { starred } = req.body;
    const tenantId = req.tenantId;

    const message = await MessageLog.findOne({ _id: messageId, tenantId });
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.starred = starred;
    await message.save();

    emitToTenant(tenantId, 'message-updated', message);

    res.json(message);
  } catch (error) {
    next(error);
  }
});

export default router;
