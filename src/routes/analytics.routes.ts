import { Router } from "express";
import * as analyticsController from "../controllers/analytics.controller";
import { authenticateJWT, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateJWT);

/**
 * GET /analytics/candidate
 * Stats: Matches, Applications, Swipes, Profile Views
 */
router.get(
  "/candidate",
  requireRole(["candidate"]),
  analyticsController.getCandidateAnalytics,
);

/**
 * GET /analytics/recruiter
 * Stats: Active Jobs, Applications Received, Matches, Job Views, Pipeline
 */
router.get(
  "/recruiter",
  requireRole(["recruiter", "admin"]),
  analyticsController.getRecruiterAnalytics,
);

export default router;
