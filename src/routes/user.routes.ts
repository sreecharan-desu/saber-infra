import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.post('/intent', authenticateJWT, requireRole(['candidate']), userController.updateIntent);
router.post('/constraints', authenticateJWT, userController.updateConstraints);

export default router;
