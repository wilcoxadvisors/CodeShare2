/**
 * Client Storage Module
 * 
 * This module contains the storage interface and implementation for client operations.
 */
import { db } from "../db";
import { clients, Client, InsertClient } from "@shared/schema";
import { eq, asc, desc, and, isNull, inArray, ne, lt } from "drizzle-orm";
import { ApiError } from "../errorHandling";

// Helper function to handle database errors consistently
function handleDbError(error: unknown, operation: string): Error {
  console.error(`Database error during ${operation}:`, error);
  if (error instanceof ApiError) {
    return error;
  }
  return new Error(`An error occurred during ${operation}: ${error instanceof Error ? error.message : String(error)}`);
}

import { customAlphabet } from 'nanoid';

/**
 * Generate a unique client code
 * Format: Alphanumeric code (0-9, A-Z) with at least 10 characters
 */
async function generateUniqueClientCode(): Promise<string> {
  // Alphanumeric code (0-9, A-Z)
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const generateCode = customAlphabet(alphabet, 10);
  
  try {
    let unique = false;
    let clientCode = '';
    
    while (!unique) {
      clientCode = generateCode();
      
      // Check if this code already exists
      const existing = await db
        .select()
        .from(clients)
        .where(eq(clients.clientCode, clientCode))
        .limit(1);
      
      unique = existing.length === 0;
    }
    
    return clientCode;
  } catch (error) {
    console.error("Error generating unique client code:", error);
    // Fallback to timestamp-based code if error occurs
    const timestamp = Date.now().toString(36).toUpperCase() + 
                     Math.random().toString(36).substring(2, 6).toUpperCase();
    return timestamp.padEnd(10, '0').substring(0, 10);
  }
}

/**
 * Interface for client storage operations
 */
export interface IClientStorage {
  getClient(id: number): Promise<Client | undefined>;
  getClients(includeDeleted?: boolean): Promise<Client[]>;
  getClientsByUserId(userId: number): Promise<Client[]>;
  getClientByUserId(userId: number): Promise<Client | null>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<Client>): Promise<Client | undefined>;
  deleteClient(id: number, adminId: number): Promise<boolean>;
  restoreClient(id: number, adminId: number): Promise<Client | undefined>;
  permanentlyDeleteClient(id: number, adminId: number): Promise<boolean>;
  getClientsDeletedBefore(date: Date): Promise<Client[]>;
  
  // For MemClientStorage only - allows direct client creation for constructor use
  addClientDirectly?(client: Client): void;
}

/**
 * Implementation of client storage operations using Drizzle ORM
 */
export class ClientStorage implements IClientStorage {
  /**
   * Get a client by ID
   */
  async getClient(id: number): Promise<Client | undefined> {
    try {
      const result = await db
        .select()
        .from(clients)
        .where(eq(clients.id, id))
        .limit(1);
        
      return result[0];
    } catch (error) {
      handleDbError(error, "Error retrieving client");
      return undefined;
    }
  }
  
  /**
   * Get all clients
   * @param includeDeleted - Whether to include soft-deleted clients
   */
  async getClients(includeDeleted: boolean = false): Promise<Client[]> {
    try {
      const query = db
        .select()
        .from(clients);
        
      // Only filter out deleted clients if includeDeleted is false
      if (!includeDeleted) {
        query.where(isNull(clients.deletedAt)); // Only return non-deleted clients
      }
      
      return await query.orderBy(asc(clients.name));
    } catch (error) {
      handleDbError(error, "Error retrieving clients");
      return [];
    }
  }
  
