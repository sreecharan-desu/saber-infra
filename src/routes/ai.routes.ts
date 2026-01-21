import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { requireAIKey } from '../middleware/auth.middleware';

const router = Router();

// Middleware applied to all /ai routes? 
// Spec says "API keys are scoped".
// We apply requireAIKey to all sub-routes here.
router.use(requireAIKey);

router.get('/data/users', aiController.getUsersData);
router.get('/data/jobs', aiController.getJobsData);
router.get('/data/swipes', aiController.getSwipesData);
router.get('/data/matches', aiController.getMatchesData);

router.post('/recommendations/update', aiController.updateRecommendation);

export default router;
