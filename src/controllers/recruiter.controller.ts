import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getCache, setCache, deleteCache } from "../utils/cache";
import * as userService from "../services/user.service";
import { sendJobOfferEmail } from "../services/email.service";
import cloudinary from "../config/cloudinary";

const uploadToCloudinary = (
  buffer: Buffer,
  folder: string,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `saber/${folder}`,
        },
        (error, result) => {
          if (error) return reject(error);
          if (result) resolve(result.secure_url);
        },
      )
      .end(buffer);
  });
};

export const updateCompanyImages = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const recruiterId = (req.user as any)?.id;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const company = await prisma.company.findFirst({
      where: { recruiter_id: recruiterId },
    });

    if (!company) return res.status(404).json({ error: "Company not found" });

    const updates: any = {};

    if (files["logo"]?.[0]) {
      updates.logo_url = await uploadToCloudinary(
        files["logo"][0].buffer,
        "logos",
      );
    }

    if (files["cover_image"]?.[0]) {
      updates.cover_image_url = await uploadToCloudinary(
        files["cover_image"][0].buffer,
        "covers",
      );
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No images provided" });
    }

    const updatedCompany = await prisma.company.update({
      where: { id: company.id },
      data: updates,
    });

    // Invalidate cache
    await deleteCache(`company_${recruiterId}`);

    res.json({ company: updatedCompany });
  } catch (err) {
    next(err);
  }
};
const companySchema = z.object({
  name: z.string(),
  website: z.string().optional(),
});

const jobSchema = z.object({
  company_id: z.string(),
  problem_statement: z.string(),
  expectations: z.string(),
  non_negotiables: z.string(),
  deal_breakers: z.string(),
  skills_required: z.array(z.string()),
  constraints_json: z.record(z.string(), z.any()),
});

export const createCompany = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, website } = companySchema.parse(req.body);
    const recruiterId = (req.user as any)?.id;

    const company = await prisma.company.create({
      data: {
        name,
        website,
        recruiter_id: recruiterId,
      },
    });

    // Fetch updated user with oauth_accounts to enrich with new company_id
    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: { id: recruiterId },
      include: { oauth_accounts: true },
    });

    const enrichedUser =
      await userService.enrichUserWithOnboarding(updatedUser);

    // Invalidate cache
    await deleteCache(`company_${recruiterId}`);

    res.json({
      company: { ...company, company_id: company.id },
      user: enrichedUser,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyCompany = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const recruiterId = (req.user as any)?.id;
    const cacheKey = `company_${recruiterId}`;

    const cached = await getCache(cacheKey);
    if (cached) return res.json({ company: cached });

    const company = await prisma.company.findFirst({
      where: { recruiter_id: recruiterId },
    });

    if (company) {
      await setCache(cacheKey, company);
    }

    res.json({ company });
  } catch (err) {
    next(err);
  }
};

export const getMyJobs = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const recruiterId = (req.user as any)?.id;
    const cacheKey = `jobs_${recruiterId}`;

    const cached = await getCache(cacheKey);
    if (cached) return res.json({ jobs: cached });

    const jobs = await prisma.job.findMany({
      where: { company: { recruiter_id: recruiterId } },
      include: { company: true },
    });

    await setCache(cacheKey, jobs);

    res.json({ jobs });
  } catch (err) {
    next(err);
  }
};

export const createJob = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = jobSchema.parse(req.body);
    const recruiterId = (req.user as any)?.id;

    // Verify ownership of company
    const company = await prisma.company.findUnique({
      where: { id: data.company_id },
    });
    if (!company || company.recruiter_id !== recruiterId) {
      return res.status(403).json({ error: "Invalid company" });
    }

    const job = await prisma.job.create({
      data: {
        ...data,
        constraints_json: data.constraints_json as any,
        skills_required: data.skills_required,
      },
    });

    // Enrich response to match spec if needed (Prisma object already has all fields)

    // Invalidate recruiter signals cache and jobs list
    await deleteCache(`signals_${recruiterId}`);
    await deleteCache(`jobs_${recruiterId}`);

    res.json(job);
  } catch (err) {
    next(err);
  }
};

