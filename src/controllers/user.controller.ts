import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { z } from 'zod';

const intentSchema = z.object({
  intent_text: z.string(),
  why_text: z.string(),
});

const constraintsSchema = z.object({
  constraints_json: z.record(z.string(), z.any()), // Validate structure more strictly if possible
});

export const updateIntent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { intent_text, why_text } = intentSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user?.id },
      data: { intent_text, why_text },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

export const updateConstraints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { constraints_json } = constraintsSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user?.id },
      data: { constraints_json: constraints_json as any },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
};
