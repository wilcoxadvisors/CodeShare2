// server/storage/accountStorage.ts
import { db } from "../db"; // Adjust path if db connection is elsewhere
import {
    accounts, Account, InsertAccount, AccountType,
    journalEntryLines, clients // Needed for client verification and delete check
} from "../../shared/schema"; // Adjust path to schema
import { eq, and, desc, asc, sql, count, inArray, gt } from "drizzle-orm";
import { standardCoaTemplate } from "../coaTemplate"; // Adjust path
import { ApiError } from "../errorHandling"; // Adjust path
// For file processing in importCoaForClient
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Interface definitions for account import functionality
export interface ImportPreview {
    totalRows: number;
    sampleRows: Record<string, any>[];
    detectedColumns: string[];
    warnings: string[];
    errors: string[];
}

export interface ImportSelections {
    columnMappings: Record<string, string>;
    skipRows?: number[];
    updateExisting?: boolean;
}

export interface ImportResult {
    success: boolean;
    message: string;
    results?: any;
    errors: string[];
    warnings: string[];
    count?: number;
    added?: number;
    updated?: number;
    unchanged?: number;
    skipped?: number;
    failed?: number;
    accountIds?: number[];
    inactive?: number;
    deleted?: number;
}

// Helper function to handle database errors consistently
function handleDbError(error: unknown, operation: string): Error {
    console.error(`Database error during ${operation}:`, error);
    if (error instanceof ApiError) {
        return error;
    }
    
    // Check if it's a unique constraint violation
    const errorStr = String(error);
    if (errorStr.includes('unique constraint') || errorStr.includes('duplicate key')) {
        return new ApiError(409, `A conflict occurred: ${errorStr}`);
    }
    
    return new ApiError(500, `Database error during ${operation}`);
}

// Define interface for hierarchical account structure
export interface AccountTreeNode extends Account {
  children: AccountTreeNode[];
}

// Define interface specifically for Account storage operations
export interface IAccountStorage {
    seedClientCoA(clientId: number): Promise<void>;
    getAccount(id: number): Promise<Account | undefined>;
    getAccounts(clientId: number): Promise<Account[]>;
    getAccountsByType(clientId: number, type: AccountType): Promise<Account[]>;
    getAccountsByClientId(clientId: number): Promise<Account[]>;
    getAccountsTree(clientId: number): Promise<AccountTreeNode[]>;
    createAccount(accountData: Omit<Account, 'id' | 'active' | 'createdAt' | 'updatedAt'>): Promise<Account>;
    getAccountById(accountId: number, clientId: number): Promise<Account | undefined>;
    updateAccount(accountId: number, clientId: number, accountData: Partial<Omit<Account, 'id' | 'clientId' | 'active' | 'createdAt' | 'updatedAt'>>): Promise<Account | null>;
    deleteAccount(accountId: number, clientId: number): Promise<boolean>; // Soft delete
    markAccountInactive(id: number, clientId: number): Promise<Account | undefined>; // Mark account as inactive instead of deleting
    generateCoaImportPreview(clientId: number, fileBuffer: Buffer, fileName: string): Promise<ImportPreview>; // Import preview
    importCoaForClient(clientId: number, fileBuffer: Buffer, fileName: string, selections?: ImportSelections | null): Promise<ImportResult>; // Refined return type
    exportCoaForClient(clientId: number): Promise<any[]>; // Return type depends on export format needs
    accountHasTransactions(id: number): Promise<boolean>; // Helper
}

// Implementation using Database
export class AccountStorage implements IAccountStorage {
    // Methods that match the IStorage interface for delegation
    async getAccount(id: number): Promise<Account | undefined> {
        console.log(`Getting account by ID ${id}`);
        try {
            const [account] = await db.select()
                .from(accounts)
                .where(eq(accounts.id, id))
                .limit(1);
            return account;
        } catch (e) {
            throw handleDbError(e, `getting account by ID ${id}`);
        }
    }
    
    async getAccounts(clientId: number): Promise<Account[]> {
        // This delegates to our existing getAccountsByClientId method
        return this.getAccountsByClientId(clientId);
    }
    
