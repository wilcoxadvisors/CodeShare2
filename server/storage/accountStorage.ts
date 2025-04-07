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
    // Industry-standard interface (aligned with Odoo, Sage Intacct)
    // These are the primary fields that should be used
    updateExisting: boolean;                         // Updates existing accounts if found in import
    handleMissingAccounts?: 'ignore' | 'deactivate' | 'delete';  // Controls how missing accounts are handled
    
    // Primary fields matching the UI and recommended approach from documentation
    updateStrategy: 'all' | 'none' | 'selected';     // Strategy for updating existing accounts
    removeStrategy: 'inactive' | 'delete' | 'none';  // Strategy for handling missing accounts
    
    // Account code arrays for granular control
    newAccountCodes: string[];                       // New accounts to include (when updateStrategy is 'selected')
    modifiedAccountCodes: string[];                  // Existing accounts to update (when updateStrategy is 'selected')
    missingAccountCodes: string[];                   // Missing accounts to process (when removeStrategy is 'selected')
    
    // Per-account action overrides for maximum flexibility
    missingAccountActions: Record<string, 'inactive' | 'delete' | 'ignore'>;  // Specific action for each account
    
    // Legacy fields - keeping for backward compatibility
    columnMappings?: Record<string, string>;
    skipRows?: number[];
    deactivateMissing?: boolean;                     // Marks accounts missing from the import as inactive
    deleteMissing?: boolean;                         // Deletes accounts missing from the import
    includedCodes?: string[];
    excludedCodes?: string[];
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
            
            let parsedData: any[] = [];
            
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
                
                // Parse all data rows
                const dataRows = data.slice(1) as any[];
                preview.totalRows = dataRows.length;
                
                // Sample rows (up to 5) for display
                preview.sampleRows = dataRows.slice(0, 5).map((row) => {
                    const rowObj: Record<string, any> = {};
                    headers.forEach((header, index) => {
                        rowObj[header] = row[index];
                    });
                    return rowObj;
                });
                
                // Process all rows for validation
                parsedData = dataRows.map((row) => {
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
                
                // Process all rows
                parsedData = parseResult.data;
                
                // Sample rows (up to 5) for display
                preview.totalRows = parseResult.data.length;
                preview.sampleRows = parseResult.data.slice(0, 5) as Record<string, any>[];
            }
            
            // Perform enhanced validation on the full dataset
            // Check for circular references
            if (parsedData.length > 0 && preview.errors.length === 0) {
                try {
                    // Get existing accounts for this client to check parent relationships
                    const existingAccounts = await this.getAccountsByClientId(clientId);
                    
                    // Check for circular references among imported accounts and with existing accounts
                    console.log(`Checking for circular references in preview with ${parsedData.length} imported accounts and ${existingAccounts.length} existing accounts`);
                    
                    // First, normalize the data to have consistent field names
                    const normalizedData = parsedData.map(row => {
                        return {
                            AccountCode: row.AccountCode || row.accountCode || row['Account Code'] || row.code,
                            ParentCode: row.ParentCode || row.parentCode || row['Parent Code'] || row.parent,
                            Name: row.Name || row.name,
                            Type: row.Type || row.type
                        };
                    });
                    
                    // Check for circular references
                    const circularReferenceCheck = this.detectCircularReferences([...normalizedData, ...existingAccounts]);
                    
                    // Add any circular reference errors to the preview
                    if (!circularReferenceCheck.valid) {
                        circularReferenceCheck.errors.forEach(err => {
                            preview.errors.push(err);
                        });
                    }
                } catch (e) {
                    // Log but don't fail the preview
                    console.error('Error checking for circular references in preview:', e);
                    preview.warnings.push('Could not fully validate parent-child relationships. Please review carefully before importing.');
                }
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
         console.log(`DEBUG seedClientCoA called for client:`, clientId);
         console.log(`DEBUG: standardCoaTemplate length: ${standardCoaTemplate.length}`);
         try {
            await db.transaction(async (tx) => {
                console.log(`DEBUG: Inside transaction for client ${clientId}`);
                
                try {
                    const existingAccounts = await tx.select({ id: accounts.id })
                                                    .from(accounts)
                                                    .where(eq(accounts.clientId, clientId))
                                                    .limit(1);
    
                    console.log(`DEBUG: Checked for existing accounts, found: ${existingAccounts.length}`);
                    if (existingAccounts.length > 0) {
                        console.log(`DEBUG: CoA already seeded for client ${clientId}. Skipping.`);
                        return;
                    }
                } catch (error) {
                    console.error("ERROR during CoA existence check:", error);
                    throw error;
                }

                console.log(`DEBUG: Seeding standard CoA for client ${clientId}...`);
                const accountMap = new Map<string, number>(); // Maps template ID to actual DB ID

                const insertedIds: { templateCode: string, dbId: number, parentTemplateCode?: string | null }[] = [];
                console.log(`DEBUG: Starting to insert ${standardCoaTemplate.length} accounts for client ${clientId}`);
                
                let counter = 0;
                for (const acc of standardCoaTemplate) {
                     counter++;
                     console.log(`DEBUG: Processing account ${counter}/${standardCoaTemplate.length}: ${acc.accountCode} - ${acc.name}`);
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
                     console.log(`DEBUG: Inserting account data:`, accountData);
                     try {
                         const inserted = await tx.insert(accounts).values(accountData).returning({ id: accounts.id });
                         console.log("DEBUG insert accounts result:", inserted);
                         
                         if (inserted.length > 0) {
                             const dbId = inserted[0].id;
                             console.log(`DEBUG: Account inserted with DB ID: ${dbId}`);
                             accountMap.set(acc.accountCode, dbId); // Map account code to actual DB ID
                             insertedIds.push({ templateCode: acc.accountCode, dbId: dbId, parentTemplateCode: acc.parentCode });
                         } else {
                             console.error("DEBUG: Failed to insert account during seeding:", acc);
                             throw new Error(`Failed to insert account ${acc.accountCode} for client ${clientId}`);
                         }
                     } catch (error) {
                         console.error("ERROR during CoA insertion:", error);
                         throw error;
                     }
                }

                console.log(`DEBUG: Starting parent relationship updates for ${insertedIds.length} accounts`);
                try {
                    const parentUpdates: Promise<any>[] = [];
                    for (const item of insertedIds) {
                         if (item.parentTemplateCode) {
                             const parentDbId = accountMap.get(item.parentTemplateCode);
                             console.log(`DEBUG: Setting parent ${item.parentTemplateCode} (DB ID: ${parentDbId}) for account with DB ID: ${item.dbId}`);
                             if (parentDbId) {
                                 parentUpdates.push(
                                     tx.update(accounts)
                                       .set({ parentId: parentDbId })
                                       .where(eq(accounts.id, item.dbId))
                                 );
                             } else {
                                 console.warn(`DEBUG: Could not find parent DB ID for template parent code ${item.parentTemplateCode} when seeding for client ${clientId}`);
                             }
                         }
                     }
                     console.log(`DEBUG: Executing ${parentUpdates.length} parent updates`);
                     const updateResults = await Promise.all(parentUpdates);
                     console.log(`DEBUG: Completed parent updates with results:`, updateResults.length);
                } catch (error) {
                    console.error("ERROR during parent relationship updates:", error);
                    throw error;
                }


                console.log(`DEBUG: Successfully seeded ${standardCoaTemplate.length} accounts for client ${clientId}.`);
            });
         } catch (e) {
             console.error(`DEBUG: Error in seedClientCoA for client ${clientId}:`, e);
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
            // Modified to include inactive accounts - they will be displayed with a greyed-out appearance
            const allAccounts = await db.select()
                                        .from(accounts)
                                        .where(eq(accounts.clientId, clientId))
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
            let rawImportData: any[] = [];
            let parsedImportData: any[] = [];
            
            if (fileType === 'csv') {
                // Parse CSV using PapaParse
                const csvString = fileBuffer.toString('utf8');
                // Use our new parseCsvImport method for consistent field naming
                parsedImportData = this.parseCsvImport(csvString);
                rawImportData = Papa.parse(csvString, { header: true, skipEmptyLines: true }).data;
            } else {
                // Parse Excel using XLSX
                const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                rawImportData = XLSX.utils.sheet_to_json(worksheet);
                // Use our new parseExcelImport method for consistent field naming
                parsedImportData = this.parseExcelImport(rawImportData);
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
            const accountsToMarkInactive: number[] = [];
            const accountsToDelete: number[] = [];
            
            // Track results
            const results = {
                success: true,
                message: 'Import successful',
                totalProcessed: parsedImportData.length,
                created: 0,
                updated: 0,
                skipped: 0,
                inactive: 0, // Track inactive accounts
                deleted: 0, // Track deleted accounts
                errors: [] as string[],
                warnings: [] as string[]
            };

            // Keep track of import data account codes for identifying missing accounts
            const importedAccountCodes = new Set<string>();
            
            // Pre-validate all accounts to check for basic validation issues and parent relationships
            const validatedAccounts: any[] = [];
            
            for (const row of parsedImportData) {
                // Add to our tracked codes
                if (row.AccountCode) {
                    importedAccountCodes.add(row.AccountCode);
                }
                
                // Validate the basic row data
                const validationResult = this.validateImportRow(row, existingAccounts, validatedAccounts);
                
                if (!validationResult.valid) {
                    validationResult.errors.forEach(err => {
                        results.errors.push(`Account ${row.AccountCode || 'unknown'}: ${err}`);
                    });
                    results.skipped++;
                    continue;
                }
                
                // Validate parent relationships specifically
                const parentValidation = this.validateParentRelationship(row, existingAccounts, validatedAccounts);
                
                if (!parentValidation.valid) {
                    parentValidation.errors.forEach(err => {
                        results.errors.push(`Account ${row.AccountCode}: ${err}`);
                    });
                    results.warnings.push(`Account ${row.AccountCode} will be imported without parent relationship`);
                    // We'll still process the account, but without the parent relationship
                    row.ParentCode = null;
                }
                
                validatedAccounts.push(row);
            }
            
            // If there are critical errors and no accounts would be imported, return early
            if (validatedAccounts.length === 0) {
                return {
                    success: false,
                    message: `Import failed: All ${parsedImportData.length} accounts had validation errors`,
                    errors: results.errors,
                    warnings: results.warnings,
                    count: parsedImportData.length,
                    added: 0,
                    updated: 0,
                    unchanged: 0,
                    skipped: parsedImportData.length,
                    failed: parsedImportData.length,
                    inactive: 0,
                    deleted: 0
                };
            }
            
            // Check for complex circular references in the entire account hierarchy
            console.log(`Checking for circular references in ${validatedAccounts.length} accounts...`);
            const circularReferenceCheck = this.detectCircularReferences([...validatedAccounts, ...existingAccounts]);
            
            if (!circularReferenceCheck.valid) {
                console.log(`Detected circular references in account hierarchy: ${circularReferenceCheck.errors.length} issues found`);
                
                // Add circular reference errors to results
                circularReferenceCheck.errors.forEach(err => {
                    results.errors.push(err);
                });
                
                // If there are circular references, don't proceed with import
                if (circularReferenceCheck.errors.length > 0) {
                    return {
                        success: false,
                        message: `Import failed: Circular references detected in account hierarchy`,
                        errors: results.errors,
                        warnings: results.warnings,
                        count: parsedImportData.length,
                        added: 0,
                        updated: 0,
                        unchanged: 0,
                        skipped: parsedImportData.length,
                        failed: parsedImportData.length,
                        inactive: 0,
                        deleted: 0
                    };
                }
            }

            // Process accounts based on industry-standard approach
            // Get the control options with appropriate defaults if not provided
            const updateExisting = selections?.updateExisting ?? true; // Default to updating existing accounts
            
            // Determine how to handle missing accounts, using both industry-standard and legacy options
            // Default to 'ignore' (no action) if nothing specified
            let handleMissingAccounts: 'ignore' | 'deactivate' | 'delete' = 'ignore'; 
            
            // Priority chain for determining how to handle missing accounts:
            // 1. Use explicit industry-standard handleMissingAccounts if provided
            if (selections?.handleMissingAccounts) {
                handleMissingAccounts = selections.handleMissingAccounts;
                console.log(`Using industry-standard handleMissingAccounts: ${handleMissingAccounts}`);
            } 
            // 2. Map from legacy removeStrategy if provided (aligns with UI dropdown)
            else if (selections?.removeStrategy) {
                // Map from removeStrategy to handleMissingAccounts
                if (selections.removeStrategy === 'inactive') {
                    handleMissingAccounts = 'deactivate';
                } else if (selections.removeStrategy === 'delete') {
                    handleMissingAccounts = 'delete';
                } else {
                    handleMissingAccounts = 'ignore';
                }
                console.log(`Mapped from removeStrategy '${selections.removeStrategy}' to handleMissingAccounts: ${handleMissingAccounts}`);
            }
            // 3. Fall back to legacy boolean flags if provided
            else if (selections?.deactivateMissing || selections?.deleteMissing) {
                const deactivateMissing = selections?.deactivateMissing ?? false;
                const deleteMissing = selections?.deleteMissing ?? false;
                
                handleMissingAccounts = deleteMissing ? 'delete' : (deactivateMissing ? 'deactivate' : 'ignore');
                console.log(`Mapped from legacy boolean flags to handleMissingAccounts: ${handleMissingAccounts}`);
            }
            
            console.log(`Import using industry-standard options: updateExisting=${updateExisting}, handleMissingAccounts=${handleMissingAccounts}`);
            
            // For backward compatibility 
            const updateStrategy = selections?.updateStrategy || (updateExisting ? 'all' : 'none');
            const removeStrategy: 'inactive' | 'delete' | 'none' | 'ignore' = 
                selections?.removeStrategy || 
                (handleMissingAccounts === 'delete' ? 'delete' : 
                 (handleMissingAccounts === 'deactivate' ? 'inactive' : 'none'));
                
            // Get selections for specific accounts if provided (for backward compatibility)
            const selectedNewAccounts = selections?.newAccountCodes || [];
            const selectedModifiedAccounts = selections?.modifiedAccountCodes || [];
            const selectedMissingAccounts = selections?.missingAccountCodes || [];
            const missingAccountActions = selections?.missingAccountActions || {};
            
            // Log selection details for debugging
            console.log(`Selected account counts (legacy): new=${selectedNewAccounts.length}, modified=${selectedModifiedAccounts.length}, missing=${selectedMissingAccounts.length}`);
            
            // First pass: Process all validated accounts except parent relationships
            for (const row of validatedAccounts) {
                try {
                    const accountCode = row.AccountCode;
                    const name = row.Name;
                    
                    // Check if we should process this account based on simplified settings
                    const isExisting = existingAccountsByCode.has(accountCode);
                    
                    // BUGFIX: Always check if this account is explicitly selected when in 'selected' mode
                    // Fix issue where unchecked accounts were still being processed
                    if (updateStrategy === 'selected') {
                        // For existing accounts, check if they're in the selectedModifiedAccounts array
                        if (isExisting && !selectedModifiedAccounts.includes(accountCode)) {
                            console.log(`BUGFIX: Skipping update for account ${accountCode} because it's not explicitly selected in modifiedAccountCodes`);
                            continue;
                        } 
                        // For new accounts, check if they're in the selectedNewAccounts array
                        else if (!isExisting && !selectedNewAccounts.includes(accountCode)) {
                            console.log(`BUGFIX: Skipping creation for account ${accountCode} because it's not explicitly selected in newAccountCodes`);
                            continue;
                        }
                    }
                    // Also check the legacy setting - If existing account and updateExisting is false, skip updating
                    else if (isExisting && !updateExisting) {
                        console.log(`Skipping update for account ${accountCode} because updateExisting is false`);
                        continue;
                    }
                    
                    // Try to normalize the account type
                    let type: AccountType;
                    try {
                        type = this.normalizeAccountType(row.Type);
                    } catch (e) {
                        const error = e as Error;
                        results.errors.push(`Account ${accountCode} skipped: ${error.message}`);
                        results.skipped++;
                        continue;
                    }

                    // Get optional fields
                    const description = this.getCaseInsensitiveValue(row, 'description') || '';
                    const isActive = this.parseBooleanFlag(this.getCaseInsensitiveValue(row, 'isActive'), true);
                    
                    // Check if account exists
                    const existingAccount = existingAccountsByCode.get(accountCode);
                    
                    if (existingAccount) {
                        // Check for transaction existence for critical field updates
                        if (existingAccount.type !== type) {
                            const hasTransactions = await this.accountHasTransactions(existingAccount.id);
                            if (hasTransactions) {
                                results.errors.push(`Cannot change type for account ${accountCode} because it has transactions`);
                                results.skipped++;
                                continue;
                            }
                        }
                        
                        // Update existing account
                        accountsToUpdate.push({
                            id: existingAccount.id,
                            data: {
                                name,
                                type,
                                description,
                                active: isActive,
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

            // Process missing accounts (those that exist in the database but not in the import file)
            // Only process if handleMissingAccounts is not set to 'ignore'
            if (handleMissingAccounts !== 'ignore') {
                console.log(`Processing missing accounts with option: handleMissingAccounts=${handleMissingAccounts}`);
                
                // Find accounts in the database that weren't in the import file
                for (const existingAccount of existingAccounts) {
                    if (!importedAccountCodes.has(existingAccount.accountCode)) {
                        // BUGFIX: Always check if this account is explicitly selected when in 'selected' mode
                        // Fix issue where unchecked missing accounts were still being processed
                        if (removeStrategy === 'selected' as any && !selectedMissingAccounts.includes(existingAccount.accountCode)) {
                            console.log(`BUGFIX: Skipping missing account ${existingAccount.accountCode} because it's not explicitly selected in missingAccountCodes`);
                            continue;
                        }
                        
                        // Check if account has transactions
                        const hasTransactions = await this.accountHasTransactions(existingAccount.id);
                        
                        // Determine the action to take for this account
                        // First check if there's a specific action for this account
                        let accountAction: 'ignore' | 'inactive' | 'delete' | 'deactivate' = 'ignore';
                        
                        // First check for per-account overrides
                        if (missingAccountActions[existingAccount.accountCode]) {
                            const specificAction = missingAccountActions[existingAccount.accountCode];
                            console.log(`Using specific action '${specificAction}' for account ${existingAccount.accountCode}`);
                            
                            if (specificAction === 'inactive') {
                                accountAction = 'deactivate'; // Map 'inactive' to 'deactivate' for consistency
                            } else {
                                accountAction = specificAction as 'ignore' | 'delete';
                            }
                        } else {
                            // Use the general handleMissingAccounts setting
                            accountAction = handleMissingAccounts;
                        }
                        
                        // Apply the selected action
                        if (accountAction === 'ignore') {
                            console.log(`Account ${existingAccount.accountCode} ignored as requested`);
                            continue;
                        } else if (accountAction === 'delete' && !hasTransactions) {
                            // Can delete only if no transactions
                            accountsToDelete.push(existingAccount.id);
                            console.log(`Account ${existingAccount.accountCode} marked for deletion`);
                        } else if (accountAction === 'deactivate' || (accountAction === 'delete' && hasTransactions)) {
                            // Mark as inactive if:
                            // - deactivate action is selected, OR
                            // - delete action is selected but account has transactions (fallback to deactivate)
                            accountsToMarkInactive.push(existingAccount.id);
                            console.log(`Account ${existingAccount.accountCode} marked for deactivation`);
                            
                            if (accountAction === 'delete' && hasTransactions) {
                                results.warnings.push(`Account ${existingAccount.accountCode} has transactions and cannot be deleted. Marking inactive instead.`);
                            }
                        }
                    }
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
                
                // Mark accounts as inactive
                for (const accountId of accountsToMarkInactive) {
                    await tx.update(accounts)
                        .set({ active: false })
                        .where(eq(accounts.id, accountId));
                    results.inactive++;
                }
                
                // Delete accounts
                for (const accountId of accountsToDelete) {
                    // Double-check for transactions
                    const hasTransactions = await this.accountHasTransactions(accountId);
                    
                    if (!hasTransactions) {
                        // Do a soft delete by setting active to false
                        await tx.update(accounts)
                            .set({ active: false })
                            .where(eq(accounts.id, accountId));
                        results.deleted++;
                    } else {
                        results.warnings.push(`Account ${accountId} has transactions and cannot be deleted. Marked inactive instead.`);
                        results.inactive++;
                    }
                }

                // Second pass: Update parent relationships
                for (const row of validatedAccounts) {
                    const accountCode = row.AccountCode;
                    if (!accountCode) continue;

                    const parentCode = row.ParentCode;
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

            // Build success message including all operations
            const successMessage = `Successfully imported: ${results.created} added, ${results.updated} updated, ${results.inactive} deactivated, ${results.deleted} deleted`;
            
            return {
                success: results.errors.length === 0,
                message: results.errors.length === 0 
                    ? successMessage
                    : `Import completed with ${results.errors.length} errors: ${successMessage}`,
                results,
                errors: results.errors,
                warnings: results.warnings,
                count: results.totalProcessed,
                added: results.created,
                updated: results.updated,
                unchanged: 0, // Not tracked in this implementation
                skipped: results.skipped,
                failed: results.errors.length,
                inactive: results.inactive,
                deleted: results.deleted,
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

            // Create a map of account ID to code for parent lookup
            const accountIdToCode = new Map<number, string>();
            const accountIdToName = new Map<number, string>(); // Add this to get parent names
            allAccounts.forEach(acc => {
                accountIdToCode.set(acc.id, acc.accountCode);
                accountIdToName.set(acc.id, acc.name);
            });

            // Format accounts for export using our mapping function
            return allAccounts.map(account => this.mapDbFieldsToExportFields(account, accountIdToCode, accountIdToName));
        } catch (e) {
            throw handleDbError(e, `exporting Chart of Accounts for client ${clientId}`);
        }
    }
    
    /**
     * Maps database fields to export fields
     * This ensures consistent field naming in exports
     */
    mapDbFieldsToExportFields(account: Account, 
                              accountIdToCode: Map<number, string> = new Map(),
                              accountIdToName: Map<number, string> = new Map()): Record<string, any> {
        return {
            AccountCode: account.accountCode,
            Name: account.name,
            Type: account.type,
            Subtype: account.subtype || '',
            IsSubledger: account.isSubledger,
            SubledgerType: account.subledgerType || '',
            Active: account.active,
            Description: account.description || '',
            ParentId: account.parentId || null,
            ParentCode: account.parentId ? accountIdToCode.get(account.parentId) || '' : '',
            ParentName: account.parentId ? accountIdToName.get(account.parentId) || '' : ''
        };
    }
    
    /**
     * Parse CSV import content
     * Converts CSV data to a standardized format for processing
     */
    parseCsvImport(csvContent: string): any[] {
        const records = Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            transform: (value) => value.trim()
        }).data;
        
        // Normalize the records
        return records.map(record => this.normalizeImportRecord(record));
    }
    
    /**
     * Parse Excel import content
     * Converts Excel data to a standardized format for processing
     */
    parseExcelImport(jsonData: any[]): any[] {
        // Normalize the records
        return jsonData.map(record => this.normalizeImportRecord(record));
    }
    
    /**
     * Normalize an import record to ensure consistent field names and types
     * This handles variations in field naming and formatting from different import sources
     */
    private normalizeImportRecord(record: any): any {
        const normalizedRecord: Record<string, any> = {};
        
        // Map fields with case-insensitive matching
        for (const [key, value] of Object.entries(record)) {
            const normalizedKey = this.normalizeFieldName(key);
            
            // Handle boolean values
            if (normalizedKey === 'isSubledger' || normalizedKey === 'active') {
                normalizedRecord[normalizedKey] = this.parseBooleanFlag(value);
            } else {
                normalizedRecord[normalizedKey] = value;
            }
        }
        
        // Map to expected external field names
        return {
            AccountCode: normalizedRecord.accountCode || null,
            Name: normalizedRecord.name || null,
            Type: normalizedRecord.type || null,
            Subtype: normalizedRecord.subtype || null,
            IsSubledger: normalizedRecord.isSubledger || false,
            SubledgerType: normalizedRecord.subledgerType || null,
            Active: normalizedRecord.active !== false, // Default to true if not specified
            Description: normalizedRecord.description || null,
            ParentCode: normalizedRecord.parentCode || null,
        };
    }
    
    /**
     * Normalize field name to handle different naming conventions
     * Maps external field names to internal field names
     */
    private normalizeFieldName(fieldName: string): string {
        const fieldNameMap: Record<string, string> = {
            'accountcode': 'accountCode',
            'account code': 'accountCode',
            'account_code': 'accountCode',
            'accountCode': 'accountCode',
            'AccountCode': 'accountCode',
            'code': 'accountCode', // Legacy support
            'Code': 'accountCode', // Legacy support
            'name': 'name',
            'Name': 'name',
            'type': 'type',
            'Type': 'type',
            'subtype': 'subtype',
            'Subtype': 'subtype',
            'issubledger': 'isSubledger',
            'isSubledger': 'isSubledger',
            'IsSubledger': 'isSubledger',
            'is_subledger': 'isSubledger',
            'subledgertype': 'subledgerType',
            'subledgerType': 'subledgerType',
            'SubledgerType': 'subledgerType',
            'subledger_type': 'subledgerType',
            'active': 'active',
            'Active': 'active',
            'isactive': 'active',
            'IsActive': 'active',
            'is_active': 'active',
            'description': 'description',
            'Description': 'description',
            'parentcode': 'parentCode',
            'parentCode': 'parentCode',
            'ParentCode': 'parentCode',
            'parent_code': 'parentCode',
            'parent': 'parentCode', // Legacy support
            'Parent': 'parentCode', // Legacy support
            'parentid': 'parentId',
            'parentId': 'parentId',
            'ParentId': 'parentId',
            'parent_id': 'parentId',
        };
        
        return fieldNameMap[fieldName] || fieldName.toLowerCase();
    }
    
    /**
     * Validate an import row for consistency and data integrity
     * This is used before inserting or updating accounts
     */
    validateImportRow(row: any, existingAccounts: any[], newAccounts: any[]): { valid: boolean, errors: string[] } {
        const result = { valid: true, errors: [] as string[] };
        
        // Check required fields
        if (!row.AccountCode) {
            result.valid = false;
            result.errors.push('Account code is required');
            return result; // No point in continuing without an account code
        }
        
        if (!row.Name) {
            result.valid = false;
            result.errors.push('Name is required');
        }
        
        if (!row.Type) {
            result.valid = false;
            result.errors.push('Type is required');
        } else {
            // Validate account type
            const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
            if (!validTypes.includes(row.Type.toUpperCase())) {
                result.valid = false;
                result.errors.push(`Type must be one of: ${validTypes.join(', ')}`);
            }
        }
        
        // Check for duplicate account codes
        if (existingAccounts.some(acc => acc.accountCode === row.AccountCode) || 
            newAccounts.some(acc => acc.AccountCode === row.AccountCode)) {
            result.valid = false;
            result.errors.push('Duplicate account code');
        }
        
        // If IsSubledger is true, SubledgerType is required
        if (row.IsSubledger === true && !row.SubledgerType) {
            result.valid = false;
            result.errors.push('SubledgerType is required when IsSubledger is true');
        }
        
        return result;
    }
    
    /**
     * Specifically validate parent-child relationships
     * This ensures that parent accounts exist before they are referenced
     */
    validateParentRelationship(row: any, existingAccounts: any[], newAccounts: any[]): { valid: boolean, errors: string[] } {
        const result = { valid: true, errors: [] as string[] };
        
        // Skip validation if no parent code is specified
        if (!row.ParentCode) {
            return result;
        }
        
        // Check if the parent exists in existing accounts or in the new accounts being added
        const parentExists = 
            existingAccounts.some(acc => acc.accountCode === row.ParentCode) ||
            newAccounts.some(acc => acc.AccountCode === row.ParentCode);
        
        if (!parentExists) {
            result.valid = false;
            result.errors.push(`Parent account with code ${row.ParentCode} not found`);
        }
        
        // Check if the parent would create a circular reference (self-reference)
        if (row.AccountCode === row.ParentCode) {
            result.valid = false;
            result.errors.push('Account cannot be its own parent');
        }
        
        // Check for direct circular reference (A → B → A)
        const directParent = newAccounts.find(acc => acc.AccountCode === row.ParentCode);
        if (directParent && directParent.ParentCode === row.AccountCode) {
            result.valid = false;
            result.errors.push(`Circular reference detected between accounts ${row.AccountCode} and ${row.ParentCode}`);
        }
        
        return result;
    }
    
    /**
     * Detect circular references in the entire account hierarchy
     * This more complex check identifies multi-level circular dependencies (A → B → C → A)
     */
    detectCircularReferences(accounts: any[]): { valid: boolean, errors: string[] } {
        const result = { valid: true, errors: [] as string[] };
        
        // Build a graph representation of parent-child relationships
        const graph: Record<string, string[]> = {};
        
        // Initialize graph with empty adjacency lists
        accounts.forEach(acc => {
            const code = acc.AccountCode || acc.accountCode;
            if (code) {
                graph[code] = [];
            }
        });
        
        // Populate adjacency lists (parent → child relationships)
        accounts.forEach(acc => {
            const code = acc.AccountCode || acc.accountCode;
            const parentCode = acc.ParentCode;
            
            if (parentCode && code && parentCode !== code) {
                if (!graph[parentCode]) {
                    graph[parentCode] = [];
                }
                graph[parentCode].push(code);
            }
        });
        
        // Check for cycles using DFS
        const visited: Record<string, boolean> = {};
        const recStack: Record<string, boolean> = {};
        
        // Track all detected cycles to avoid duplicates
        const detectedCycles: Set<string> = new Set();
        
        const detectCycle = (node: string, path: string[] = []): boolean => {
            // Node is not present in graph
            if (!graph[node]) return false;
            
            // Mark current node as visited and part of recursion stack
            visited[node] = true;
            recStack[node] = true;
            path.push(node);
            
            // Visit all adjacent vertices (children)
            for (const adjacentNode of graph[node]) {
                // If not visited, check recursively
                if (!visited[adjacentNode]) {
                    if (detectCycle(adjacentNode, [...path])) {
                        return true;
                    }
                } 
                // If adjacent vertex is already in recursion stack, we found a cycle
                else if (recStack[adjacentNode]) {
                    // Found a cycle, report it
                    const cycleStart = path.indexOf(adjacentNode);
                    const cyclePath = path.slice(cycleStart).concat(adjacentNode);
                    const cycleKey = cyclePath.sort().join(','); // Normalize to avoid duplicates
                    
                    if (!detectedCycles.has(cycleKey)) {
                        detectedCycles.add(cycleKey);
                        const cycleStr = cyclePath.join(' → ');
                        result.errors.push(`Circular reference detected in account hierarchy: ${cycleStr}`);
                        result.valid = false;
                    }
                    
                    return true;
                }
            }
            
            // Remove the node from recursion stack
            recStack[node] = false;
            return false;
        };
        
        // Check all nodes
        for (const node in graph) {
            if (!visited[node]) {
                detectCycle(node);
            }
        }
        
        return result;
    }
}

// Create and export an instance of the storage class
export const accountStorage = new AccountStorage();