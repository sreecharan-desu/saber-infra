import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/metrics', authenticateJWT, requireRole(['admin']), adminController.getMetrics);
router.post('/ai/keys', authenticateJWT, requireRole(['admin']), adminController.rotateAIKeys);

export default router;
