import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getSummary,
  regenerateSummary,
  getSimilar,
  getResearchGaps,
  getRecommendations,
  refreshRecommendations,
  getPredictions,
  refreshEmbeddings,
} from '../controllers/aiController.js';

const router = express.Router();

router.get('/summary/:paperId', getSummary);
router.post('/summary/:paperId/generate', protect, regenerateSummary);
router.get('/similar/:paperId', getSimilar);
router.get('/gaps', getResearchGaps);
router.get('/recommendations', protect, getRecommendations);
router.post('/recommendations/refresh', protect, refreshRecommendations);
router.get('/predictions', getPredictions);
router.post('/embeddings/refresh', protect, refreshEmbeddings);

export default router;
