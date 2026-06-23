import { Queue } from 'bullmq';
import { redisConnection, isRedisConnected } from '../config/redis.js';
import { runIngestion } from '../services/ingestionService.js';
import logger from '../config/logger.js';

const queueOptions = (name) => ({
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

let ingestionQueue = null;
export let aiQueue = null;
export let analyticsQueue = null;
export let alertQueue = null;

export const initQueues = () => {
  if (ingestionQueue) return;
  try {
    ingestionQueue = new Queue('IngestionQueue', queueOptions('IngestionQueue'));
    aiQueue = new Queue('AiQueue', queueOptions('AiQueue'));
    analyticsQueue = new Queue('AnalyticsQueue', queueOptions('AnalyticsQueue'));
    alertQueue = new Queue('AlertQueue', queueOptions('AlertQueue'));
    logger.info('BullMQ queues initialized: Ingestion, AI, Analytics, Alert');
  } catch (error) {
    logger.error(`Error initializing BullMQ Queues: ${error.message}`);
  }
};

export const triggerIngestionJob = async () => {
  if (ingestionQueue) {
    try {
      const job = await ingestionQueue.add('fetch-and-ingest', { timestamp: Date.now() });
      logger.info(`Ingestion job added to BullMQ: ${job.id}`);
      return { type: 'bullmq', jobId: job.id };
    } catch (error) {
      logger.error(`BullMQ job failed, falling back: ${error.message}`);
      const count = await runIngestion();
      return { type: 'in-memory', count };
    }
  } else {
    const count = await runIngestion();
    return { type: 'in-memory', count };
  }
};

export const startScheduler = () => {
  if (ingestionQueue) {
    try {
      // Ingestion: every hour
      ingestionQueue.add('hourly-ingestion', {}, { repeat: { pattern: '0 * * * *' } });
      // Daily analytics
      analyticsQueue.add('daily-analytics', { periods: ['daily'] }, { repeat: { pattern: '0 2 * * *' } });
      // Weekly analytics + clusters
      analyticsQueue.add('weekly-analytics', { periods: ['weekly'] }, { repeat: { pattern: '0 3 * * 1' } });
      // Monthly analytics
      analyticsQueue.add('monthly-analytics', { periods: ['monthly'] }, { repeat: { pattern: '0 4 1 * *' } });
      // Alert checks: every 6 hours
      alertQueue.add('check-alerts', {}, { repeat: { pattern: '0 */6 * * *' } });
      logger.info('Scheduled BullMQ jobs: ingestion, daily/weekly/monthly analytics, alerts');
    } catch (error) {
      logger.error(`Scheduler setup error: ${error.message}`);
    }
  } else {
    logger.warn('Redis not connected — BullMQ disabled. Using in-memory scheduler.');
    const ONE_HOUR = 3600000;
    const SIX_HOURS = 6 * ONE_HOUR;

    setInterval(async () => {
      logger.info('In-memory: running hourly ingestion');
      try { await runIngestion(); } catch (e) { logger.error(e.message); }
    }, ONE_HOUR);

    setInterval(async () => {
      logger.info('In-memory: running analytics compute');
      try {
        const { computeTrends, computeTopicClusters } = await import('../services/analyticsService.js');
        await computeTrends('daily');
        await computeTopicClusters();
      } catch (e) { logger.error(e.message); }
    }, SIX_HOURS);

    setInterval(async () => {
      logger.info('In-memory: running alert checks');
      try {
        const { checkAndFireAlerts } = await import('../services/alertService.js');
        await checkAndFireAlerts();
      } catch (e) { logger.error(e.message); }
    }, SIX_HOURS);

    logger.info('In-memory scheduler started (ingestion hourly, analytics + alerts every 6h)');
  }
};
