import express from 'express';
import { protect, requireAdmin as isAdmin } from '../middleware/auth.js';
import {
  getAdminStats,
  refreshAnalytics,
  queueSummaries,
  refreshEmbeddingsAdmin,
  getAdminDashboard,
  clearCache,
} from '../controllers/adminController.js';

const router = express.Router();

router.use(protect, isAdmin);

router.get('/stats', getAdminStats);
router.get('/dashboard', getAdminDashboard);
router.post('/analytics/refresh', refreshAnalytics);
router.post('/ai/queue-summaries', queueSummaries);
router.post('/embeddings/refresh', refreshEmbeddingsAdmin);
router.delete('/cache/clear', clearCache);

export default router;