  /**
   * Get clients by user ID
   */
  async getClientsByUserId(userId: number): Promise<Client[]> {
    try {
      return await db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.userId, userId),
            isNull(clients.deletedAt) // Only return non-deleted clients
          )
        )
        .orderBy(asc(clients.name));
    } catch (error) {
      handleDbError(error, "Error retrieving clients by user ID");
      return [];
    }
  }
  
  /**
   * Get a client by user ID (returns first match)
   */
  async getClientByUserId(userId: number): Promise<Client | null> {
    try {
      const results = await db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.userId, userId),
            isNull(clients.deletedAt) // Only return non-deleted clients
          )
        )
        .limit(1);
      
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      handleDbError(error, "Error retrieving client by user ID");
      return null;
    }
  }
  
  /**
   * Create a new client
   */
  async createClient(client: InsertClient): Promise<Client> {
    try {
      // Generate a unique client code
      const clientCode = await generateUniqueClientCode();
      
      // Ensure active is always a boolean and add the client code
      const clientData = {
        ...client,
        clientCode,
        active: client.active !== undefined ? client.active : true
      };
      
      // Log client data before insertion to help debug
      console.log("DEBUG: ClientStorage.createClient called with data:", JSON.stringify(clientData, null, 2));
      
      const [newClient] = await db.insert(clients).values(clientData).returning();
      
      // Log what was actually saved
      console.log("DEBUG: Client created with DB data:", JSON.stringify(newClient, null, 2));
      console.log("DEBUG: Chart of Accounts seeding should happen at the route level, not here.");
      
      return newClient;
    } catch (error) {
      console.error("DEBUG: Error in ClientStorage.createClient:", error);
      throw handleDbError(error, "Error creating client");
    }
  }
  
  /**
   * Update a client
   */
  async updateClient(id: number, clientData: Partial<Client>): Promise<Client | undefined> {
    try {
      // Add updated timestamp
      const updateData = {
        ...clientData,
        updatedAt: new Date()
      };
      
      const [updatedClient] = await db
        .update(clients)
        .set(updateData)
        .where(eq(clients.id, id))
        .returning();
      
      return updatedClient;
    } catch (error) {
      handleDbError(error, "Error updating client");
      return undefined;
    }
  }
  
  /**
   * Soft delete a client by setting deletedAt timestamp
   * 
   * @param id - The ID of the client to delete
   * @param adminId - ID of the admin user performing the deletion (for audit logging)
   * @returns boolean indicating success
   */
  async deleteClient(id: number, adminId: number): Promise<boolean> {
    try {
      // Get client details before deletion for audit logging
      const client = await this.getClient(id);
      if (!client) {
        throw new Error(`Client with ID ${id} not found`);
      }
      
      // Perform soft deletion by setting deletedAt timestamp
      const [deletedClient] = await db
        .update(clients)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
          active: false // Also mark as inactive
        })
        .where(eq(clients.id, id))
        .returning();
      
      // Import the audit log storage module directly to avoid circular dependencies
      const { auditLogStorage } = await import('./auditLogStorage');
      
      // Log this action in the audit log
      await auditLogStorage.createAuditLog({
        action: 'client_delete',
        performedBy: adminId,
        details: JSON.stringify({
          clientId: id,
          clientName: client.name,
          clientCode: client.clientCode
        })
      });
      
      return !!deletedClient;
    } catch (error) {
      handleDbError(error, `Error deleting client ${id}`);
      return false;
    }
  }
  
  /**
   * Restore a soft-deleted client by clearing the deletedAt timestamp
   * 
   * @param id - The ID of the client to restore
   * @param adminId - ID of the admin user performing the restoration (for audit logging)
   * @returns The restored client or undefined if not found/restored
   */
  async restoreClient(id: number, adminId: number): Promise<Client | undefined> {
    try {
      // Get client details before restoration for verification and audit logging
      const client = await this.getClient(id);
      if (!client) {
        throw new Error(`Client with ID ${id} not found`);
      }
      
      // Can only restore if it was previously deleted
      if (!client.deletedAt) {
        console.warn(`Client with ID ${id} is not deleted, nothing to restore`);
        return client; // Return existing client as it's already not deleted
      }
      
      // Perform restore by clearing deletedAt timestamp and setting active back to true
      const [restoredClient] = await db
        .update(clients)
        .set({
          deletedAt: null,
          updatedAt: new Date(),
          active: true // Mark as active again
        })
        .where(eq(clients.id, id))
        .returning();
      
      if (!restoredClient) {
        console.error(`Failed to restore client with ID ${id}`);
        return undefined;
      }
      
      // Import the audit log storage module directly to avoid circular dependencies
      const { auditLogStorage } = await import('./auditLogStorage');
      
      // Log this action in the audit log
      await auditLogStorage.createAuditLog({
        action: 'client_restore',
        performedBy: adminId,
        details: JSON.stringify({
          clientId: id,
          clientName: client.name,
          clientCode: client.clientCode
        })
      });
      
      return restoredClient;
    } catch (error) {
      handleDbError(error, `Error restoring client ${id}`);
      return undefined;
    }
  }
  
  /**
   * Permanently delete a client and all its associated data
   * 
   * This should only be called on clients that have already been soft-deleted.
   * It removes all data associated with the client from all tables.
   * 
   * @param id - The ID of the client to permanently delete
   * @param adminId - ID of the admin user performing the permanent deletion (for audit logging)
   * @returns boolean indicating success
   */
  /**
   * Get all clients that have been soft-deleted before a specified date
   * Used primarily for automatic cleanup of old soft-deleted clients
   * 
   * @param date - Threshold date (clients deleted before this date will be returned)
   * @returns Array of clients deleted before the threshold date
   */
  async getClientsDeletedBefore(date: Date): Promise<Client[]> {
    try {
      const results = await db
        .select()
        .from(clients)
        .where(
          and(
            // Must have a deletedAt timestamp (must be soft-deleted)
            ne(clients.deletedAt, null),
            // And the deletedAt must be earlier than the threshold date
            lt(clients.deletedAt, date)
          )
        )
        .orderBy(asc(clients.deletedAt));
      
      return results;
    } catch (error) {
      handleDbError(error, `Error retrieving clients deleted before ${date.toISOString()}`);
      return [];
    }
  }

  async permanentlyDeleteClient(id: number, adminId: number): Promise<boolean> {
    try {
      // Get client details before permanent deletion for verification and audit logging
      const client = await this.getClient(id);
      if (!client) {
        throw new Error(`Client with ID ${id} not found`);
      }
      
      // Can only permanently delete if it was previously soft-deleted
      if (!client.deletedAt) {
        throw new Error(`Client with ID ${id} has not been soft-deleted. Permanent deletion is only allowed for soft-deleted clients.`);
      }
      
      // Import database and schema related modules
      const { db } = await import('../db');
      const { 
        entities, 
        accounts, 
        clients, 
        journalEntries, 
        journalEntryLines, 
        locations,
        userEntityAccess
      } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      console.log(`Starting permanent deletion for client ${id} (${client.name})...`);
      
      // Transaction to ensure atomicity
      await db.transaction(async (tx) => {
        // Step 1: Delete journal entry lines for all journal entries associated with this client
        console.log(`Deleting journal entry lines for client ${id}...`);
        // First, get all journal entries for this client
        const journalEntriesForClient = await tx
          .select({ id: journalEntries.id })
          .from(journalEntries)
          .where(eq(journalEntries.clientId, id));
          
        const journalEntryIds = journalEntriesForClient.map(je => je.id);
        
        if (journalEntryIds.length > 0) {
          // Delete all journal entry lines for these journal entries
          await tx
            .delete(journalEntryLines)
            .where(
              inArray(journalEntryLines.journalEntryId, journalEntryIds)
            );
        }
        
        // Step 2: Delete all journal entries for this client
        console.log(`Deleting journal entries for client ${id}...`);
        await tx
          .delete(journalEntries)
          .where(eq(journalEntries.clientId, id));
        
        // Step 3: Delete all accounts for this client
        console.log(`Deleting accounts for client ${id}...`);
        await tx
          .delete(accounts)
          .where(eq(accounts.clientId, id));
          
        // Step 4: Delete all locations for this client
        console.log(`Deleting locations for client ${id}...`);
        await tx
          .delete(locations)
          .where(eq(locations.clientId, id));
        
        // Step 5: Get all entities for this client for later use
        console.log(`Finding entities for client ${id}...`);
        const entitiesForClient = await tx
          .select({ id: entities.id })
          .from(entities)
          .where(eq(entities.clientId, id));
          
        const entityIds = entitiesForClient.map(entity => entity.id);
        
        if (entityIds.length > 0) {
          // Step 6: Delete all user entity access records for this client's entities
          console.log(`Deleting user entity access records for client ${id}'s entities...`);
          await tx
            .delete(userEntityAccess)
            .where(
              inArray(userEntityAccess.entityId, entityIds)
            );
        }
        
        // Step 7: Delete all entities for this client
        console.log(`Deleting entities for client ${id}...`);
        await tx
          .delete(entities)
          .where(eq(entities.clientId, id));
        
        // Step 8: Finally, delete the client itself
        console.log(`Deleting client ${id}...`);
        await tx
          .delete(clients)
          .where(eq(clients.id, id));
      });
      
      // Import the audit log storage module directly to avoid circular dependencies
      const { auditLogStorage } = await import('./auditLogStorage');
      
      // Log this action in the audit log
      await auditLogStorage.createAuditLog({
        action: 'client_permanent_delete',
        performedBy: adminId,
        details: JSON.stringify({
          clientId: id,
          clientName: client.name,
          clientCode: client.clientCode,
          deletedAt: client.deletedAt
        })
      });
      
      console.log(`Successfully permanently deleted client ${id} (${client.name})`);
      return true;
    } catch (error) {
      handleDbError(error, `Error permanently deleting client ${id}`);
      console.error('Permanent deletion failed:', error);
      return false;
    }
  }
}

