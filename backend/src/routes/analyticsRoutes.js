import express from 'express';
import {
  getTrendsHandler,
  computeTrendsHandler,
  getCitationsHandler,
  getTopicClustersHandler,
  computeTopicClustersHandler,
  getAuthorRankingsHandler,
  getInstitutionRankingsHandler,
  getDashboardHandler,
  getEmergingHandler,
  getTimeSeriesHandler,
} from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/trends', getTrendsHandler);
router.post('/trends/compute', computeTrendsHandler);
router.get('/citations', getCitationsHandler);
router.get('/topics', getTopicClustersHandler);
router.post('/topics/compute', computeTopicClustersHandler);
router.get('/authors/rankings', getAuthorRankingsHandler);
router.get('/institutions/rankings', getInstitutionRankingsHandler);
router.get('/dashboard', getDashboardHandler);
router.get('/emerging', getEmergingHandler);
router.get('/timeseries', getTimeSeriesHandler);

export default router;
