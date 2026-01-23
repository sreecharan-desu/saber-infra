import { Router } from 'express';
import * as recruiterController from '../controllers/recruiter.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { swipeLimiter } from '../middleware/rateLimit.middleware';

import { upload } from '../middleware/upload.middleware';

const router = Router();

router.post('/company', authenticateJWT, requireRole(['recruiter']), recruiterController.createCompany);
router.put('/company/images', authenticateJWT, requireRole(['recruiter']), upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'cover_image', maxCount: 1 }]), recruiterController.updateCompanyImages);
router.get('/company', authenticateJWT, requireRole(['recruiter']), recruiterController.getMyCompany);
router.post('/job', authenticateJWT, requireRole(['recruiter']), recruiterController.createJob);
router.get('/jobs', authenticateJWT, requireRole(['recruiter']), recruiterController.getMyJobs);
router.put('/job/:id', authenticateJWT, requireRole(['recruiter']), recruiterController.updateJob);
router.delete('/job/:id', authenticateJWT, requireRole(['recruiter']), recruiterController.deleteJob);
router.get('/signals', authenticateJWT, requireRole(['recruiter']), recruiterController.getSignalsOfInterest);
router.get('/feed', authenticateJWT, requireRole(['recruiter']), recruiterController.getRecruiterFeed); 
router.post('/swipe', authenticateJWT, requireRole(['recruiter']), swipeLimiter, recruiterController.recruiterSwipe); 

export default router;
