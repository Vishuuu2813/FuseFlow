import { Server } from 'socket.io';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

let io = null;

export const initIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join room for multi-tenant isolation
    socket.on('join-tenant', (tenantId) => {
      if (tenantId) {
        socket.join(tenantId.toString());
        logger.info(`Socket ${socket.id} joined tenant room: ${tenantId}`);
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
