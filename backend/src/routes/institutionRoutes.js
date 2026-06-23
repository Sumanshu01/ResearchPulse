import express from 'express';
import { getInstitutions, getInstitutionById } from '../controllers/institutionController.js';

const router = express.Router();

router.get('/', getInstitutions);
router.get('/:id', getInstitutionById);

export default router;
