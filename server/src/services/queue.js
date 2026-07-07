import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export const campaignQueue = new Queue('campaignQueue', {
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

export const addCampaignJob = async (campaignId, data) => {
  return await campaignQueue.add(`campaign-${campaignId}`, data, {
    jobId: campaignId.toString(), // Ensures unique job per campaign id
  });
};

export const cancelCampaignJob = async (campaignId) => {
  const job = await campaignQueue.getJob(campaignId.toString());
  if (job) {
    await job.remove();
  }
};
