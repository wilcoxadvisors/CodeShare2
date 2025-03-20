import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertEntitySchema, 
  insertAccountSchema, 
  insertJournalEntrySchema, 
  insertJournalEntryLineSchema,
  JournalEntryStatus
} from "@shared/schema";
import { registerAccountRoutes } from "./accountRoutes";
import { 
  enhancedUserSchema,
  enhancedEntitySchema,
  journalEntryWithLinesSchema,
  validateRequest 
} from "@shared/validation";
import { registerAIRoutes } from "./aiRoutes";
import { registerBudgetRoutes } from "./budgetRoutes";
import { registerForecastRoutes } from "./forecastRoutes";
import { 
  asyncHandler, 
  throwBadRequest, 
  throwNotFound, 
  throwForbidden, 
  throwUnauthorized,
  HttpStatus 
} from "./errorHandling";

interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Public routes for checking API availability - must be defined before auth middleware
  app.post("/api/public/check-api", (req, res) => {
    try {
      const { api } = req.body;
      
      if (!api || typeof api !== 'string') {
        return res.status(400).json({ message: 'Invalid API name provided' });
      }
      
      // Whitelist of APIs that can be publicly checked
      const allowedApis = ['XAI_API_KEY', 'OPENAI_API_KEY'];
      
      if (!allowedApis.includes(api)) {
        return res.status(403).json({ message: 'Not allowed to check this API' });
      }
      
      // Check if the API key exists in the environment
      const exists = !!process.env[api];
      
      // Return existence flag but NEVER the actual value
      return res.json({ exists });
    } catch (error) {
      console.error('Error checking API availability:', error);
      return res.status(500).json({ message: 'Failed to check API availability' });
    }
  });

  // Import memorystore dynamically with ESM syntax
  const MemoryStore = (await import("memorystore")).default(session);
  
  // Set up session middleware
  app.use(
    session({
      cookie: { maxAge: 86400000 }, // 24 hours
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || "wilcox-accounting-secret",
    })
  );
  
  // Set up passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // Use bcrypt to compare the password with the hash
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (isMatch) {
          return done(null, {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
          });
        }
        
        return done(null, false, { message: "Invalid username or password" });
      } catch (error) {
        return done(error);
      }
    })
  );
  
  // Serialize user to the session
  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as AuthUser).id);
  });
  
  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      
      done(null, {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      done(error);
    }
  });
  
  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };
  
  // Role-based authorization middleware
  const hasRole = (role: string) => (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if ((req.user as AuthUser).role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    next();
  };
  
  // API routes
  
  // Authentication routes
  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    res.json({ user: req.user });
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  app.get("/api/auth/me", isAuthenticated, (req, res) => {
    res.json({ user: req.user });
  });
  
  // User routes
  app.get("/api/users", isAuthenticated, hasRole("admin"), async (req, res) => {
    try {
      const users = await Promise.all(
        (await storage.getEntities()).map(async (user) => {
          // Exclude password
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        })
      );
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Entity routes
  app.get("/api/entities", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as AuthUser).id;
      const entities = await storage.getEntitiesByUser(userId);
      res.json(entities);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/entities/:id", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const entity = await storage.getEntity(entityId);
      
      if (!entity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      // Check if user has access to this entity
      const userId = (req.user as AuthUser).id;
      if (entity.ownerId !== userId) {
        const accessLevel = await storage.getUserEntityAccess(userId, entityId);
        if (!accessLevel) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      res.json(entity);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Account routes
  app.get("/api/entities/:entityId/accounts", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const accounts = await storage.getAccounts(entityId);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/entities/:entityId/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entityId = parseInt(req.params.entityId);
      
      const account = await storage.getAccount(id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      if (account.entityId !== entityId) {
        return res.status(403).json({ message: "Forbidden: Account does not belong to this entity" });
      }
      
      res.json(account);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/entities/:entityId/accounts", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      
      // Validate input
      const accountData = insertAccountSchema.parse({
        ...req.body,
        entityId
      });
      
      const account = await storage.createAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/entities/:entityId/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entityId = parseInt(req.params.entityId);
      
      // Get the existing account first to validate entity ownership
      const existingAccount = await storage.getAccount(id);
      if (!existingAccount) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      if (existingAccount.entityId !== entityId) {
        return res.status(403).json({ message: "Forbidden: Account does not belong to this entity" });
      }
      
      // Update the account
      const updatedAccount = await storage.updateAccount(id, req.body);
      if (!updatedAccount) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      res.json(updatedAccount);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete("/api/entities/:entityId/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entityId = parseInt(req.params.entityId);
      
      // Get the existing account first to validate entity ownership
      const existingAccount = await storage.getAccount(id);
      if (!existingAccount) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      if (existingAccount.entityId !== entityId) {
        return res.status(403).json({ message: "Forbidden: Account does not belong to this entity" });
      }
      
      // Check if the account is used in any journal entries
      const journalEntries = await storage.getJournalEntries(entityId);
      const journalEntryIds = journalEntries.map(entry => entry.id);
      
      // Fetch all journal entry lines for these entries
      const hasJournalEntryLines = [];
      for (const entryId of journalEntryIds) {
        const lines = await storage.getJournalEntryLines(entryId);
        hasJournalEntryLines.push(...lines.filter(line => line.accountId === id));
        if (hasJournalEntryLines.length > 0) break; // Stop checking once we find any
      }
      
      if (hasJournalEntryLines.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete account as it is used in journal entries", 
          canDeactivate: true 
        });
      }
      
      // If no journal entries use this account, delete it
      await storage.deleteAccount(id);
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Journal Entry routes
  app.get("/api/entities/:entityId/journal-entries", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const { status } = req.query;
      
      let entries;
      if (status && typeof status === 'string') {
        entries = await storage.getJournalEntriesByStatus(entityId, status as JournalEntryStatus);
      } else {
        entries = await storage.getJournalEntries(entityId);
      }
      
      // Load lines for each entry
      const entriesWithLines = await Promise.all(
        entries.map(async (entry) => {
          const lines = await storage.getJournalEntryLines(entry.id);
          return {
            ...entry,
            lines
          };
        })
      );
      
      res.json(entriesWithLines);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/entities/:entityId/journal-entries/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entry = await storage.getJournalEntry(id);
      
      if (!entry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      const lines = await storage.getJournalEntryLines(id);
      
      res.json({
        ...entry,
        lines
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/entities/:entityId/journal-entries", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const userId = (req.user as AuthUser).id;
      
      // Validate journal entry data
      const entryData = insertJournalEntrySchema.parse({
        ...req.body,
        entityId,
        createdBy: userId
      });
      
      // Validate lines
      const linesData = z.array(insertJournalEntryLineSchema.omit({ journalEntryId: true })).parse(req.body.lines);
      
      // Check if debits equal credits
      const totalDebit = linesData.reduce((sum, line) => sum + parseFloat(line.debit), 0);
      const totalCredit = linesData.reduce((sum, line) => sum + parseFloat(line.credit), 0);
      
      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        return res.status(400).json({ 
          message: "Journal entry is unbalanced. Total debits must equal total credits." 
        });
      }
      
      // Create journal entry
      const journalEntry = await storage.createJournalEntry(entryData);
      
      // Create lines
      const lines = await Promise.all(
        linesData.map(async (line) => 
          storage.createJournalEntryLine({
            ...line,
            journalEntryId: journalEntry.id,
            entityId
          })
        )
      );
      
      // Update journal entry if status is POSTED
      if (entryData.status === JournalEntryStatus.POSTED) {
        await storage.updateJournalEntry(journalEntry.id, {
          postedBy: userId,
          postedAt: new Date()
        });
      }
      
      res.status(201).json({
        ...journalEntry,
        lines
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/entities/:entityId/journal-entries/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entityId = parseInt(req.params.entityId);
      const userId = (req.user as AuthUser).id;
      
      // Get existing entry
      const existingEntry = await storage.getJournalEntry(id);
      if (!existingEntry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      // Only allow updates to draft entries
      if (existingEntry.status !== JournalEntryStatus.DRAFT) {
        return res.status(400).json({ message: "Can only update draft journal entries" });
      }
      
      // Validate update data
      const updateData = insertJournalEntrySchema.partial().parse(req.body);
      
      // Update journal entry
      const updatedEntry = await storage.updateJournalEntry(id, {
        ...updateData,
        updatedAt: new Date()
      });
      
      // Update to POSTED status
      if (updateData.status === JournalEntryStatus.POSTED && existingEntry.status !== JournalEntryStatus.POSTED) {
        await storage.updateJournalEntry(id, {
          postedBy: userId,
          postedAt: new Date()
        });
      }
      
      const lines = await storage.getJournalEntryLines(id);
      
      res.json({
        ...updatedEntry,
        lines
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get single journal entry with lines
  app.get("/api/entities/:entityId/journal-entries/:id", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const entryId = parseInt(req.params.id);
      
      const entry = await storage.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      const lines = await storage.getJournalEntryLines(entryId);
      
      res.json({
        ...entry,
        lines
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get journal entry lines
  app.get("/api/entities/:entityId/journal-entries/:id/lines", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const entryId = parseInt(req.params.id);
      
      const entry = await storage.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      const lines = await storage.getJournalEntryLines(entryId);
      res.json(lines);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get journal entry files
  app.get("/api/entities/:entityId/journal-entries/:id/files", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const entryId = parseInt(req.params.id);
      
      const entry = await storage.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      const files = await storage.getJournalEntryFiles(entryId);
      
      // Don't return the actual file data in the list response
      const filesWithoutData = files.map(file => ({
        id: file.id,
        journalEntryId: file.journalEntryId,
        filename: file.filename,
        contentType: file.contentType,
        size: file.size,
        createdAt: file.createdAt,
        uploadedBy: file.uploadedBy
      }));
      
      res.json(filesWithoutData);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Upload file to journal entry
  app.post("/api/entities/:entityId/journal-entries/:id/files", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const entryId = parseInt(req.params.id);
      const userId = (req.user as AuthUser).id;
      
      const entry = await storage.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (entry.status === JournalEntryStatus.POSTED || entry.status === JournalEntryStatus.VOIDED) {
        return res.status(400).json({ message: "Cannot upload files to posted or voided journal entries" });
      }
      
      if (!req.body.filename || !req.body.fileContent) {
        return res.status(400).json({ message: "Filename and file content are required" });
      }
      
      const fileData = {
        filename: req.body.filename,
        contentType: req.body.contentType || 'application/octet-stream',
        size: req.body.fileContent.length,
        data: req.body.fileContent,
        uploadedBy: userId
      };
      
      const file = await storage.createJournalEntryFile(entryId, fileData);
      
      // Return the file metadata without the actual data
      const fileResponse = {
        id: file.id,
        journalEntryId: file.journalEntryId,
        filename: file.filename,
        contentType: file.contentType,
        size: file.size,
        createdAt: file.createdAt,
        uploadedBy: file.uploadedBy
      };
      
      res.json(fileResponse);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Submit journal entry for approval
  app.post("/api/entities/:entityId/journal-entries/:id/request-approval", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const entryId = parseInt(req.params.id);
      const userId = (req.user as AuthUser).id;
      
      const entry = await storage.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (entry.status !== JournalEntryStatus.DRAFT) {
        return res.status(400).json({ message: "Only draft journal entries can be submitted for approval" });
      }
      
      // Update status to pending approval
      const updatedEntry = await storage.updateJournalEntry(entryId, {
        status: JournalEntryStatus.PENDING_APPROVAL,
        requestedBy: userId,
        requestedAt: new Date(),
        updatedAt: new Date()
      });
      
      res.json(updatedEntry);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Approve journal entry
  app.post("/api/entities/:entityId/journal-entries/:id/approve", isAuthenticated, hasRole("admin"), async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const entryId = parseInt(req.params.id);
      const userId = (req.user as AuthUser).id;
      
      const entry = await storage.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (entry.status !== JournalEntryStatus.PENDING_APPROVAL) {
        return res.status(400).json({ message: "Only pending approval journal entries can be approved" });
      }
      
      // Update status to approved
      const updatedEntry = await storage.updateJournalEntry(entryId, {
        status: JournalEntryStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date()
      });
      
      res.json(updatedEntry);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Reject journal entry
  app.post("/api/entities/:entityId/journal-entries/:id/reject", isAuthenticated, hasRole("admin"), async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const entryId = parseInt(req.params.id);
      const userId = (req.user as AuthUser).id;
      
      const entry = await storage.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (entry.status !== JournalEntryStatus.PENDING_APPROVAL) {
        return res.status(400).json({ message: "Only pending approval journal entries can be rejected" });
      }
      
      const { rejectionReason } = req.body;
      if (!rejectionReason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      
      // Update status to rejected
      const updatedEntry = await storage.updateJournalEntry(entryId, {
        status: JournalEntryStatus.REJECTED,
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason,
        updatedAt: new Date()
      });
      
      res.json(updatedEntry);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Post journal entry to GL
  app.post("/api/entities/:entityId/journal-entries/:id/post", isAuthenticated, hasRole("admin"), async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const entryId = parseInt(req.params.id);
      const userId = (req.user as AuthUser).id;
      
      const entry = await storage.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (entry.status !== JournalEntryStatus.APPROVED) {
        return res.status(400).json({ message: "Only approved journal entries can be posted" });
      }
      
      // Update status to posted
      const updatedEntry = await storage.updateJournalEntry(entryId, {
        status: JournalEntryStatus.POSTED,
        postedBy: userId,
        postedAt: new Date(),
        updatedAt: new Date()
      });
      
      res.json(updatedEntry);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Void journal entry
  app.post("/api/entities/:entityId/journal-entries/:id/void", isAuthenticated, hasRole("admin"), async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const entryId = parseInt(req.params.id);
      const userId = (req.user as AuthUser).id;
      
      const entry = await storage.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (entry.status !== JournalEntryStatus.POSTED) {
        return res.status(400).json({ message: "Only posted journal entries can be voided" });
      }
      
      const { voidReason } = req.body;
      if (!voidReason) {
        return res.status(400).json({ message: "Void reason is required" });
      }
      
      // Update status to voided
      const updatedEntry = await storage.updateJournalEntry(entryId, {
        status: JournalEntryStatus.VOIDED,
        rejectedBy: userId, // Use rejectedBy for void as well
        rejectedAt: new Date(),
        rejectionReason: voidReason, // Use rejectionReason for void reason
        updatedAt: new Date()
      });
      
      res.json(updatedEntry);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Duplicate journal entry
  app.post("/api/entities/:entityId/journal-entries/:id/duplicate", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const entryId = parseInt(req.params.id);
      const userId = (req.user as AuthUser).id;
      
      const entry = await storage.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (entry.status === JournalEntryStatus.VOIDED) {
        return res.status(400).json({ message: "Voided journal entries cannot be duplicated" });
      }
      
      // Get lines of the original entry
      const lines = await storage.getJournalEntryLines(entryId);
      
      // Create a new journal entry as draft
      const now = new Date();
      const newEntryData = {
        entityId,
        createdBy: userId,
        date: new Date(),
        reference: `COPY-${entry.reference}`,
        description: entry.description,
        status: JournalEntryStatus.DRAFT,
        createdAt: now,
        updatedAt: now
      };
      
      const newEntry = await storage.createJournalEntry(newEntryData);
      
      // Duplicate all lines
      for (const line of lines) {
        await storage.createJournalEntryLine({
          journalEntryId: newEntry.id,
          entityId,
          accountId: line.accountId,
          description: line.description,
          debit: line.debit,
          credit: line.credit
        });
      }
      
      res.json(newEntry);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  

  

  
  // Reports
  app.get("/api/entities/:entityId/reports/trial-balance", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const { startDate, endDate } = req.query;
      
      const startDateObj = startDate ? new Date(startDate as string) : undefined;
      const endDateObj = endDate ? new Date(endDate as string) : undefined;
      
      const trialBalance = await storage.generateTrialBalance(entityId, startDateObj, endDateObj);
      res.json(trialBalance);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/entities/:entityId/reports/balance-sheet", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const { asOfDate } = req.query;
      
      const asOfDateObj = asOfDate ? new Date(asOfDate as string) : undefined;
      
      const balanceSheet = await storage.generateBalanceSheet(entityId, asOfDateObj);
      res.json(balanceSheet);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/entities/:entityId/reports/income-statement", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const { startDate, endDate } = req.query;
      
      const startDateObj = startDate ? new Date(startDate as string) : undefined;
      const endDateObj = endDate ? new Date(endDate as string) : undefined;
      
      const incomeStatement = await storage.generateIncomeStatement(entityId, startDateObj, endDateObj);
      res.json(incomeStatement);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/entities/:entityId/reports/cash-flow", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const { startDate, endDate } = req.query;
      
      const startDateObj = startDate ? new Date(startDate as string) : undefined;
      const endDateObj = endDate ? new Date(endDate as string) : undefined;
      
      const cashFlow = await storage.generateCashFlow(entityId, startDateObj, endDateObj);
      res.json(cashFlow);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  


  // General Ledger API route
  app.get("/api/entities/:entityId/general-ledger", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const entityId = parseInt(req.params.entityId);
      if (isNaN(entityId)) {
        return res.status(400).json({ message: "Invalid entity ID" });
      }
      
      // Get filter parameters from query string
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
      const status = req.query.status as JournalEntryStatus | undefined;
      
      // Fetch general ledger data
      const glEntries = await storage.getGeneralLedger(entityId, {
        startDate,
        endDate,
        accountId,
        status
      });
      
      res.json(glEntries);
    } catch (error) {
      console.error('Error fetching general ledger:', error);
      res.status(500).json({ message: 'Failed to fetch general ledger' });
    }
  });
  
  // API route to check for the existence of secrets - public access for pre-login availability checks
  app.post("/api/secrets/check", (req, res) => {
    try {
      const { secret } = req.body;
      
      if (!secret || typeof secret !== 'string') {
        return res.status(400).json({ message: 'Invalid secret name provided' });
      }
      
      // Whitelist of secrets that can be publicly checked
      const allowedSecrets = ['XAI_API_KEY', 'OPENAI_API_KEY'];
      
      if (!allowedSecrets.includes(secret)) {
        return res.status(403).json({ message: 'Not allowed to check this secret' });
      }
      
      // Check if the secret exists in the environment
      const exists = !!process.env[secret];
      
      // Return existence flag but NEVER the actual value
      return res.json({ exists });
    } catch (error) {
      console.error('Error checking secret:', error);
      return res.status(500).json({ message: 'Failed to check secret existence' });
    }
  });

  // Register account routes with enhanced error handling
  registerAccountRoutes(app);
  
  // Register the AI routes
  registerAIRoutes(app);
  
  // Register the Budget routes
  registerBudgetRoutes(app, storage);
  
  // Register the Forecast routes
  registerForecastRoutes(app, storage);
  
  const httpServer = createServer(app);
  return httpServer;
}
