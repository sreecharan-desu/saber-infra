import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import jobRoutes from './job.routes';
import matchRoutes from './match.routes';
import recruiterRoutes from './recruiter.routes';
import adminRoutes from './admin.routes';
import aiRoutes from './ai.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes); // /me, /intent, /constraints
router.use('/', jobRoutes); // /jobs/feed, /swipe
router.use('/', matchRoutes); // matches, messages
router.use('/', recruiterRoutes); // /company, /job
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);

export default router;
