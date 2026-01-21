import { Router } from 'express';
import * as matchController from '../controllers/match.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.get('/matches', authenticateJWT, matchController.getMatches);
router.post('/messages', authenticateJWT, matchController.sendMessage);

export default router;
