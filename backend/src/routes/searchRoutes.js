import express from 'express';
import { searchPapers } from '../controllers/searchController.js';

const router = express.Router();

router.get('/', searchPapers);

export default router;
