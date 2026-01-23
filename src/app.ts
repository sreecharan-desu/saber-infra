import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import passport from "passport";
import { randomUUID } from "crypto";
import cookieParser from "cookie-parser";
import { config, validateEnv } from "./config/env";
import { globalLimiter } from "./middleware/rateLimit.middleware";
import logger from "./utils/logger";

dotenv.config();
validateEnv();

const app = express();

// Middleware
app.use(helmet());
app.use(cookieParser());
app.use(
  cors({
    origin: config.allowedOrigins,
    credentials: true,
  }),
);

// Origin Memory Middleware
// Remembers where the user "came from" for OAuth redirects
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.get("origin");
  const referer = req.get("referer");
  const potentialOrigin = origin || (referer ? new URL(referer).origin : null);

  if (potentialOrigin && config.allowedOrigins.includes(potentialOrigin)) {
    res.cookie("saber_origin", potentialOrigin, {
      maxAge: 3600000, // 1 hour
      httpOnly: true,
      secure: true, // true for cross-site cookie in Chrome
      sameSite: "none", // Required for cross-domain cookie
    });
  }
  next();
});

// Request ID Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers["x-request-id"] = req.headers["x-request-id"] || randomUUID();
  next();
});

// Logging
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);

// Global Rate Limiting
app.use(globalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport initialization
app.use(passport.initialize());

// Root route
app.get("/", (req: Request, res: Response) => {
  res.send("Hello World");
});

// Health Check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

import routes from "./routes";

app.use("/", routes);

// Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.stack || err.message, {
    requestId: req.headers["x-request-id"],
    url: req.url,
    method: req.method,
  });

  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      status: err.status || 500,
    },
  });
});

export default app;
