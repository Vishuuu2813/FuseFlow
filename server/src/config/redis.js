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
      // Mute high frequency retries: retry every 30 seconds after 3 initial failures
      if (times > 3) {
        return 30000;
      }
      return 1000;
    }
  };
};

export const redisConnection = new Redis(redisUrl, getRedisConfig());

let isRedisConnected = false;
let redisWarned = false;

redisConnection.on('connect', () => {
  isRedisConnected = true;
  redisWarned = false;
  logger.info('Redis connected successfully.');
});

redisConnection.on('error', (err) => {
  isRedisConnected = false;
  if (!redisWarned) {
    logger.warn('Redis is offline. Queued tasks will run in local in-memory fallback mode.');
    redisWarned = true;
  }
});

export const getRedisStatus = () => isRedisConnected;

export const createRedisClient = () => {
  return new Redis(redisUrl, getRedisConfig());
};
