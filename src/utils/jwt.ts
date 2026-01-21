import jwt from 'jsonwebtoken';

const SECRETS = process.env.JWT_SECRET || 'default_secret';

export const generateToken = (payload: object): string => {
  return jwt.sign(payload, SECRETS, { expiresIn: '7d' });
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, SECRETS);
};
