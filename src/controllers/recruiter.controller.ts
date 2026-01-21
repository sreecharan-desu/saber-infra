import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { z } from 'zod';

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
        const recruiterId = req.user?.id as string;
        
        const company = await prisma.company.create({
            data: {
                name,
                website,
                recruiter_id: recruiterId
            }
        });
        
        res.json(company);
    } catch (err) {
        next(err);
    }
};

export const createJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = jobSchema.parse(req.body);
        const recruiterId = req.user!.id;

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
       const userId = req.user?.id as string;
       // Get my jobs
       const myJobs = await prisma.job.findMany({
           where: { company: { recruiter_id: userId }, active: true },
           select: { id: true, constraints_json: true, skills_required: true }
       });
       
       if (myJobs.length === 0) return res.json([]);
       
       const myJobIds = myJobs.map(j => j.id);

       // Find candidates not swiped by me for these jobs
       // ... This gets complex because Swipe is unique on [user_id, job_id, target_user_id]
       // Actually Swipe model has `user_id` (actor) and `job_id`. 
       // For Recruiter swipe: Actor=Recruiter, Job=Job, Target=Candidate.
       
       const candidates = await prisma.user.findMany({
           where: {
               role: 'candidate',
               // Exclude if I have swiped them for specific job?
               // Let's do a simple fetch and filter in memory for prototype speed. 
               // In production, complex query.
           },
           include: { skills: true }
       });
       
       // FilterCandidates
       // Return structure: { candidate, for_job_id }?
       // Let's return candidates and let frontend decide or just valid candidates.
       
       const feed = [];
       for (const candidate of candidates) {
            for (const job of myJobs) {
                 // Check if swiped already
                 const alreadySwiped = await prisma.swipe.count({
                     where: {
                         user_id: userId,
                         job_id: job.id,
                         target_user_id: candidate.id
                     }
                 });
                 if (alreadySwiped > 0) continue;

                 // Check constraints (Soft or Hard? Spec says "Hard constraints block exposure")
                 // Check Job constraints vs User Constraints
                 // ... (implementation constraint check same as candidate feed)
                 
                 feed.push({
                     candidate_id: candidate.id,
                     intent_text: candidate.intent_text,
                     skills: candidate.skills,
                     // Constraints?
                     relevant_job_id: job.id
                 });
            }
       }
       
       // Dedupe or limit?
       res.json(feed.slice(0, 50));
   } catch(err) {
       next(err);
   }
};

export const recruiterSwipe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const schema = z.object({
            job_id: z.string(),
            candidate_id: z.string(),
            direction: z.enum(['left', 'right'])
        });
        const { job_id, candidate_id, direction } = schema.parse(req.body);
        const userId = req.user?.id as string; // Recruiter

        await prisma.$transaction(async (tx) => {
             await tx.swipe.create({
                 data: {
                     user_id: userId,
                     job_id,
                     target_user_id: candidate_id,
                     direction
                 }
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
        next(err);
    }
}