export const getRecruiterFeed = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req.user as any)?.id;
    const cacheKey = `recruiter_feed_${userId}`;

    const cachedFeed = await getCache(cacheKey);
    if (cachedFeed) return res.json({ candidates: cachedFeed });

    // Parallelize fetching active jobs and existing swipes
    const [myJobs, mySwipedCandidateIds] = await Promise.all([
      prisma.job.findMany({
        where: { company: { recruiter_id: userId }, active: true },
        select: { id: true, constraints_json: true, skills_required: true },
      }),
      prisma.swipe
        .findMany({
          where: { user_id: userId },
          select: { target_user_id: true },
        })
        .then((swipes) => new Set(swipes.map((s) => s.target_user_id))),
    ]);

    if (myJobs.length === 0) return res.json({ candidates: [] });

    // DB-level filtering: Find candidates who haven't been swiped by this recruiter yet
    // This is significantly faster than fetching all candidates and filtering in memory
    const candidates = await prisma.user.findMany({
      where: {
        role: "candidate",
        id: {
          notIn: Array.from(mySwipedCandidateIds).filter(
            (id): id is string => id !== null,
          ),
        },
      },
      include: { skills: true },
      take: 40, // Fetch a manageable batch for high-speed scoring
    });

    const feed = [];
    for (const candidate of candidates) {
      const userConstraints =
        (candidate.constraints_json as Record<string, any>) || {};
      const candidateSkillNames = new Set(
        candidate.skills.map((s) => s.name.toLowerCase()),
      );

      for (const job of myJobs) {
        // 1. Constraint check
        const jobConstraints =
          (job.constraints_json as Record<string, any>) || {};
        let mismatch = false;

        for (const key in userConstraints) {
          if (
            jobConstraints[key] !== undefined &&
            jobConstraints[key] !== userConstraints[key]
          ) {
            mismatch = true;
            break;
          }
        }
        if (mismatch) continue;

        // 2. Skill check (At least one skill should match)
        if (job.skills_required.length > 0) {
          const hasSkillMatch = job.skills_required.some((skill) =>
            candidateSkillNames.has(skill.toLowerCase()),
          );
          if (!hasSkillMatch) continue;
        }

        feed.push({
          candidate_id: candidate.id,
          intent_text: candidate.intent_text,
          skills: candidate.skills,
          relevant_job_id: job.id,
        });
        // Break after first relevant job to keep feed unique per candidate
        break;
      }
    }

    await setCache(cacheKey, feed, 60); // Cache feed for 60 seconds

    res.json({ candidates: feed });
  } catch (err) {
    next(err);
  }
};

