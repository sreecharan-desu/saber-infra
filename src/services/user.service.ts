import prisma from '../config/prisma';
import { UserRole, Prisma } from '@prisma/client';

export interface OAuthProfile {
  provider: string;
  id: string;
  email: string | null;
  displayName: string;
  photos?: { value: string }[];
  accessToken?: string; // Added to facilitate data extraction
  _raw?: string | object;
}

export const findOrCreateUserConfirmingIdentity = async (profile: OAuthProfile) => {
  // 1. Try to find by OAuthAccount
  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_provider_user_id: {
        provider: profile.provider,
        provider_user_id: profile.id,
      },
    },
    include: { 
      user: {
        include: { oauth_accounts: true }
      }
    },
  });

  if (existingAccount) {
    return existingAccount.user;
  }

  // 2. If no account, check if email exists (implicit linking if trusted email?)
  // Prompt says "Trust OAuth providers fully".
  // If email matches, we should probably link to that user to avoid duplicates?
  // Let's assume yes because "Trust OAuth providers fully".
  
  if (profile.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
      include: { oauth_accounts: true },
    });

    if (existingUser) {
      // Create OAuthAccount and link
      await prisma.oAuthAccount.create({
        data: {
          user_id: existingUser.id,
          provider: profile.provider,
          provider_user_id: profile.id,
          raw_data_json: profile._raw ? (typeof profile._raw === 'string' ? JSON.parse(profile._raw) : profile._raw) : {},
        },
      });
      return prisma.user.findUniqueOrThrow({
        where: { id: existingUser.id },
        include: { oauth_accounts: true }
      });
    }
  }

  // 3. Create new user
  // "Assign role = candidate by default"
  // "Create user immediately"
  
  // Handle case where email is null (GitHub can hide email). 
  // Schema says email is String and @unique. We MUST have an email.
  // If email is null, we can't create a user easily or need a placeholder.
  // For now, assume email is present or fail.
  
  if (!profile.email) {
    throw new Error('Email is required from OAuth provider to create an account.');
  }

  const newUser = await prisma.user.create({
    data: {
      email: profile.email,
      name: profile.displayName || profile.email.split('@')[0],
      photo_url: profile.photos?.[0]?.value,
      role: UserRole.candidate,
      oauth_accounts: {
        create: {
          provider: profile.provider,
          provider_user_id: profile.id,
          raw_data_json: profile._raw ? (typeof profile._raw === 'string' ? JSON.parse(profile._raw) : profile._raw) : {},
        },
      },
    },
    include: { oauth_accounts: true },
  });

  return newUser;
};

export const linkOAuthCloudAccount = async (userId: string, profile: OAuthProfile) => {
  // Check if account already used
  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_provider_user_id: {
        provider: profile.provider,
        provider_user_id: profile.id,
      },
    },
  });

  if (existingAccount) {
    if (existingAccount.user_id === userId) return; // already linked
    throw new Error('This account is already linked to another user.');
  }

  await prisma.oAuthAccount.create({
    data: {
      user_id: userId,
      provider: profile.provider,
      provider_user_id: profile.id,
      raw_data_json: profile._raw ? (typeof profile._raw === 'string' ? JSON.parse(profile._raw) : profile._raw) : {},
    },
  });
};

export const enrichUserWithOnboarding = (user: any) => {
  if (!user) return user;
  
  const accounts = user.oauth_accounts || [];
  const hasGithub = accounts.some((acc: any) => acc.provider === 'github');
  const hasLinkedin = accounts.some((acc: any) => acc.provider === 'linkedin');
  
  // onboarding is true if either GitHub or LinkedIn is missing
  const onboarding = !hasGithub || !hasLinkedin;
  
  return { ...user, onboarding };
};
