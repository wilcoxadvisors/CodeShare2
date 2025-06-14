import {
  journalEntries, JournalEntry, InsertJournalEntry, JournalEntryStatus,
  journalEntryLines, JournalEntryLine, InsertJournalEntryLine,
  journalEntryFiles, journalEntryFileBlobs,
  accounts, Account, AccountType,
  entities, clients,
  txDimensionLink, InsertTxDimensionLink,
  dimensions, dimensionValues
} from "../../shared/schema";
import * as schema from "../../shared/schema";
import * as fs from 'fs';
import * as path from 'path';
import { db } from "../db";
import { eq, and, desc, asc, gte, lte, sql, count, inArray, like, isNull, or } from "drizzle-orm";
import { ApiError } from "../errorHandling";
import { format, parseISO } from "date-fns";
import { ListJournalEntriesFilters } from "../../shared/validation";
import { AccountStorage } from "./accountStorage"; // Import the AccountStorage class
import { getFileStorage } from './fileStorage'; // Import the file storage factory

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

// Define interface for Journal Entry Storage operations
// Interface for General Ledger options
export interface GLOptions {
  entityId: number;
  clientId: number;
  startDate?: Date | null;
  endDate?: Date | null;
  accountId?: number | null;
}

// Interface for General Ledger Entry
export interface GeneralLedgerEntry {
  id: number;
  date: Date;
  referenceNumber: string | null;
  description: string | null;
  accountId: number;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
  journalEntryId: number;
  lineId: number;
  entityCode: string | null;
}

export interface IJournalEntryStorage {
  // Journal Entry operations
  createJournalEntry(clientId: number, createdById: number, entryData: InsertJournalEntry): Promise<JournalEntry>;
  getJournalEntry(id: number): Promise<JournalEntry | undefined>;
  getJournalEntries(entityId: number): Promise<JournalEntry[]>;
  getJournalEntriesByStatus(entityId: number, status: JournalEntryStatus): Promise<JournalEntry[]>;
  listJournalEntries(filters?: ListJournalEntriesFilters): Promise<JournalEntry[]>;
  updateJournalEntry(id: number, entryData: Partial<JournalEntry>): Promise<JournalEntry | undefined>;
  updateJournalEntryWithLines(id: number, entryData: Partial<JournalEntry>, lines?: Partial<JournalEntryLine>[]): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: number): Promise<boolean>;
  
  // General Ledger operations
  getGeneralLedgerEntries(options: GLOptions): Promise<GeneralLedgerEntry[]>;
  
  // Legacy Journal methods (aliases for JournalEntry methods)
  getJournal(id: number): Promise<JournalEntry | undefined>;
  getJournals(entityId: number): Promise<JournalEntry[]>;
  getJournalsByType(entityId: number, type: any): Promise<JournalEntry[]>;
  createJournal(journal: any): Promise<JournalEntry>;
  updateJournal(id: number, journal: Partial<any>): Promise<JournalEntry | undefined>;
  deleteJournal(id: number): Promise<boolean>;
  
  // Journal Entry Line operations
  getJournalEntryLines(journalEntryId: number): Promise<any[]>;
  createJournalEntryLine(insertLine: InsertJournalEntryLine): Promise<JournalEntryLine>;
  addJournalEntryLine(insertLine: InsertJournalEntryLine): Promise<JournalEntryLine>; // Alias for createJournalEntryLine
  updateJournalEntryLine(id: number, line: Partial<JournalEntryLine>): Promise<JournalEntryLine | undefined>;
  deleteJournalEntryLine(id: number): Promise<boolean>;
  
  // Journal Entry File operations
  getJournalEntryFiles(journalEntryId: number): Promise<any[]>;
  createJournalEntryFile(journalEntryId: number, file: any): Promise<any>;
  getJournalEntryFile(fileId: number): Promise<any>;
  deleteJournalEntryFile(fileId: number): Promise<boolean>;
  
  // Batch operation
  createBatchJournalEntries(
    clientId: number,
    createdById: number,
    entriesData: Omit<InsertJournalEntry, 'clientId' | 'createdBy'>[]
  ): Promise<{ successCount: number; errors: { entryIndex: number; error: string }[] }>;
  
  // Reversal operations
  reverseJournalEntry(journalEntryId: number, options: {
    date?: Date;
    description?: string;
    createdBy: number;
    referenceNumber?: string;
  }): Promise<JournalEntry | undefined>;
  
  // Copy operations
  copyJournalEntry(originalEntryId: number, newUserId: number): Promise<JournalEntry>;

  // Validation and helper methods
  validateJournalEntryBalance(id: number): Promise<boolean>;
  validateAccountIds(accountIds: number[], clientId: number): Promise<boolean>;
}

// Implementation class for Journal Entry Storage
export class JournalEntryStorage implements IJournalEntryStorage {
  
  // Helper method to validate account IDs
  async validateAccountIds(accountIds: number[], clientId: number): Promise<boolean> {
    if (!accountIds || accountIds.length === 0) return false;
    
    try {
      // Get all valid accounts for the client
      const validAccounts = await db.select({ id: accounts.id })
        .from(accounts)
        .where(and(
          eq(accounts.clientId, clientId),
          eq(accounts.active, true)
        ));
      
      const validAccountIds = new Set(validAccounts.map(acc => acc.id));
      
      // Check if all requested accountIds exist in the valid set
      return accountIds.every(id => validAccountIds.has(id));
    } catch (e) {
      throw handleDbError(e, `validating account IDs for client ${clientId}`);
    }
  }
  
  // Helper method to check if journal entry is balanced
  async validateJournalEntryBalance(id: number): Promise<boolean> {
    try {
      const lines = await this.getJournalEntryLines(id);
      
      if (lines.length === 0) {
        return false; // No lines means not balanced
      }
      
      let totalDebits = 0;
      let totalCredits = 0;
      
      lines.forEach(line => {
        const amount = parseFloat(line.amount || '0');
        if (line.type === 'debit') {
          totalDebits += amount;
        } else if (line.type === 'credit') {
          totalCredits += amount;
        }
      });
      
      // Use a small epsilon value for floating-point comparison
      const epsilon = 0.0001;
      return Math.abs(totalDebits - totalCredits) < epsilon;
    } catch (e) {
      throw handleDbError(e, `validating journal entry balance for ID ${id}`);
    }
  }
  
  async getJournalEntry(id: number): Promise<JournalEntry | undefined> {
    console.log(`Getting journal entry ${id}`);
    try {
      const [entry] = await db.select()
        .from(journalEntries)
        .where(eq(journalEntries.id, id))
        .limit(1);
      
      if (entry) {
        // Fetch lines and return them separately
        const lines = await this.getJournalEntryLines(id);
        
        // Fetch files for this journal entry
        const files = await this.getJournalEntryFiles(id);
        
        // Return entry with lines and files as non-database properties (to avoid type issues)
        const result = { ...entry } as JournalEntry & { 
          lines: JournalEntryLine[],
          files: any[]
        };
        result.lines = lines || [];
        result.files = files || [];
        return result;
      }
      
      return undefined;
    } catch (e) {
      throw handleDbError(e, `getting journal entry ${id}`);
    }
  }
  
