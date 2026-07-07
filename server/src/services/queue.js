import { executeCampaignLogic } from '../workers/campaignWorker.js';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Map to track active in-memory job timers for cancellation
const activeCampaigns = new Map();

export const addCampaignJob = async (campaignId, data) => {
  logger.info(`[In-Memory Queue] Scheduling campaign ${campaignId}...`);
  
  const jobId = campaignId.toString();
  
  // Cancel if already scheduled to avoid double runs
  if (activeCampaigns.has(jobId)) {
    clearTimeout(activeCampaigns.get(jobId));
  }

  const timeoutId = setTimeout(async () => {
    try {
      activeCampaigns.delete(jobId);
      await executeCampaignLogic(data);
    } catch (err) {
      logger.error(`In-Memory Campaign execution failed: ${err.message}`);
    }
  }, 0);

  activeCampaigns.set(jobId, timeoutId);
  return { id: jobId };
};

export const cancelCampaignJob = async (campaignId) => {
  const jobId = campaignId.toString();
  if (activeCampaigns.has(jobId)) {
    logger.info(`[In-Memory Queue] Cancelling execution for campaign ${campaignId}.`);
    clearTimeout(activeCampaigns.get(jobId));
    activeCampaigns.delete(jobId);
  }
};
