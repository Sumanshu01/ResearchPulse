import express from 'express';
import { protect } from '../middleware/auth.js';
import { getAlerts, markRead, markAllRead, subscribe, unsubscribe } from '../controllers/alertController.js';

const router = express.Router();

router.use(protect);

router.get('/', getAlerts);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.post('/subscribe', subscribe);
router.delete('/subscribe/:refName', unsubscribe);

export default router;
