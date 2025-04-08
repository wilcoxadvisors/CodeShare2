import { Express, Request, Response } from "express";
import { z } from "zod";
import { DatabaseStorage, IStorage } from "./storage";
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

// Initialize storage
const storage: IStorage = new DatabaseStorage();

// Type for authenticated user in request
interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

// Authentication middleware - check for authentication using passport's isAuthenticated method
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  // Use both req.isAuthenticated() and req.user to ensure proper authentication
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    console.log("AUTH DEBUG: User authenticated in accountRoutes:", req.user);
    return next();
  }
  
  // Log authentication failure details
  console.log("AUTH DEBUG: Authentication failed in accountRoutes");
  console.log("AUTH DEBUG: req.isAuthenticated exists:", !!req.isAuthenticated);
  console.log("AUTH DEBUG: req.isAuthenticated():", req.isAuthenticated ? req.isAuthenticated() : false);
  console.log("AUTH DEBUG: req.user exists:", !!req.user);
  
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
  // For verification script - direct accounts endpoint
  app.get("/api/accounts/:clientId", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    console.log(`VERIFICATION TEST: GET /api/accounts/:clientId endpoint called for clientId=${req.params.clientId}`);
    const clientId = parseInt(req.params.clientId);
    
    if (isNaN(clientId) || clientId <= 0) {
      console.error(`VERIFICATION TEST: Invalid client ID: ${clientId}`);
      return res.status(400).json({ message: "Invalid client ID" });
    }
    
    try {
      // Check if user has access to this client (admin has access to all)
      const userId = (req.user as AuthUser).id;
      const userRole = (req.user as AuthUser).role;
      
      if (userRole !== 'admin') {
        const client = await storage.clients.getClient(clientId);
        if (!client || (client.userId !== userId)) {
          console.error(`VERIFICATION TEST: User ${userId} doesn't have access to client ${clientId}`);
          return res.status(403).json({ message: "You don't have access to this client" });
        }
      }
      
      // Get accounts for the client
      const accounts = await storage.accounts.getAccounts(clientId);
      console.log(`VERIFICATION TEST: Found ${accounts.length} accounts for client ${clientId}`);
      
      // Return the accounts as JSON array
      return res.json(accounts);
    } catch (error) {
      console.error(`VERIFICATION TEST: Error fetching accounts for client ${clientId}:`, error);
      throw error;
    }
  }));
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
    const client = await storage.clients.getClient(clientId);
    
    if (!client) {
      throwNotFound("Client");
    }
    
    if (client.userId !== userId && (req.user as AuthUser).role !== 'admin') {
      throwForbidden("You don't have access to this client");
    }
    
    try {
      // Get accounts for export
      const accounts = await storage.accounts.getAccounts(clientId);
      
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
          AccountCode: account.accountCode,
          Name: account.name,
          Type: account.type,
          Subtype: account.subtype || '',
          IsSubledger: account.isSubledger ? 'Yes' : 'No',
          SubledgerType: account.subledgerType || '',
          Active: account.active ? 'Yes' : 'No',
          Description: account.description || '',
          ParentId: account.parentId || '',
          ParentCode: parentAccount ? parentAccount.accountCode : '',
          ParentName: parentAccount ? parentAccount.name : ''
        };
      });
      
      // Sort by account code for better organization
      accountsData.sort((a, b) => a.AccountCode.localeCompare(b.AccountCode));
      
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
    const client = await storage.clients.getClient(clientId);
    
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
      const preview = await storage.accounts.generateCoaImportPreview(clientId, req.file.buffer, fileName);
      
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
    const client = await storage.clients.getClient(clientId);
    
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
      const result = await storage.accounts.importCoaForClient(clientId, req.file.buffer, fileName, selections);
      
      // Check if import was successful
      if (!result.success) {
        // Construct a more detailed error message that includes import stats
        const detailedMessage = result.message || "Import failed";
        const statsMessage = `Successfully imported: ${result.added || 0} added, ${result.updated || 0} updated, ${result.reactivated || 0} reactivated, ${result.inactive || 0} deactivated, ${result.deleted || 0} deleted`;
        
        // Return error response when the import fails but we have detailed information
        return res.status(400).json({
          status: "error",
          message: `${detailedMessage}: ${statsMessage}`,
          detailedMessage: detailedMessage, // Keep the original message also for reference
          statsMessage: statsMessage,
          errors: result.errors || [],
          warnings: result.warnings || [],
          count: result.count || 0,
          added: result.added || 0,
          updated: result.updated || 0,
          reactivated: result.reactivated || 0,
          unchanged: result.unchanged || 0,
          skipped: result.skipped || 0,
          inactive: result.inactive || 0,
          deleted: result.deleted || 0
        });
      }
      
      // Return success response with detailed import stats
      const message = `Successfully processed ${result.count} accounts: ${result.added} added, ${result.updated} updated, ${result.reactivated || 0} reactivated, ${result.unchanged} unchanged, ${result.skipped} skipped, ${result.inactive} marked inactive, ${result.deleted} deleted.`;
      
      res.json({
        status: "success",
        message: message,
        count: result.count,
        added: result.added,
        updated: result.updated,
        reactivated: result.reactivated || 0, // Include reactivated accounts count
        unchanged: result.unchanged,
        skipped: result.skipped,
        inactive: result.inactive,
        deleted: result.deleted,
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
    console.log(`VERIFICATION TEST: GET /api/clients/:clientId/accounts/tree API endpoint called for clientId=${req.params.clientId}`);
    const clientId = parseInt(req.params.clientId);
    
    // Validate client ID
    if (isNaN(clientId) || clientId <= 0) {
      console.log(`VERIFICATION TEST: Invalid client ID: ${clientId}`);
      throwBadRequest("Invalid client ID");
    }
    
    // Validate user has access to client
    const userId = (req.user as AuthUser).id;
    const client = await storage.clients.getClient(clientId);
    
    if (!client) {
      console.log(`VERIFICATION TEST: Client not found for ID: ${clientId}`);
      throwNotFound("Client");
    }
    
    if (client.userId !== userId && (req.user as AuthUser).role !== 'admin') {
      console.log(`VERIFICATION TEST: Access forbidden - user ${userId} does not have access to client ${clientId}`);
      throwForbidden("You don't have access to this client");
    }
    
    console.log(`VERIFICATION TEST: Authorization passed, fetching account tree for client ${clientId}`);
    
    // Get hierarchical account tree for client
    const accountTree = await storage.accounts.getAccountsTree(clientId);
    console.log(`VERIFICATION TEST: Account tree fetched with ${accountTree.length} root nodes`);
    
    // Return account tree with success status
    res.json({
      status: "success",
      data: accountTree
    });
  }));
  
  // Get all accounts for a client
  app.get("/api/clients/:clientId/accounts", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    console.log(`VERIFICATION TEST: GET /api/clients/:clientId/accounts API endpoint called for clientId=${req.params.clientId}`);
    const clientId = parseInt(req.params.clientId);
    
    // Validate client ID
    if (isNaN(clientId) || clientId <= 0) {
      console.log(`VERIFICATION TEST: Invalid client ID: ${clientId}`);
      throwBadRequest("Invalid client ID");
    }
    
    // Validate user has access to client
    const userId = (req.user as AuthUser).id;
    const client = await storage.clients.getClient(clientId);
    
    if (!client) {
      console.log(`VERIFICATION TEST: Client not found for ID: ${clientId}`);
      throwNotFound("Client");
    }
    
    if (client.userId !== userId && (req.user as AuthUser).role !== 'admin') {
      console.log(`VERIFICATION TEST: Access forbidden - user ${userId} does not have access to client ${clientId}`);
      throwForbidden("You don't have access to this client");
    }
    
    console.log(`VERIFICATION TEST: Authorization passed, fetching accounts for client ${clientId}`);
    
    // Get accounts from storage (now using clientId)
    const accounts = await storage.accounts.getAccounts(clientId);
    console.log(`VERIFICATION TEST: Fetched ${accounts.length} accounts for client ${clientId}`);
    
    // Enhanced debugging
    if (accounts.length > 0) {
      console.log(`VERIFICATION TEST: First account example - ${accounts[0].accountCode} - ${accounts[0].name}`);
    } else {
      console.log(`VERIFICATION TEST: WARNING - No accounts found for client ${clientId}`);
    }
    
    // Return accounts with the expected structure
    res.json({ accounts });
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
    const client = await storage.clients.getClient(clientId);
    
    if (!client) {
      throwNotFound("Client");
    }
    
    if (client.userId !== userId && (req.user as AuthUser).role !== 'admin') {
      throwForbidden("You don't have access to this client");
    }
    
    // Get account from storage
    const account = await storage.accounts.getAccount(accountId);
    
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
    console.log("VERIFICATION TEST: POST /api/clients/:clientId/accounts route hit");
    const clientId = parseInt(req.params.clientId);
    console.log(`VERIFICATION TEST: Create account request for clientId=${clientId}`, JSON.stringify(req.body, null, 2));
    
    // Validate client ID
    if (isNaN(clientId) || clientId <= 0) {
      console.log(`VERIFICATION TEST: Invalid client ID: ${clientId}`);
      throwBadRequest("Invalid client ID");
    }
    
    // Validate user has access to client
    const userId = (req.user as AuthUser).id;
    const client = await storage.clients.getClient(clientId);
    
    if (!client) {
      console.log(`VERIFICATION TEST: Client not found for ID: ${clientId}`);
      throwNotFound("Client");
    }
    
    if (client.userId !== userId && (req.user as AuthUser).role !== 'admin') {
      console.log(`VERIFICATION TEST: Access forbidden - user ${userId} does not have access to client ${clientId}`);
      throwForbidden("You don't have access to this client");
    }
    
    console.log(`VERIFICATION TEST: User ${userId} has access to client ${clientId}`);
    
    // Validate request data
    const validationResult = validateRequest(
      enhancedAccountSchema,
      { ...req.body, clientId }
    );
    
    if (!validationResult.success) {
      console.log(`VERIFICATION TEST: Validation failed:`, validationResult.error);
      return res.status(HttpStatus.BAD_REQUEST).json(validationResult.error);
    }
    
    const accountData = validationResult.data;
    console.log(`VERIFICATION TEST: Validated account data:`, JSON.stringify(accountData, null, 2));
    
    // Check for duplicate account code
    const existingAccounts = await storage.accounts.getAccounts(clientId);
    console.log(`VERIFICATION TEST: Found ${existingAccounts.length} existing accounts for client ${clientId}`);
    const isDuplicateCode = existingAccounts.some(
      acc => acc.accountCode === accountData.accountCode
    );
    
    if (isDuplicateCode) {
      console.log(`VERIFICATION TEST: Duplicate account code detected: ${accountData.accountCode}`);
      throwBadRequest("Account code already exists. Please use a unique code.");
    }
    
    // Create account
    console.log(`VERIFICATION TEST: Calling storage.accounts.createAccount with:`, JSON.stringify(accountData, null, 2));
    
    // Cast the type string to AccountType enum
    const accountDataWithCorrectType = {
      ...accountData,
      type: accountData.type as AccountType
    };
    
    const account = await storage.accounts.createAccount(accountDataWithCorrectType);
    console.log(`VERIFICATION TEST: Account created successfully:`, JSON.stringify(account, null, 2));
    
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
    const client = await storage.clients.getClient(clientId);
    
    if (!client) {
      throwNotFound("Client");
    }
    
    if (client.userId !== userId && (req.user as AuthUser).role !== 'admin') {
      throwForbidden("You don't have access to this client");
    }
    
    // Get existing account
    const existingAccount = await storage.accounts.getAccount(accountId);
    
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
    
    // Check for duplicate account code if accountCode is being updated
    if (updateData.accountCode && updateData.accountCode !== existingAccount.accountCode) {
      const existingAccounts = await storage.accounts.getAccounts(clientId);
      const isDuplicateCode = existingAccounts.some(
        acc => acc.accountCode === updateData.accountCode && acc.id !== accountId
      );
      
      if (isDuplicateCode) {
        throwBadRequest("Account code already exists. Please use a unique code.");
      }
    }
    
    // Cast the type property to AccountType enum if it exists
    const updateDataWithCorrectType = {
      ...updateData,
      type: updateData.type ? (updateData.type as AccountType) : undefined
    };
    
    // Check if account has transactions
    const hasTransactions = await storage.accounts.accountHasTransactions(accountId);
    
    console.log(`DEBUG: Account ${accountId} has transactions: ${hasTransactions}`);
    
    // If account has transactions, restrict certain field updates
    if (hasTransactions) {
      // Create a list of restricted fields that can't be updated when transactions exist
      const restrictedFields = ['accountCode', 'type'];
      const attemptedRestrictedUpdates = Object.keys(updateDataWithCorrectType)
        .filter(field => restrictedFields.includes(field) && updateDataWithCorrectType[field] !== undefined);
      
      console.log(`DEBUG: Attempted restricted updates: ${JSON.stringify(attemptedRestrictedUpdates)}`);
      
      // If user is trying to update restricted fields, block the update with clear error message
      if (attemptedRestrictedUpdates.length > 0) {
        console.log(`DEBUG: Blocking update of restricted fields: ${attemptedRestrictedUpdates.join(', ')}`);
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: `Cannot update ${attemptedRestrictedUpdates.join(', ')} for account with existing transactions`,
          restrictedFields: attemptedRestrictedUpdates,
          hasTransactions: true
        });
      }
      
      console.log("DEBUG: Account has transactions but requested update is allowed");
    } else {
      console.log("DEBUG: Account has no transactions, all updates permitted");
    }
    
    // Update account
    const updatedAccount = await storage.accounts.updateAccount(accountId, clientId, updateDataWithCorrectType);
    
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
    const client = await storage.clients.getClient(clientId);
    
    if (!client) {
      throwNotFound("Client");
    }
    
    if (client.userId !== userId && (req.user as AuthUser).role !== 'admin') {
      throwForbidden("You don't have access to this client");
    }
    
    // Get existing account
    const existingAccount = await storage.accounts.getAccount(accountId);
    
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
    await storage.accounts.deleteAccount(accountId, clientId);
    
    // Return success
    res.status(HttpStatus.NO_CONTENT).end();
  }));
  
  // Special debugging route to seed Chart of Accounts for a client
  app.post("/api/clients/:clientId/seed-coa", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log("DEBUG: Manual seed CoA route called");
      const clientId = parseInt(req.params.clientId);
      
      // Verify client exists
      const client = await storage.clients.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Check if accounts already exist
      const existingAccounts = await storage.accounts.getAccounts(clientId);
      console.log(`DEBUG: Client ${clientId} has ${existingAccounts.length} existing accounts`);
      
      if (existingAccounts.length > 0) {
        return res.json({ 
          message: `Client ${clientId} already has ${existingAccounts.length} accounts.`,
          success: false,
          accountCount: existingAccounts.length
        });
      }
      
      console.log(`DEBUG: Manually seeding CoA for client ${clientId}`);
      await storage.accounts.seedClientCoA(clientId);
      
      // Verify accounts were created
      const newAccounts = await storage.accounts.getAccounts(clientId);
      console.log(`DEBUG: After seeding, client ${clientId} now has ${newAccounts.length} accounts`);
      
      return res.json({ 
        message: `Successfully seeded ${newAccounts.length} accounts for client ${clientId}`,
        success: true,
        accountCount: newAccounts.length
      });
    } catch (error: any) {
      console.error(`Error manually seeding CoA:`, error);
      return res.status(500).json({ 
        message: `Error seeding CoA: ${error.message}`,
        success: false,
        error: error.message
      });
    }
  }));
  
  // IMPORTANT: Helper endpoint to diagnose automatic seeding issues
  app.get('/api/diagnostic/seeding-issues', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    // This endpoint provides a detailed diagnostic analysis of why automatic CoA seeding might fail
    try {
      const summary = {
        message: "Diagnostic information for CoA seeding",
        adminEndpoint: {
          status: "Working",
          details: "The /api/admin/clients POST endpoint successfully creates clients and seeds their Chart of Accounts"
        },
        regularEndpoint: {
          status: "Failing silently",
          details: "The /api/clients POST endpoint creates clients but fails to seed accounts"
        },
        manualEndpoint: {
          status: "Working",
          details: "The /api/clients/:clientId/seed-coa endpoint successfully seeds accounts for existing clients"
        },
        rootCauseAnalysis: [
          "Timing issues with async operations when creating new clients and entities",
          "Potential database transaction isolation problems causing parent-child relationships to fail",
          "Multiple concurrent operations within the same request may be interfering with each other"
        ],
        currentWorkaround: [
          "Use the manual seeding endpoint after client creation",
          "All new clients should run: POST /api/clients/:clientId/seed-coa after creation to ensure accounts exist"
        ],
        recommendations: [
          "Continue using the manual seeding endpoint until the automatic seeding is fixed",
          "Consider refactoring client creation to use explicit transaction management",
          "Consider creating a job queue for CoA seeding to run after client creation completes"
        ]
      };
      
      return res.json(summary);
    } catch (error) {
      console.error("Error in diagnostic endpoint:", error);
      res.status(500).json({ 
        success: false,
        message: "Error generating diagnostic information"
      });
    }
  }));

  // Add endpoint to check if an account has transactions
  app.get('/api/clients/:clientId/accounts/transactions-check/:accountId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const clientId = parseInt(req.params.clientId);
    const accountId = parseInt(req.params.accountId);
    
    // Check client exists
    const client = await storage.clients.getClient(clientId);
    if (!client) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: "Client not found" });
    }
    
    // Skip account verification here since we'll get transaction check errors if it doesn't exist
    
    // Check if account has transactions
    const hasTransactions = await storage.accounts.accountHasTransactions(accountId);
    
    return res.json({
      accountId,
      hasTransactions,
      message: hasTransactions 
        ? "Account has existing transactions" 
        : "Account has no transactions"
    });
  }));
}