    async getAccountsByType(clientId: number, type: AccountType): Promise<Account[]> {
        console.log(`Getting accounts of type ${type} for client ${clientId}`);
        try {
            return await db.select()
                .from(accounts)
                .where(and(
                    eq(accounts.clientId, clientId),
                    eq(accounts.type, type),
                    eq(accounts.active, true)
                ))
                .orderBy(accounts.accountCode);
        } catch (e) {
            throw handleDbError(e, `getting accounts by type ${type} for client ${clientId}`);
        }
    }
    
    // Define interface for import preview result
    async generateCoaImportPreview(clientId: number, fileBuffer: Buffer, fileName: string): Promise<ImportPreview> {
        console.log(`Generating CoA import preview for client ${clientId}, file: ${fileName}`);
        try {
            const fileExt = fileName.split('.').pop()?.toLowerCase();
            const isExcel = fileExt === 'xlsx' || fileExt === 'xls';
            
            // Data structure to store preview results
            const preview: ImportPreview = {
                totalRows: 0,
                sampleRows: [],
                detectedColumns: [],
                warnings: [],
                errors: []
            };
            
            if (isExcel) {
                // Process Excel file
                const XLSX = require('xlsx');
                const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (data.length < 2) {
                    preview.errors.push('File contains no data rows. Please ensure the file has header and data rows.');
                    return preview;
                }
                
                // Extract headers (first row)
                const headers = data[0] as string[];
                preview.detectedColumns = headers.map(h => String(h).trim());
                
                // Check for required columns
                this.validateRequiredColumns(preview);
                
                // Sample rows (up to 5)
                const dataRows = data.slice(1) as any[];
                preview.totalRows = dataRows.length;
                preview.sampleRows = dataRows.slice(0, 5).map((row) => {
                    const rowObj: Record<string, any> = {};
                    headers.forEach((header, index) => {
                        rowObj[header] = row[index];
                    });
                    return rowObj;
                });
            } else {
                // Process CSV file with PapaParse
                const Papa = require('papaparse');
                const parseResult = Papa.parse(fileBuffer.toString(), {
                    header: true,
                    skipEmptyLines: true
                });
                
                if (parseResult.errors && parseResult.errors.length > 0) {
                    preview.errors = parseResult.errors.map((err: any) => `CSV parsing error: ${err.message} at row ${err.row}`);
                }
                
                if (parseResult.data.length === 0) {
                    preview.errors.push('File contains no data rows. Please ensure the file has header and data rows.');
                    return preview;
                }
                
                // Extract headers from the first row
                preview.detectedColumns = Object.keys(parseResult.data[0] as object).map(h => h.trim());
                
                // Check for required columns
                this.validateRequiredColumns(preview);
                
                // Sample rows (up to 5)
                preview.totalRows = parseResult.data.length;
                preview.sampleRows = parseResult.data.slice(0, 5) as Record<string, any>[];
            }
            
            return preview;
        } catch (e) {
            throw handleDbError(e, `generating CoA import preview for client ${clientId}`);
        }
    }
    
    // Helper method to validate required columns
    private validateRequiredColumns(preview: ImportPreview): void {
        const requiredColumns = ['name', 'accountCode', 'type'];
        const missingColumns = requiredColumns.filter(col => 
            !preview.detectedColumns.some((header: string) => 
                header.toLowerCase() === col.toLowerCase() ||
                header.toLowerCase() === col.replace(/([A-Z])/g, '_$1').toLowerCase()
            )
        );
        
        if (missingColumns.length > 0) {
            preview.warnings.push(`Missing required columns: ${missingColumns.join(', ')}. These columns are required for account creation.`);
        }
    }

    // Helper method to normalize account types from imported data
    private normalizeAccountType(type: string): AccountType {
      if (!type) {
        throw new Error("Account type is required");
      }
      const upperType = type.trim().toUpperCase();
      // Add more robust mapping if needed
      if (upperType === 'ASSET' || upperType === 'ASSETS') return AccountType.ASSET;
      if (upperType === 'LIABILITY' || upperType === 'LIABILITIES') return AccountType.LIABILITY;
      if (upperType === 'EQUITY') return AccountType.EQUITY;
      if (upperType === 'REVENUE' || upperType === 'INCOME' || upperType === 'REVENUES' || upperType === 'INCOMES') return AccountType.REVENUE;
      if (upperType === 'EXPENSE' || upperType === 'EXPENSES') return AccountType.EXPENSE;

      throw new Error(`Invalid account type: ${type}`);
    }

