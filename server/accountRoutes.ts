import { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { 
  asyncHandler, 
  throwBadRequest, 
  throwNotFound, 
  throwForbidden, 
  HttpStatus 
} from "./errorHandling";
import { 
  enhancedAccountSchema 
} from "@shared/validation";
import { 
  AccountType,
  Account
} from "@shared/schema";
import { validateRequest } from "@shared/validation";

// Type for authenticated user in request
interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(HttpStatus.UNAUTHORIZED).json({ message: "Unauthorized" });
};

// Register account routes
export function registerAccountRoutes(app: Express) {
  // Get all accounts for an entity
  app.get("/api/entities/:entityId/accounts", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    
    // Validate entity ID
    if (isNaN(entityId) || entityId <= 0) {
      throwBadRequest("Invalid entity ID");
    }
    
    // Validate user has access to entity
    const userId = (req.user as AuthUser).id;
    const entity = await storage.getEntity(entityId);
    
    if (!entity) {
      throwNotFound("Entity");
    }
    
    if (entity.ownerId !== userId) {
      const accessLevel = await storage.getUserEntityAccess(userId, entityId);
      if (!accessLevel) {
        throwForbidden("You don't have access to this entity");
      }
    }
    
    // Get accounts from storage
    const accounts = await storage.getAccounts(entityId);
    
    // Return accounts
    res.json(accounts);
  }));
  
  // Get account by ID
  app.get("/api/entities/:entityId/accounts/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const accountId = parseInt(req.params.id);
    
    // Validate IDs
    if (isNaN(entityId) || entityId <= 0) {
      throwBadRequest("Invalid entity ID");
    }
    
    if (isNaN(accountId) || accountId <= 0) {
      throwBadRequest("Invalid account ID");
    }
    
    // Validate user has access to entity
    const userId = (req.user as AuthUser).id;
    const entity = await storage.getEntity(entityId);
    
    if (!entity) {
      throwNotFound("Entity");
    }
    
    if (entity.ownerId !== userId) {
      const accessLevel = await storage.getUserEntityAccess(userId, entityId);
      if (!accessLevel) {
        throwForbidden("You don't have access to this entity");
      }
    }
    
    // Get account from storage
    const account = await storage.getAccount(accountId);
    
    if (!account) {
      throwNotFound("Account");
    }
    
    if (account.entityId !== entityId) {
      throwForbidden("Account does not belong to this entity");
    }
    
    // Return account
    res.json(account);
  }));
  
  // Create a new account
  app.post("/api/entities/:entityId/accounts", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    
    // Validate entity ID
    if (isNaN(entityId) || entityId <= 0) {
      throwBadRequest("Invalid entity ID");
    }
    
    // Validate user has access to entity
    const userId = (req.user as AuthUser).id;
    const entity = await storage.getEntity(entityId);
    
    if (!entity) {
      throwNotFound("Entity");
    }
    
    if (entity.ownerId !== userId) {
      const accessLevel = await storage.getUserEntityAccess(userId, entityId);
      if (!accessLevel) {
        throwForbidden("You don't have access to this entity");
      }
    }
    
    // Validate request data
    const validationResult = validateRequest(
      enhancedAccountSchema,
      { ...req.body, entityId }
    );
    
    if (!validationResult.success) {
      return res.status(HttpStatus.BAD_REQUEST).json(validationResult.error);
    }
    
    const accountData = validationResult.data;
    
    // Check for duplicate account code
    const existingAccounts = await storage.getAccounts(entityId);
    const isDuplicateCode = existingAccounts.some(
      acc => acc.code === accountData.code
    );
    
    if (isDuplicateCode) {
      throwBadRequest("Account code already exists. Please use a unique code.");
    }
    
    // Create account
    const account = await storage.createAccount(accountData);
    
    // Return created account
    res.status(HttpStatus.CREATED).json(account);
  }));
  
  // Update an account
  app.put("/api/entities/:entityId/accounts/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const accountId = parseInt(req.params.id);
    
    // Validate IDs
    if (isNaN(entityId) || entityId <= 0) {
      throwBadRequest("Invalid entity ID");
    }
    
    if (isNaN(accountId) || accountId <= 0) {
      throwBadRequest("Invalid account ID");
    }
    
    // Validate user has access to entity
    const userId = (req.user as AuthUser).id;
    const entity = await storage.getEntity(entityId);
    
    if (!entity) {
      throwNotFound("Entity");
    }
    
    if (entity.ownerId !== userId) {
      const accessLevel = await storage.getUserEntityAccess(userId, entityId);
      if (!accessLevel) {
        throwForbidden("You don't have access to this entity");
      }
    }
    
    // Get existing account
    const existingAccount = await storage.getAccount(accountId);
    
    if (!existingAccount) {
      throwNotFound("Account");
    }
    
    if (existingAccount.entityId !== entityId) {
      throwForbidden("Account does not belong to this entity");
    }
    
    // Validate partial update data
    const validationResult = validateRequest(
      enhancedAccountSchema.partial(),
      req.body
    );
    
    if (!validationResult.success) {
      return res.status(HttpStatus.BAD_REQUEST).json(validationResult.error);
    }
    
    const updateData = validationResult.data;
    
    // Check for duplicate account code if code is being updated
    if (updateData.code && updateData.code !== existingAccount.code) {
      const existingAccounts = await storage.getAccounts(entityId);
      const isDuplicateCode = existingAccounts.some(
        acc => acc.code === updateData.code && acc.id !== accountId
      );
      
      if (isDuplicateCode) {
        throwBadRequest("Account code already exists. Please use a unique code.");
      }
    }
    
    // Update account
    const updatedAccount = await storage.updateAccount(accountId, updateData);
    
    if (!updatedAccount) {
      throwNotFound("Account");
    }
    
    // Return updated account
    res.json(updatedAccount);
  }));
  
  // Delete an account
  app.delete("/api/entities/:entityId/accounts/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const accountId = parseInt(req.params.id);
    
    // Validate IDs
    if (isNaN(entityId) || entityId <= 0) {
      throwBadRequest("Invalid entity ID");
    }
    
    if (isNaN(accountId) || accountId <= 0) {
      throwBadRequest("Invalid account ID");
    }
    
    // Validate user has access to entity
    const userId = (req.user as AuthUser).id;
    const entity = await storage.getEntity(entityId);
    
    if (!entity) {
      throwNotFound("Entity");
    }
    
    if (entity.ownerId !== userId) {
      const accessLevel = await storage.getUserEntityAccess(userId, entityId);
      if (!accessLevel) {
        throwForbidden("You don't have access to this entity");
      }
    }
    
    // Get existing account
    const existingAccount = await storage.getAccount(accountId);
    
    if (!existingAccount) {
      throwNotFound("Account");
    }
    
    if (existingAccount.entityId !== entityId) {
      throwForbidden("Account does not belong to this entity");
    }
    
    // Check if account is used in journal entries
    const journalEntries = await storage.getJournalEntries(entityId);
    const journalEntryIds = journalEntries.map(entry => entry.id);
    
    // Check if account is used in any journal entry lines
    let hasJournalEntryLines = false;
    for (const entryId of journalEntryIds) {
      const lines = await storage.getJournalEntryLines(entryId);
      if (lines.some(line => line.accountId === accountId)) {
        hasJournalEntryLines = true;
        break;
      }
    }
    
    if (hasJournalEntryLines) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Cannot delete account as it is used in journal entries",
        canDeactivate: true
      });
    }
    
    // Delete account
    await storage.deleteAccount(accountId);
    
    // Return success
    res.status(HttpStatus.NO_CONTENT).end();
  }));
}