import express from 'express';
import { getAuthors, getAuthorById } from '../controllers/authorController.js';

const router = express.Router();

router.get('/', getAuthors);
router.get('/:id', getAuthorById);

export default router;
