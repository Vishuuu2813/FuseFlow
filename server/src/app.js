import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pino from 'pino';

// Configurations
import { connectDB } from './config/db.js';
import { initIO } from './socket.js';

// Routes
import authRouter from './routes/auth.js';
import sessionRouter from './routes/session.js';
import contactRouter from './routes/contact.js';
import campaignRouter from './routes/campaign.js';
import autoReplyRouter from './routes/autoreply.js';
import kbRouter from './routes/kb.js';
import adminRouter from './routes/admin.js';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const app = express();
const server = http.createServer(app);

// 1. Initialize WebSockets
initIO(server);

// 2. Connect to Database
connectDB();

// 4. Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading assets/QRs if needed
}));
app.use(cors({
  origin: true, // Echo origin (or specify front-end url)
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 5. Register Routes
app.use('/api/auth', authRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/contacts', contactRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/autoreply', autoReplyRouter);
app.use('/api/kb', kbRouter);
app.use('/api/admin', adminRouter);


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
server.listen(PORT, () => {
  logger.info(`WhatsFlow Server running on port ${PORT}`);
});
