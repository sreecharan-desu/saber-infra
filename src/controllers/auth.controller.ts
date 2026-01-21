import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as oauthProviders from '../services/oauth.providers';
import * as userService from '../services/user.service';
import * as githubDataService from '../services/github.data.service';
import { generateToken } from '../utils/jwt';

import { config } from '../config/env';

const callbackSchema = z.object({
  provider: z.enum(['google', 'github', 'linkedin']),
  code: z.string(),
  redirect_uri: z.string().optional(),
});

export const handleOAuthCallbackGET = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query;
    
    // Redirect to frontend with auth code and state
    return res.redirect(`${config.frontendUrl}?code=${code}${state ? `&state=${state}` : ''}`);
    
  
  } catch (error) {
    next(error);
  }
};

export const handleOAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider, code, redirect_uri } = callbackSchema.parse(req.body);
    const redirectUri = redirect_uri || `${config.baseUrl}/api/auth/oauth/callback`; 

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
    
    // Trigger GitHub data extraction in background if available
    if (provider === 'github' && profile.accessToken) {
      githubDataService.extractAndStoreGithubData(user.id, profile.accessToken);
    }

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
    const redirectUri = redirect_uri || `${config.baseUrl}/api/auth/oauth/callback`;

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

    await userService.linkOAuthCloudAccount((req.user as any)?.id, profile);
    
    // Trigger GitHub data extraction in background if available
    if (provider === 'github' && profile.accessToken) {
      githubDataService.extractAndStoreGithubData((req.user as any).id, profile.accessToken);
    }
    
    res.json({ status: 'ok', message: 'Provider linked successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response) => {
  res.json(req.user);
};
