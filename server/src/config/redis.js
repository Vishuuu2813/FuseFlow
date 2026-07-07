import Redis from 'ioredis';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const getRedisConfig = () => {
  return {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    }
  };
};

export const redisConnection = new Redis(redisUrl, getRedisConfig());

redisConnection.on('connect', () => {
  logger.info('Redis connected successfully.');
});

redisConnection.on('error', (err) => {
  logger.error(`Redis connection error: ${err.message}`);
});

export const createRedisClient = () => {
  return new Redis(redisUrl, getRedisConfig());
};
