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
import Papa from "papaparse";
import multer from "multer";
import * as XLSX from "xlsx";

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

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
});

// Register account routes
export function registerAccountRoutes(app: Express) {
  // Export Chart of Accounts (CSV or Excel)
  app.get("/api/clients/:clientId/accounts/export", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    console.log("DEBUG: GET /api/clients/:clientId/accounts/export route hit");
    const clientId = parseInt(req.params.clientId);
    const format = (req.query.format as string || 'csv').toLowerCase();
    
    console.log(`DEBUG: Export request received for clientId=${clientId}, format=${format}`);
    
    // Validate format
    if (format !== 'csv' && format !== 'excel') {
      console.log(`DEBUG: Invalid format requested: ${format}`);
      throwBadRequest("Invalid format. Supported formats: csv, excel");
    }
    
    // Validate client ID
    if (isNaN(clientId) || clientId <= 0) {
      console.log(`DEBUG: Invalid client ID: ${clientId}`);
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
    
    try {
      // Get accounts for export
      const accounts = await storage.getAccountsForClient(clientId);
      
      // Build a map of account IDs to account objects for efficient parent lookup
      const accountMap = new Map();
      accounts.forEach(account => {
        accountMap.set(account.id, account);
      });
      
      // Format accounts for export with enhanced parent information
      const accountsData = accounts.map(account => {
        // Find parent account details if parentId exists
        const parentAccount = account.parentId ? accountMap.get(account.parentId) : null;
        
        return {
          Code: account.code,
          Name: account.name,
          Type: account.type,
          Subtype: account.subtype || '',
          IsSubledger: account.isSubledger ? 'Yes' : 'No',
          SubledgerType: account.subledgerType || '',
          Active: account.active ? 'Yes' : 'No',
          Description: account.description || '',
          ParentId: account.parentId || '',
          ParentCode: parentAccount ? parentAccount.code : '',
          ParentName: parentAccount ? parentAccount.name : ''
        };
      });
      
      // Sort by account code for better organization
      accountsData.sort((a, b) => a.Code.localeCompare(b.Code));
      
      if (format === 'csv') {
        // Generate CSV using PapaParse
        const csv = Papa.unparse(accountsData, {
          header: true,
          skipEmptyLines: true
        });
        
        // Set response headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="chart_of_accounts_${clientId}_${new Date().toISOString().slice(0,10)}.csv"`);
        
        // Send CSV response
        return res.send(csv);
      } else if (format === 'excel') {
        // Create Excel workbook using XLSX
        const worksheet = XLSX.utils.json_to_sheet(accountsData);
        
        // Column widths for better readability
        const columnWidths = [
          { wch: 10 },  // Code
          { wch: 30 },  // Name
          { wch: 15 },  // Type
          { wch: 20 },  // Subtype
          { wch: 12 },  // IsSubledger
          { wch: 20 },  // SubledgerType
          { wch: 10 },  // Active
          { wch: 40 },  // Description
          { wch: 10 },  // ParentId
          { wch: 10 },  // ParentCode
          { wch: 30 }   // ParentName
        ];
        
        worksheet['!cols'] = columnWidths;
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Chart of Accounts");
        
        // Generate Excel buffer
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // Set response headers for Excel download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="chart_of_accounts_${clientId}_${new Date().toISOString().slice(0,10)}.xlsx"`);
        
        // Send Excel response
        return res.send(excelBuffer);
      }
    } catch (error) {
      console.error("Error exporting accounts:", error);
      throw error;
    }
  }));
  
  // Generate Chart of Accounts import preview
  app.post("/api/clients/:clientId/accounts/import-preview", isAuthenticated, upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
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
    
    // Check if file was uploaded
    if (!req.file) {
      throwBadRequest("No file uploaded. Please provide a CSV file.");
    }
    
    // Check file type for CSV or Excel
    const fileName = req.file.originalname.toLowerCase();
    const isCSV = req.file.mimetype === 'text/csv' || fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    if (!isCSV && !isExcel) {
      throwBadRequest("Invalid file format. Please upload a CSV or Excel file.");
    }
    
    try {
      // Generate preview for the import file
      const preview = await storage.generateCoaImportPreview(clientId, req.file.buffer, fileName);
      
      res.json({
        status: "success",
        preview
      });
    } catch (error: any) {
      console.error("Error generating import preview:", error);
      throwBadRequest(`Error generating import preview: ${error.message || "Unknown error"}`);
    }
  }));

  // Import Chart of Accounts from CSV
  app.post("/api/clients/:clientId/accounts/import", isAuthenticated, upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
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
    
    // Check if file was uploaded
    if (!req.file) {
      throwBadRequest("No file uploaded. Please provide a CSV file.");
    }
    
    // Check file type for CSV or Excel
    const fileName = req.file.originalname.toLowerCase();
    const isCSV = req.file.mimetype === 'text/csv' || fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    if (!isCSV && !isExcel) {
      throwBadRequest("Invalid file format. Please upload a CSV or Excel file.");
    }
    
    try {
      // Extract selected changes if provided
      const selections = req.body.selections ? JSON.parse(req.body.selections) : null;
      
      // Process the imported file - pass the filename to determine type
      const result = await storage.importCoaForClient(clientId, req.file.buffer, fileName, selections);
      
      // Return success response with detailed import stats
      const message = `Successfully processed ${result.count} accounts: ${result.added} added, ${result.updated} updated, ${result.unchanged} unchanged, ${result.skipped} skipped, ${result.inactive} marked inactive.`;
      
      res.json({
        status: "success",
        message: message,
        count: result.count,
        added: result.added,
        updated: result.updated,
        unchanged: result.unchanged,
        skipped: result.skipped,
        inactive: result.inactive,
        errors: result.errors,
        warnings: result.warnings
      });
    } catch (error: any) {
      console.error("Error importing accounts:", error);
      throwBadRequest(`Error importing accounts: ${error.message || "Unknown error"}`);
    }
  }));
  // Get hierarchical account tree for a client (must come before /:id route)
  app.get("/api/clients/:clientId/accounts/tree", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
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
    
    // Get hierarchical account tree for client
    const accountTree = await storage.getAccountsTree(clientId);
    
    // Return account tree with success status
    res.json({
      status: "success",
      data: accountTree
    });
  }));
  
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
    console.log("DEBUG: POST /api/clients/:clientId/accounts route hit");
    const clientId = parseInt(req.params.clientId);
    console.log(`DEBUG: Create account request for clientId=${clientId}`, req.body);
    
    // Validate client ID
    if (isNaN(clientId) || clientId <= 0) {
      console.log(`DEBUG: Invalid client ID: ${clientId}`);
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