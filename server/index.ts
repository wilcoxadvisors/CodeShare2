import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initDatabase } from "./initDb";
import { errorHandler, notFoundHandler } from "./errorHandling";
import { registerFormRoutes } from "./formRoutes";
import { registerChatRoutes } from "./chatRoutes";
import { registerAIRoutes } from "./aiRoutes";
import { registerAIAnalyticsRoutes } from "./aiAnalyticsRoutes";
import { registerBatchUploadRoutes } from "./batchUploadRoutes";
import blogRoutes from "./routes/blogRoutes";
import contentRoutes from "./routes/contentRoutes";
import { registerAIMLRoutes } from "./routes/aiMLRoutes";
import { pool } from "./db";
import { startEntityIdsMonitoring } from "../shared/deprecation-monitor";
import * as fs from 'fs';
import * as path from 'path';

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
    log('Starting server initialization...');
    
    // Initialize database with default data
    log('Starting database initialization...');
    console.log("Initializing DB...");
    try {
      await initDatabase();
      console.log("DB initialization complete.");
      log('✅ Database initialization complete');
    } catch (error) {
      console.error("DB initialization failed:", error);
      log(`❌ Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
    
    // Initialize entity_ids usage monitoring
    log('Starting entity IDs monitoring...');
    startEntityIdsMonitoring();
    log('✅ Entity IDs usage monitoring initialized');
    
    // Ensure uploads directories exist
    log('Creating uploads directories...');
    const uploadsBaseDir = path.join(process.cwd(), 'public', 'uploads');
    const journalEntriesDir = path.join(uploadsBaseDir, 'journal-entries');
    
    // Create directories with recursive option
    if (!fs.existsSync(uploadsBaseDir)) {
      fs.mkdirSync(uploadsBaseDir, { recursive: true });
    }
    if (!fs.existsSync(journalEntriesDir)) {
      fs.mkdirSync(journalEntriesDir, { recursive: true });
    }
    log('✅ Uploads directories created');
    
    // Register API routes
    log('Registering API routes...');
    const server = await registerRoutes(app);
    log('✅ API routes registered');
    
    // Register form submission routes
    log('Registering form routes...');
    registerFormRoutes(app);
    log('✅ Form routes registered');
    
    // Register chat routes
    log('Registering chat routes...');
    registerChatRoutes(app);
    log('✅ Chat routes registered');
    
    // Register AI routes
    log('Registering AI routes...');
    registerAIRoutes(app);
    log('✅ AI routes registered');
    
    // Register AI analytics routes with broader data access
    log('Registering AI analytics routes...');
    registerAIAnalyticsRoutes(app);
    log('✅ AI analytics routes registered');
    
    // Register batch upload routes for optimized CSV imports
    log('Registering batch upload routes...');
    // Create a new storage instance for batch uploads
    const { DatabaseStorage } = await import('./storage');
    const batchStorage = new DatabaseStorage();
    await import('./batchUploadRoutes').then(({ registerBatchUploadRoutes }) => {
      registerBatchUploadRoutes(app, batchStorage);
    });
    log('✅ Batch upload routes registered');
    
    // Register blog routes
    log('Registering blog routes...');
    app.use('/api/blog', blogRoutes);
    log('✅ Blog routes registered');
    
    // Register content routes
    log('Registering content routes...');
    app.use('/api/content', contentRoutes);
    log('✅ Content routes registered');
    
    // Register AI ML routes
    log('Registering AI ML routes...');
    registerAIMLRoutes(app);
    log('✅ AI ML routes registered');

    // importantly set up vite or static serving before 404 handler
    // so frontend routes are properly handled
    log('Setting up frontend serving...');
    if (app.get("env") === "development") {
      await setupVite(app, server);
      log('✅ Vite development server set up');
    } else {
      serveStatic(app);
      log('✅ Static file serving set up');
    }
    
    // Add 404 handler for unmatched routes *after* frontend routing
    log('Adding 404 handler...');
    app.use((req, res) => notFoundHandler(req, res));
    log('✅ 404 handler added');

    // Add global error handler
    log('Adding global error handler...');
    app.use(errorHandler);
    log('✅ Global error handler added');

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    log('Starting HTTP server on port 5000...');
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`✅ Server running successfully on port ${port}`);
    });

    // Setup graceful shutdown to properly close database connections
    const gracefulShutdown = async (signal: string) => {
      log(`Received ${signal}, gracefully shutting down...`);
      
      // Close HTTP server first to stop accepting new connections
      await new Promise<void>((resolve) => {
        server.close(() => {
          log('HTTP server closed');
          resolve();
        });
      });
      
      // Then close all database connections
      try {
        await pool.end();
        log('Database connections closed');
      } catch (err) {
        log(`Error closing database connections: ${err}`, 'error');
      }
      
      log('Shutdown complete');
      process.exit(0);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`, 'error');
    if (error instanceof Error && error.stack) {
      log(error.stack, 'error');
    }
    process.exit(1);
  }
})();
