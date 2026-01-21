import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as oauthProviders from '../services/oauth.providers';
import * as userService from '../services/user.service';
import { generateToken } from '../utils/jwt';

const callbackSchema = z.object({
  provider: z.enum(['google', 'github', 'linkedin']),
  code: z.string(),
  redirect_uri: z.string().optional(),
});

export const handleOAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider, code, redirect_uri } = callbackSchema.parse(req.body);
    const redirectUri = redirect_uri || process.env.BASE_URL + '/auth/callback'; // Fallback

    let profile;
    switch (provider) {
      case 'google':
        profile = await oauthProviders.getGoogleProfile(code, redirectUri);
        break;
      case 'github':
        profile = await oauthProviders.getGithubProfile(code, redirectUri);
        break;
      case 'linkedin':
        profile = await oauthProviders.getLinkedinProfile(code, redirectUri);
        break;
      default:
        throw new Error('Invalid provider');
    }

    const user = await userService.findOrCreateUserConfirmingIdentity(profile);
    const token = generateToken({ id: user.id, role: user.role });

    res.json({ token, user });
  } catch (error) {
    next(error);
  }
};

export const linkProvider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { provider, code, redirect_uri } = callbackSchema.parse(req.body);
    const redirectUri = redirect_uri || process.env.BASE_URL + '/auth/callback';

    let profile;
    switch (provider) {
      case 'google':
        profile = await oauthProviders.getGoogleProfile(code, redirectUri);
        break;
      case 'github':
        profile = await oauthProviders.getGithubProfile(code, redirectUri);
        break;
      case 'linkedin':
        profile = await oauthProviders.getLinkedinProfile(code, redirectUri);
        break;
        default:
          throw new Error('Invalid provider');
    }

    await userService.linkOAuthCloudAccount(req.user.id, profile);
    
    // Return updated user?
    res.json({ status: 'ok', message: 'Provider linked successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response) => {
  res.json(req.user);
};
