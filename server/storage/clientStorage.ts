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
      // Ensure active is always a boolean
      const clientData = {
        ...client,
        active: client.active !== undefined ? client.active : true
      };
      
      // Log client data before insertion to help debug
      console.log("Creating client with data (in storage):", JSON.stringify(clientData, null, 2));
      
      const [newClient] = await db.insert(clients).values(clientData).returning();
      
      // Log what was actually saved
      console.log("Client created with data (from DB):", JSON.stringify(newClient, null, 2));
      
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
   */
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values())
      .sort((a, b) => a.name.localeCompare(b.name));
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
    
    // Ensure all required fields have proper defaults
    const newClient: Client = {
      id,
      name: client.name,
      userId: client.userId,
      legalName: client.legalName !== undefined ? client.legalName : null, // Added legalName
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
      createdAt: new Date(),
      updatedAt: null
    };
    
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
}

// Export singleton instances
export const clientStorage = new ClientStorage();
export const memClientStorage = new MemClientStorage();