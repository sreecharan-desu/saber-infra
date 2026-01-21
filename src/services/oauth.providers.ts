import axios from 'axios';
import { OAuthProfile } from './user.service';

interface TokenResponse {
  access_token: string;
}

// Helper to get env vars safely
const getEnv = (key: string) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
};

export const getGoogleProfile = async (code: string, redirectUri: string): Promise<OAuthProfile> => {
  const clientId = getEnv('GOOGLE_CLIENT_ID');
  const clientSecret = getEnv('GOOGLE_CLIENT_SECRET');

  const { data: tokenData } = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  return {
    provider: 'google',
    id: profile.id,
    email: profile.email,
    displayName: profile.name,
    photos: profile.picture ? [{ value: profile.picture }] : [],
    _raw: profile,
  };
};

export const getGithubProfile = async (code: string, redirectUri: string): Promise<OAuthProfile> => {
  const clientId = getEnv('GITHUB_CLIENT_ID');
  const clientSecret = getEnv('GITHUB_CLIENT_SECRET');

  const { data: tokenData } = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    },
    { headers: { Accept: 'application/json' } }
  );

  const accessToken = tokenData.access_token;
  if (!accessToken) throw new Error('Failed to retrieve GitHub access token');

  const { data: user } = await axios.get('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Fetch email if private
  let email = user.email;
  if (!email) {
    const { data: emails } = await axios.get('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const primary = emails.find((e: any) => e.primary && e.verified);
    if (primary) email = primary.email;
  }

  return {
    provider: 'github',
    id: String(user.id),
    email,
    displayName: user.name || user.login,
    photos: user.avatar_url ? [{ value: user.avatar_url }] : [],
    _raw: user,
  };
};

export const getLinkedinProfile = async (code: string, redirectUri: string): Promise<OAuthProfile> => {
  const clientId = getEnv('LINKEDIN_CLIENT_ID');
  const clientSecret = getEnv('LINKEDIN_CLIENT_SECRET');

  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', redirectUri);
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);

  const { data: tokenData } = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const accessToken = tokenData.access_token;

  // Utilize OIDC userinfo endpoint if possible or standard v2/me
  const { data: user } = await axios.get('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return {
    provider: 'linkedin',
    id: user.sub,
    email: user.email,
    displayName: user.name,
    photos: user.picture ? [{ value: user.picture }] : [],
    _raw: user,
  };
};
