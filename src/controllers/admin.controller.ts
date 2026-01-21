import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

export const getMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const totalSwipes = await prisma.swipe.count();
        const totalMatches = await prisma.match.count();
        // Calculate ratio
        const ratio = totalSwipes > 0 ? totalMatches / totalSwipes : 0;

        res.json({
            swipes: totalSwipes,
            matches: totalMatches,
            ratio
        });
    } catch (err) {
        next(err);
    }
};

export const rotateAIKeys = async (req: Request, res: Response, next: NextFunction) => {
    // "POST /admin/ai/keys Admin-only."
    // In reality this would update a DB record or Secret Manager.
    // Here we can just mock the response or update env if we had access (we don't persist env write at runtime usually).
    // Let's just return a stub success.
    res.json({ message: "Key rotation initiated (Mock)" });
};
