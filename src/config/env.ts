import dotenv from "dotenv";
dotenv.config();

const requiredEnv = [
  "DATABASE_URL",
  "JWT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
  "BASE_URL",
  "AI_INTERNAL_API_KEY",
];

export const validateEnv = () => {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      "CRITICAL: Missing required environment variables:",
      missing.join(", "),
    );
    process.exit(1);
  }
};

export const config = {
  port: process.env.PORT || 3000,
  baseUrl: process.env.BASE_URL || "http://localhost:3000",
  // Support comma-separated origins for CORS
  allowedOrigins: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",")
    : ["http://localhost:5173"],
  // Specific URLs for links
  candidateFrontendUrl:
    process.env.CANDIDATE_FRONTEND_URL ||
    process.env.FRONTEND_URL?.split(",")[0] ||
    "http://localhost:5173",
  recruiterFrontendUrl:
    process.env.RECRUITER_FRONTEND_URL ||
    process.env.FRONTEND_URL?.split(",")[0] ||
    "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET as string,
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID as string,
    clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID as string,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET as string,
  },
};
