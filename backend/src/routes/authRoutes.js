import express from 'express';
import {
  registerUser,
  authUser,
  getMe,
  logoutUser,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validateRegister, validateLogin } from '../middleware/validator.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, validateRegister, registerUser);
router.post('/login', authLimiter, validateLogin, authUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);

export default router;
