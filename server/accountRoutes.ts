import { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "./index";
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
  Account,
  journalEntryLines
} from "@shared/schema";
import { validateRequest } from "@shared/validation";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "./db";

// Type for authenticated user in request
interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

// Authentication middleware - simple check for user in session
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  // If user exists in session, they're authenticated
  if (req.user) {
    return next();
  }
  
  // No authenticated user
  return res.status(HttpStatus.UNAUTHORIZED).json({ message: "Unauthorized" });
};

// Register account routes
export function registerAccountRoutes(app: Express) {
  // Get all accounts for a client
  app.get("/api/clients/:clientId/accounts", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const clientId = parseInt(req.params.clientId);
    
    // Validate client ID
    if (isNaN(clientId) || clientId <= 0) {
      throwBadRequest("Invalid client ID");
    }
    
    // Validate user has access to client
    const userId = (req.user as AuthUser).id;
    const client = await storage.getClient(clientId);
    
    if (!client) {
      throwNotFound("Client");
    }
    
    if (client.userId !== userId && (req.user as AuthUser).role !== 'admin') {
      throwForbidden("You don't have access to this client");
    }
    
    // Get accounts from storage (now using clientId)
    const accounts = await storage.getAccounts(clientId);
    
    // Return accounts
    res.json(accounts);
  }));
  
  // Get account by ID
  app.get("/api/clients/:clientId/accounts/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const clientId = parseInt(req.params.clientId);
    const accountId = parseInt(req.params.id);
    
    // Validate IDs
    if (isNaN(clientId) || clientId <= 0) {
      throwBadRequest("Invalid client ID");
    }
    
    if (isNaN(accountId) || accountId <= 0) {
      throwBadRequest("Invalid account ID");
    }
    
    // Validate user has access to client
    const userId = (req.user as AuthUser).id;
    const client = await storage.getClient(clientId);
    
    if (!client) {
      throwNotFound("Client");
    }
    
    if (client.userId !== userId && (req.user as AuthUser).role !== 'admin') {
      throwForbidden("You don't have access to this client");
    }
    
    // Get account from storage
    const account = await storage.getAccount(accountId);
    
    if (!account) {
      throwNotFound("Account");
    }
    
    if (account.clientId !== clientId) {
      throwForbidden("Account does not belong to this client");
    }
    
    // Return account
    res.json(account);
  }));
  
  // Create a new account
  app.post("/api/clients/:clientId/accounts", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const clientId = parseInt(req.params.clientId);
    
    // Validate client ID
    if (isNaN(clientId) || clientId <= 0) {
      throwBadRequest("Invalid client ID");
    }
    
    // Validate user has access to client
    const userId = (req.user as AuthUser).id;
    const client = await storage.getClient(clientId);
    
    if (!client) {
      throwNotFound("Client");
    }
    
    if (client.userId !== userId && (req.user as AuthUser).role !== 'admin') {
      throwForbidden("You don't have access to this client");
    }
    
    // Validate request data
    const validationResult = validateRequest(
      enhancedAccountSchema,
      { ...req.body, clientId }
    );
    
    if (!validationResult.success) {
      return res.status(HttpStatus.BAD_REQUEST).json(validationResult.error);
    }
    
    const accountData = validationResult.data;
    
    // Check for duplicate account code
    const existingAccounts = await storage.getAccounts(clientId);
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
  app.put("/api/clients/:clientId/accounts/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const clientId = parseInt(req.params.clientId);
    const accountId = parseInt(req.params.id);
    
    // Validate IDs
    if (isNaN(clientId) || clientId <= 0) {
      throwBadRequest("Invalid client ID");
    }
    
    if (isNaN(accountId) || accountId <= 0) {
      throwBadRequest("Invalid account ID");
    }
    
    // Validate user has access to client
    const userId = (req.user as AuthUser).id;
    const client = await storage.getClient(clientId);
    
    if (!client) {
      throwNotFound("Client");
    }
    
    if (client.userId !== userId && (req.user as AuthUser).role !== 'admin') {
      throwForbidden("You don't have access to this client");
    }
    
    // Get existing account
    const existingAccount = await storage.getAccount(accountId);
    
    if (!existingAccount) {
      throwNotFound("Account");
    }
    
    if (existingAccount.clientId !== clientId) {
      throwForbidden("Account does not belong to this client");
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
      const existingAccounts = await storage.getAccounts(clientId);
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
  app.delete("/api/clients/:clientId/accounts/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const clientId = parseInt(req.params.clientId);
    const accountId = parseInt(req.params.id);
    
    // Validate IDs
    if (isNaN(clientId) || clientId <= 0) {
      throwBadRequest("Invalid client ID");
    }
    
    if (isNaN(accountId) || accountId <= 0) {
      throwBadRequest("Invalid account ID");
    }
    
    // Validate user has access to client
    const userId = (req.user as AuthUser).id;
    const client = await storage.getClient(clientId);
    
    if (!client) {
      throwNotFound("Client");
    }
    
    if (client.userId !== userId && (req.user as AuthUser).role !== 'admin') {
      throwForbidden("You don't have access to this client");
    }
    
    // Get existing account
    const existingAccount = await storage.getAccount(accountId);
    
    if (!existingAccount) {
      throwNotFound("Account");
    }
    
    if (existingAccount.clientId !== clientId) {
      throwForbidden("Account does not belong to this client");
    }
    
    // Check if account is used directly in any journal entry lines
    let hasJournalEntryLines = false;
    
    try {
      // Query the journal_entry_lines table directly to find any references to this account
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(journalEntryLines)
        .where(eq(journalEntryLines.accountId, accountId));
      
      // If count is more than 0, the account is in use
      const count = parseInt(result[0].count.toString());
      hasJournalEntryLines = count > 0;
    } catch (error) {
      console.error("Error checking journal entry lines:", error);
      throw error;
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