    // Helper method to parse boolean flags from import data
    private parseBooleanFlag(value: any, defaultValue: boolean = false): boolean {
         if (value === undefined || value === null) return defaultValue;
         if (typeof value === 'boolean') return value;
         const normalizedValue = String(value).toLowerCase().trim();
         return ['true', '1', 'yes', 'y'].includes(normalizedValue);
    }

     // Helper method to get value case-insensitively from import row
     private getCaseInsensitiveValue(row: any, fieldName: string): any {
         if (!row) return null;
         const lowerFieldName = fieldName.toLowerCase();
         for (const key in row) {
             if (key.toLowerCase() === lowerFieldName) {
                 return row[key];
             }
         }
         // Add variations if needed (e.g., account_code vs accountCode)
         if(fieldName === 'accountCode') return row['account_code'] ?? row['Account Code'] ?? row['code'] ?? null; // Added legacy 'code'
         if(fieldName === 'parentCode') return row['parent_code'] ?? row['Parent Code'] ?? row['parent'] ?? null; // Added legacy 'parent'

         return null;
     }

     // Helper method to get parent code from row
     private getParentCode(row: any): string | null {
         const parentCodeValue = this.getCaseInsensitiveValue(row, 'parentCode');
         if (parentCodeValue !== null && parentCodeValue !== undefined && String(parentCodeValue).trim() !== '') {
           const trimmed = String(parentCodeValue).trim();
           if (trimmed) {
             return trimmed;
           }
         }
         return null;
     }

    private parseIsSubledger(row: any, existingAccount?: Account): boolean {
        const isSubledgerField = this.getCaseInsensitiveValue(row, 'isSubledger') ?? this.getCaseInsensitiveValue(row, 'is_subledger');
        if (isSubledgerField === undefined && existingAccount) {
          return existingAccount.isSubledger ?? false; // Default to false if null/undefined in existing
        }
        return this.parseBooleanFlag(isSubledgerField, false); // Default to false if not provided/invalid
    }

     private getSubledgerType(row: any, existingAccount?: Account): string | null {
        const subledgerType = this.getCaseInsensitiveValue(row, 'subledgerType') ?? this.getCaseInsensitiveValue(row, 'subledger_type');
        if (subledgerType) {
            const trimmed = String(subledgerType).trim();
            return trimmed !== '' ? trimmed : null;
        }
        if (existingAccount) {
          return existingAccount.subledgerType;
        }
        return null;
    }


    async seedClientCoA(clientId: number): Promise<void> {
        // Implementation copied from DatabaseStorage in original storage.ts
         console.log(`Attempting to seed CoA for client ${clientId}`);
         try {
            await db.transaction(async (tx) => {
                const existingAccounts = await tx.select({ id: accounts.id })
                                                .from(accounts)
                                                .where(eq(accounts.clientId, clientId))
                                                .limit(1);

                if (existingAccounts.length > 0) {
                    console.log(`CoA already seeded for client ${clientId}. Skipping.`);
                    return;
                }

                console.log(`Seeding standard CoA for client ${clientId}...`);
                const accountMap = new Map<string, number>(); // Maps template ID to actual DB ID

                const insertedIds: { templateCode: string, dbId: number, parentTemplateCode?: string | null }[] = [];
                for (const acc of standardCoaTemplate) {
                     const accountData = { // Using the exact schema fields
                        clientId: clientId,
                        accountCode: acc.accountCode,
                        name: acc.name,
                        type: acc.type,
                        parentId: null, // Insert with null parent first, set in a second pass
                        subtype: acc.subtype,
                        isSubledger: acc.isSubledger ?? false,
                        subledgerType: acc.subledgerType,
                        active: true,
                        description: acc.description ?? '',
                    };
                     const inserted = await tx.insert(accounts).values(accountData).returning({ id: accounts.id });
                     if (inserted.length > 0) {
                         const dbId = inserted[0].id;
                         accountMap.set(acc.accountCode, dbId); // Map account code to actual DB ID
                         insertedIds.push({ templateCode: acc.accountCode, dbId: dbId, parentTemplateCode: acc.parentCode });
                    } else {
                         console.error("Failed to insert account during seeding:", acc);
                         throw new Error(`Failed to insert account ${acc.accountCode} for client ${clientId}`);
                    }
                }

                const parentUpdates: Promise<any>[] = [];
                for (const item of insertedIds) {
                     if (item.parentTemplateCode) {
                         const parentDbId = accountMap.get(item.parentTemplateCode);
                         if (parentDbId) {
                             parentUpdates.push(
                                 tx.update(accounts)
                                   .set({ parentId: parentDbId })
                                   .where(eq(accounts.id, item.dbId))
                             );
                         } else {
                             console.warn(`Could not find parent DB ID for template parent code ${item.parentTemplateCode} when seeding for client ${clientId}`);
                         }
                     }
                 }
                 await Promise.all(parentUpdates);


                console.log(`Successfully seeded ${standardCoaTemplate.length} accounts for client ${clientId}.`);
            });
         } catch (e) {
             throw handleDbError(e, `seeding CoA for client ${clientId}`);
         }
    }