/**
 * Memory-based implementation of client storage operations
 * Primarily used by MemStorage for testing and development
 */
export class MemClientStorage implements IClientStorage {
  private clients: Map<number, Client>;
  private currentClientId: number;
  
  constructor() {
    this.clients = new Map();
    this.currentClientId = 1; // Start IDs at 1
  }
  
  /**
   * Add a client directly to the map
   * This is used by MemStorage constructor to add the default client
   * without using async methods
   */
  addClientDirectly(client: Client): void {
    this.clients.set(client.id, client);
    // Update the ID counter if this ID is higher
    if (client.id >= this.currentClientId) {
      this.currentClientId = client.id + 1;
    }
  }
  
  /**
   * Get a client by ID
   */
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }
  
  /**
   * Get all clients
   * @param includeDeleted - Whether to include soft-deleted clients
   */
  async getClients(includeDeleted: boolean = false): Promise<Client[]> {
    // Filter out deleted clients if includeDeleted is false
    const clientsList = Array.from(this.clients.values());
    const filteredClients = includeDeleted
      ? clientsList 
      : clientsList.filter(client => !client.deletedAt);
      
    return filteredClients.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  /**
   * Get clients by user ID
   */
  async getClientsByUserId(userId: number): Promise<Client[]> {
    return Array.from(this.clients.values())
      .filter(client => client.userId === userId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  
  /**
   * Get a client by user ID (returns first match)
   */
  async getClientByUserId(userId: number): Promise<Client | null> {
    const clients = await this.getClientsByUserId(userId);
    return clients.length > 0 ? clients[0] : null;
  }
  
  /**
   * Create a new client
   */
  async createClient(client: InsertClient): Promise<Client> {
    const id = this.currentClientId++;
    
    // Generate an alphanumeric client code using nanoid like the main storage implementation
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const generateCode = customAlphabet(alphabet, 10);
    
    // Generate unique code for memory storage
    const clientCode = generateCode();
    
    // Ensure all required fields have proper defaults
    const newClient: Client = {
      id,
      name: client.name,
      userId: client.userId,
      clientCode, // Add alphanumeric client code
      legalName: client.legalName !== undefined ? client.legalName : null,
      active: client.active !== undefined ? client.active : true,
      industry: client.industry !== undefined ? client.industry : null,
      referralSource: client.referralSource !== undefined ? client.referralSource : null,
      contactName: client.contactName !== undefined ? client.contactName : null,
      contactEmail: client.contactEmail !== undefined ? client.contactEmail : null,
      contactPhone: client.contactPhone !== undefined ? client.contactPhone : null,
      address: client.address !== undefined ? client.address : null,
      city: client.city !== undefined ? client.city : null,
      state: client.state !== undefined ? client.state : null,
      country: client.country !== undefined ? client.country : null,
      postalCode: client.postalCode !== undefined ? client.postalCode : null,
      website: client.website !== undefined ? client.website : null,
      notes: client.notes !== undefined ? client.notes : null,
      taxId: client.taxId !== undefined ? client.taxId : null,
      createdAt: new Date(),
      updatedAt: null
    } as Client; // Use type assertion to fix TypeScript error
    
    this.clients.set(id, newClient);
    return newClient;
  }
  
  /**
   * Update a client
   */
  async updateClient(id: number, clientData: Partial<Client>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) {
      return undefined;
    }
    
    const updatedClient = {
      ...client,
      ...clientData,
      updatedAt: new Date()
    };
    
    this.clients.set(id, updatedClient);
    return updatedClient;
  }
  
  /**
   * Soft delete a client by setting deletedAt timestamp
   * 
   * @param id - The ID of the client to delete
   * @param adminId - ID of the admin user performing the deletion (for audit logging)
   * @returns boolean indicating success
   */
  async deleteClient(id: number, adminId: number): Promise<boolean> {
    const client = this.clients.get(id);
    if (!client) {
      return false;
    }
    
    // Perform soft deletion by setting deletedAt timestamp
    const deletedClient = {
      ...client,
      deletedAt: new Date(),
      updatedAt: new Date(),
      active: false // Also mark as inactive
    };
    
    this.clients.set(id, deletedClient);
    
    // Import the audit log storage module directly to avoid circular dependencies
    const { memAuditLogStorage } = await import('./auditLogStorage');
    
    // Log this action in the audit log
    await memAuditLogStorage.createAuditLog({
      action: 'client_delete',
      performedBy: adminId,
      details: JSON.stringify({
        clientId: id,
        clientName: client.name,
        clientCode: client.clientCode
      })
    });
    
    return true;
  }
  
  /**
   * Restore a soft-deleted client by clearing the deletedAt timestamp
   * 
   * @param id - The ID of the client to restore
   * @param adminId - ID of the admin user performing the restoration (for audit logging)
   * @returns The restored client or undefined if not found/restored
   */
  async restoreClient(id: number, adminId: number): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) {
      return undefined;
    }
    
    // Can only restore if it was previously deleted
    if (!client.deletedAt) {
      console.warn(`MemClientStorage.restoreClient: Client with ID ${id} is not deleted, nothing to restore`);
      return client; // Return existing client as it's already not deleted
    }
    
    // Perform restore by clearing deletedAt timestamp and setting active back to true
    const restoredClient = {
      ...client,
      deletedAt: null,
      updatedAt: new Date(),
      active: true // Mark as active again
    };
    
    this.clients.set(id, restoredClient);
    
    // Import the audit log storage module directly to avoid circular dependencies
    const { memAuditLogStorage } = await import('./auditLogStorage');
    
    // Log this action in the audit log
    await memAuditLogStorage.createAuditLog({
      action: 'client_restore',
      performedBy: adminId,
      details: JSON.stringify({
        clientId: id,
        clientName: client.name,
        clientCode: client.clientCode
      })
    });
    
    return restoredClient;
  }
  
  /**
   * Get all clients that have been soft-deleted before a specified date
   * Used primarily for automatic cleanup of old soft-deleted clients
   * 
   * @param date - Threshold date (clients deleted before this date will be returned)
   * @returns Array of clients deleted before the threshold date
   */
  async getClientsDeletedBefore(date: Date): Promise<Client[]> {
    // Filter clients that:
    // 1. Have a deletedAt timestamp (are soft-deleted)
    // 2. Their deletedAt is earlier than the threshold date
    return Array.from(this.clients.values())
      .filter(client => 
        client.deletedAt !== null && 
        client.deletedAt !== undefined && 
        client.deletedAt < date
      )
      .sort((a, b) => {
        // Sort by deletedAt date (oldest first)
        if (a.deletedAt && b.deletedAt) {
          return a.deletedAt.getTime() - b.deletedAt.getTime();
        }
        return 0;
      });
  }
  
  /**
   * Permanently delete a client and all its associated data
   * 
   * This should only be called on clients that have already been soft-deleted.
   * It removes the client completely from memory storage.
   * 
   * @param id - The ID of the client to permanently delete
   * @param adminId - ID of the admin user performing the permanent deletion (for audit logging)
   * @returns boolean indicating success
   */
  async permanentlyDeleteClient(id: number, adminId: number): Promise<boolean> {
    const client = this.clients.get(id);
    if (!client) {
      return false;
    }
    
    // Can only permanently delete if it was previously soft-deleted
    if (!client.deletedAt) {
      console.error(`MemClientStorage.permanentlyDeleteClient: Client with ID ${id} has not been soft-deleted. Permanent deletion is only allowed for soft-deleted clients.`);
      return false;
    }
    
    // Since this is memory storage, we just need to remove the client from our map
    // In a real app with multiple tables, we would need to remove all associated data too
    this.clients.delete(id);
    
    // Import the audit log storage module directly to avoid circular dependencies
    const { memAuditLogStorage } = await import('./auditLogStorage');
    
    // Log this action in the audit log
    await memAuditLogStorage.createAuditLog({
      action: 'client_permanent_delete',
      performedBy: adminId,
      details: JSON.stringify({
        clientId: id,
        clientName: client.name,
        clientCode: client.clientCode,
        deletedAt: client.deletedAt
      })
    });
    
    return true;
  }
}

// Export singleton instances
export const clientStorage = new ClientStorage();
export const memClientStorage = new MemClientStorage();