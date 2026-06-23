import { Worker } from 'bullmq';
import { redisConnection, isRedisConnected } from '../config/redis.js';
import { runIngestion } from '../services/ingestionService.js';
import logger from '../config/logger.js';

let ingestionWorker = null;
let aiWorker = null;
let analyticsWorker = null;
let alertWorker = null;

export const initWorkers = () => {
  if (ingestionWorker) return;
  try {
    // ── Ingestion Worker ──────────────────────────────
    ingestionWorker = new Worker(
      'IngestionQueue',
      async (job) => {
        logger.info(`[IngestionWorker] Processing job ${job.id}: ${job.name}`);
        const count = await runIngestion();
        return { status: 'success', papersSaved: count };
      },
      { connection: redisConnection, concurrency: 1 }
    );
    ingestionWorker.on('completed', (job, result) =>
      logger.info(`[IngestionWorker] Job ${job.id} done: ${JSON.stringify(result)}`)
    );
    ingestionWorker.on('failed', (job, err) =>
      logger.error(`[IngestionWorker] Job ${job?.id} failed: ${err.message}`)
    );

    // ── AI Worker ────────────────────────────────────
    aiWorker = new Worker(
      'AiQueue',
      async (job) => {
        logger.info(`[AiWorker] Processing job ${job.id}: ${job.name}`);
        if (job.name === 'generate-summary') {
          const { generatePaperSummary } = await import('../services/geminiService.js');
          await generatePaperSummary(job.data.paperId);
          return { status: 'success', paperId: job.data.paperId };
        }
        if (job.name === 'update-embedding') {
          const { updatePaperEmbedding } = await import('../services/embeddingService.js');
          await updatePaperEmbedding(job.data.paperId);
          return { status: 'success', paperId: job.data.paperId };
        }
      },
      { connection: redisConnection, concurrency: 2 }
    );
    aiWorker.on('completed', (job, result) =>
      logger.info(`[AiWorker] Job ${job.id} done: ${JSON.stringify(result)}`)
    );
    aiWorker.on('failed', (job, err) =>
      logger.error(`[AiWorker] Job ${job?.id} failed: ${err.message}`)
    );

    // ── Analytics Worker ──────────────────────────────
    analyticsWorker = new Worker(
      'AnalyticsQueue',
      async (job) => {
        logger.info(`[AnalyticsWorker] Processing job ${job.id}: ${job.name}`);
        const { computeTrends, computeTopicClusters } = await import('../services/analyticsService.js');
        const periods = job.data.periods || ['daily'];
        for (const p of periods) await computeTrends(p);
        if (job.name === 'weekly-analytics') await computeTopicClusters();
        return { status: 'success', periods };
      },
      { connection: redisConnection, concurrency: 1 }
    );
    analyticsWorker.on('completed', (job, result) =>
      logger.info(`[AnalyticsWorker] Job ${job.id} done`)
    );
    analyticsWorker.on('failed', (job, err) =>
      logger.error(`[AnalyticsWorker] Job ${job?.id} failed: ${err.message}`)
    );

    // ── Alert Worker ──────────────────────────────────
    alertWorker = new Worker(
      'AlertQueue',
      async (job) => {
        logger.info(`[AlertWorker] Processing job ${job.id}: ${job.name}`);
        const { checkAndFireAlerts } = await import('../services/alertService.js');
        const fired = await checkAndFireAlerts();
        return { status: 'success', fired };
      },
      { connection: redisConnection, concurrency: 1 }
    );
    alertWorker.on('completed', (job, result) =>
      logger.info(`[AlertWorker] Job ${job.id} done: ${JSON.stringify(result)}`)
    );
    alertWorker.on('failed', (job, err) =>
      logger.error(`[AlertWorker] Job ${job?.id} failed: ${err.message}`)
    );

    logger.info('All BullMQ workers initialized dynamically: Ingestion, AI, Analytics, Alert');
  } catch (error) {
    logger.error(`Error initializing BullMQ Workers: ${error.message}`);
  }
};

export default {};
