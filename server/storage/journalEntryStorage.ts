import {
  journalEntries, JournalEntry, InsertJournalEntry, JournalEntryStatus,
  journalEntryLines, JournalEntryLine, InsertJournalEntryLine,
  accounts, Account, AccountType,
  entities, clients
} from "../../shared/schema";
import { db } from "../db";
import { eq, and, desc, asc, gte, lte, sql, count, inArray, like, isNull, or } from "drizzle-orm";
import { ApiError } from "../errorHandling";
import { format, parseISO } from "date-fns";
import { ListJournalEntriesFilters } from "../../shared/validation";
import { AccountStorage } from "./accountStorage"; // Import the AccountStorage class

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
export interface IJournalEntryStorage {
  // Journal Entry operations
  createJournalEntry(clientId: number, createdById: number, entryData: InsertJournalEntry): Promise<JournalEntry>;
  getJournalEntry(id: number): Promise<JournalEntry | undefined>;
  getJournalEntries(entityId: number): Promise<JournalEntry[]>;
  getJournalEntriesByStatus(entityId: number, status: JournalEntryStatus): Promise<JournalEntry[]>;
  listJournalEntries(filters?: ListJournalEntriesFilters): Promise<JournalEntry[]>;
  updateJournalEntry(id: number, entryData: Partial<JournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: number): Promise<boolean>;
  
  // Journal Entry Line operations
  getJournalEntryLines(journalEntryId: number): Promise<JournalEntryLine[]>;
  createJournalEntryLine(insertLine: InsertJournalEntryLine): Promise<JournalEntryLine>;
  addJournalEntryLine(insertLine: InsertJournalEntryLine): Promise<JournalEntryLine>; // Alias for createJournalEntryLine
  updateJournalEntryLine(id: number, line: Partial<JournalEntryLine>): Promise<JournalEntryLine | undefined>;
  deleteJournalEntryLine(id: number): Promise<boolean>;
  
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
      
      return entry;
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
      return await query;
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
      
      // Update the journal entry
      const [updatedEntry] = await db.update(journalEntries)
        .set(entryData)
        .where(eq(journalEntries.id, id))
        .returning();
      
      return updatedEntry;
    } catch (e) {
      throw handleDbError(e, `updating journal entry ${id}`);
    }
  }
  
  async deleteJournalEntry(id: number): Promise<boolean> {
    console.log(`Deleting journal entry ${id}`);
    try {
      // Check if entry exists
      const existingEntry = await this.getJournalEntry(id);
      if (!existingEntry) {
        return false;
      }
      
      // Delete associated lines first to maintain referential integrity
      await db.delete(journalEntryLines)
        .where(eq(journalEntryLines.journalEntryId, id));
      
      // Delete the journal entry
      const result = await db.delete(journalEntries)
        .where(eq(journalEntries.id, id));
      
      return true;
    } catch (e) {
      throw handleDbError(e, `deleting journal entry ${id}`);
    }
  }
  
  async getJournalEntryLines(journalEntryId: number): Promise<JournalEntryLine[]> {
    console.log(`Getting lines for journal entry ${journalEntryId}`);
    try {
      return await db.select()
        .from(journalEntryLines)
        .where(eq(journalEntryLines.journalEntryId, journalEntryId));
    } catch (e) {
      throw handleDbError(e, `getting lines for journal entry ${journalEntryId}`);
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
  }): Promise<JournalEntry | undefined> {
    console.log(`Reversing journal entry ${journalEntryId}`);
    try {
      // Get the original journal entry
      const originalEntry = await this.getJournalEntry(journalEntryId);
      if (!originalEntry) {
        throw new ApiError(404, `Journal entry with ID ${journalEntryId} not found`);
      }
      
      // Verify the entry is in posted status
      if (originalEntry.status !== 'posted') {
        throw new ApiError(400, `Can only reverse journal entries with status 'posted', but entry has status '${originalEntry.status}'`);
      }
      
      // Get the original lines
      const originalLines = await this.getJournalEntryLines(journalEntryId);
      if (originalLines.length === 0) {
        throw new ApiError(400, `Journal entry with ID ${journalEntryId} has no lines to reverse`);
      }
      
      // Create a new journal entry for the reversal
      const reversalDate = options.date || new Date();
      const originalDateStr = format(new Date(originalEntry.date), 'yyyy-MM-dd');
      
      const reversalDescription = options.description || `Reversal of journal entry ${originalEntry.referenceNumber} from ${originalDateStr}`;
      const reversalReference = options.referenceNumber || `REV-${originalEntry.referenceNumber}`;
      
      // Create reversal entry with the same data as original but reversed type and linked
      const reversalEntry = await this.createJournalEntry(
        originalEntry.clientId,
        options.createdBy,
        {
          ...originalEntry,
          date: reversalDate,
          description: reversalDescription,
          referenceNumber: reversalReference,
          status: 'draft',
          createdBy: options.createdBy,
          // Link to the original entry
          reversedEntryId: originalEntry.id
        }
      );
      
      // Create reversed lines (opposite debit/credit types)
      for (const line of originalLines) {
        const reversedType = line.type === 'debit' ? 'credit' : 'debit';
        await this.createJournalEntryLine({
          journalEntryId: reversalEntry.id,
          accountId: line.accountId,
          type: reversedType,
          amount: line.amount,
          description: line.description || null,
          // Copy other fields as needed
          locationId: line.locationId,
          reconciled: false, // New reversal line is not reconciled
        });
      }
      
      // Update the original entry to link to the reversal
      await this.updateJournalEntry(originalEntry.id, {
        reversedByEntryId: reversalEntry.id
      });
      
      // Auto-post the reversal entry
      await this.updateJournalEntry(reversalEntry.id, {
        status: 'posted',
        postedBy: options.createdBy,
        postedAt: new Date()
      });
      
      // Return the completed reversal entry
      return this.getJournalEntry(reversalEntry.id);
    } catch (e) {
      throw handleDbError(e, `reversing journal entry ${journalEntryId}`);
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
          
          // Process lines
          if (entryData.lines && Array.isArray(entryData.lines)) {
            for (const lineData of entryData.lines) {
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
}

// Create and export an instance of the storage class
export const journalEntryStorage = new JournalEntryStorage();