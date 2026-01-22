import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { z } from 'zod';
import * as userService from '../services/user.service';

const intentSchema = z.object({
  intent_text: z.string(),
  why_text: z.string(),
});

// Accept constraints directly in the body, not nested
const constraintsSchema = z.record(z.string(), z.any());

const roleSchema = z.object({
  role: z.enum(['candidate', 'recruiter']),
});

export const updateIntent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { intent_text, why_text } = intentSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: (req.user as any)?.id },
      data: { intent_text, why_text },
      include: { oauth_accounts: true }
    });
    res.json(userService.enrichUserWithOnboarding(user));
  } catch (err) {
    next(err);
  }
};

export const updateConstraints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const constraints_json = constraintsSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: (req.user as any)?.id },
      data: { constraints_json: constraints_json as any },
      include: { oauth_accounts: true }
    });
    res.json(userService.enrichUserWithOnboarding(user));
  } catch (err) {
    next(err);
  }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = roleSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: (req.user as any)?.id },
      data: { role },
      include: { oauth_accounts: true }
    });
    res.json(userService.enrichUserWithOnboarding(user));
  } catch (err) {
    next(err);
  }
};
