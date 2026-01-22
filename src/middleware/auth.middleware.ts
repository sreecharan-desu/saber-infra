import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import prisma from '../config/prisma';

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>

    try {
      const payload = verifyToken(token);
      if (!payload || !payload.id) {
        return res.status(403).json({ error: 'Invalid token payload' });
      }

      const user = await prisma.user.findUnique({ where: { id: payload.id } });
      if (!user) {
        return res.status(403).json({ error: 'User not found' });
      }

      req.user = user;
      next();
    } catch (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
  } else {
    res.status(401).json({ error: 'Authorization header required' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export const requireAIKey = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('X-API-KEY');

  if (!apiKey) {
      return res.status(401).json({ error: 'X-API-KEY header required' });
  }

  // 1. Check Bootstrap/Env Key (Fast path for legacy/cron)
  if (apiKey === process.env.AI_INTERNAL_API_KEY) {
      return next();
  }

  // 2. Check Database Keys (Production rotation path)
  try {
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
      
      const keyRecord = await prisma.apiKey.findFirst({
          where: { 
              keyHash: hash,
              isActive: true
          }
      });

      if (keyRecord) {
          // Update last used asynchronously (don't block response)
          prisma.apiKey.update({
              where: { id: keyRecord.id },
              data: { lastUsed: new Date() }
          }).catch(err => console.error('Failed to update api key usage', err));
          
          return next();
      }
      
      return res.status(403).json({ error: 'Invalid AI API Key' });

  } catch (err) {
      console.error('API Key validation error', err);
      return res.status(500).json({ error: 'Internal Server Error during auth' });
  }
};