    async getAccountsByClientId(clientId: number): Promise<Account[]> {
        // Implementation copied from DatabaseStorage in original storage.ts
         console.log(`Getting accounts for client ${clientId}`);
         try {
             return await db.select()
                            .from(accounts)
                            .where(and(eq(accounts.clientId, clientId), eq(accounts.active, true))) // Only active
                            .orderBy(accounts.accountCode);
         } catch (e) {
             throw handleDbError(e, `Getting accounts for client ${clientId}`);
         }
    }

    async getAccountsTree(clientId: number): Promise<AccountTreeNode[]> {
        // Implementation copied from DatabaseStorage in original storage.ts
        console.log(`Getting accounts tree for client ${clientId}`);
        try {
            const allAccounts = await db.select()
                                        .from(accounts)
                                        .where(and(eq(accounts.clientId, clientId), eq(accounts.active, true)))
                                        .orderBy(accounts.accountCode);

            const accountMap: { [key: number]: AccountTreeNode } = {}; // Use AccountTreeNode
            const rootAccounts: AccountTreeNode[] = [];

            allAccounts.forEach(account => {
                accountMap[account.id] = { ...account, children: [] };
            });

            allAccounts.forEach(account => {
                if (account.parentId && accountMap[account.parentId]) {
                    accountMap[account.parentId].children.push(accountMap[account.id]);
                } else {
                    rootAccounts.push(accountMap[account.id]);
                }
            });

            return rootAccounts;
        } catch (e) {
            throw handleDbError(e, `getting accounts tree for client ${clientId}`);
        }
    }

     async getAccountById(accountId: number, clientId: number): Promise<Account | undefined> {
         console.log(`Getting account ${accountId} for client ${clientId}`);
         try {
             const [account] = await db.select()
                 .from(accounts)
                 .where(and(eq(accounts.id, accountId), eq(accounts.clientId, clientId)))
                 .limit(1);
             return account;
         } catch (e) {
             console.error(`Error getting account by ID ${accountId}:`, e);
             return undefined;
         }
     }

    async createAccount(accountData: Omit<Account, 'id' | 'active' | 'createdAt' | 'updatedAt'>): Promise<Account> {
        // Implementation copied from DatabaseStorage in original storage.ts
         console.log(`Creating account '${accountData.name}' (${accountData.accountCode}) for client ${accountData.clientId}`);
         try {
              if (accountData.parentId) {
                  const parent = await db.select({id: accounts.id})
                                         .from(accounts)
                                         .where(and(eq(accounts.id, accountData.parentId), eq(accounts.clientId, accountData.clientId), eq(accounts.active, true)))
                                         .limit(1);
                  if(parent.length === 0) {
                     throw new ApiError(400, `Parent account ID ${accountData.parentId} not found or inactive for client ${accountData.clientId}.`);
                  }
              }

             const dataToInsert = {
                 ...accountData,
                 active: true, // Default to active
                 description: accountData.description ?? '',
             };

             const [account] = await db.insert(accounts)
                 .values(dataToInsert)
                 .returning();

             return account;
         } catch (e) {
             throw handleDbError(e, `creating account ${accountData.accountCode} for client ${accountData.clientId}`);
         }
    }

