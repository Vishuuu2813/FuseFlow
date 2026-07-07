import WhatsAppSession from '../models/WhatsAppSession.js';
import WhatsAppSessionKey from '../models/WhatsAppSessionKey.js';
import Tenant from '../models/Tenant.js';
import { connectToWhatsApp, disconnectWhatsApp } from '../services/whatsapp.js';

export const getSessions = async (req, res, next) => {
  try {
    const sessions = await WhatsAppSession.find({ tenantId: req.tenantId }).select('-creds');
    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

export const createSession = async (req, res, next) => {
  try {
    const { sessionName } = req.body;
    if (!sessionName) {
      return res.status(400).json({ message: 'Session name is required.' });
    }

    // 1. Fetch tenant limits
    const tenant = await Tenant.findById(req.tenantId);
    const existingSessionsCount = await WhatsAppSession.countDocuments({ tenantId: req.tenantId });

    if (existingSessionsCount >= tenant.limits.maxDevices) {
      return res.status(400).json({
        message: `Plan limit exceeded. Your plan allows a maximum of ${tenant.limits.maxDevices} WhatsApp device(s). Upgrade to add more.`
      });
    }

    // 2. Create session
    const newSession = await WhatsAppSession.create({
      tenantId: req.tenantId,
      sessionName,
      status: 'DISCONNECTED',
    });

    res.status(201).json(newSession);
  } catch (error) {
    next(error);
  }
};

export const connectSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const session = await WhatsAppSession.findOne({ _id: sessionId, tenantId: req.tenantId });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    // Trigger connection in background (will stream QR code / state over socket.io)
    connectToWhatsApp(req.tenantId, sessionId);

    res.json({ message: 'Connection sequence started.', status: 'CONNECTING' });
  } catch (error) {
    next(error);
  }
};

export const disconnectSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const session = await WhatsAppSession.findOne({ _id: sessionId, tenantId: req.tenantId });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    await disconnectWhatsApp(sessionId);
    
    // Reset credentials and update status
    session.status = 'DISCONNECTED';
    session.qrCode = null;
    session.creds = null;
    await session.save();

    await WhatsAppSessionKey.deleteMany({ sessionId });

    res.json({ message: 'Session disconnected successfully.', status: 'DISCONNECTED' });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const session = await WhatsAppSession.findOneAndDelete({ _id: sessionId, tenantId: req.tenantId });

    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    // Disconnect active socket
    await disconnectWhatsApp(sessionId);

    // Delete credentials keys
    await WhatsAppSessionKey.deleteMany({ sessionId });

    res.json({ message: 'Session deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
