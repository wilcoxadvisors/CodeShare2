import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initDatabase } from "./initDb";
import { errorHandler, notFoundHandler } from "./errorHandling";
import { registerFormRoutes } from "./formRoutes";
import { registerChatRoutes } from "./chatRoutes";
import { registerAIRoutes } from "./aiRoutes";
import { registerAIAnalyticsRoutes } from "./aiAnalyticsRoutes";
import { DatabaseStorage, MemStorage, IStorage } from "./storage";

// Create and export storage instance that will be used by other modules
// Always use DatabaseStorage since we're using the PostgreSQL database
export const storage: IStorage = new DatabaseStorage();

const app = express();
app.use(express.json({
  limit: '10mb',
  // More detailed error handling for JSON parsing errors
  reviver: (key, value) => {
    // Convert ISO 8601 date strings to Date objects
    if (typeof value === 'string' && 
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) {
      return new Date(value);
    }
    return value;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Request logging middleware
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
      
      // For error responses (4xx, 5xx), log more details
      if (res.statusCode >= 400 && capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      // For successful responses, just log a brief summary or status
      else if (capturedJsonResponse) {
        if (typeof capturedJsonResponse === 'object' && capturedJsonResponse !== null) {
          // Just log that there was a response, not the entire payload
          logLine += ` :: Response sent`;
        } else {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
      }

      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Initialize database with default data
    await initDatabase();
    
    // Register API routes
    const server = await registerRoutes(app);
    
    // Register form submission routes
    registerFormRoutes(app);
    
    // Register chat routes
    registerChatRoutes(app);
    
    // Register AI routes
    registerAIRoutes(app);
    
    // Register AI analytics routes with broader data access
    registerAIAnalyticsRoutes(app);

    // importantly set up vite or static serving before 404 handler
    // so frontend routes are properly handled
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    
    // Add 404 handler for unmatched routes *after* frontend routing
    app.use((req, res) => notFoundHandler(req, res));

    // Add global error handler
    app.use(errorHandler);

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`, 'error');
    if (error instanceof Error && error.stack) {
      log(error.stack, 'error');
    }
    process.exit(1);
  }
})();
