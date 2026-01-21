import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.post('/oauth/callback', authController.handleOAuthCallback);
router.post('/link-provider', authenticateJWT, authController.linkProvider);
router.get('/me', authenticateJWT, authController.getMe); // Moved /me here as it's typically auth related, though could be in user routes

export default router;
