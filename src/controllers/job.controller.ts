import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const swipeSchema = z.object({
  job_id: z.string(),
  direction: z.enum(["left", "right"]),
});

import { getCache, setCache, deleteCache } from "../utils/cache";

export const getFeed = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req.user as any)?.id; // Candidate
    const cacheKey = `candidate_feed_${userId}`;

    // Check Cache
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { skills: true, recommendation_profile: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // 1. Fetch potential jobs (not swiped by me)
    const jobsPool = await prisma.job.findMany({
      where: {
        active: true,
        swipes: {
          none: {
            user_id: userId,
          },
        },
      },
      include: {
        company: true,
      },
      take: 200, // Increased pool for better splitting
    });

    const userSkillNames = new Set(
      user.skills.map((s) => s.name.toLowerCase()),
    );

    // Helper to check constraints deeply
    const isConstraintMatch = (userValue: any, jobValue: any): boolean => {
      if (jobValue === undefined) return true;
      if (userValue === jobValue) return true;
      if (Array.isArray(userValue) && Array.isArray(jobValue)) {
        if (userValue.length !== jobValue.length) return false;
        return userValue.every((v, i) => v === jobValue[i]);
      }
      return false;
    };

    const constraintMatches: any[] = [];
    const nonMatches: any[] = [];

    jobsPool.forEach((job) => {
      const userC = (user.constraints_json as Record<string, any>) || {};
      const jobC = (job.constraints_json as Record<string, any>) || {};

      let matchesConstraints = true;
      for (const key in userC) {
        if (!isConstraintMatch(userC[key], jobC[key])) {
          matchesConstraints = false;
          break;
        }
      }

      // Calculate score (skill overlap)
      let score = 0;
      job.skills_required.forEach((s: string) => {
        if (userSkillNames.has(s.toLowerCase())) score += 1;
      });

      if (matchesConstraints) {
        constraintMatches.push({ job, score });
      } else {
        nonMatches.push(job);
      }
    });

    // Sort constraint matches by score
    constraintMatches.sort((a, b) => b.score - a.score);

    // Decide how many to put in "Recommended" (jobs)
    // Primary: those with positive score
    // Fallback: top 15 if no positive scores exist
    let splitIndex = constraintMatches.filter((m) => m.score > 0).length;
    if (splitIndex === 0 && constraintMatches.length > 0) {
      splitIndex = Math.min(constraintMatches.length, 15);
    }

    const recommendedItems = constraintMatches.slice(0, splitIndex);
    const remainingItems = [
      ...constraintMatches.slice(splitIndex).map((m) => m.job),
      ...nonMatches,
    ];

    const formatJob = (job: any) => ({
      id: job.id,
      problem_statement: job.problem_statement,
      expectations: job.expectations,
      non_negotiables: job.non_negotiables,
      deal_breakers: job.deal_breakers,
      skills_required: job.skills_required,
      constraints: job.constraints_json,
      active: job.active,
      created_at: job.created_at,
      updated_at: job.updated_at,
      company: {
        name: job.company.name,
        logo_url: job.company.logo_url,
        cover_image_url: job.company.cover_image_url,
      },
    });

    const response = {
      jobs: recommendedItems.map((r) => formatJob(r.job)),
      all: remainingItems.map((job) => formatJob(job)),
    };

    // Cache for 60 seconds
    await setCache(cacheKey, response, 60);

    res.json(response);
  } catch (err) {
    next(err);
  }
};

export const swipe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { job_id, direction } = swipeSchema.parse(req.body);
    const userId = (req.user as any)?.id;

    // Daily Limit Check
    if (direction === "right") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todaySwipes = await prisma.swipe.count({
        where: {
          user_id: userId,
          direction: "right",
          created_at: { gte: startOfDay },
        },
      });
      const limit = parseInt(process.env.SWIPE_LIMIT || "50");
      if (todaySwipes >= limit) {
        return res
          .status(429)
          .json({ error: "Daily right-swipe limit reached" });
      }
    }

    // Transactional Logic
    await prisma.$transaction(async (tx) => {
      // 1. Record Swipe
      await tx.swipe.create({
        data: {
          user_id: userId,
          job_id,
          direction,
          // target_user_id is null for Candidate swipe
        },
      });

      if (direction === "right") {
        // 2. Create Application automatically on right swipe
        try {
          await tx.application.create({
            data: {
              user_id: userId,
              job_id,
              status: "pending",
              cover_note: null, // No cover note on swipe, can be added later
            },
          });
        } catch (appErr) {
          // If application already exists (duplicate), ignore
          console.log("Application may already exist for this job");
        }

        // 3. Check for Match (Did Recruiter swipe me?)
        // Recruiter swipe: user_id=Recruiter, job_id=Job, target_user_id=Me, direction=right
        const reciprocalSwipe = await tx.swipe.findFirst({
          where: {
            job_id,
            target_user_id: userId,
            direction: "right",
          } as any,
        });

        if (reciprocalSwipe) {
          // MUTUAL MATCH!
          // Reveal identities.

          // Explainability Generation (Mocked for speed but logic is simple overlap)
          const explainability = {
            match_quality: "high",
            reason: "Mutual interest and constraint alignment.",
          };

          const match = await tx.match.create({
            data: {
              candidate_id: userId as string,
              job_id,
              reveal_status: true,
              explainability_json: explainability as any,
              // Note: Match does not need to store job_id? Wait, schema has job_id. Fixed in earlier step.
            },
          });

          // Update application status to 'reviewing' on match
          await tx.application.updateMany({
            where: {
              user_id: userId,
              job_id,
              status: "pending",
            },
            data: {
              status: "reviewing",
            },
          });

          // Notify? Return match info.
          return match;
        }
      }
    });

    // Invalidate Feed Cache for this user so they don't see the swiped job
    await deleteCache(`candidate_feed_${userId}`);

    res.json({ success: true, message: "Swipe recorded" });
  } catch (err) {
    // Only catch if not already handled
    // Prisma Unique Constraint violation -> 400
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res.status(400).json({ error: "Already swiped on this job" });
    }
    next(err);
  }
};
