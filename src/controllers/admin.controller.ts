import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import logger from '../utils/logger';
import { randomUUID, createHash } from 'crypto';

import { getCache, setCache } from '../utils/cache';

export const getMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cacheKey = 'admin_metrics_global';
        const cachedData = await getCache(cacheKey);
        
        if (cachedData) {
            return res.json(cachedData);
        }

        const [totalSwipes, totalMatches, activeJobs, activeCandidates] = await Promise.all([
            prisma.swipe.count(),
            prisma.match.count(),
            prisma.job.count({ where: { active: true } }),
            prisma.user.count({ where: { role: 'candidate' } })
        ]);

        const matchRate = totalSwipes > 0 ? (totalMatches / totalSwipes) * 100 : 0;
        const metrics = {
            overview: {
                total_swipes: totalSwipes,
                total_matches: totalMatches,
                match_rate: `${matchRate.toFixed(2)}%`,
                active_jobs: activeJobs,
                active_candidates: activeCandidates
            },
            timestamp: new Date().toISOString(),
            is_cached: false
        };

        // Cache for 5 minutes
        await setCache(cacheKey, { ...metrics, is_cached: true }, 300);

        res.json(metrics);
    } catch (err) {
        next(err);
    }
};

export const rotateAIKeys = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const newKey = `ai_sk_${randomUUID().replace(/-/g, '')}`; // Structured key format
        const hash = createHash('sha256').update(newKey).digest('hex');
        
        const requesterId = (req.user as any)?.id || 'unknown';

        // 1. Persist new key
        await prisma.apiKey.create({
            data: {
                keyHash: hash,
                name: `Rotated by Admin ${requesterId}`,
                isActive: true
            }
        });

        logger.warn(`Security: New AI API Key generated and activated by Admin ${requesterId}`);

        // 2. Return to Admin (One-time view)
        res.json({
            status: 'success',
            message: 'New AI API Key generated and active. Store this key securely; it will not be shown again.',
            new_key: newKey,
            generated_at: new Date().toISOString(),
            note: 'This key is immediately valid for API access. You may now update your cron jobs.'
        });
    } catch (err) {
        next(err);
    }
};
