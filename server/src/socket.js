import { Server } from 'socket.io';
import pino from 'pino';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import { isPlatformAdmin } from './middleware/access.js';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

let io = null;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_access_key_whatsflow_2026';

const allowedOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const initIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('Socket authentication token is required.'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-passwordHash');

      if (!user || !user.isActive) {
        return next(new Error('Socket user is inactive or invalid.'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid socket authentication token.'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join room for multi-tenant isolation
    socket.on('join-tenant', (tenantId) => {
      const requestedTenantId = tenantId?.toString();
      const userTenantId = socket.user?.tenantId?.toString();

      if (isPlatformAdmin(socket.user) && requestedTenantId) {
        socket.join(requestedTenantId);
        logger.info(`Socket ${socket.id} joined tenant room as platform admin: ${requestedTenantId}`);
        return;
      }

      if (userTenantId && (!requestedTenantId || requestedTenantId === userTenantId)) {
        socket.join(userTenantId);
        logger.info(`Socket ${socket.id} joined tenant room: ${userTenantId}`);
      }
    });

    // Typing indicator events
    socket.on('typing-start', (data) => {
      const { tenantId, phone } = data;
      if (tenantId) {
        socket.to(tenantId.toString()).emit('typing-start', { phone });
      }
    });

    socket.on('typing-stop', (data) => {
      const { tenantId, phone } = data;
      if (tenantId) {
        socket.to(tenantId.toString()).emit('typing-stop', { phone });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};
export const emitToTenant = (tenantId, event, data) => {
  if (io && tenantId) {
    io.to(tenantId.toString()).emit(event, data);
  }
};
