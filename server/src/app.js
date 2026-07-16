import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import rateLimit from 'express-rate-limit';

// Configurations
import { connectDB } from './config/db.js';
import { initIO } from './socket.js';
import { initScheduler } from './services/scheduler.js';

// Routes
import authRouter from './routes/auth.js';
import sessionRouter from './routes/session.js';
import contactRouter from './routes/contact.js';
import campaignRouter from './routes/campaign.js';
import autoReplyRouter from './routes/autoreply.js';
import kbRouter from './routes/kb.js';
import adminRouter from './routes/admin.js';
import flowRouter from './routes/flow.js';
import chatRouter from './routes/chat.js';
import webhookRouter from './routes/webhook.js';
import templateRouter from './routes/template.js';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const app = express();
const server = http.createServer(app);

const allowedOrigins = (
  process.env.CLIENT_ORIGINS ||
  'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// 1. Initialize WebSockets
initIO(server);

// 2. Connect to Database
connectDB().then(async () => {
  try {
    const WhatsAppSession = (await import('./models/WhatsAppSession.js')).default;
    const { connectToWhatsApp } = await import('./services/whatsapp.js');
    const activeSessions = await WhatsAppSession.find({ status: 'CONNECTED' });
    logger.info(`[Startup] Found ${activeSessions.length} active sessions to reconnect.`);
    for (const session of activeSessions) {
      logger.info(`[Startup] Reconnecting active session: ${session.sessionName} (${session._id})`);
      connectToWhatsApp(session.tenantId, session._id).catch((err) => {
        logger.error(`[Startup] Failed to reconnect session ${session._id}: ${err.message}`);
      });
    }
  } catch (err) {
    logger.error(`[Startup] Error during active session auto-reconnect: ${err.message}`);
  }
});
initScheduler();

// 4. Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading assets/QRs if needed
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS.'));
  },
  credentials: true
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false
}));
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' }
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// 5. Register Routes
app.use('/api/auth', authRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/contacts', contactRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/autoreply', autoReplyRouter);
app.use('/api/kb', kbRouter);
app.use('/api/admin', adminRouter);
app.use('/api/flows', flowRouter);
app.use('/api/chat', chatRouter);
app.use('/api/webhooks', webhookRouter);
app.use('/api/templates', templateRouter);


// Click Tracking Redirect Route
app.get('/track/click/:campaignId', async (req, res) => {
  const { campaignId } = req.params;
  const { url } = req.query;
  try {
    if (!url) {
      return res.status(400).send('Invalid redirect URL.');
    }
    const Campaign = (await import('./models/Campaign.js')).default;
    await Campaign.findByIdAndUpdate(campaignId, {
      $inc: { 'stats.clicks': 1 }
    });
    res.redirect(url);
  } catch (err) {
    logger.error(`Click tracking error: ${err.message}`);
    if (url) {
      res.redirect(url);
    } else {
      res.status(500).send('Server Error');
    }
  }
});

// Base Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// 6. Global Error Handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    status: 'error',
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 7. Start Server
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    logger.info(`WhatsFlow Server running on port ${PORT}`);
  });
}

export default app;