  async getJournalEntries(entityId: number): Promise<JournalEntry[]> {
    console.log(`Getting journal entries for entity ${entityId}`);
    try {
      return await db.select()
        .from(journalEntries)
        .where(eq(journalEntries.entityId, entityId))
        .orderBy(desc(journalEntries.date));
    } catch (e) {
      throw handleDbError(e, `getting journal entries for entity ${entityId}`);
    }
  }
  
  async getJournalEntriesByStatus(entityId: number, status: JournalEntryStatus): Promise<JournalEntry[]> {
    console.log(`Getting journal entries with status ${status} for entity ${entityId}`);
    try {
      return await db.select()
        .from(journalEntries)
        .where(and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.status, status)
        ))
        .orderBy(desc(journalEntries.date));
    } catch (e) {
      throw handleDbError(e, `getting journal entries with status ${status} for entity ${entityId}`);
    }
  }
  
  async listJournalEntries(filters?: ListJournalEntriesFilters): Promise<JournalEntry[]> {
    // Start with a base query
    let query = db.select().from(journalEntries);
    
    // Build filters if present
    if (filters) {
      const conditions = [];
      
      // Add filter for clientId if provided
      if (filters.clientId) {
        conditions.push(eq(journalEntries.clientId, filters.clientId));
      }
      
      // Add filter for entityId if provided
      if (filters.entityId) {
        conditions.push(eq(journalEntries.entityId, filters.entityId));
      }
      
      // Add date range filters if provided
      if (filters.startDate) {
        conditions.push(gte(journalEntries.date, filters.startDate));
      }
      
      if (filters.endDate) {
        conditions.push(lte(journalEntries.date, filters.endDate));
      }
      
      // Add filter for status if provided
      if (filters.status) {
        conditions.push(eq(journalEntries.status, filters.status));
      }
      
      // Add filter for journal type if provided
      if (filters.journalType) {
        conditions.push(eq(journalEntries.journalType, filters.journalType));
      }
      
      // Add filter for reference number if provided
      if (filters.referenceNumber) {
        conditions.push(like(journalEntries.referenceNumber, `%${filters.referenceNumber}%`));
      }
      
      // Apply all conditions to the query
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      // Apply sorting
      const sortField = filters.sortBy || 'date';
      const sortDirection = filters.sortDirection === 'asc' ? asc : desc;
      
      switch (sortField) {
        case 'date':
          query = query.orderBy(sortDirection(journalEntries.date));
          break;
        case 'referenceNumber':
          query = query.orderBy(sortDirection(journalEntries.referenceNumber));
          break;
        case 'description':
          query = query.orderBy(sortDirection(journalEntries.description));
          break;
        // For other fields, default to date
        default:
          query = query.orderBy(desc(journalEntries.date));
      }
      
      // Apply pagination
      if (filters.limit !== undefined) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset !== undefined) {
        query = query.offset(filters.offset);
      }
    } else {
      // Default sorting by date descending if no filters provided
      query = query.orderBy(desc(journalEntries.date));
    }
    
    try {
      // Get the base journal entries
      const entries = await query;

      // Enhance entries with pre-calculated totals
      const enhancedEntries = await Promise.all(entries.map(async (entry) => {
        // Get lines for this entry
        const lines = await this.getJournalEntryLines(entry.id);
        
        // Calculate totals
        let totalDebit = 0;
        let totalCredit = 0;
        
        lines.forEach(line => {
          if (line.type === 'debit') {
            // Handle both string and number formats
            const amount = typeof line.amount === 'string' ? parseFloat(line.amount) : line.amount;
            totalDebit += isNaN(amount) ? 0 : amount;
          } else if (line.type === 'credit') {
            // Handle both string and number formats
            const amount = typeof line.amount === 'string' ? parseFloat(line.amount) : line.amount;
            totalCredit += isNaN(amount) ? 0 : amount;
          }
        });
        
        console.log(`DEBUG: Calculated totals for entry ${entry.id}: debit=${totalDebit}, credit=${totalCredit}`);
        
        // Return the enhanced entry with totals
        return {
          ...entry,
          totals: {
            debit: totalDebit,
            credit: totalCredit
          }
        };
      }));
      
      return enhancedEntries;
    } catch (e) {
      throw handleDbError(e, `listing journal entries with filters`);
    }
  }
  
  async createJournalEntry(clientId: number, createdById: number, entryData: InsertJournalEntry): Promise<JournalEntry> {
    console.log(`Creating journal entry for client ${clientId}`);
    try {
      // Validate the client exists
      const clientExists = await db.select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);
      
      if (clientExists.length === 0) {
        throw new ApiError(404, `Client with ID ${clientId} not found`);
      }
      
      // Validate the entity exists
      const entityExists = await db.select({ id: entities.id })
        .from(entities)
        .where(eq(entities.id, entryData.entityId))
        .limit(1);
      
      if (entityExists.length === 0) {
        throw new ApiError(404, `Entity with ID ${entryData.entityId} not found`);
      }
      
      // Prepare data for insert
      // Ensure date is a properly formatted string (YYYY-MM-DD) to avoid timezone issues
      const formattedDate = typeof entryData.date === 'string' 
        ? entryData.date // Already a string, keep as is
        : format(new Date(entryData.date), 'yyyy-MM-dd'); // Format to YYYY-MM-DD
        
      const insertData = {
        ...entryData,
        date: formattedDate, // Use consistent date format
        clientId,
        createdBy: createdById,
        status: entryData.status || 'draft' // Default to draft if not specified
      };
      
      console.log('--- DATABASE WRITE ---', insertData);
      
      // Insert the journal entry
      const [journalEntry] = await db.insert(journalEntries)
        .values(insertData)
        .returning();
      
      return journalEntry;
    } catch (e) {
      throw handleDbError(e, `creating journal entry for client ${clientId}`);
    }
  }
  
  async updateJournalEntry(id: number, entryData: Partial<JournalEntry>): Promise<JournalEntry | undefined> {
    console.log(`Updating journal entry ${id}`);
    try {
      // Check if entry exists
      const existingEntry = await this.getJournalEntry(id);
      if (!existingEntry) {
        return undefined;
      }
      
      // Format date if provided to ensure consistent format
      let updatedEntryData = { ...entryData };
      if (entryData.date !== undefined) {
        const formattedDate = typeof entryData.date === 'string'
          ? entryData.date // Already a string, keep as is
          : format(new Date(entryData.date), 'yyyy-MM-dd'); // Format to YYYY-MM-DD
          
        updatedEntryData.date = formattedDate;
      }
      
      // Update the journal entry
      const [updatedEntry] = await db.update(journalEntries)
        .set(updatedEntryData)
        .where(eq(journalEntries.id, id))
        .returning();
      
      return updatedEntry;
    } catch (e) {
      throw handleDbError(e, `updating journal entry ${id}`);
    }
  }
  
  async updateJournalEntryWithLines(id: number, entryData: Partial<JournalEntry>, lines?: Partial<JournalEntryLine>[]): Promise<JournalEntry | undefined> {
    console.log(`Updating journal entry ${id} with ${lines?.length || 0} lines`);
    try {
      // Check if entry exists
      const existingEntry = await this.getJournalEntry(id);
      if (!existingEntry) {
        return undefined;
      }
      
      // Format date if provided to ensure consistent format
      let updatedEntryData = { ...entryData };
      if (entryData.date !== undefined) {
        const formattedDate = typeof entryData.date === 'string'
          ? entryData.date // Already a string, keep as is
          : format(new Date(entryData.date), 'yyyy-MM-dd'); // Format to YYYY-MM-DD
          
        updatedEntryData.date = formattedDate;
      }
      
      // Start a transaction
      return await db.transaction(async (tx) => {
        // Update the journal entry
        const [updatedEntry] = await tx.update(journalEntries)
          .set(updatedEntryData)
          .where(eq(journalEntries.id, id))
          .returning();
        
        // If lines are provided, handle line updates
        if (lines && lines.length > 0) {
          // Get existing lines
          const existingLines = await tx.select()
            .from(journalEntryLines)
            .where(eq(journalEntryLines.journalEntryId, id));
          
          // Delete existing dimension links first (to maintain referential integrity)
          const existingLineIds = existingLines.map(line => line.id);
          if (existingLineIds.length > 0) {
            await tx.delete(txDimensionLink)
              .where(inArray(txDimensionLink.journalEntryLineId, existingLineIds));
          }
          
          // Delete existing lines for this journal entry
          await tx.delete(journalEntryLines)
            .where(eq(journalEntryLines.journalEntryId, id));
          
          // Insert new lines with dimension tags
          for (const line of lines) {
            // Extract tags from line data
            const { tags, ...lineData } = line as any;
            
            // Insert the line first
            const [insertedLine] = await tx.insert(journalEntryLines)
              .values({
                ...lineData,
                journalEntryId: id,
                // Ensure amount is a string
                amount: typeof lineData.amount === 'number' ? lineData.amount.toString() : lineData.amount
              } as any)
              .returning();
            
            // If tags exist, save dimension links
            if (tags && Array.isArray(tags) && tags.length > 0) {
              console.log(`Saving ${tags.length} dimension tags for line ${insertedLine.id}`);
              
              for (const tag of tags) {
                await tx.insert(txDimensionLink)
                  .values({
                    journalEntryLineId: insertedLine.id,
                    dimensionId: tag.dimensionId,
                    dimensionValueId: tag.dimensionValueId
                  });
              }
            }
          }
        }
        
        // Return the updated entry
        return {
          ...updatedEntry,
          lines: lines || []
        };
      });
    } catch (e) {
      throw handleDbError(e, `updating journal entry ${id} with lines`);
    }
  }
  
  async deleteJournalEntry(id: number): Promise<boolean> {
    console.log(`Deleting journal entry ${id}`);
    try {
      // Get the entry to delete
      const entryToDelete = await this.getJournalEntry(id);
      if (!entryToDelete) {
        return false;
      }
      
      // Block deletion of POSTED entries
      if (entryToDelete.status === JournalEntryStatus.POSTED) {
        throw new Error(`Cannot delete a posted journal entry (#${id}). Use void instead.`);
      }
      
      // Allow deletion of draft entries (whether they're reversals or not)
      
      // If this is a DRAFT entry that references a POSTED entry (as a reversal):
      // We should still allow its deletion and update the original entry
      if (entryToDelete.reversedEntryId && entryToDelete.isReversal) {
        // Update the original entry to remove the reference to this reversal
        await db.update(journalEntries)
          .set({
            isReversed: false,
            reversedByEntryId: null,
            updatedAt: new Date()
          })
          .where(eq(journalEntries.id, entryToDelete.reversedEntryId));
          
        console.log(`Updated original entry ${entryToDelete.reversedEntryId} to remove reference to deleted reversal ${id}`);
      }
      
      // Check if any other entries reference this one (through reversedByEntryId)
      const referencingEntries = await db.select({
          id: journalEntries.id,
          status: journalEntries.status
        })
        .from(journalEntries)
        .where(eq(journalEntries.reversedByEntryId, id));
      
      // Update all referencing entries to clear their references
      for (const entry of referencingEntries) {
        await db.update(journalEntries)
          .set({
            reversedEntryId: null,
            isReversal: true, // Keep this as true since it's still a reversal
            updatedAt: new Date()
          })
          .where(eq(journalEntries.id, entry.id));
          
        console.log(`Updated referencing entry ${entry.id} to remove reference to deleted entry ${id}`);
      }
      
      // Delete associated lines first to maintain referential integrity
      await db.delete(journalEntryLines)
        .where(eq(journalEntryLines.journalEntryId, id));
      
      // Delete journal entry files if any
      await db.delete(journalEntryFiles)
        .where(eq(journalEntryFiles.journalEntryId, id));
      
      // Delete the journal entry
      await db.delete(journalEntries)
        .where(eq(journalEntries.id, id));
      
      return true;
    } catch (e) {
      throw handleDbError(e, `deleting journal entry ${id}`);
    }
  }
  
  async getJournalEntryLines(journalEntryId: number): Promise<any[]> {
    console.log(`Getting lines with dimension tags for journal entry ${journalEntryId}`);
    try {
      // First, get the basic journal entry lines
      const lines = await db.select().from(journalEntryLines)
        .where(eq(journalEntryLines.journalEntryId, journalEntryId))
        .orderBy(asc(journalEntryLines.id));

      console.log(`DEBUG: Retrieved ${lines.length} lines for journal entry ${journalEntryId}`);

      // For each line, get its dimension tags using a direct SQL join
      const linesWithTags = await Promise.all(lines.map(async (line) => {
        console.log(`DEBUG: Getting dimension tags for line ${line.id}`);
        
        const dimensionTags = await db.select({
          dimensionId: dimensions.id,
          dimensionName: dimensions.name,
          dimensionValueId: dimensionValues.id,
          dimensionValueName: dimensionValues.name
        })
        .from(txDimensionLink)
        .innerJoin(dimensions, eq(txDimensionLink.dimensionId, dimensions.id))
        .innerJoin(dimensionValues, eq(txDimensionLink.dimensionValueId, dimensionValues.id))
        .where(eq(txDimensionLink.journalEntryLineId, line.id));

        console.log(`DEBUG: Line ${line.id} dimension tags from DB:`, JSON.stringify(dimensionTags, null, 2));

        const tags = dimensionTags.map(tag => ({
          dimensionId: tag.dimensionId,
          dimensionValueId: tag.dimensionValueId,
          dimensionName: tag.dimensionName,
          dimensionValueName: tag.dimensionValueName
        }));

        const result = {
          ...line,
          tags: tags
        };
        
        console.log(`DEBUG: Line ${line.id} final result with tags:`, JSON.stringify(result, null, 2));
        return result;
      }));

      console.log(`DEBUG: Returning ${linesWithTags.length} formatted lines with dimension tags`);
      return linesWithTags;

    } catch (e) {
      console.error(`ERROR getting lines with dimension tags:`, e);
      throw handleDbError(e, `getting lines with dimension tags for journal entry ${journalEntryId}`);
    }
  }
  
  /**
   * Get general ledger entries for an entity with optional filters
   * Returns transactions with running balance calculation
   */
  async getGeneralLedgerEntries(options: GLOptions): Promise<GeneralLedgerEntry[]> {
    console.log(`Getting general ledger entries for entity ${options.entityId}`);
    try {
      // Build base query conditions
      const conditions = [
        eq(journalEntries.entityId, options.entityId),
        eq(journalEntries.status, 'posted') // Only include posted entries
      ];
      
      // Add date range conditions if provided
      if (options.startDate) {
        conditions.push(gte(journalEntries.date, options.startDate));
      }
      
      if (options.endDate) {
        conditions.push(lte(journalEntries.date, options.endDate));
      }
      
      // Get account information first for the client (needed for account details and filtering)
      const clientAccounts = await db.select({
        id: accounts.id,
        code: accounts.accountCode,
        name: accounts.name,
        type: accounts.type
      })
      .from(accounts)
      .where(eq(accounts.clientId, options.clientId));
      
      // Create a map for fast account lookup
      const accountMap = new Map(clientAccounts.map(acc => [acc.id, acc]));
      
      // Get journal entries and their lines
      const query = db.select({
        entryId: journalEntries.id,
        entryDate: journalEntries.date,
        referenceNumber: journalEntries.referenceNumber,
        description: journalEntries.description,
        lineId: journalEntryLines.id,
        accountId: journalEntryLines.accountId,
        lineType: journalEntryLines.type,
        amount: journalEntryLines.amount,
        lineDescription: journalEntryLines.description,
        entityCode: journalEntryLines.entityCode
      })
      .from(journalEntries)
      .innerJoin(journalEntryLines, eq(journalEntries.id, journalEntryLines.journalEntryId))
      .where(and(...conditions))
      .orderBy(asc(journalEntries.date), asc(journalEntries.id));
      
      // Apply account filter if provided
      if (options.accountId) {
        query.where(eq(journalEntryLines.accountId, options.accountId));
      }
      
      // Execute the query
      const results = await query;
      
      // Transform results to GeneralLedgerEntry format with balance calculation
      let entries: GeneralLedgerEntry[] = [];
      let runningBalance = 0;
      
      for (const row of results) {
        // Skip if account not found (shouldn't happen with proper constraints)
        if (!accountMap.has(row.accountId)) continue;
        
        const account = accountMap.get(row.accountId)!;
        const amount = parseFloat(row.amount) || 0;
        
        // Determine debit/credit values
        let debit = 0;
        let credit = 0;
        if (row.lineType === 'debit') {
          debit = amount;
        } else {
          credit = amount;
        }
        
        // Calculate running balance based on account type
        // For assets and expenses, debits increase balance
        // For liabilities, equity, and revenue, credits increase balance
        if (account.type === 'asset' || account.type === 'expense') {
          runningBalance += debit - credit;
        } else {
          runningBalance += credit - debit;
        }
        
        // Create GeneralLedgerEntry
        entries.push({
          id: row.lineId,
          date: row.entryDate,
          referenceNumber: row.referenceNumber,
          description: row.description || row.lineDescription,
          accountId: row.accountId,
          accountCode: account.code,
          accountName: account.name,
          debit,
          credit,
          balance: runningBalance,
          journalEntryId: row.entryId,
          lineId: row.lineId,
          entityCode: row.entityCode
        });
      }
      
      return entries;
    } catch (e) {
      throw handleDbError(e, `getting general ledger entries for entity ${options.entityId}`);
    }
  }
  
  async createJournalEntryLine(insertLine: InsertJournalEntryLine): Promise<JournalEntryLine> {
    console.log(`Creating line for journal entry ${insertLine.journalEntryId}`);
    try {
      // Get journal entry to verify it exists and is not posted/void
      const journalEntry = await this.getJournalEntry(insertLine.journalEntryId);
      if (!journalEntry) {
        throw new ApiError(404, `Journal entry with ID ${insertLine.journalEntryId} not found`);
      }
      
      if (journalEntry.status === 'posted' || journalEntry.status === 'void') {
        throw new ApiError(400, `Cannot add line to journal entry with status ${journalEntry.status}`);
      }
      
      // Validate the account exists and is active
      // Create a local instance of AccountStorage
      const accountStorageInstance = new AccountStorage();
      const accountValid = await accountStorageInstance.getAccountById(insertLine.accountId, journalEntry.clientId);
      if (!accountValid) {
        throw new ApiError(404, `Account with ID ${insertLine.accountId} not found or inactive`);
      }
      
      // Insert the line
      const [line] = await db.insert(journalEntryLines)
        .values(insertLine)
        .returning();
      
      return line;
    } catch (e) {
      throw handleDbError(e, `creating line for journal entry ${insertLine.journalEntryId}`);
    }
  }
  
  // Alias for createJournalEntryLine to maintain API compatibility
  async addJournalEntryLine(insertLine: InsertJournalEntryLine): Promise<JournalEntryLine> {
    return this.createJournalEntryLine(insertLine);
  }
  
  async updateJournalEntryLine(id: number, lineData: Partial<JournalEntryLine>): Promise<JournalEntryLine | undefined> {
    console.log(`Updating journal entry line ${id}`);
    try {
      // Check if line exists
      const [existingLine] = await db.select()
        .from(journalEntryLines)
        .where(eq(journalEntryLines.id, id))
        .limit(1);
      
      if (!existingLine) {
        return undefined;
      }
      
      // Get journal entry to verify it's not posted/void
      const journalEntry = await this.getJournalEntry(existingLine.journalEntryId);
      if (journalEntry && (journalEntry.status === 'posted' || journalEntry.status === 'void')) {
        throw new ApiError(400, `Cannot update line in journal entry with status ${journalEntry.status}`);
      }
      
      // Update the line
      const [updatedLine] = await db.update(journalEntryLines)
        .set(lineData)
        .where(eq(journalEntryLines.id, id))
        .returning();
      
      return updatedLine;
    } catch (e) {
      throw handleDbError(e, `updating journal entry line ${id}`);
    }
  }
  
  async deleteJournalEntryLine(id: number): Promise<boolean> {
    console.log(`Deleting journal entry line ${id}`);
    try {
      // Check if line exists
      const [existingLine] = await db.select()
        .from(journalEntryLines)
        .where(eq(journalEntryLines.id, id))
        .limit(1);
      
      if (!existingLine) {
        return false;
      }
      
      // Get journal entry to verify it's not posted/void
      const journalEntry = await this.getJournalEntry(existingLine.journalEntryId);
      if (journalEntry && (journalEntry.status === 'posted' || journalEntry.status === 'void')) {
        throw new ApiError(400, `Cannot delete line from journal entry with status ${journalEntry.status}`);
      }
      
      // Delete the line
      await db.delete(journalEntryLines)
        .where(eq(journalEntryLines.id, id));
      
      return true;
    } catch (e) {
      throw handleDbError(e, `deleting journal entry line ${id}`);
    }
  }
  
  async reverseJournalEntry(journalEntryId: number, options: {
    date?: Date;
    description?: string;
    createdBy: number;
    referenceNumber?: string;
    postAutomatically?: boolean;
  }): Promise<JournalEntry | undefined> {
    console.log(`Reversing journal entry ${journalEntryId} with options:`, options);
    try {
      // Get the original journal entry
      const originalEntry = await this.getJournalEntry(journalEntryId);
      if (!originalEntry) {
        throw new ApiError(404, `Journal entry with ID ${journalEntryId} not found`);
      }
      
      console.log(`Original entry found:`, JSON.stringify(originalEntry));
      
      // Verify the entry is in posted status
      if (originalEntry.status !== 'posted') {
        throw new ApiError(400, `Can only reverse journal entries with status 'posted', but entry has status '${originalEntry.status}'`);
      }
      
      // Check if this entry has already been reversed
      if (originalEntry.reversedByEntryId) {
        throw new ApiError(400, `Journal entry ${journalEntryId} has already been reversed by entry ${originalEntry.reversedByEntryId}`);
      }
      
      // Get the original lines
      const originalLines = await this.getJournalEntryLines(journalEntryId);
      if (originalLines.length === 0) {
        throw new ApiError(400, `Journal entry with ID ${journalEntryId} has no lines to reverse`);
      }
      
      console.log(`Found ${originalLines.length} lines to reverse`);
      
      // Create a new journal entry for the reversal
      // Use the provided date, or the original entry's reversalDate, or today's date
      let reversalDate: string;
      if (options.date) {
        reversalDate = format(options.date, 'yyyy-MM-dd');
      } else if (originalEntry.reversalDate) {
        reversalDate = format(new Date(originalEntry.reversalDate), 'yyyy-MM-dd');
      } else {
        reversalDate = format(new Date(), 'yyyy-MM-dd');
      }
      
      // Format the original entry date consistently
      const originalDateStr = format(new Date(originalEntry.date), 'yyyy-MM-dd');
      
      // Add timestamp to make reference number unique and avoid collisions
      const timestamp = Date.now().toString().substring(8); // Last few digits of timestamp
      
      const reversalDescription = options.description || `Reversal of journal entry ${originalEntry.referenceNumber} from ${originalDateStr}`;
      const reversalReference = options.referenceNumber || `REV-${originalEntry.referenceNumber}-${timestamp}`;
      
      // Create a new entry data object for the reversal, explicitly selecting only the fields we need
      // This avoids potential issues with unknown fields or primary key conflicts
      const reversalEntryData = {
        date: reversalDate, // Use the determined reversal date
        clientId: originalEntry.clientId,
        entityId: originalEntry.entityId,
        referenceNumber: reversalReference,
        description: reversalDescription,
        journalType: originalEntry.journalType,
        isSystemGenerated: false,
        status: options.postAutomatically ? 'posted' as const : 'draft' as const,  // Set status based on flag
        createdBy: options.createdBy,
        isReversal: true,
        reversedEntryId: originalEntry.id,
        postedBy: options.postAutomatically ? options.createdBy : null,
        postedAt: options.postAutomatically ? new Date() : null
      };
      
      console.log(`Creating reversal entry with data:`, JSON.stringify(reversalEntryData));
      
      // Execute the insert as a transaction to ensure atomicity
      let reversalEntry;
      await db.transaction(async (tx) => {
        // Insert the new journal entry
        const [newReversalEntry] = await tx.insert(journalEntries)
          .values(reversalEntryData)
          .returning();
          
        reversalEntry = newReversalEntry;
        console.log(`Created new reversal entry with ID: ${reversalEntry.id}`);
        
        // Create reversed lines (opposite debit/credit types) with dimension tags
        for (const line of originalLines) {
          const reversedType = line.type === 'debit' ? 'credit' : 'debit';
          const lineData = {
            journalEntryId: reversalEntry.id,
            accountId: line.accountId,
            type: reversedType,
            amount: line.amount,
            description: line.description || null,
            entityCode: line.entityCode || null, // Include entityCode from original line
            fsliBucket: line.fsliBucket || null, // Copy reporting fields as well
            internalReportingBucket: line.internalReportingBucket || null,
            item: line.item || null,
            reconciled: false // New reversal line is not reconciled
          };
          
          // Insert the reversed line
          const [insertedLine] = await tx.insert(journalEntryLines)
            .values(lineData)
            .returning();
            
          console.log(`Added reversed line for account ${line.accountId}: ${reversedType} ${line.amount}`);
          
          // Copy dimension tags from the original line
          if (line.tags && Array.isArray(line.tags) && line.tags.length > 0) {
            console.log(`Copying ${line.tags.length} dimension tags to reversed line ${insertedLine.id}`);
            
            for (const tag of line.tags) {
              await tx.insert(txDimensionLink)
                .values({
                  journalEntryLineId: insertedLine.id,
                  dimensionId: tag.dimensionId,
                  dimensionValueId: tag.dimensionValueId
                });
            }
          }
        }
        
        // Update the original entry to link to the reversal
        await tx.update(journalEntries)
          .set({ 
            reversedByEntryId: reversalEntry.id,
            isReversed: true 
          })
          .where(eq(journalEntries.id, originalEntry.id));
        
        console.log(`Updated original entry ${originalEntry.id} to link to reversal ${reversalEntry.id}`);
        
        // Leave the reversal entry in draft status - removed auto-posting
        // This ensures the user must manually review and post the reversal
        console.log(`Reversal entry ${reversalEntry.id} created in draft status`);
      });
      
      // Return the completed reversal entry with lines
      if (!reversalEntry) {
        throw new ApiError(500, `Failed to create reversal entry for journal entry ${journalEntryId}`);
      }
      
      const entry = await this.getJournalEntry(reversalEntry.id);
      console.log(`Returning reversal entry:`, JSON.stringify(entry));
      return entry;
    } catch (e) {
      throw handleDbError(e, `reversing journal entry ${journalEntryId}`);
    }
  }
  
  // Journal Entry File methods
  async getJournalEntryFiles(journalEntryId: number): Promise<any[]> {
    console.log(`Getting files for journal entry ${journalEntryId}`);
    try {
      // Use a simple select query with specific fields to avoid schema mismatches
      const files = await db.select({
        id: journalEntryFiles.id,
        journalEntryId: journalEntryFiles.journalEntryId,
        filename: journalEntryFiles.filename,
        path: journalEntryFiles.path,
        mimeType: journalEntryFiles.mimeType,
        size: journalEntryFiles.size,
        storageKey: journalEntryFiles.storageKey,
        uploadedBy: journalEntryFiles.uploadedBy,
        uploadedAt: journalEntryFiles.uploadedAt
      })
      .from(journalEntryFiles)
      .where(eq(journalEntryFiles.journalEntryId, journalEntryId))
      .orderBy(desc(journalEntryFiles.uploadedAt));
      
      console.log('DEBUG Attach Storage: getJournalEntryFiles DB result:', files);
      return files;
    } catch (e) {
      throw handleDbError(e, `getting files for journal entry ${journalEntryId}`);
    }
  }
  
  async createJournalEntryFile(journalEntryId: number, file: any): Promise<any> {
    console.log(`Creating file for journal entry ${journalEntryId}`);
    try {
      // Get the file storage implementation
      const fileStorage = getFileStorage();
      
      // Ensure the journal entry exists
      const journalEntry = await this.getJournalEntry(journalEntryId);
      if (!journalEntry) {
        throw new ApiError(404, `Journal entry with ID ${journalEntryId} not found`);
      }

      // Get existing files for this journal entry to check for duplicates
      const existingFiles = await db.select()
        .from(journalEntryFiles)
        .where(eq(journalEntryFiles.journalEntryId, journalEntryId));
      
      // Check if this file already exists (by name and size)
      const isDuplicate = existingFiles.some(existingFile => 
        existingFile.filename === file.originalname && 
        existingFile.size === file.size
      );
      
      // If it's a duplicate, return a specific error
      if (isDuplicate) {
        console.log(`Duplicate file detected: ${file.originalname}`);
        throw new ApiError(409, `A file with the same name and size already exists for this journal entry`);
      }
      
      // Ensure the file is valid before saving
      if (!file.buffer) {
        throw new ApiError(400, 'Invalid file data: No buffer found');
      }
      
      // Store the file data in the blob storage
      const storageKey = await fileStorage.save(file.buffer);
      console.log(`File content saved with storage key: ${storageKey}`);
      
      // Create a database record with a reference to the blob storage
      const [journalEntryFile] = await db.insert(journalEntryFiles)
        .values({
          journalEntryId,
          filename: file.originalname,
          path: null, // No physical path needed for DB-stored files
          mimeType: file.mimetype || 'application/octet-stream',
          size: file.size || 0,
          storageKey: storageKey as number, // Reference to the blob storage
          uploadedBy: file.uploadedBy
        })
        .returning();
      
      console.log(`File metadata stored in database for journal entry ${journalEntryId}`);
      
      return journalEntryFile;
    } catch (e) {
      throw handleDbError(e, `creating file for journal entry ${journalEntryId}`);
    }
  }

  async getJournalEntryFile(fileId: number): Promise<any> {
    console.log(`Getting file with ID ${fileId}`);
    try {
      // Use the same select query approach as getJournalEntryFiles
      const files = await db.select({
        id: journalEntryFiles.id,
        journalEntryId: journalEntryFiles.journalEntryId,
        filename: journalEntryFiles.filename,
        path: journalEntryFiles.path,
        mimeType: journalEntryFiles.mimeType,
        size: journalEntryFiles.size,
        storageKey: journalEntryFiles.storageKey,
        uploadedBy: journalEntryFiles.uploadedBy,
        uploadedAt: journalEntryFiles.uploadedAt
      })
      .from(journalEntryFiles)
      .where(eq(journalEntryFiles.id, fileId))
      .limit(1);
      
      if (files.length === 0) {
        throw new ApiError(404, `File with ID ${fileId} not found`);
      }
      
      return files[0];
    } catch (e) {
      throw handleDbError(e, `getting file with ID ${fileId}`);
    }
  }
  
  async saveJournalEntryFile(fileData: { 
    journalEntryId: number;
    filename: string;
    mimeType: string;
    size: number;
    uploadedBy: number;
    fileData: string;
  }): Promise<any> {
    console.log(`Saving file ${fileData.filename} for journal entry ${fileData.journalEntryId}`);
    try {
      // Get the file storage implementation
      const fileStorage = getFileStorage();
      
      // Convert base64 string to Buffer
      const fileBuffer = Buffer.from(fileData.fileData, 'base64');
      
      // Store the file data in the blob storage
      const storageKey = await fileStorage.save(fileBuffer);
      console.log(`File content saved with storage key: ${storageKey}`);
      
      // Create a database record with a reference to the blob storage
      const [journalEntryFile] = await db.insert(journalEntryFiles)
        .values({
          journalEntryId: fileData.journalEntryId,
          filename: fileData.filename,
          path: null, // No physical path needed for DB-stored files
          mimeType: fileData.mimeType || 'application/octet-stream',
          size: fileData.size || 0,
          storageKey: storageKey as number, // Reference to the blob storage
          uploadedBy: fileData.uploadedBy
        })
        .returning();
      
      console.log(`File metadata stored in database for journal entry ${fileData.journalEntryId}`);
      
      return journalEntryFile;
    } catch (e) {
      throw handleDbError(e, `saving file for journal entry ${fileData.journalEntryId}`);
    }
  }
  
  async getJournalEntryFileData(storageKey: number | string): Promise<Buffer> {
    console.log(`Getting file data with storage key ${storageKey}`);
    try {
      // Get the file storage implementation
      const fileStorage = getFileStorage();
      
      // Load the file data from storage
      const fileBuffer = await fileStorage.load(storageKey);
      
      if (!fileBuffer) {
        throw new ApiError(404, `File data with storage key ${storageKey} not found`);
      }
      
      return fileBuffer;
    } catch (e) {
      throw handleDbError(e, `getting file data with storage key ${storageKey}`);
    }
  }
  
  async deleteJournalEntryFile(fileId: number): Promise<boolean> {
    console.log(`Deleting file with ID ${fileId}`);
    try {
      // Get the file storage implementation
      const fileStorage = getFileStorage();
      
      // First get the file details
      const file = await this.getJournalEntryFile(fileId);
      if (!file) {
        return false;
      }
      
      // If we have a storageKey, delete from blob storage
      if (file.storageKey) {
        try {
          await fileStorage.delete(file.storageKey);
          console.log(`Deleted file from blob storage with key: ${file.storageKey}`);
        } catch (error) {
          console.error(`Error deleting from blob storage: ${error}`);
          // Continue with deletion of metadata even if blob deletion fails
        }
      }
      
      // For backward compatibility with filesystem-stored files
      // Delete the physical file from the file system if path exists and the file exists on disk
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        console.log(`Deleted file from filesystem: ${file.path}`);
      }
      
      // Delete the file record from the database
      await db.delete(journalEntryFiles)
        .where(eq(journalEntryFiles.id, fileId));
      
      console.log(`Deleted file record from database: ${fileId}`);
      return true;
    } catch (e) {
      throw handleDbError(e, `deleting file with ID ${fileId}`);
    }
  }
  
  async createBatchJournalEntries(
    clientId: number,
    createdById: number,
    entriesData: Omit<InsertJournalEntry, 'clientId' | 'createdBy'>[]
  ): Promise<{ successCount: number; errors: { entryIndex: number; error: string }[] }> {
    console.log(`Creating batch of ${entriesData.length} journal entries for client ${clientId}`);
    const result = {
      successCount: 0,
      errors: [] as { entryIndex: number; error: string }[]
    };
    
    try {
      // Validate client exists
      const clientExists = await db.select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);
      
      if (clientExists.length === 0) {
        throw new ApiError(404, `Client with ID ${clientId} not found`);
      }
      
      // Process entries one by one for better error handling
      for (let i = 0; i < entriesData.length; i++) {
        const entryData = entriesData[i];
        
        try {
          // Prepare data for insert
          const insertData = {
            ...entryData,
            clientId,
            createdBy: createdById,
            status: entryData.status || 'draft' // Default to draft if not specified
          };
          
          // Insert the journal entry
          const [journalEntry] = await db.insert(journalEntries)
            .values(insertData)
            .returning();
          
          // Process lines if present in the entry data
          // Note: 'lines' is not in the InsertJournalEntry type, but we handle it for backward compatibility
          const entryWithLines = entryData as any;
          if (entryWithLines.lines && Array.isArray(entryWithLines.lines)) {
            for (const lineData of entryWithLines.lines) {
              await this.createJournalEntryLine({
                ...lineData,
                journalEntryId: journalEntry.id
              });
            }
          }
          
          // Validate the entry is balanced
          const isBalanced = await this.validateJournalEntryBalance(journalEntry.id);
          if (!isBalanced) {
            // If not balanced, delete the entry and report error
            await this.deleteJournalEntry(journalEntry.id);
            result.errors.push({
              entryIndex: i,
              error: `Journal entry is not balanced`
            });
          } else {
            result.successCount++;
          }
        } catch (error) {
          // Capture error for this specific entry
          result.errors.push({
            entryIndex: i,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      return result;
    } catch (e) {
      throw handleDbError(e, `creating batch journal entries for client ${clientId}`);
    }
  }
  
  // Legacy Journal methods (aliases for JournalEntry methods)
  async getJournal(id: number): Promise<JournalEntry | undefined> {
    return this.getJournalEntry(id);
  }
  
  async getJournals(entityId: number): Promise<JournalEntry[]> {
    return this.getJournalEntries(entityId);
  }
  
  async getJournalsByType(entityId: number, type: any): Promise<JournalEntry[]> {
    // Filter journal entries by journal type
    try {
      return await db.select()
        .from(journalEntries)
        .where(and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.journalType, type)
        ))
        .orderBy(desc(journalEntries.date));
    } catch (e) {
      throw handleDbError(e, `getting journal entries with type ${type} for entity ${entityId}`);
    }
  }
  
  async createJournal(journal: any): Promise<JournalEntry> {
    return this.createJournalEntry(journal.clientId, journal.createdBy, journal);
  }
  
  async updateJournal(id: number, journal: Partial<any>): Promise<JournalEntry | undefined> {
    return this.updateJournalEntry(id, journal);
  }
  
  async deleteJournal(id: number): Promise<boolean> {
    return this.deleteJournalEntry(id);
  }

  /**
   * Create dimension tags for a journal entry line
   * Ensures data structure perfectly matches txDimensionLink schema
   */
  async createDimensionTags(journalEntryLineId: number, tags: Array<{
    dimensionId: number;
    dimensionValueId: number;
    dimensionName?: string;
    dimensionValueName?: string;
  }>): Promise<void> {
    console.log(`Creating dimension tags for journal entry line ${journalEntryLineId}`);
    
    try {
      // Early return if no tags to process
      if (!tags || tags.length === 0) {
        console.log(`No tags provided for journal entry line ${journalEntryLineId}`);
        return;
      }

      // Validate that journalEntryLineId exists
      if (!journalEntryLineId || journalEntryLineId <= 0) {
        throw new Error(`Invalid journalEntryLineId: ${journalEntryLineId}`);
      }

      // Prepare dimension link records matching InsertTxDimensionLink schema exactly
      const dimensionLinks: InsertTxDimensionLink[] = tags.map(tag => {
        // Validate required fields
        if (!tag.dimensionId || !tag.dimensionValueId) {
          throw new Error(`Invalid tag data: dimensionId=${tag.dimensionId}, dimensionValueId=${tag.dimensionValueId}`);
        }

        return {
          journalEntryLineId: journalEntryLineId,
          dimensionId: tag.dimensionId,
          dimensionValueId: tag.dimensionValueId
        };
      });

      console.log(`Inserting ${dimensionLinks.length} dimension tags for line ${journalEntryLineId}:`, 
        dimensionLinks.map(link => `dimension:${link.dimensionId} -> value:${link.dimensionValueId}`).join(', '));

      // Insert dimension links with proper error handling
      await db.insert(txDimensionLink).values(dimensionLinks);
      
      console.log(`Successfully created ${dimensionLinks.length} dimension tags for journal entry line ${journalEntryLineId}`);
    } catch (e) {
      console.error(`Error creating dimension tags for line ${journalEntryLineId}:`, e);
      throw handleDbError(e, `creating dimension tags for journal entry line ${journalEntryLineId}`);
    }
  }

  /**
   * Update dimension tags for a journal entry line
   * Handles the complete delete-then-insert operation within a transaction
   */
  async updateDimensionTagsForLine(journalEntryLineId: number, tags: Array<{
    dimensionId: number;
    dimensionValueId: number;
    dimensionName?: string;
    dimensionValueName?: string;
  }>): Promise<void> {
    console.log(`Updating dimension tags for journal entry line ${journalEntryLineId}`);
    
    try {
      // Validate journalEntryLineId
      if (!journalEntryLineId || journalEntryLineId <= 0) {
        throw new Error(`Invalid journalEntryLineId: ${journalEntryLineId}`);
      }

      // Execute delete-then-insert operation in a transaction for atomicity
      await db.transaction(async (tx) => {
        // Step 1: Delete all existing tags for this journal entry line
        const deletedTags = await tx.delete(txDimensionLink)
          .where(eq(txDimensionLink.journalEntryLineId, journalEntryLineId))
          .returning();
        
        console.log(`Deleted ${deletedTags.length} existing dimension tags for line ${journalEntryLineId}`);

        // Step 2: Insert new tags if any are provided
        if (tags && tags.length > 0) {
          // Validate and prepare new dimension links
          const dimensionLinks: InsertTxDimensionLink[] = tags.map(tag => {
            if (!tag.dimensionId || !tag.dimensionValueId) {
              throw new Error(`Invalid tag data: dimensionId=${tag.dimensionId}, dimensionValueId=${tag.dimensionValueId}`);
            }

            return {
              journalEntryLineId: journalEntryLineId,
              dimensionId: tag.dimensionId,
              dimensionValueId: tag.dimensionValueId
            };
          });

          console.log(`Inserting ${dimensionLinks.length} new dimension tags for line ${journalEntryLineId}:`, 
            dimensionLinks.map(link => `dimension:${link.dimensionId} -> value:${link.dimensionValueId}`).join(', '));

          // Insert new tags
          await tx.insert(txDimensionLink).values(dimensionLinks);
          
          console.log(`Successfully inserted ${dimensionLinks.length} new dimension tags for line ${journalEntryLineId}`);
        } else {
          console.log(`No new tags to insert for line ${journalEntryLineId}`);
        }
      });

      console.log(`Successfully updated dimension tags for journal entry line ${journalEntryLineId}`);
    } catch (e) {
      console.error(`Error updating dimension tags for line ${journalEntryLineId}:`, e);
      throw handleDbError(e, `updating dimension tags for journal entry line ${journalEntryLineId}`);
    }
  }

  /**
   * Delete all dimension tags for a journal entry line
   */
  async deleteDimensionTagsForLine(journalEntryLineId: number): Promise<void> {
    console.log(`Deleting all dimension tags for journal entry line ${journalEntryLineId}`);
    
    try {
      if (!journalEntryLineId || journalEntryLineId <= 0) {
        throw new Error(`Invalid journalEntryLineId: ${journalEntryLineId}`);
      }

      const deletedTags = await db.delete(txDimensionLink)
        .where(eq(txDimensionLink.journalEntryLineId, journalEntryLineId))
        .returning();
      
      console.log(`Successfully deleted ${deletedTags.length} dimension tags for journal entry line ${journalEntryLineId}`);
    } catch (e) {
      console.error(`Error deleting dimension tags for line ${journalEntryLineId}:`, e);
      throw handleDbError(e, `deleting dimension tags for journal entry line ${journalEntryLineId}`);
    }
  }

  /**
   * Process due accrual reversals - finds all accrual entries that need to be reversed
   * and creates their reversal entries automatically
   */
  async processDueAccrualReversals(): Promise<{ successCount: number; failCount: number; }> {
    console.log('CRON JOB: Checking for due accrual reversals...');

    // Find all journal entries that are accruals, are not yet reversed,
    // and have a reversal date on or before today.
    const today = format(new Date(), 'yyyy-MM-dd');
    const dueEntries = await db.select({ 
      id: journalEntries.id, 
      createdBy: journalEntries.createdBy,
      reversalDate: journalEntries.reversalDate
    })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.isAccrual, true),
          eq(journalEntries.status, 'posted'), // Only reverse posted entries
          isNull(journalEntries.reversedByEntryId), // Not already reversed
          lte(journalEntries.reversalDate, today) // Due for reversal
        )
      );

    if (dueEntries.length === 0) {
      console.log('CRON JOB: No accrual entries are due for reversal.');
      return { successCount: 0, failCount: 0 };
    }

    console.log(`CRON JOB: Found ${dueEntries.length} accrual entries to reverse.`);
    let successCount = 0;
    let failCount = 0;

    for (const entry of dueEntries) {
      try {
        // Use the existing reverseJournalEntry method to create the reversal
        const reversalEntry = await this.reverseJournalEntry(entry.id, {
          date: entry.reversalDate ? new Date(entry.reversalDate) : new Date(),
          description: 'Automatic accrual reversal',
          createdBy: entry.createdBy || 1, // Use original creator or system user as fallback
          postAutomatically: true // Add new flag to force posting
        });

        if (reversalEntry) {
          console.log(`CRON JOB: Successfully reversed and posted accrual entry ${entry.id} -> ${reversalEntry.id}`);
          successCount++;
        } else {
          console.error(`CRON JOB: Failed to create reversal entry for ${entry.id} - no entry returned`);
          failCount++;
        }
      } catch (error) {
        console.error(`CRON JOB: Failed to reverse accrual entry ID ${entry.id}:`, error);
        failCount++;
      }
    }

    console.log(`CRON JOB: Reversal process complete. Success: ${successCount}, Failed: ${failCount}`);
    return { successCount, failCount };
  }

  async copyJournalEntry(originalEntryId: number, newUserId: number): Promise<JournalEntry> {
    console.log(`ARCHITECT_DEBUG: FINAL ATTEMPT. Starting copy for original entry ID: ${originalEntryId}`);

    const originalEntry = await db.query.journalEntries.findFirst({
        where: eq(schema.journalEntries.id, originalEntryId),
    });

    if (!originalEntry) {
        throw new Error(`Original journal entry with id ${originalEntryId} not found`);
    }
    if (originalEntry.status === 'voided') {
        throw new Error('Cannot copy a voided journal entry.');
    }

    const originalLines = await db.query.journalEntryLines.findMany({
        where: eq(schema.journalEntryLines.journalEntryId, originalEntryId),
        with: { dimensions: true }
    });

    try {
        const newJournalEntry = await db.transaction(async (tx) => {
            const [copiedEntry] = await tx
                .insert(schema.journalEntries)
                .values({
                    clientId: originalEntry.clientId,
                    entityId: originalEntry.entityId,
                    date: new Date(),
                    description: `Copy of: ${originalEntry.description}`,
                    status: 'draft',
                    createdBy: newUserId,
                    // referenceNumber and updatedBy are correctly omitted.
                })
                .returning();

            if (!copiedEntry) {
                throw new Error('Failed to create the new journal entry header.');
            }

            for (const line of originalLines) {
                const [newLine] = await tx
                    .insert(schema.journalEntryLines)
                    .values({
                        journalEntryId: copiedEntry.id,
                        accountId: line.accountId,
                        amount: line.amount,
                        type: line.type,
                        description: line.description,
                    })
                    .returning();

                if (!newLine) {
                    throw new Error('Failed to create a new journal entry line.');
                }

                if (line.dimensions && line.dimensions.length > 0) {
                    const newDimensionLinks = line.dimensions.map((dim) => ({
                        journalEntryLineId: newLine.id,
                        dimensionId: dim.dimensionId,
                        valueId: dim.valueId,
                    }));
                    await tx.insert(schema.txDimensionLink).values(newDimensionLinks);
                }
            }

            return copiedEntry;
        });

        const fullCopiedEntry = await this.getJournalEntry(newJournalEntry.id);
        if (!fullCopiedEntry) {
            throw new Error("Could not retrieve the newly copied journal entry after transaction.");
        }

        return fullCopiedEntry;

    } catch (error) {
        console.error("ARCHITECT_DEBUG: Error during the final copy transaction:", error);
        throw new Error(`Database error during copy of JE ${originalEntryId}`);
    }
  }
}

// Create and export an instance of the storage class
export const journalEntryStorage = new JournalEntryStorage();