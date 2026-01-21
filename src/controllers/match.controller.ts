import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { z } from 'zod';

const messageSchema = z.object({
  match_id: z.string(),
  content: z.string(),
});

export const getMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { candidate_id: userId },
          // For recruiter, we need to check if they own the job in the match
          { job: { company: { recruiter_id: userId } } }, 
        ]
      },
      include: {
        job: {
            include: { company: true }
        }, 
        candidate: {
            select: { name: true, photo_url: true, intent_text: true, skills: true }
        },
        messages: {
            orderBy: { created_at: 'desc' },
            take: 1
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Clean up response based on role? 
    // If Match is revealed, show full info.
    res.json(matches);
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { match_id, content } = messageSchema.parse(req.body);
        const userId = req.user!.id;

        // Verify participation
        const match = await prisma.match.findUnique({
            where: { id: match_id },
            include: { job: { include: { company: true } } }
        });

        if (!match) return res.status(404).json({error: "Match not found"});

        const isCandidate = match.candidate_id === userId;
        const isRecruiter = match.job.company.recruiter_id === userId;

        if (!isCandidate && !isRecruiter) {
            return res.status(403).json({error: "Not a participant"});
        }

        const message = await prisma.message.create({
            data: {
                match_id,
                sender_id: userId,
                content
            }
        });

        res.json(message);
    } catch (err) {
        next(err);
    }
};
