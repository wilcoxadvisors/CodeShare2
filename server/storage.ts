/**
 * Storage Module
 * 
 * Main storage interface and implementation that delegates to specialized 
 * storage modules for different parts of the application.
 */
import { ApiError } from "./errorHandling";
import { 
  // Schema imports for type definitions
  journalEntries, JournalEntryStatus,
  User, UserRole, Client, Entity, userEntityAccess,
  accounts, AccountType,
  InsertClient, InsertEntity, InsertUser
} from "@shared/schema";

// Import all specialized storage module classes and instances
import { AccountStorage, accountStorage, AccountTreeNode, ImportPreview, ImportSelections, ImportResult, IAccountStorage } from './storage/accountStorage';
import { JournalEntryStorage, journalEntryStorage, IJournalEntryStorage } from './storage/journalEntryStorage';
import { ClientStorage, clientStorage, memClientStorage, IClientStorage } from './storage/clientStorage';
import { EntityStorage, entityStorage, memEntityStorage, IEntityStorage } from './storage/entityStorage';
import { UserStorage, userStorage, IUserStorage } from './storage/userStorage';
import { ConsolidationStorage, consolidationStorage, IConsolidationStorage } from './storage/consolidationStorage';
import { AssetStorage, assetStorage, IAssetStorage } from './storage/assetStorage';
import { BudgetStorage, budgetStorage, IBudgetStorage } from './storage/budgetStorage';
import { FormStorage, formStorage, IFormStorage } from './storage/formStorage';
import { ReportStorage, reportStorage, IReportStorage } from './storage/reportStorage';
import { UserActivityStorage, userActivityStorage, IUserActivityStorage } from './storage/userActivityStorage';
import { AuditLogStorage, auditLogStorage, memAuditLogStorage, IAuditLogStorage } from './storage/auditLogStorage';

import { eq } from "drizzle-orm";
import { db } from "./db";
import { logEntityIdsFallback, logEntityIdsUpdate, logEntityIdsDeprecation } from "../shared/deprecation-logger";

/**
 * This is a simplified version of IStorage that only includes what we need for this test.
 * The complete IStorage interface contains many more method declarations.
 */
export interface IStorage {
  // Specialized storage modules as properties
  accounts: IAccountStorage;
  clients: IClientStorage;
  entities: IEntityStorage;
  journalEntries: IJournalEntryStorage;
  consolidation: IConsolidationStorage;
  assets: IAssetStorage;
  budgets: IBudgetStorage;
  forms: IFormStorage;
  reports: IReportStorage;
  userActivity: IUserActivityStorage;
  users: IUserStorage;
  entity: IEntityStorage;
  journalEntry: IJournalEntryStorage;
  auditLogs: IAuditLogStorage;
  
  // User-related shortcuts
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Client-related shortcuts
  getClient(id: number): Promise<Client | undefined>;
  getClients(includeDeleted?: boolean): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<Client>): Promise<Client | undefined>;
  
  // Entity-related shortcuts
  getEntity(id: number): Promise<Entity | undefined>;
  getEntities(clientId: number): Promise<Entity[]>;
  createEntity(entity: InsertEntity): Promise<Entity>;
}

// Database implementation
export class DatabaseStorage implements IStorage {
  public accounts: IAccountStorage;
  public clients: IClientStorage;
  public entities: IEntityStorage;
  public journalEntries: IJournalEntryStorage;
  public consolidation: IConsolidationStorage;
  public assets: IAssetStorage;
  public budgets: IBudgetStorage;
  public forms: IFormStorage;
  public reports: IReportStorage;
  public userActivity: IUserActivityStorage;
  public users: IUserStorage;
  public entity: IEntityStorage;
  public journalEntry: IJournalEntryStorage;
  public auditLogs: IAuditLogStorage;
  
  constructor() {
    // Assign specialized storage modules
    this.accounts = accountStorage;
    this.clients = clientStorage;
    this.entities = entityStorage;
    this.journalEntries = journalEntryStorage;
    this.consolidation = consolidationStorage;
    this.assets = assetStorage;
    this.budgets = budgetStorage;
    this.forms = formStorage;
    this.reports = reportStorage;
    this.userActivity = userActivityStorage;
    this.users = userStorage;
    this.entity = entityStorage;
    this.journalEntry = journalEntryStorage;
    this.auditLogs = auditLogStorage;
  }

  // Shortcut helper methods
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.getUserById(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.getUserByUsername(username);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    return this.users.createUser(user);
  }
  
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.getClient(id);
  }
  
  async getClients(includeDeleted: boolean = false): Promise<Client[]> {
    return this.clients.getClients(includeDeleted);
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    return this.clients.createClient(client);
  }
  
  // Add the missing updateClient method
  async updateClient(id: number, client: Partial<Client>): Promise<Client | undefined> {
    return this.clients.updateClient(id, client);
  }
  
  async getEntity(id: number): Promise<Entity | undefined> {
    return this.entities.getEntity(id);
  }
  
  async getEntities(clientId: number): Promise<Entity[]> {
    return this.entities.getEntitiesByClient(clientId);
  }
  
  async createEntity(entity: InsertEntity): Promise<Entity> {
    return this.entities.createEntity(entity);
  }
}

export class MemStorage implements IStorage {
  public accounts: IAccountStorage; 
  public clients: IClientStorage; 
  public entities: IEntityStorage; 
  public journalEntries: IJournalEntryStorage; 
  public consolidation: IConsolidationStorage;
  public assets: IAssetStorage;
  public budgets: IBudgetStorage;
  public forms: IFormStorage;
  public reports: IReportStorage;
  public userActivity: IUserActivityStorage;
  public users: IUserStorage;
  public entity: IEntityStorage;
  public journalEntry: IJournalEntryStorage;
  public auditLogs: IAuditLogStorage;
  
  constructor() {
    // Assign specialized storage modules
    this.accounts = accountStorage;
    this.clients = memClientStorage;
    this.entities = memEntityStorage;
    this.journalEntries = journalEntryStorage;
    this.consolidation = consolidationStorage;
    this.assets = assetStorage;
    this.budgets = budgetStorage;
    this.forms = formStorage;
    this.reports = reportStorage;
    this.userActivity = userActivityStorage;
    this.users = userStorage;
    this.entity = memEntityStorage;
    this.journalEntry = journalEntryStorage;
    this.auditLogs = memAuditLogStorage;
  }

  // Helper methods to get various storage types
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.getUserById(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.getUserByUsername(username);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    return this.users.createUser(user);
  }
  
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.getClient(id);
  }
  
  async getClients(includeDeleted: boolean = false): Promise<Client[]> {
    return this.clients.getClients(includeDeleted);
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    return this.clients.createClient(client);
  }
  
  // Add the missing updateClient method
  async updateClient(id: number, client: Partial<Client>): Promise<Client | undefined> {
    return this.clients.updateClient(id, client);
  }
  
  async getEntity(id: number): Promise<Entity | undefined> {
    return this.entities.getEntity(id);
  }
  
  async getEntities(clientId: number): Promise<Entity[]> {
    return this.entities.getEntitiesByClient(clientId);
  }
  
  async createEntity(entity: InsertEntity): Promise<Entity> {
    return this.entities.createEntity(entity);
  }
}

// Export only the memory storage instance - DB Storage is now initialized in index.ts
export const memStorage = new MemStorage();