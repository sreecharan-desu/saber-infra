import { Router } from 'express';
import * as jobController from '../controllers/job.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/jobs/feed', authenticateJWT, requireRole(['candidate']), jobController.getFeed);
router.post('/swipe', authenticateJWT, requireRole(['candidate']), jobController.swipe);

export default router;
