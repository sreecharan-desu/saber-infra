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
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export const requireAIKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('X-API-KEY');
  if (apiKey === process.env.AI_INTERNAL_API_KEY) {
    next();
  } else {
    res.status(403).json({ error: 'Invalid AI API Key' });
  }
};
