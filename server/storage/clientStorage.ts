/**
 * Client Storage Module
 * 
 * This module contains the storage interface and implementation for client operations.
 */
import { db } from "../db";
import { clients, Client, InsertClient } from "@shared/schema";
import { eq, asc } from "drizzle-orm";
import { ApiError } from "../errorHandling";

// Helper function to handle database errors consistently
function handleDbError(error: unknown, operation: string): Error {
  console.error(`Database error during ${operation}:`, error);
  if (error instanceof ApiError) {
    return error;
  }
  return new Error(`An error occurred during ${operation}: ${error instanceof Error ? error.message : String(error)}`);
}

/**
 * Interface for client storage operations
 */
export interface IClientStorage {
  getClient(id: number): Promise<Client | undefined>;
  getClients(): Promise<Client[]>;
  getClientsByUserId(userId: number): Promise<Client[]>;
  getClientByUserId(userId: number): Promise<Client | null>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<Client>): Promise<Client | undefined>;
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
   */
  async getClients(): Promise<Client[]> {
    try {
      return await db
        .select()
        .from(clients)
        .orderBy(asc(clients.name));
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
        .where(eq(clients.userId, userId))
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
        .where(eq(clients.userId, userId))
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
      const [newClient] = await db.insert(clients).values(client).returning();
      return newClient;
    } catch (error) {
      handleDbError(error, "Error creating client");
      throw error;
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
}

// Export a singleton instance
export const clientStorage = new ClientStorage();