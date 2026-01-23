import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import * as userService from '../services/user.service';

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

export const createCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, website } = companySchema.parse(req.body);
        const recruiterId = (req.user as any)?.id;
        
        const company = await prisma.company.create({
            data: {
                name,
                website,
                recruiter_id: recruiterId
            }
        });
        
        // Fetch updated user with oauth_accounts to enrich with new company_id
        const updatedUser = await prisma.user.findUniqueOrThrow({
            where: { id: recruiterId },
            include: { oauth_accounts: true }
        });
        
        const enrichedUser = await userService.enrichUserWithOnboarding(updatedUser);
        
        res.json({ 
            company: { ...company, company_id: company.id },
            user: enrichedUser
        });
    } catch (err) {
        next(err);
    }
};

export const getMyCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recruiterId = (req.user as any)?.id;
        const company = await prisma.company.findFirst({
            where: { recruiter_id: recruiterId }
        });
        res.json({ company });
    } catch (err) {
        next(err);
    }
};

export const getMyJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recruiterId = (req.user as any)?.id;
        const jobs = await prisma.job.findMany({
            where: { company: { recruiter_id: recruiterId } },
            include: { company: true }
        });
        res.json({ jobs });
    } catch (err) {
        next(err);
    }
};

export const createJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = jobSchema.parse(req.body);
        const recruiterId = (req.user as any)?.id;

        // Verify ownership of company
        const company = await prisma.company.findUnique({ where: { id: data.company_id } });
        if (!company || company.recruiter_id !== recruiterId) {
            return res.status(403).json({ error: "Invalid company" });
        }

        const job = await prisma.job.create({
            data: {
                ...data,
                constraints_json: data.constraints_json as any,
                skills_required: data.skills_required
            }
        });

        res.json(job);
    } catch (err) {
        next(err);
    }
};

export const getRecruiterFeed = async (req: Request, res: Response, next: NextFunction) => {
    // Show candidates who match my jobs
    // "Recruiter feed shows: Candidate intent, Skills, Constraints"
    // Does Recruiter Swipe? Yes. "A recruiter is ... swiping on a candidate’s intent summary"
    
    // Logic: Find Candidates who satisfy Job Constraints.
    // For which Job? The recruiter might have multiple. 
    // Ideally, pass ?job_id query param or show feed mixed? 
    // Let's assume per-job feed or mixed. Simple: Recruiter selects a job to recruit for.
    // Spec says: "Recruiter feed shows..." imply generic feed? Or maybe per job context.
    // Let's require job_id param for clarity, or just fetch all relevant candidates for all active jobs.
    
    // Implementation: Candidates that are relevant to ANY of my active jobs and haven't been swiped yet.

   try {
       const userId = (req.user as any)?.id;
       
       const myJobs = await prisma.job.findMany({
           where: { company: { recruiter_id: userId }, active: true },
           select: { id: true, constraints_json: true, skills_required: true }
       });
       
       if (myJobs.length === 0) return res.json({ candidates: [] });
       
       const myJobIds = myJobs.map(j => j.id);

       // Fetch candidates
       const candidates = await prisma.user.findMany({
           where: { role: 'candidate' },
           include: { skills: true }
       });

       // Fetch my swipes to filter out
       const mySwipes = await prisma.swipe.findMany({
           where: { user_id: userId, job_id: { in: myJobIds } },
           select: { job_id: true, target_user_id: true } as any
       });
       
       const swipedKeys = new Set(mySwipes.map((s: any) => `${s.job_id}:${s.target_user_id}`));

       const feed = [];
       for (const candidate of candidates) {
            const userConstraints = (candidate.constraints_json as Record<string, any>) || {};

            for (const job of myJobs) {
                 if (swipedKeys.has(`${job.id}:${candidate.id}`)) continue;

                 // Hard Constraints Check: Job vs Candidate
                 const jobConstraints = (job.constraints_json as Record<string, any>) || {};
                 let mismatch = false;
                 
                 // If seeker has constraint X, job must satisfy X.
                 for (const key in userConstraints) {
                     if (jobConstraints[key] !== undefined && jobConstraints[key] !== userConstraints[key]) {
                         mismatch = true;
                         break;
                     }
                 }
                 if (mismatch) continue;

                 feed.push({
                     candidate_id: candidate.id,
                     intent_text: candidate.intent_text,
                     skills: candidate.skills,
                     relevant_job_id: job.id
                 });
            }
       }
       
       res.json({ candidates: feed.slice(0, 50) });
   } catch(err) {
       next(err);
   }
};

export const recruiterSwipe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const schema = z.object({
            job_id: z.string(),
            target_user_id: z.string(),
            direction: z.enum(['left', 'right'])
        });
        const { job_id, target_user_id, direction } = schema.parse(req.body);
        const candidate_id = target_user_id;
        const userId = (req.user as any)?.id; // Recruiter

        await prisma.$transaction(async (tx) => {
             await tx.swipe.create({
                 data: {
                     user_id: userId,
                     job_id,
                     target_user_id: candidate_id,
                     direction
                 } as any
             });

             if (direction === 'right') {
                 // Check match (Candidate swiped Job?)
                 const reciprocal = await tx.swipe.findFirst({
                     where: {
                         user_id: candidate_id,
                         job_id,
                         direction: 'right'
                     }
                 });

                 if (reciprocal) {
                      await tx.match.create({
                         data: {
                             candidate_id,
                             job_id,
                             reveal_status: true,
                             explainability_json: { reason: "Mutual match" } as any
                         }
                     });
                     // Notify
                 }
             }
        });
        
        res.json({ success: true });
    } catch(err) {
        // Handle duplicate swipe error
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            return res.status(400).json({ error: 'Already swiped on this candidate for this job' });
        }
        next(err);
    }
}