    async updateAccount(accountId: number, clientId: number, 
                       accountData: Partial<Omit<Account, 'id' | 'clientId' | 'active' | 'createdAt' | 'updatedAt'>>): Promise<Account | null> {
        // Implementation copied from DatabaseStorage in original storage.ts
         console.log(`Updating account ${accountId} for client ${clientId}`);
         try {
             // Check if account exists
             const existingAccount = await this.getAccountById(accountId, clientId);
             if (!existingAccount) {
                 throw new ApiError(404, `Account with ID ${accountId} not found for client ${clientId}.`);
             }

             // Check parent if it's being updated
             if (accountData.parentId) {
                 const parent = await db.select({ id: accounts.id })
                     .from(accounts)
                     .where(and(eq(accounts.id, accountData.parentId), eq(accounts.clientId, clientId), eq(accounts.active, true)))
                     .limit(1);

                 if (parent.length === 0) {
                     throw new ApiError(400, `Parent account ID ${accountData.parentId} not found or inactive for client ${clientId}.`);
                 }

                 // Prevent circular references
                 if (accountData.parentId === accountId) {
                     throw new ApiError(400, "An account cannot be its own parent.");
                 }
             }

             const [updatedAccount] = await db.update(accounts)
                 .set(accountData)
                 .where(and(eq(accounts.id, accountId), eq(accounts.clientId, clientId)))
                 .returning();

             return updatedAccount || null;
         } catch (e) {
             throw handleDbError(e, `updating account ${accountId} for client ${clientId}`);
         }
    }

    async deleteAccount(accountId: number, clientId: number): Promise<boolean> {
        // Implementation copied from DatabaseStorage in original storage.ts
         console.log(`Soft deleting account ${accountId} for client ${clientId}`);
         try {
             // Check if account exists and is not already inactive
             const existingAccount = await this.getAccountById(accountId, clientId);
             if (!existingAccount) {
                 throw new ApiError(404, `Account with ID ${accountId} not found for client ${clientId}.`);
             }
             
             if (!existingAccount.active) {
                 throw new ApiError(400, `Account ${accountId} is already inactive.`);
             }

             // Check if account has child accounts
             const childAccounts = await db.select({ id: accounts.id })
                 .from(accounts)
                 .where(and(eq(accounts.parentId, accountId), eq(accounts.clientId, clientId), eq(accounts.active, true)))
                 .limit(1);

             if (childAccounts.length > 0) {
                 throw new ApiError(400, `Cannot delete account ${accountId} because it has active child accounts.`);
             }

             // Check if account is used in transactions
             const hasTransactions = await this.accountHasTransactions(accountId);
             if (hasTransactions) {
                 throw new ApiError(400, `Cannot delete account ${accountId} because it is used in transactions. Mark it as inactive instead.`);
             }

             // Soft delete the account by marking it inactive
             await db.update(accounts)
                 .set({ active: false })
                 .where(and(eq(accounts.id, accountId), eq(accounts.clientId, clientId)));

             return true;
         } catch (e) {
             throw handleDbError(e, `deleting account ${accountId} for client ${clientId}`);
         }
    }

    async accountHasTransactions(id: number): Promise<boolean> {
        // Implementation copied from DatabaseStorage in original storage.ts
        console.log(`DEBUG: AccountStorage.accountHasTransactions for account ${id}`);
        try {
             // Check if account is used in any journal entry lines
             const usageCount = await db.select({ count: sql<number>`count(*)` })
                 .from(journalEntryLines)
                 .where(eq(journalEntryLines.accountId, id))
                 .limit(1);

             return usageCount[0]?.count > 0;
         } catch (e) {
             throw handleDbError(e, `checking if account ${id} has transactions`);
         }
    }
    
