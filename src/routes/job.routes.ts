import { Router } from 'express';
import * as jobController from '../controllers/job.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { swipeLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

router.get('/feed', authenticateJWT, requireRole(['candidate']), jobController.getFeed);
router.post('/swipe', authenticateJWT, requireRole(['candidate']), swipeLimiter, jobController.swipe);

export default router;
