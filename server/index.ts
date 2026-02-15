import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { bootstrapDatabase } from "./bootstrap";
import { startAllCronJobs } from "./cron-jobs";
import { db } from "./db";
import { sql } from "drizzle-orm";

import { csrfCookieMiddleware, csrfProtectionMiddleware } from "./csrf";

const app = express();
const httpServer = createServer(app);

// Fix #41: CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === "production" 
    ? process.env.ALLOWED_ORIGINS?.split(",") || ["https://gapnight.com"]
    : ["http://localhost:5173", "http://localhost:5000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Requested-With"],
  maxAge: 86400,
};
app.use(cors(corsOptions));

// Fix #8: CSRF Protection
app.use(csrfCookieMiddleware);
app.use(csrfProtectionMiddleware);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

import { API_VERSION } from "./config";

// Fix #40: API Version Header Middleware
app.use((req, res, next) => {
  res.setHeader("X-API-Version", API_VERSION);
  next();
});

// Security headers middleware
app.use((req, res, next) => {
  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.stripe.com https://maps.googleapis.com https://accounts.google.com https://www.googleapis.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com; object-src 'none'; base-uri 'self';"
  );
  
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Permissions policy
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  
  // HSTS (only in production)
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  
  // X-XSS-Protection
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  next();
});

app.use(cookieParser());

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    await bootstrapDatabase();
  } catch (err) {
    console.error("Bootstrap failed:", err);
  }
  await registerRoutes(httpServer, app);

  // Fix #42: Health Check Endpoint
  app.get("/health", async (_req, res) => {
    try {
      // Check database connectivity
      await db.execute(sql`SELECT 1`);
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: "connected",
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: "Database connection failed",
      });
    }
  });

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
      
      // Start scheduled jobs in production
      if (process.env.NODE_ENV === "production") {
        startAllCronJobs();
      } else {
        log("Cron jobs disabled in development mode");
      }
    },
  );
})();