    async markAccountInactive(id: number, clientId: number): Promise<Account | undefined> {
        console.log(`Marking account ${id} as inactive for client ${clientId}`);
        // Add additional debugging log
        console.log(`DEBUG: AccountStorage.markAccountInactive for account ${id}, client ${clientId}`);
        try {
            // Check if account exists and is not already inactive
            const existingAccount = await this.getAccountById(id, clientId);
            if (!existingAccount) {
                throw new ApiError(404, `Account with ID ${id} not found for client ${clientId}.`);
            }
            
            if (!existingAccount.active) {
                return existingAccount; // Already inactive, just return it
            }
            
            // Set the account to inactive
            const [updatedAccount] = await db.update(accounts)
                .set({ active: false })
                .where(and(eq(accounts.id, id), eq(accounts.clientId, clientId)))
                .returning();
            
            return updatedAccount;
        } catch (e) {
            throw handleDbError(e, `marking account ${id} inactive for client ${clientId}`);
        }
    }

    async importCoaForClient(clientId: number, fileBuffer: Buffer, fileName: string, selections?: ImportSelections | null): Promise<ImportResult> {
        try {
            // Determine file type based on file extension
            const fileType = fileName.toLowerCase().endsWith('.csv') ? 'csv' : 'excel';
            console.log(`Importing Chart of Accounts for client ${clientId} from ${fileType} file: ${fileName}`);
            
            // Parse the file based on type
            let importData: any[] = [];
            
            if (fileType === 'csv') {
                // Parse CSV using PapaParse
                const csvString = fileBuffer.toString('utf8');
                const parseResult = Papa.parse(csvString, { header: true, skipEmptyLines: true });
                importData = parseResult.data;
            } else {
                // Parse Excel using XLSX
                const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                importData = XLSX.utils.sheet_to_json(worksheet);
            }

            // Verify client exists
            const clientExists = await db.query.clients.findFirst({
                where: eq(clients.id, clientId)
            });

            if (!clientExists) {
                throw new ApiError(404, `Client with ID ${clientId} not found`);
            }

            // Get existing accounts for this client
            const existingAccounts = await this.getAccountsByClientId(clientId);
            const existingAccountsByCode = new Map<string, Account>();
            existingAccounts.forEach(acc => existingAccountsByCode.set(acc.accountCode, acc));

            // Prepare data for import
            const accountsToCreate: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>[] = [];
            const accountsToUpdate: Array<{ id: number, data: Partial<Account> }> = [];
            
            // Track results
            const results = {
                success: true,
                message: 'Import successful',
                totalProcessed: importData.length,
                created: 0,
                updated: 0,
                skipped: 0,
                errors: [] as string[],
                warnings: [] as string[]
            };

            // First pass: Process all accounts except parent relationships
            for (const row of importData) {
                try {
                    const accountCode = this.getCaseInsensitiveValue(row, 'accountCode');
                    if (!accountCode) {
                        results.errors.push(`Row skipped: Missing account code`);
                        results.skipped++;
                        continue;
                    }

                    const name = this.getCaseInsensitiveValue(row, 'name');
                    if (!name) {
                        results.errors.push(`Account ${accountCode} skipped: Missing name`);
                        results.skipped++;
                        continue;
                    }

                    const typeValue = this.getCaseInsensitiveValue(row, 'type');
                    if (!typeValue) {
                        results.errors.push(`Account ${accountCode} skipped: Missing type`);
                        results.skipped++;
                        continue;
                    }

                    // Try to normalize the account type
                    let type: AccountType;
                    try {
                        type = this.normalizeAccountType(typeValue);
                    } catch (e) {
                        const error = e as Error;
                        results.errors.push(`Account ${accountCode} skipped: ${error.message}`);
                        results.skipped++;
                        continue;
                    }

                    // Get optional fields
                    const description = this.getCaseInsensitiveValue(row, 'description') || '';
                    const isActive = this.parseBooleanFlag(this.getCaseInsensitiveValue(row, 'isActive'), true);
                    // isFolder removed as it's not in the schema
                    
                    // Check if account exists
                    const existingAccount = existingAccountsByCode.get(accountCode);
                    
                    if (existingAccount) {
                        // Update existing account
                        accountsToUpdate.push({
                            id: existingAccount.id,
                            data: {
                                name,
                                type,
                                description,
                                active: isActive,
                                // isFolder removed as it's not in the schema
                                // Note: We don't update parentId here; it will be done in the second pass
                            }
                        });
                    } else {
                        // Create new account
                        accountsToCreate.push({
                            clientId,
                            accountCode,
                            name,
                            type,
                            description,
                            active: isActive,
                            isSubledger: false, // Default value
                            subledgerType: null, // Default value
                            subtype: null, // Default value
                            parentId: null // Set in second pass
                        });
                    }
                } catch (e) {
                    const accountCode = this.getCaseInsensitiveValue(row, 'accountCode') || 'unknown';
                    const error = e as Error;
                    results.errors.push(`Error processing account ${accountCode}: ${error.message}`);
                    results.skipped++;
                }
            }

            // Execute the db operations inside a transaction
            await db.transaction(async (tx) => {
                // Insert new accounts
                for (const accountData of accountsToCreate) {
                    const [inserted] = await tx.insert(accounts).values(accountData).returning();
                    if (inserted) {
                        existingAccountsByCode.set(inserted.accountCode, inserted);
                        results.created++;
                    }
                }

                // Update existing accounts
                for (const update of accountsToUpdate) {
                    await tx.update(accounts)
                        .set(update.data)
                        .where(eq(accounts.id, update.id));
                    results.updated++;
                }

                // Second pass: Update parent relationships
                for (const row of importData) {
                    const accountCode = this.getCaseInsensitiveValue(row, 'accountCode');
                    if (!accountCode) continue;

                    const parentCode = this.getParentCode(row);
                    if (!parentCode) continue;

                    const account = existingAccountsByCode.get(accountCode);
                    if (!account) {
                        results.errors.push(`Could not find account with code ${accountCode} for parent update`);
                        continue;
                    }

                    const parentAccount = existingAccountsByCode.get(parentCode);
                    if (!parentAccount) {
                        results.errors.push(`Parent account with code ${parentCode} not found for account ${accountCode}`);
                        continue;
                    }

                    if (account.id !== parentAccount.id) { // Prevent self-reference
                        await tx.update(accounts)
                            .set({ parentId: parentAccount.id })
                            .where(eq(accounts.id, account.id));
                    } else {
                        results.errors.push(`Cannot set account ${accountCode} as its own parent`);
                    }
                }
            });

            return {
                success: results.errors.length === 0,
                message: results.errors.length === 0 
                    ? `Successfully imported: ${results.created} created, ${results.updated} updated` 
                    : `Import completed with ${results.errors.length} errors`,
                results,
                errors: results.errors,
                warnings: results.warnings,
                count: results.totalProcessed,
                added: results.created,
                updated: results.updated,
                unchanged: 0, // Not tracked in this implementation
                skipped: results.skipped,
                failed: results.errors.length,
                accountIds: [] // Not tracked in this implementation
            };
        } catch (e) {
            throw handleDbError(e, `importing Chart of Accounts for client ${clientId}`);
        }
    }

    async exportCoaForClient(clientId: number): Promise<any[]> {
        // Implementation copied from DatabaseStorage in original storage.ts
        console.log(`Exporting Chart of Accounts for client ${clientId}`);
        try {
            // Get all accounts including inactive ones
            const allAccounts = await db.select()
                .from(accounts)
                .where(eq(accounts.clientId, clientId))
                .orderBy(accounts.accountCode);

            // Create a map of account ID to account code for parent lookup
            const accountIdToCode = new Map<number, string>();
            allAccounts.forEach(acc => accountIdToCode.set(acc.id, acc.accountCode));

            // Format accounts for export
            return allAccounts.map(account => ({
                Code: account.accountCode,
                Name: account.name,
                Type: account.type,
                Subtype: account.subtype || '',
                Description: account.description || '',
                IsActive: account.active ? 'YES' : 'NO',
                // IsFolder field removed as it's not in the schema
                ParentCode: account.parentId ? accountIdToCode.get(account.parentId) || '' : '',
                // Add any other fields needed for export
            }));
        } catch (e) {
            throw handleDbError(e, `exporting Chart of Accounts for client ${clientId}`);
        }
    }
}

// Create and export an instance of the storage class
export const accountStorage = new AccountStorage();