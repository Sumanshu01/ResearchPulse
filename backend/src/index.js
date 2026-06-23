import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './services/socketService.js';
import { startScheduler, triggerIngestionJob, initQueues } from './jobs/queue.js';
import { seedDatabase } from './services/ingestionService.js';
import Paper from './models/Paper.js';
import logger from './config/logger.js';
import { waitForRedis } from './config/redis.js';
import { initWorkers } from './jobs/worker.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Create HTTP Server
    const server = http.createServer(app);

    // 3. Initialize Socket.IO
    initSocket(server);

    // 4. Start Background Scheduler
    const hasRedis = await waitForRedis(1500);
    if (hasRedis) {
      initQueues();
      initWorkers();
    }
    startScheduler();

    // 5. Start Server
    server.listen(PORT, async () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API docs available at http://localhost:${PORT}/api/docs`);

      // 6. Seed/Populate check: If DB has no papers, seed across all topics
      try {
        const paperCount = await Paper.countDocuments();
        if (paperCount === 0) {
          logger.info('Database has 0 papers. Running full topic seed across all major research areas...');
          // Run seed in background so server starts immediately
          seedDatabase().catch((e) => logger.error(`Seed error: ${e.message}`));
        } else if (paperCount < 50) {
          logger.info(`Database has only ${paperCount} papers. Running additional ingestion to expand coverage...`);
          seedDatabase().catch((e) => logger.error(`Seed error: ${e.message}`));
        } else {
          logger.info(`Database already has ${paperCount} papers. Skipping initial seed.`);
        }
      } catch (seedErr) {
        logger.error(`Error checking/seeding database on start: ${seedErr.message}`);
      }
    });

    // Graceful Shutdown
    const handleShutdown = () => {
      logger.info('Shutting down server gracefully...');
      server.close(() => {
        logger.info('Server closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', handleShutdown);
    process.on('SIGINT', handleShutdown);
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Handle unhandled port-in-use errors cleanly
process.on('uncaughtException', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${err.port || 5000} is already in use. Run: netstat -ano | findstr :5000  then  taskkill /PID <PID> /F`);
  } else {
    logger.error(`Uncaught exception: ${err.message}`);
  }
  process.exit(1);
});

startServer();
