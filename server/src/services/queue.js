import { Queue } from 'bullmq';
import { redisConnection, getRedisStatus } from '../config/redis.js';
import { executeCampaignLogic } from '../workers/campaignWorker.js';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Declare the queue
const campaignQueue = new Queue('campaignQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Suppress unhandled queue errors if Redis connection fails
campaignQueue.on('error', () => {});

export const addCampaignJob = async (campaignId, data) => {
  if (getRedisStatus()) {
    try {
      return await campaignQueue.add(`campaign-${campaignId}`, data, {
        jobId: campaignId.toString(),
      });
    } catch (err) {
      logger.warn('BullMQ dispatch failed, falling back to local memory execution.');
    }
  }

  // Local Memory Fallback execution (runs in background via setTimeout)
  logger.info(`[Fallback] Processing campaign ${campaignId} locally in-memory (Redis offline)...`);
  setTimeout(async () => {
    try {
      await executeCampaignLogic(data);
    } catch (err) {
      logger.error(`Local Campaign execution failed: ${err.message}`);
    }
  }, 0);
  
  return { id: campaignId.toString() };
};

export const cancelCampaignJob = async (campaignId) => {
  if (getRedisStatus()) {
    try {
      const job = await campaignQueue.getJob(campaignId.toString());
      if (job) {
        await job.remove();
      }
    } catch (err) {
      // Fail silently
    }
  }
};