export const getSignalsOfInterest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const recruiterId = (req.user as any)?.id;
    const cacheKey = `signals_${recruiterId}`;

    const cachedSignals = await getCache(cacheKey);
    if (cachedSignals)
      return res.json({ signals: cachedSignals, is_cached: true });

    // 1. Get my active jobs
    const myJobs = await prisma.job.findMany({
      where: { company: { recruiter_id: recruiterId }, active: true },
      select: { id: true, problem_statement: true },
    });

    if (myJobs.length === 0) return res.json({ signals: [] });
    const myJobIds = myJobs.map((j) => j.id);

    // 2. Find Candidates who swiped RIGHT on my jobs
    // Use optimized query structure with only necessary fields
    const incomingSwipes = await prisma.swipe.findMany({
      where: {
        job_id: { in: myJobIds },
        direction: "right",
        user: {
          swipes_received: {
            none: {
              user_id: recruiterId,
              job_id: { in: myJobIds },
            },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            intent_text: true,
            skills: true,
          },
        },
        job: {
          select: {
            id: true,
            problem_statement: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    const signals = incomingSwipes.map((s) => ({
      signal_id: s.id,
      candidate_id: s.user_id,
      intent_text: s.user.intent_text,
      skills: s.user.skills,
      job_id: s.job_id,
      job_problem: s.job.problem_statement,
      received_at: s.created_at,
    }));

    // Cache recruiter signals for 30 seconds to keep it snappy but fresh
    await setCache(cacheKey, signals, 30);

    res.json({ signals, is_cached: false });
  } catch (err) {
    next(err);
  }
};

export const recruiterSwipe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schema = z.object({
      job_id: z.string(),
      target_user_id: z.string(),
      direction: z.enum(["left", "right"]),
    });
    const { job_id, target_user_id, direction } = schema.parse(req.body);
    const candidate_id = target_user_id;
    const userId = (req.user as any)?.id; // Recruiter

    let matchCreated = false;
    let matchDetails: any = null;

    await prisma.$transaction(async (tx) => {
      await tx.swipe.create({
        data: {
          user_id: userId,
          job_id,
          target_user_id: candidate_id,
          direction,
        } as any,
      });

      if (direction === "right") {
        // Check match (Candidate swiped Job?)
        const reciprocal = await tx.swipe.findFirst({
          where: {
            user_id: candidate_id,
            job_id,
            direction: "right",
          },
        });

        if (reciprocal) {
          matchDetails = await tx.match.create({
            data: {
              candidate_id,
              job_id,
              reveal_status: true,
              explainability_json: { reason: "Mutual match" } as any,
            },
            include: {
              candidate: true,
              job: { include: { company: true } },
            },
          });
          matchCreated = true;
        }
      }
    });

    if (matchCreated && matchDetails) {
      // Async notify
      sendJobOfferEmail({
        candidateEmail: matchDetails.candidate.email,
        candidateName: matchDetails.candidate.name,
        companyName: matchDetails.job.company.name,
        problemStatement: matchDetails.job.problem_statement,
        jobId: matchDetails.job_id,
      }).catch((e) => console.error("Email notify failed", e));
    }

    // Invalidate signals just in case
    await deleteCache(`signals_${userId}`);
    // Invalidate feed to remove the swiped candidate
    await deleteCache(`recruiter_feed_${userId}`);

    res.json({ success: true, is_mutual: matchCreated, match: matchDetails });
  } catch (err) {
    // Handle duplicate swipe error
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res
        .status(400)
        .json({ error: "Already swiped on this candidate for this job" });
    }
    next(err);
  }
};

const jobUpdateSchema = z.object({
  problem_statement: z.string().optional(),
  expectations: z.string().optional(),
  non_negotiables: z.string().optional(),
  deal_breakers: z.string().optional(),
  skills_required: z.array(z.string()).optional(),
  constraints_json: z.record(z.string(), z.any()).optional(),
  active: z.boolean().optional(),
});

export const updateJob = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const userId = (req.user as any)?.id;
    const data = jobUpdateSchema.parse(req.body);

    // Verify ownership
    const job = await prisma.job.findFirst({
      where: { id, company: { recruiter_id: userId } },
    });

    if (!job)
      return res.status(404).json({ error: "Job not found or unauthorized" });

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        ...data,
        constraints_json: data.constraints_json
          ? (data.constraints_json as any)
          : undefined,
        skills_required: data.skills_required,
      },
    });

    // Invalidate caches
    await deleteCache(`signals_${userId}`);
    await deleteCache(`jobs_${userId}`);
    await deleteCache(`recruiter_feed_${userId}`);

    res.json(updatedJob);
  } catch (err) {
    next(err);
  }
};

export const deleteJob = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const userId = (req.user as any)?.id;

    // Verify ownership
    const job = await prisma.job.findFirst({
      where: { id, company: { recruiter_id: userId } },
    });

    if (!job)
      return res.status(404).json({ error: "Job not found or unauthorized" });

    // Hard delete with dependency cleanup
    await prisma.$transaction(async (tx) => {
      // Remove related swipes
      await tx.swipe.deleteMany({
        where: { job_id: id },
      });

      // Remove related matches and their messages
      const matches = await tx.match.findMany({
        where: { job_id: id },
        select: { id: true },
      });
      const matchIds = matches.map((m) => m.id);

      await tx.message.deleteMany({
        where: { match_id: { in: matchIds } },
      });

      await tx.match.deleteMany({
        where: { job_id: id },
      });

      // Finally delete the job
      await tx.job.delete({
        where: { id },
      });
    });

    // Invalidate recruiter signals cache and jobs list
    await deleteCache(`signals_${userId}`);
    await deleteCache(`jobs_${userId}`);

    res.json({
      success: true,
      message: "Job and all associated data deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
