import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { DatabaseStorage, IStorage } from "./storage";
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
  insertJournalEntryLineSchema
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
import { registerConsolidationRoutes } from "./consolidationRoutes";
import { registerAdminRoutes } from "./adminRoutes";
import { registerJournalEntryRoutes } from "./journalEntryRoutes";
import { registerLocationRoutes } from "./locationRoutes";
import { registerDebugRoutes } from "./debugRoutes";
import { createVerificationRouter } from "./routes/verificationRoutes";
import { 
  asyncHandler, 
  throwBadRequest, 
  throwNotFound, 
  throwForbidden, 
  throwUnauthorized,
  HttpStatus 
} from "./errorHandling";
import { journalEntryStorage } from "./storage/journalEntryStorage";
import { userStorage } from "./storage/userStorage";
import { generateUsageReport } from "../shared/deprecation-monitor";

interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a database storage instance to use in routes
  const storage: IStorage = new DatabaseStorage();
  
  // Make storage available to all routes via app.locals
  app.locals.storage = storage;
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
      cookie: { 
        maxAge: 86400000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only use secure in production
        sameSite: 'lax' // Helps prevent CSRF
      },
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
        console.log(`Login attempt for username: ${username}`);
        const user = await userStorage.getUserByUsername(username);
        
        if (!user) {
          console.log(`Login failed: User '${username}' not found`);
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // Check if the password is a plain string ("password-hash" or similar)
        if (user.password === "password-hash" || user.password === "password123") {
          console.log(`User '${username}' has a plain text password, should be hashed!`);
          // This user has a plain text password, we should update it with a proper bcrypt hash
          const hashedPassword = await bcrypt.hash("password123", 10);
          await userStorage.updateUser(user.id, { password: hashedPassword });
          console.log(`Updated plain text password for user '${username}' with bcrypt hash`);
          // Let's allow login with password123 in this case
          if (password === "password123") {
            return done(null, {
              id: user.id,
              username: user.username,
              name: user.name,
              email: user.email,
              role: user.role,
            });
          }
        }
        
        // Use bcrypt to compare the password with the hash
        console.log(`Attempting password verification for '${username}'`);
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (isMatch) {
          console.log(`Login successful for '${username}'`);
          return done(null, {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
          });
        }
        
        console.log(`Login failed: Invalid password for '${username}'`);
        return done(null, false, { message: "Invalid username or password" });
      } catch (error) {
        console.error(`Login error for '${username}':`, error);
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
      const user = await userStorage.getUser(id);
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
  app.post("/api/auth/login", (req, res, next) => {
    console.log("Login attempt with username:", req.body.username);
    
    passport.authenticate("local", (err: Error | null, user: any, info: { message: string }) => {
      if (err) {
        console.error("Error during authentication:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Authentication failed:", info?.message || "Unknown reason");
        return res.status(401).json({ 
          message: "Authentication failed", 
          error: info?.message || "Invalid credentials" 
        });
      }
      
      // Log in the user
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Error during login (req.login):", loginErr);
          return next(loginErr);
        }
        
        console.log("User successfully authenticated:", user.username);
        
        // Send user data back to the client
        res.json({ 
          user, 
          message: "Authentication successful",
          sessionID: req.sessionID // Include session ID for debugging
        });
      });
    })(req, res, next);
  });
  
  app.post("/api/auth/logout", (req, res) => {
    console.log("Logout attempt for user:", req.user);
    
    if (!req.isAuthenticated()) {
      return res.status(200).json({ message: "No user is logged in" });
    }
    
    const username = (req.user as any)?.username;
    
    req.logout((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return res.status(500).json({ message: "Logout failed", error: err.message });
      }
      
      console.log("User successfully logged out:", username);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  app.get("/api/auth/me", (req, res) => {
    console.log("Auth check - isAuthenticated:", req.isAuthenticated());
    console.log("Auth check - session:", req.session);
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    console.log("Current authenticated user:", req.user);
    res.json({ user: req.user });
  });
  
  // User routes
  app.get("/api/users", isAuthenticated, hasRole("admin"), async (req, res) => {
    try {
      const users = await Promise.all(
        (await userStorage.getUsers()).map(async (user) => {
          // Exclude password
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        })
      );
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // User entity access route
  app.get("/api/users/:userId/entity-access", isAuthenticated, async (req, res) => {
    try {
      const requestedUserId = parseInt(req.params.userId);
      const currentUserId = (req.user as AuthUser).id;
      const userRole = (req.user as AuthUser).role;
      
      // Only allow users to access their own entity access list unless they're an admin
      if (requestedUserId !== currentUserId && userRole !== 'admin') {
        return res.status(403).json({ 
          status: "error",
          message: "You do not have permission to view this user's entity access list" 
        });
      }
      
      // Get the entity access list
      const accessList = await userStorage.getUserEntityAccessList(requestedUserId);
      
      res.json({
        status: "success",
        data: accessList
      });
    } catch (error) {
      console.error("Error fetching user entity access list:", error);
      res.status(500).json({ 
        status: "error", 
        message: "Internal server error" 
      });
    }
  });
  
  // Entity routes
  app.get("/api/entities", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as AuthUser).id;
      const entities = await storage.entities.getEntitiesByUser(userId);
      res.json(entities);
    } catch (error) {
      console.error("Error fetching entities:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/entities/:id", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const entity = await storage.entities.getEntity(entityId);
      
      if (!entity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      // Check if user has access to this entity
      const userId = (req.user as AuthUser).id;
      if (entity.ownerId !== userId) {
        const accessLevel = await userStorage.getUserEntityAccess(userId, entityId);
        if (!accessLevel) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      res.json(entity);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // POST route for entity creation (for non-admin users)
  app.post("/api/entities", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as AuthUser).id;
      
      // Validate input
      const validatedData = insertEntitySchema.parse({
        ...req.body,
        ownerId: userId, // Set current user as owner
        isActive: true
      });
      
      const entity = await storage.entities.createEntity(validatedData);
      res.status(201).json({
        status: "success",
        data: entity
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          status: "error", 
          message: "Invalid entity data", 
          errors: error.errors 
        });
      }
      console.error("Error creating entity:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // PUT route for entity update (for non-admin users)
  app.put("/api/entities/:id", isAuthenticated, async (req, res) => {
    try {
      // Get the raw ID string first
      const rawIdString = req.params.id;
      const userId = (req.user as AuthUser).id;
      
      console.log(`DEBUG Route Update Entity: Received request for ID: ${rawIdString} from user ${userId}`);
      console.log("DEBUG Route Update Entity: Received body:", JSON.stringify(req.body));
      
      // CRITICAL FIX: First check if the ID exceeds PostgreSQL integer range directly as a string
      // This prevents the parseInt from generating a number that's too large for JS to handle properly
      if (rawIdString.length > 10 || parseInt(rawIdString) > 2147483647) { // PostgreSQL int max is 2147483647 (10 digits)
        console.error(`DEBUG Route Update Entity: ID ${rawIdString} exceeds PostgreSQL integer range - likely a temporary frontend ID`);
        return res.status(400).json({ 
          status: "error", 
          message: "Cannot update entity with temporary ID. Please save the client first." 
        });
      }
      
      // Now safely parse the integer
      const entityId = parseInt(rawIdString);
      
      // Validate the entity ID format
      if (isNaN(entityId)) {
        console.error(`DEBUG Route Update Entity: Invalid entity ID format: ${rawIdString}`);
        return res.status(400).json({ 
          status: "error", 
          message: `Invalid entity ID format: ${rawIdString}` 
        });
      }
      
      if (entityId <= 0) {
        console.error(`DEBUG Route Update Entity: Invalid entity ID (must be positive): ${entityId}`);
        return res.status(400).json({ 
          status: "error", 
          message: `Invalid entity ID (must be positive): ${entityId}` 
        });
      }
      
      let existingEntity;
      
      // CRITICAL FIX: Short-circuit for temporary IDs in step 2 of the setup flow
      // These IDs are typically large numbers like timestamps (e.g., 1743100000000)
      // This pattern indicates they are coming from EntityManagementCard's temporary IDs
      if (entityId > 1740000000000) { // Timestamp-based IDs from January 2025 onwards will be > 1740000000000
        console.error(`DEBUG Route Update Entity: Detected temporary ID pattern: ${entityId}`);
        return res.status(400).json({ 
          status: "error", 
          message: "Cannot update entity with temporary ID. You need to complete the client setup first." 
        });
      }
      
      try {
        // Verify entity exists
        console.log(`DEBUG Route Update Entity: Fetching entity with ID ${entityId} from storage...`);
        existingEntity = await storage.entities.getEntity(entityId);
      } catch (error) {
        // If the error is specifically about the ID being out of range, handle it gracefully
        if (error instanceof Error && error.message.includes("out of range for type integer")) {
          console.error(`DEBUG Route Update Entity ERROR: ${error.message}`);
          return res.status(400).json({ 
            status: "error", 
            message: "Cannot update entity with temporary ID. Please save the client first." 
          });
        }
        // Otherwise return a 500 error
        console.error(`DEBUG Route Update Entity ERROR: ${error instanceof Error ? error.message : String(error)}`, error);
        return res.status(500).json({ 
          status: "error", 
          message: "Database error occurred" 
        });
      }
      
      if (!existingEntity) {
        console.log(`DEBUG Route Update Entity: Entity with ID ${entityId} not found in database`);
        return res.status(404).json({ 
          status: "error", 
          message: `Entity with ID ${entityId} not found` 
        });
      }
      
      // Check if user has access to this entity
      if (existingEntity.ownerId !== userId) {
        const accessLevel = await userStorage.getUserEntityAccess(userId, entityId);
        if (!accessLevel) {
          console.log(`DEBUG Route Update Entity: User ${userId} does not have access to entity ${entityId}`);
          return res.status(403).json({ 
            status: "error", 
            message: "You do not have permission to update this entity" 
          });
        }
      }
      
      console.log(`DEBUG Route Update Entity: Found existing entity:`, JSON.stringify(existingEntity));
      
      // Validate required fields in request body
      if (!req.body.name || req.body.name.trim() === '') {
        console.error("DEBUG Route Update Entity: Missing required field 'name' in request body");
        throw new Error("Entity name is required");
      }
      
      // If the industry field is present, convert it to string for consistency
      if (req.body.industry !== undefined) {
        if (req.body.industry === null || req.body.industry === '') {
          console.log("DEBUG Route Update Entity: Setting empty industry to 'other'");
          req.body.industry = "other";
        } else {
          // Convert numeric industry values to string for consistency
          console.log(`DEBUG Route Update Entity: Converting industry value "${req.body.industry}" (${typeof req.body.industry}) to string`);
          req.body.industry = String(req.body.industry);
        }
      }
      
      // Log the specific changes being made
      console.log("DEBUG Route Update Entity: Fields being updated:");
      for (const [key, value] of Object.entries(req.body)) {
        // Use type safety to access properties 
        if (key in existingEntity && existingEntity[key as keyof typeof existingEntity] !== value) {
          console.log(`  - ${key}: "${existingEntity[key as keyof typeof existingEntity]}" -> "${value}"`);
        }
      }
      
      console.log(`DEBUG Route Update Entity: Calling storage.updateEntity with ID ${entityId}...`);
      
      const updatedEntity = await storage.entities.updateEntity(entityId, req.body);
      
      if (!updatedEntity) {
        console.error(`DEBUG Route Update Entity: Storage returned null/undefined after update for ID ${entityId}`);
        throw new Error(`Failed to update entity with ID ${entityId}`);
      }
      
      console.log(`DEBUG Route Update Entity: Update successful, returning entity:`, JSON.stringify(updatedEntity));
      
      return res.json({
        status: "success",
        data: updatedEntity
      });
    } catch (error: any) {
      console.error(`DEBUG Route Update Entity ERROR: ${error.message}`, error.stack);
      
      if (error instanceof z.ZodError) {
        console.error("DEBUG Route Update Entity: ZodError validation failed", JSON.stringify(error.errors));
        return res.status(400).json({ 
          status: "error", 
          message: "Invalid entity data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        status: "error", 
        message: error.message || "Internal server error" 
      });
    }
  });
  
  // Account routes are now handled by accountRoutes.ts
  // These legacy routes are commented out to avoid duplication
  
  /* 
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
        const lines = await storage.journalEntry.getJournalEntryLines(entryId);
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
  */
  
  // Journal Entry routes
  app.get("/api/entities/:entityId/journal-entries", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const { status } = req.query;
      
      let entries;
      if (status && typeof status === 'string') {
        entries = await storage.journalEntries.getJournalEntriesByStatus(entityId, status);
      } else {
        entries = await storage.journalEntries.getJournalEntries(entityId);
      }
      
      // Load lines for each entry
      const entriesWithLines = await Promise.all(
        entries.map(async (entry) => {
          const lines = await storage.journalEntries.getJournalEntryLines(entry.id);
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
      const entry = await storage.journalEntry.getJournalEntry(id);
      
      if (!entry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      const lines = await storage.journalEntry.getJournalEntryLines(id);
      
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
      
      // Validate that we have a user object and a valid user ID
      if (!req.user || typeof (req.user as any).id !== 'number') {
        console.error('User ID not found in request object for entity journal entry creation');
        return res.status(500).json({ message: 'Authentication error: User ID not found.' });
      }
      
      const userId = (req.user as AuthUser).id;
      
      // Validate journal entry data, explicitly including the createdBy field
      const entryData = insertJournalEntrySchema.parse({
        ...req.body,
        entityId,
        createdBy: userId  // Explicitly set createdBy to the authenticated user's ID
      });
      
      // Double check that createdBy is set
      if (!entryData.createdBy) {
        return res.status(400).json({ message: "Creator ID is required" });
      }
      
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
      
      // Create journal entry - pass the entire entry data which includes createdBy
      const journalEntry = await storage.journalEntry.createJournalEntry(entryData);
      
      // Create lines
      const lines = await Promise.all(
        linesData.map(async (line) => 
          storage.journalEntry.createJournalEntryLine({
            ...line,
            journalEntryId: journalEntry.id,
            entityId
          })
        )
      );
      
      // Update journal entry if status is POSTED
      if (entryData.status === "posted") {
        await storage.journalEntry.updateJournalEntry(journalEntry.id, {
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
      const existingEntry = await storage.journalEntry.getJournalEntry(id);
      if (!existingEntry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      // Only allow updates to draft entries
      if (existingEntry.status !== "draft") {
        return res.status(400).json({ message: "Can only update draft journal entries" });
      }
      
      // Validate update data
      const updateData = insertJournalEntrySchema.partial().parse(req.body);
      
      // Update journal entry
      const updatedEntry = await storage.journalEntry.updateJournalEntry(id, {
        ...updateData,
        updatedAt: new Date()
      });
      
      // Update to POSTED status
      if (updateData.status === "posted" && existingEntry.status !== "posted") {
        await storage.journalEntry.updateJournalEntry(id, {
          postedBy: userId,
          postedAt: new Date()
        });
      }
      
      const lines = await storage.journalEntry.getJournalEntryLines(id);
      
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
      
      const entry = await storage.journalEntry.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      const lines = await storage.journalEntry.getJournalEntryLines(entryId);
      
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
      
      const entry = await storage.journalEntry.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      const lines = await storage.journalEntry.getJournalEntryLines(entryId);
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
      
      const entry = await storage.journalEntry.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      const files = await storage.journalEntry.getJournalEntryFiles(entryId);
      
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
      
      const entry = await storage.journalEntry.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (entry.status === "posted" || entry.status === "void") {
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
      
      const file = await storage.journalEntry.createJournalEntryFile(entryId, fileData);
      
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
      
      const entry = await storage.journalEntry.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (entry.status !== "draft") {
        return res.status(400).json({ message: "Only draft journal entries can be submitted for approval" });
      }
      
      // Update status to pending approval
      const updatedEntry = await storage.journalEntry.updateJournalEntry(entryId, {
        status: "pending_approval",
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
      
      const entry = await storage.journalEntry.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (entry.status !== "pending_approval") {
        return res.status(400).json({ message: "Only pending approval journal entries can be approved" });
      }
      
      // Update status to approved
      const updatedEntry = await storage.journalEntry.updateJournalEntry(entryId, {
        status: "approved",
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
      
      const entry = await storage.journalEntry.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (entry.status !== "pending_approval") {
        return res.status(400).json({ message: "Only pending approval journal entries can be rejected" });
      }
      
      const { rejectionReason } = req.body;
      if (!rejectionReason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      
      // Update status to rejected
      const updatedEntry = await storage.journalEntry.updateJournalEntry(entryId, {
        status: "rejected",
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
      
      const entry = await storage.journalEntry.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (entry.status !== "approved") {
        return res.status(400).json({ message: "Only approved journal entries can be posted" });
      }
      
      // Update status to posted
      const updatedEntry = await storage.journalEntry.updateJournalEntry(entryId, {
        status: "posted",
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
      
      const entry = await storage.journalEntry.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (entry.status !== "posted") {
        return res.status(400).json({ message: "Only posted journal entries can be voided" });
      }
      
      const { voidReason } = req.body;
      if (!voidReason) {
        return res.status(400).json({ message: "Void reason is required" });
      }
      
      // Update status to voided
      const updatedEntry = await storage.journalEntry.updateJournalEntry(entryId, {
        status: "void",
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
      
      const entry = await storage.journalEntry.getJournalEntry(entryId);
      if (!entry || entry.entityId !== entityId) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (entry.status === "voided") {
        return res.status(400).json({ message: "Voided journal entries cannot be duplicated" });
      }
      
      // Get lines of the original entry
      const lines = await storage.journalEntry.getJournalEntryLines(entryId);
      
      // Create a new journal entry as draft
      const now = new Date();
      const newEntryData = {
        entityId,
        createdBy: userId,
        date: new Date(),
        reference: `COPY-${entry.reference}`,
        description: entry.description,
        status: "draft",
        createdAt: now,
        updatedAt: now
      };
      
      const newEntry = await storage.journalEntry.createJournalEntry(newEntryData);
      
      // Duplicate all lines
      for (const line of lines) {
        await storage.journalEntry.createJournalEntryLine({
          journalEntryId: newEntry.id,
          entityId,
          accountId: line.accountId,
          description: line.description,
          type: line.type || (line.debit > 0 ? 'debit' : 'credit'),
          amount: line.amount || (line.debit > 0 ? line.debit.toString() : line.credit.toString())
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
      
      const trialBalance = await storage.reports.generateTrialBalance(entityId, startDateObj, endDateObj);
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
      
      const balanceSheet = await storage.reports.generateBalanceSheet(entityId, asOfDateObj);
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
      
      const incomeStatement = await storage.reports.generateIncomeStatement(entityId, startDateObj, endDateObj);
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
      
      const cashFlow = await storage.reports.generateCashFlow(entityId, startDateObj, endDateObj);
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
      const status = req.query.status as string | undefined;
      
      // Fetch general ledger data
      const glEntries = await storage.reports.getGeneralLedger(entityId, {
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
  
  // Register the Consolidation routes
  registerConsolidationRoutes(app, storage);
  
  // Register the Admin routes
  registerAdminRoutes(app, storage);
  
  // Register the Journal Entry routes
  registerJournalEntryRoutes(app);
  
  // Register the Location routes
  registerLocationRoutes(app, storage);
  
  // Register Debug routes for development and testing
  registerDebugRoutes(app, storage);
  
  // Register Verification routes for testing
  // Create a verification router that has direct access to the storage object
  console.log("Creating verification router with storage instance...");
  const verificationRouterInstance = createVerificationRouter(storage);
  
  // Mount verification routes at both /api/verification and directly at /api
  app.use('/api/verification', verificationRouterInstance);
  
  // IMPORTANT: Also mount the verification routes directly at /api to support verification scripts
  // The test-verification-routes.js expects these routes to be available directly
  app.use('/api', verificationRouterInstance);
  
  // Endpoint to check if any accounts exist for testing
  app.get('/api/test/accounts', async (req, res) => {
    try {
      console.log('Fetching accounts...');
      const accounts = await storage.accounts.listAccounts();
      console.log(`Found ${accounts ? accounts.length : 0} accounts`);
      if (accounts && accounts.length > 0) {
        console.log('First account:', JSON.stringify(accounts[0], null, 2));
      }
      res.setHeader('Content-Type', 'application/json');
      return res.json({ count: accounts.length, accounts: accounts.slice(0, 5) });
    } catch (error) {
      console.error('Error fetching accounts:', error);
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ message: "Error fetching accounts", error: error.message });
    }
  });
  
  // Directly parse JSON in the test endpoint
  app.post('/api/test/journal-entries', async (req, res) => {
    try {
      // Set a default user ID for testing
      const testUserId = 1;
      
      console.log('Received request body:', JSON.stringify(req.body, null, 2));
      
      // Added extra logging to debug content-type issues
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Request body type:', typeof req.body);
      
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ message: "Invalid request body, expected JSON object" });
      }
      
      // Extract entry data and lines separately
      const { lines, ...entryData } = req.body;
      
      console.log('Lines extracted:', JSON.stringify(lines, null, 2));
      console.log('Lines type:', typeof lines);
      console.log('Is array?', Array.isArray(lines));
      
      if (!lines || !Array.isArray(lines)) {
        return res.status(400).json({ message: "Lines data missing or not an array" });
      }
      
      if (lines.length === 0) {
        return res.status(400).json({ message: "Journal entry must have at least one line" });
      }
      
      // Prepare the journal entry data with createdBy field explicitly set
      const journalEntryData = {
        ...entryData,
        createdBy: testUserId || 1, // Make sure createdBy is always set
        // Set any missing required fields with defaults
        status: entryData.status || 'draft',
        journalType: entryData.journalType || 'JE',
        referenceNumber: entryData.referenceNumber || `TEST-${Date.now()}`,
        description: entryData.description || 'Test journal entry'
      };
      
      console.log('Creating journal entry with data:', JSON.stringify(journalEntryData, null, 2));
      console.log('Lines data:', JSON.stringify(lines, null, 2));
      
      // Enhanced error handling
      try {
        // Create journal entry with lines using journalEntryStorage
        const journalEntry = await journalEntryStorage.createJournalEntry(
          journalEntryData.clientId,
          journalEntryData.createdBy,
          journalEntryData
        );
        
        // Add lines to the journal entry
        if (lines && lines.length > 0) {
          for (const line of lines) {
            await journalEntryStorage.createJournalEntryLine({
              ...line,
              journalEntryId: journalEntry.id
            });
          }
        }
        
        // Get the complete journal entry with lines
        const completeJournalEntry = await journalEntryStorage.getJournalEntry(journalEntry.id);
        res.status(201).json(completeJournalEntry);
      } catch (storageError) {
        console.error('Storage error:', storageError);
        
        // Check if the error is about missing accounts
        if (storageError.code === 'fk' || 
            (storageError.message && storageError.message.includes('foreign key'))) {
          return res.status(400).json({ 
            message: "Foreign key constraint violation - verify account IDs exist", 
            error: storageError.message 
          });
        }
        
        // If it's a validation error about lines, return a 400
        if (storageError.message && storageError.message.includes('line')) {
          return res.status(400).json({ message: storageError.message });
        }
        
        throw storageError; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      console.error('Error in test endpoint:', error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });
  
  /**
   * Client verification routes - mirrors admin client routes
   * These routes are specifically for verification scripts
   */
  
  // Get all clients
  app.get("/api/clients", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log("GET /api/clients - User:", req.user);
      const clients = await storage.clients.getClients();
      
      // Return direct array format for verification scripts
      return res.json(clients);
    } catch (error: any) {
      console.error("Error fetching clients:", error.message || error);
      throw error;
    }
  }));
  
  // Create a new client
  app.post("/api/clients", asyncHandler(async (req: Request, res: Response) => {
    const clientData = req.body;
    try {
      console.log("Creating client with data (verification route):", clientData);
      
      // Explicitly create new client
      const newClient = await storage.clients.createClient(clientData);
      console.log(`DEBUG: Client created successfully with ID ${newClient.id}`);

      // Explicitly create default entity first (to ensure dependencies)
      const defaultEntityData = {
        name: `${newClient.name} Default Entity`,
        code: "DEFAULT",
        entityCode: "DEFAULT",
        ownerId: clientData.userId,
        clientId: newClient.id,
        active: true,
        fiscalYearStart: "01-01",
        fiscalYearEnd: "12-31",
        currency: "USD",
        timezone: "UTC"
      };
      
      console.log(`DEBUG: Creating default entity with data:`, JSON.stringify(defaultEntityData, null, 2));
      
      try {
        // Explicitly create the entity with thorough error handling
        const entity = await storage.entities.createEntity(defaultEntityData);
        console.log(`DEBUG: Default entity created with ID ${entity.id} for client ID ${newClient.id}`);
        
        // Verify entity was created by fetching it
        const entities = await storage.entities.getEntitiesByClient(newClient.id);
        console.log(`DEBUG: Verified client ${newClient.id} has ${entities.length} entities`);
        
        if (entities.length === 0) {
          console.error(`ERROR: Entity creation failed silently for client ${newClient.id}`);
          throw new Error(`Failed to create entity for client ${newClient.id}`);
        }
      } catch (entityError) {
        console.error(`ERROR: Entity creation failed for client ${newClient.id}:`, entityError);
        throw entityError; // Re-throw to ensure proper handling
      }

      // Immediately seed the Chart of Accounts - create a dedicated function to ensure this works reliably
      const seedCoA = async (clientId: number) => {
        console.log(`DEBUG: [seedCoA] Starting Chart of Accounts seeding for client ID ${clientId}`);
        
        try {
          // Check if accounts already exist
          console.log(`DEBUG: [seedCoA] Checking for existing accounts for client ${clientId}`);
          const existingAccounts = await storage.accounts.getAccounts(clientId);
          console.log(`DEBUG: [seedCoA] Found ${existingAccounts.length} existing accounts for client ${clientId}`);
          
          if (existingAccounts.length > 0) {
            console.log(`DEBUG: [seedCoA] Client ${clientId} already has ${existingAccounts.length} accounts. Skipping CoA seeding.`);
            return true; // Already seeded
          } else {
            console.log(`DEBUG: [seedCoA] No existing accounts found. Proceeding with CoA seeding for client ${clientId}`);
            await storage.accounts.seedClientCoA(clientId);
            console.log(`DEBUG: [seedCoA] Chart of Accounts seeded successfully for client ID ${clientId}`);
            
            // Verify accounts were created
            const accounts = await storage.accounts.getAccounts(clientId);
            console.log(`DEBUG: [seedCoA] Verification complete - client ${clientId} now has ${accounts.length} accounts`);
            
            if (accounts.length === 0) {
              console.error(`ERROR: [seedCoA] No accounts were created for client ${clientId} - CoA seeding may have failed silently`);
              return false;
            } else {
              console.log(`DEBUG: [seedCoA] Successfully verified account creation for client ${clientId}`);
              return true;
            }
          }
        } catch (seedError) {
          console.error(`ERROR: [seedCoA] CoA seeding failed for client ${clientId}:`, seedError);
          console.error(`ERROR: [seedCoA] Full seedError details:`, seedError);
          throw seedError; // Re-throw for proper handling
        }
      };

      // Attempt to seed the Chart of Accounts with proper error handling
      try {
        const seedResult = await seedCoA(newClient.id);
        if (seedResult) {
          console.log(`DEBUG: Chart of Accounts seeding was successful for client ${newClient.id}`);
        } else {
          console.warn(`WARNING: Chart of Accounts seeding may have failed for client ${newClient.id}`);
        }
      } catch (seedError) {
        console.error(`ERROR: CoA seeding failed for client ${newClient.id}:`, seedError);
        // Continue - don't fail client creation if CoA seeding fails
        // The user can manually seed the CoA later via the dedicated endpoint
      }

      res.status(201).json(newClient);
    } catch (error) {
      console.error("ERROR: Client creation or CoA seeding failed:", error);
      console.error("ERROR: Full error details:", error);
      res.status(500).json({ error: error.message });
    }
  }));
  
  // Get a specific client by ID
  app.get("/api/clients/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log('GET /api/clients/:id - Start of handler');
      const clientId = parseInt(req.params.id);
      console.log('Client ID:', clientId);
      
      const client = await storage.clients.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Return client directly without nesting in data property for verification scripts
      return res.json(client);
    } catch (error: any) {
      console.error("Error getting client:", error.message || error);
      throw error;
    }
  }));
  
  // Update a specific client
  app.put("/api/clients/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log('PUT /api/clients/:id - Start of handler');
      const clientId = parseInt(req.params.id);
      console.log('Client ID:', clientId);
      
      // Verify client exists
      const existingClient = await storage.clients.getClient(clientId);
      if (!existingClient) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const updatedClient = await storage.clients.updateClient(clientId, req.body);
      
      // Return client directly without nesting in data property for verification scripts
      return res.json(updatedClient);
    } catch (error: any) {
      console.error("Error updating client:", error.message || error);
      throw error;
    }
  }));
  
  /**
   * Entity verification routes - mirrors admin entity routes 
   * These routes are specifically for verification scripts
   */
  
  // Get all entities
  app.get("/api/entities", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log("GET /api/entities - User:", req.user);
      const entities = await storage.entities.getEntities();
      
      // Return direct array format for verification scripts
      return res.json(entities);
    } catch (error: any) {
      console.error("Error fetching entities:", error.message || error);
      throw error;
    }
  }));
  
  // Create a new entity
  app.post("/api/entities", asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log("POST /api/entities - Received entity data:", req.body);
      console.log("User authenticated status:", req.isAuthenticated ? req.isAuthenticated() : false);
      console.log("User data:", req.user);
      
      // Extract user ID from the authenticated user or from the request body
      let userId = (req.user as any)?.id;
      
      // If no authenticated user, try to get the userId from the request body
      if (!userId && req.body.userId) {
        userId = req.body.userId;
        console.log("Using userId from request body:", userId);
      }
      
      if (!userId) {
        return res.status(400).json({
          status: 'error',
          message: 'User ID is required either in session or request body'
        });
      }
      
      // Create the entity
      const entityData = {
        ...req.body,
        createdBy: userId
      };
      
      console.log("Creating entity with data:", entityData);
      const newEntity = await storage.entities.createEntity(entityData);
      console.log("Entity created successfully:", newEntity);
      
      // Return entity directly without nesting in data property for verification scripts
      return res.status(201).json(newEntity);
    } catch (error: any) {
      console.error("Error creating entity:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create entity',
        error: error.message || String(error)
      });
    }
  }));
  
  // Get a specific entity by ID
  app.get("/api/entities/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log('GET /api/entities/:id - Start of handler');
      const entityId = parseInt(req.params.id);
      console.log('Entity ID:', entityId);
      
      const entity = await storage.entities.getEntity(entityId);
      if (!entity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      // Return entity directly without nesting in data property for verification scripts
      return res.json(entity);
    } catch (error: any) {
      console.error("Error getting entity:", error.message || error);
      throw error;
    }
  }));
  
  // Update a specific entity
  app.put("/api/entities/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log('PUT /api/entities/:id - Start of handler');
      const entityId = parseInt(req.params.id);
      console.log('Entity ID:', entityId);
      
      // Verify entity exists
      const existingEntity = await storage.entities.getEntity(entityId);
      if (!existingEntity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      const updatedEntity = await storage.entities.updateEntity(entityId, req.body);
      
      // Return entity directly without nesting in data property for verification scripts
      return res.json(updatedEntity);
    } catch (error: any) {
      console.error("Error updating entity:", error.message || error);
      throw error;
    }
  }));
  
  // Set entity inactive
  app.post("/api/entities/:id/set-inactive", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log('POST /api/entities/:id/set-inactive - Start of handler');
      const entityId = parseInt(req.params.id);
      console.log('Entity ID:', entityId);
      
      // Verify entity exists
      const existingEntity = await storage.entities.getEntity(entityId);
      if (!existingEntity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      const updatedEntity = await storage.entities.updateEntity(entityId, { active: false });
      
      // Return entity directly without nesting in data property for verification scripts
      return res.json(updatedEntity);
    } catch (error: any) {
      console.error("Error setting entity inactive:", error.message || error);
      throw error;
    }
  }));
  
  // Soft delete entity
  app.delete("/api/entities/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log('DELETE /api/entities/:id - Start of handler');
      const entityId = parseInt(req.params.id);
      console.log('Entity ID to soft delete:', entityId);
      
      // Verify entity exists
      const existingEntity = await storage.entities.getEntity(entityId);
      if (!existingEntity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      // Mark as inactive and set deletedAt timestamp
      const updatedEntity = await storage.entities.updateEntity(entityId, { 
        active: false,
        deletedAt: new Date()
      });
      
      // Return entity directly without nesting in data property for verification scripts
      return res.json(updatedEntity);
    } catch (error: any) {
      console.error("Error soft deleting entity:", error.message || error);
      throw error;
    }
  }));
  
  // Restore soft-deleted entity
  app.post("/api/entities/:id/restore", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log('POST /api/entities/:id/restore - Start of handler');
      const entityId = parseInt(req.params.id);
      console.log('Entity ID to restore:', entityId);
      
      // Verify entity exists
      const existingEntity = await storage.entities.getEntity(entityId);
      if (!existingEntity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      // Mark as active and clear deletedAt timestamp
      const updatedEntity = await storage.entities.updateEntity(entityId, { 
        active: true,
        deletedAt: null
      });
      
      // Return entity directly without nesting in data property for verification scripts
      return res.json(updatedEntity);
    } catch (error: any) {
      console.error("Error restoring entity:", error.message || error);
      throw error;
    }
  }));

  // Manually seed Chart of Accounts for a client
  app.post("/api/clients/:clientId/seed-coa", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log('POST /api/clients/:clientId/seed-coa - Start of handler');
      const clientId = parseInt(req.params.clientId);
      console.log('Client ID to seed CoA for:', clientId);
      
      // Verify client exists
      const client = await storage.clients.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Check if entities exist for this client
      const entities = await storage.entities.getEntitiesByClient(clientId);
      console.log(`Found ${entities.length} entities for client ${clientId}`);
      
      if (entities.length === 0) {
        console.error(`ERROR: No entities found for client ${clientId}. Creating default entity.`);
        // Create a default entity if none exists
        const defaultEntityData = {
          name: `${client.name} Default Entity`,
          code: "DEFAULT",
          entityCode: "DEFAULT",
          ownerId: client.userId,
          clientId: clientId,
          active: true,
          fiscalYearStart: "01-01",
          fiscalYearEnd: "12-31",
          currency: "USD",
          timezone: "UTC"
        };
        
        console.log(`Creating default entity for client ${clientId}:`, JSON.stringify(defaultEntityData, null, 2));
        await storage.entities.createEntity(defaultEntityData);
        console.log(`Default entity created for client ${clientId}`);
      }
      
      // Check if accounts already exist
      const existingAccounts = await storage.accounts.getAccounts(clientId);
      console.log(`Client ${clientId} has ${existingAccounts.length} existing accounts`);
      
      if (existingAccounts.length > 0) {
        console.log(`Client ${clientId} already has ${existingAccounts.length} accounts. No need to seed.`);
        return res.json({ 
          success: true, 
          message: "Chart of Accounts already exists for this client", 
          accountCount: existingAccounts.length 
        });
      }
      
      // Seed the Chart of Accounts
      console.log(`Seeding Chart of Accounts for client ${clientId}...`);
      await storage.accounts.seedClientCoA(clientId);
      
      // Verify accounts were created
      const accounts = await storage.accounts.getAccounts(clientId);
      console.log(`Verified client ${clientId} now has ${accounts.length} accounts`);
      
      if (accounts.length === 0) {
        return res.status(500).json({
          success: false,
          message: "Chart of Accounts seeding failed - no accounts were created"
        });
      }
      
      return res.json({
        success: true,
        message: "Chart of Accounts seeded successfully",
        accountCount: accounts.length
      });
    } catch (error: any) {
      console.error(`Error seeding Chart of Accounts for client:`, error);
      return res.status(500).json({
        success: false,
        message: `Error seeding Chart of Accounts: ${error.message || String(error)}`
      });
    }
  }));
  
  const httpServer = createServer(app);
  return httpServer;
}
