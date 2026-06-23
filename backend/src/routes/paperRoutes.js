import express from 'express';
import {
  getPapers,
  getPaperById,
  triggerIngestion,
  seedPapers,
} from '../controllers/paperController.js';
import { protect, requireAdmin, lenientProtect } from '../middleware/auth.js';

const router = express.Router();

router.post('/seed', seedPapers); // Public endpoint – must be before /:id
router.get('/', getPapers);
router.get('/:id', lenientProtect, getPaperById);
router.post('/ingest', protect, requireAdmin, triggerIngestion);


export default router;
