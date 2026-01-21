import { Router } from 'express';
import * as recruiterController from '../controllers/recruiter.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.post('/company', authenticateJWT, requireRole(['recruiter']), recruiterController.createCompany);
router.post('/job', authenticateJWT, requireRole(['recruiter']), recruiterController.createJob);
router.get('/recruiter/feed', authenticateJWT, requireRole(['recruiter']), recruiterController.getRecruiterFeed); // Optional endpoint not explicitly in spec but needed
router.post('/recruiter/swipe', authenticateJWT, requireRole(['recruiter']), recruiterController.recruiterSwipe); // Same

export default router;
