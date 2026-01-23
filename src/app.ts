import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import passport from "passport";
import { randomUUID } from "crypto";
import { config, validateEnv } from "./config/env";
import { globalLimiter } from "./middleware/rateLimit.middleware";
import logger from "./utils/logger";

dotenv.config();
validateEnv();

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.allowedOrigins,
    credentials: true,
  }),
);

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
