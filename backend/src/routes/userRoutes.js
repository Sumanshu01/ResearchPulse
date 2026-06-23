import express from 'express';
import {
  savePaper,
  getSavedPapers,
  deleteSavedPaper,
  toggleFollowTopic,
  toggleFollowAuthor,
  getUserProfile,
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { validateSavePaper } from '../middleware/validator.js';

const router = express.Router();

router.use(protect); // All routes in this router are protected

router.post('/saved', validateSavePaper, savePaper);
router.get('/saved', getSavedPapers);
router.delete('/saved/:paperId', deleteSavedPaper);

router.post('/follow-topic', toggleFollowTopic);
router.post('/follow-author', toggleFollowAuthor);
router.get('/profile', getUserProfile);

export default router;
