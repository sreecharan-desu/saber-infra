import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as oauthProviders from "../services/oauth.providers";
import * as userService from "../services/user.service";
import * as githubDataService from "../services/github.data.service";
import * as linkedinDataService from "../services/linkedin.data.service";
import { generateToken } from "../utils/jwt";
import prisma from "../config/prisma";

import { config } from "../config/env";

const callbackSchema = z.object({
  provider: z.enum(["google", "github", "linkedin"]),
  code: z.string(),
  redirect_uri: z.string().optional(),
});

export const handleOAuthCallbackGET = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { code, state } = req.query;

    // Determine target frontend
    // 1. Check for origin memory cookie (Set by middleware in app.ts)
    // 2. Fallback to state-based detection
    // 3. Absolute fallback to candidate production URL
    let targetFrontend =
      req.cookies?.saber_origin || config.candidateFrontendUrl;

    if (state && typeof state === "string") {
      let extractedOrigin: string | null = null;

      // Try to extract origin from "provider:origin" format
      if (state.includes(":http")) {
        const parts = state.split(":http");
        extractedOrigin = "http" + parts[parts.length - 1];
      } else {
        try {
          const stateUrl = new URL(state);
          extractedOrigin = stateUrl.origin;
        } catch (e) {
          // Not a URL
        }
      }

      // If valid origin extracted from state, it overrides the cookie
      if (extractedOrigin && config.allowedOrigins.includes(extractedOrigin)) {
        targetFrontend = extractedOrigin;
      }
      // Or if keyword based fallback
      else if (state.toLowerCase().includes("recruiter")) {
        targetFrontend = config.recruiterFrontendUrl;
      }
    }

    // Redirect to frontend with auth code and state
    return res.redirect(
      `${targetFrontend}/auth/callback?code=${code}${state ? `&state=${state}` : ""}`,
    );
  } catch (error) {
    next(error);
  }
};

export const handleOAuthCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { provider, code, redirect_uri } = callbackSchema.parse(req.body);
    const redirectUri =
      redirect_uri || `${config.baseUrl}/api/auth/oauth/callback`;

    let profile;
    switch (provider) {
      case "google":
        profile = await oauthProviders.getGoogleProfile(code, redirectUri);
        break;
      case "github":
        profile = await oauthProviders.getGithubProfile(code, redirectUri);
        break;
      case "linkedin":
        profile = await oauthProviders.getLinkedinProfile(code, redirectUri);
        break;
      default:
        throw new Error("Invalid provider");
    }

    const user = await userService.findOrCreateUserConfirmingIdentity(profile);

    // Check for hardcoded admin email - THIS IS A SIMPLE OVERRIDE
    if (user.email === "admin@saber.so" && user.role !== "admin") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "admin" },
      });
      user.role = "admin";
    }

    // Trigger GitHub data extraction in background if available
    if (provider === "github" && profile.accessToken) {
      githubDataService.extractAndStoreGithubData(user.id, profile.accessToken);
    }
    if (provider === "linkedin" && profile.accessToken) {
      linkedinDataService.extractAndStoreLinkedinData(
        user.id,
        profile.accessToken,
        profile._raw,
      );
    }

    // Re-fetch to ensure all linked accounts are captured for the frontend
    const finalUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { oauth_accounts: true },
    });

    const token = generateToken({ id: finalUser.id, role: finalUser.role });

    res.json({
      token,
      user: await userService.enrichUserWithOnboarding(finalUser),
    });
  } catch (error) {
    next(error);
  }
};

export const linkProvider = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { provider, code, redirect_uri } = callbackSchema.parse(req.body);
    const redirectUri =
      redirect_uri || `${config.baseUrl}/api/auth/oauth/callback`;

    let profile;
    switch (provider) {
      case "google":
        profile = await oauthProviders.getGoogleProfile(code, redirectUri);
        break;
      case "github":
        profile = await oauthProviders.getGithubProfile(code, redirectUri);
        break;
      case "linkedin":
        profile = await oauthProviders.getLinkedinProfile(code, redirectUri);
        break;
      default:
        throw new Error("Invalid provider");
    }

    await userService.linkOAuthCloudAccount((req.user as any)?.id, profile);

    // Trigger GitHub data extraction in background if available
    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: { id: (req.user as any).id },
      include: { oauth_accounts: true },
    });

    // Trigger extraction in background
    if (provider === "github" && profile.accessToken) {
      githubDataService.extractAndStoreGithubData(
        updatedUser.id,
        profile.accessToken,
      );
    }
    if (provider === "linkedin" && profile.accessToken) {
      linkedinDataService.extractAndStoreLinkedinData(
        updatedUser.id,
        profile.accessToken,
        profile._raw,
      );
    }

    res.json({
      status: "ok",
      message: "Provider linked successfully",
      user: await userService.enrichUserWithOnboarding(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};

import { getCache, setCache } from "../utils/cache";

export const getMe = async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const cacheKey = `user_profile_${userId}`;

  const cached = await getCache(cacheKey);
  if (cached) return res.json(cached);

  // Re-fetch to ensure oauth_accounts and other links are fresh
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { oauth_accounts: true },
  });

  const enriched = await userService.enrichUserWithOnboarding(user);
  await setCache(cacheKey, enriched, 60);

  res.json(enriched);
};
