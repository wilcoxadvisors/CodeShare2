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
  GLOptions, GLEntry
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

import { eq } from "drizzle-orm";
import { db } from "./db";
import { logEntityIdsFallback, logEntityIdsUpdate, logEntityIdsDeprecation } from "../shared/deprecation-logger";

/**
 * IStorage defines the main interface for data storage in the application.
 * 
 * This interface includes the following categories of methods:
 * 1. Methods that haven't been moved to specialized storage modules yet
 * 2. Properties that reference specialized storage modules
 * 
 * Note: Many methods have been moved to specialized storage modules:
 * - User methods → userStorage.ts
 * - Account methods → accountStorage.ts
 * - Client methods → clientStorage.ts
 * - Entity methods → entityStorage.ts
 * - Journal Entry methods → journalEntryStorage.ts
 * - Consolidation Group methods → consolidationStorage.ts
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
  
  // Fixed Asset methods
  getFixedAsset(id: number): Promise<FixedAsset | undefined>;
  getFixedAssets(entityId: number): Promise<FixedAsset[]>;
  createFixedAsset(asset: InsertFixedAsset): Promise<FixedAsset>;
  updateFixedAsset(id: number, asset: Partial<FixedAsset>): Promise<FixedAsset | undefined>;
  
  // Report methods
  generateTrialBalance(clientId: number, startDate?: Date, endDate?: Date, entityId?: number): Promise<any>;
  generateBalanceSheet(clientId: number, asOfDate?: Date, entityId?: number): Promise<any>;
  generateIncomeStatement(clientId: number, startDate?: Date, endDate?: Date, entityId?: number): Promise<any>;
  generateCashFlow(clientId: number, startDate?: Date, endDate?: Date, entityId?: number): Promise<any>;
  
  // GL reporting
  getGeneralLedger(entityId: number, options?: GLOptions): Promise<GLEntry[]>;

  // Feature Usage Analytics methods
  recordFeatureUsage(usage: InsertFeatureUsage): Promise<FeatureUsage>;
  updateFeatureUsage(id: number, data: Partial<FeatureUsage>): Promise<FeatureUsage | undefined>;
  getFeatureUsage(userId: number, featureName: string): Promise<FeatureUsage | undefined>;
  getFeatureUsageStats(featureName: string): Promise<{
    totalUsageCount: number,
    uniqueUsers: number,
    avgUseTime?: number
  }>;
  
  // Industry Benchmark methods
  addIndustryBenchmark(benchmark: InsertIndustryBenchmark): Promise<IndustryBenchmark>;
  getIndustryBenchmarks(industry: string, year: number): Promise<IndustryBenchmark[]>;
  getBenchmarksByMetric(metricName: string): Promise<IndustryBenchmark[]>;
  getIndustryComparison(entityId: number, metricNames: string[]): Promise<any>;
  
  // Form Submission methods
  // Contact Form
  createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;
  getContactSubmissions(limit?: number, offset?: number): Promise<ContactSubmission[]>;
  getContactSubmissionById(id: number): Promise<ContactSubmission | undefined>;
  updateContactSubmission(id: number, status: string): Promise<ContactSubmission | undefined>;
  
  // Checklist Form
  createChecklistSubmission(submission: InsertChecklistSubmission): Promise<ChecklistSubmission>;
  getChecklistSubmissions(limit?: number, offset?: number): Promise<ChecklistSubmission[]>;
  getChecklistSubmissionById(id: number): Promise<ChecklistSubmission | undefined>;
  updateChecklistSubmission(id: number, status: string): Promise<ChecklistSubmission | undefined>;
  
  // Checklist Files
  createChecklistFile(fileData: InsertChecklistFile): Promise<ChecklistFile>;
  getChecklistFiles(): Promise<ChecklistFile[]>;
  getActiveChecklistFile(): Promise<ChecklistFile | undefined>;
  getChecklistFileById(id: number): Promise<ChecklistFile | undefined>;
  updateChecklistFile(id: number, isActive: boolean): Promise<ChecklistFile | undefined>;
  deleteChecklistFile(id: number): Promise<void>;
  
  // Consultation Form
  createConsultationSubmission(submission: InsertConsultationSubmission): Promise<ConsultationSubmission>;
  getConsultationSubmissions(limit?: number, offset?: number): Promise<ConsultationSubmission[]>;
  getConsultationSubmissionById(id: number): Promise<ConsultationSubmission | undefined>;
  updateConsultationSubmission(id: number, status: string): Promise<ConsultationSubmission | undefined>;
  
  // Blog Subscribers
  createBlogSubscriber(subscriber: InsertBlogSubscriber): Promise<BlogSubscriber>;
  getBlogSubscribers(includeInactive?: boolean): Promise<BlogSubscriber[]>;
  getBlogSubscriberByEmail(email: string): Promise<BlogSubscriber | undefined>;
  updateBlogSubscriber(id: number, data: Partial<BlogSubscriber>): Promise<BlogSubscriber | undefined>;
  deleteBlogSubscriber(id: number): Promise<void>;
  
  // Location methods
  createLocation(location: InsertLocation): Promise<Location | undefined>;
  getLocation(id: number): Promise<Location | undefined>;
  getLocations(clientId: number): Promise<Location[]>;
  getLocationByCode(clientId: number, code: string): Promise<Location | undefined>;
  updateLocation(id: number, data: Partial<Location>): Promise<Location | undefined>;
  
  // Budget methods
  getBudget(id: number): Promise<Budget | undefined>;
  getBudgets(entityId: number): Promise<Budget[]>;
  getBudgetsByStatus(status: BudgetStatus): Promise<Budget[]>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, data: Partial<Budget>): Promise<Budget | undefined>;
  deleteBudget(id: number): Promise<void>;
  
  // Budget Item methods
  getBudgetItem(id: number): Promise<BudgetItem | undefined>;
  getBudgetItems(budgetId: number): Promise<BudgetItem[]>;
  getBudgetItemsByAccount(accountId: number): Promise<BudgetItem[]>;
  createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  updateBudgetItem(id: number, data: Partial<BudgetItem>): Promise<BudgetItem | undefined>;
  deleteBudgetItem(id: number): Promise<void>;
  adjustBudgetAmounts(budgetId: number, adjustmentFactor: number): Promise<void>;
  distributeBudget(budgetId: number, totalAmount: number): Promise<void>;
  
  // Budget Document methods
  getBudgetDocument(id: number): Promise<BudgetDocument | undefined>;
  getBudgetDocuments(budgetId: number): Promise<BudgetDocument[]>;
  createBudgetDocument(document: InsertBudgetDocument): Promise<BudgetDocument>;
  updateBudgetDocument(id: number, isActive: boolean): Promise<BudgetDocument | undefined>;
  deleteBudgetDocument(id: number): Promise<void>;
  
  // Forecast methods
  getForecast(id: number): Promise<Forecast | undefined>;
  getForecasts(entityId: number): Promise<Forecast[]>;
  getBaseForecast(entityId: number): Promise<Forecast | undefined>;
  createForecast(forecast: InsertForecast): Promise<Forecast>;
  updateForecast(id: number, data: Partial<Forecast>): Promise<Forecast | undefined>;
  deleteForecast(id: number): Promise<void>;
  
  // User Activity Tracking methods - delegate to userActivityStorage
  logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog>;
  getUserActivities(userId: number, limit?: number): Promise<UserActivityLog[]>;
  getUserActivitiesByEntity(entityId: number, limit?: number): Promise<UserActivityLog[]>;
  getUserActivitiesByResourceType(resourceType: string, limit?: number): Promise<UserActivityLog[]>;
  
  // User-related shortcuts
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Client-related shortcuts
  getClient(id: number): Promise<Client | undefined>;
  getClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  
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
  }

  // User Activity Tracking methods - delegate to userActivityStorage
  async logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog> {
    return this.userActivity.logUserActivity(activity);
  }
  
  async getUserActivities(userId: number, limit: number = 100): Promise<UserActivityLog[]> {
    return this.userActivity.getUserActivities(userId, limit);
  }
  
  async getUserActivitiesByEntity(entityId: number, limit: number = 100): Promise<UserActivityLog[]> {
    return this.userActivity.getUserActivitiesByEntity(entityId, limit);
  }
  
  async getUserActivitiesByResourceType(resourceType: string, limit: number = 100): Promise<UserActivityLog[]> {
    return this.userActivity.getUserActivitiesByResourceType(resourceType, limit);
  }
  
  // Feature Usage Analytics methods - delegate to userActivityStorage
  async recordFeatureUsage(usage: InsertFeatureUsage): Promise<FeatureUsage> {
    return this.userActivity.recordFeatureUsage(usage);
  }
  
  async updateFeatureUsage(id: number, data: Partial<FeatureUsage>): Promise<FeatureUsage | undefined> {
    // This would need to be implemented in userActivityStorage
    throw new Error("Method updateFeatureUsage not implemented in userActivityStorage");
  }
  
  async getFeatureUsage(userId: number, featureName: string): Promise<FeatureUsage | undefined> {
    return this.userActivity.getFeatureUsageByUser(userId, featureName);
  }
  
  async getFeatureUsageStats(featureName: string): Promise<{
    totalUsageCount: number,
    uniqueUsers: number,
    avgUseTime?: number
  }> {
    // This would need to be implemented in userActivityStorage
    throw new Error("Method getFeatureUsageStats not implemented in userActivityStorage");
  }

  // Add direct method to match interface name exactly
  async getFeatureUsageByUser(userId: number, featureName: string): Promise<FeatureUsage | undefined> {
    return this.userActivity.getFeatureUsageByUser(userId, featureName);
  }
  
  // Industry Benchmark methods - delegate to userActivityStorage
  async addIndustryBenchmark(benchmark: InsertIndustryBenchmark): Promise<IndustryBenchmark> {
    return this.userActivity.addIndustryBenchmark(benchmark);
  }
  
  async getIndustryBenchmarks(industry: string, year: number): Promise<IndustryBenchmark[]> {
    // This needs to be adapted since userActivityStorage.getIndustryBenchmarks doesn't take a year parameter
    const benchmarks = await this.userActivity.getIndustryBenchmarks(industry);
    return benchmarks.filter(b => b.year === year);
  }
  
  async getBenchmarksByMetric(metricName: string): Promise<IndustryBenchmark[]> {
    // This would need to be implemented in userActivityStorage
    throw new Error("Method getBenchmarksByMetric not implemented in userActivityStorage");
  }
  
  async getIndustryComparison(entityId: number, metricNames: string[]): Promise<any> {
    return this.userActivity.getIndustryComparison(entityId, metricNames);
  }
  
  // Data Consent methods - delegate to userActivityStorage
  async recordDataConsent(consent: InsertDataConsent): Promise<DataConsent> {
    return this.userActivity.recordDataConsent(consent);
  }
  
  async getUserConsent(userId: number, consentType: string): Promise<DataConsent | undefined> {
    // This would need to be adapted to use userActivity.getDataConsent
    const consent = await this.userActivity.getDataConsent(userId);
    return consent?.consentType === consentType ? consent : undefined;
  }
  
  async updateUserConsent(id: number, granted: boolean): Promise<DataConsent | undefined> {
    // This would need to be adapted to use userActivity.updateDataConsent
    throw new Error("Method updateUserConsent not implemented in userActivityStorage");
  }

  // Other methods from the original class would go here...

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
    return this.clients.getClientById(id);
  }
  
  async getClients(): Promise<Client[]> {
    return this.clients.getClients();
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    return this.clients.createClient(client);
  }
  
  async getEntity(id: number): Promise<Entity | undefined> {
    return this.entities.getEntityById(id);
  }
  
  async getEntities(clientId: number): Promise<Entity[]> {
    return this.entities.getEntitiesByClientId(clientId);
  }
  
  async createEntity(entity: InsertEntity): Promise<Entity> {
    return this.entities.createEntity(entity);
  }

  // Fixed Asset methods would need implementations
  // Report methods would need implementations
  // GL reporting methods would need implementations
  // Form Submission methods would need implementations
  // Budget methods would need implementations
  // Forecast methods would need implementations
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
    this.userActivity = new MemUserActivityStorage();
    this.users = userStorage;
    this.entity = memEntityStorage;
    this.journalEntry = journalEntryStorage;
  }

  // User Activity Tracking methods - delegate to userActivity
  async logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog> {
    return this.userActivity.logUserActivity(activity);
  }
  
  async getUserActivities(userId: number, limit: number = 100): Promise<UserActivityLog[]> {
    return this.userActivity.getUserActivities(userId, limit);
  }
  
  async getUserActivitiesByEntity(entityId: number, limit: number = 100): Promise<UserActivityLog[]> {
    return this.userActivity.getUserActivitiesByEntity(entityId, limit);
  }
  
  async getUserActivitiesByResourceType(resourceType: string, limit: number = 100): Promise<UserActivityLog[]> {
    return this.userActivity.getUserActivitiesByResourceType(resourceType, limit);
  }
  
  // Feature Usage Analytics methods - delegate to userActivity
  async recordFeatureUsage(usage: InsertFeatureUsage): Promise<FeatureUsage> {
    return this.userActivity.recordFeatureUsage(usage);
  }
  
  async updateFeatureUsage(id: number, data: Partial<FeatureUsage>): Promise<FeatureUsage | undefined> {
    // This would need to be implemented
    throw new Error("Method updateFeatureUsage not implemented in MemUserActivityStorage");
  }
  
  async getFeatureUsage(userId: number, featureName: string): Promise<FeatureUsage | undefined> {
    return this.userActivity.getFeatureUsageByUser(userId, featureName);
  }
  
  async getFeatureUsageByUser(userId: number, featureName: string): Promise<FeatureUsage | undefined> {
    return this.userActivity.getFeatureUsageByUser(userId, featureName);
  }
  
  async getFeatureUsageStats(featureName: string): Promise<{
    totalUsageCount: number,
    uniqueUsers: number,
    avgUseTime?: number
  }> {
    // This would need to be implemented
    throw new Error("Method getFeatureUsageStats not implemented in MemUserActivityStorage");
  }
  
  // Industry Benchmark methods - delegate to userActivity
  async addIndustryBenchmark(benchmark: InsertIndustryBenchmark): Promise<IndustryBenchmark> {
    return this.userActivity.addIndustryBenchmark(benchmark);
  }
  
  async getIndustryBenchmarks(industry: string, year: number): Promise<IndustryBenchmark[]> {
    // This needs to be adapted since userActivity.getIndustryBenchmarks doesn't take a year parameter
    const benchmarks = await this.userActivity.getIndustryBenchmarks(industry);
    return benchmarks.filter(b => b.year === year);
  }
  
  async getBenchmarksByMetric(metricName: string): Promise<IndustryBenchmark[]> {
    // This would need to be implemented
    throw new Error("Method getBenchmarksByMetric not implemented in MemUserActivityStorage");
  }
  
  async getIndustryComparison(entityId: number, metricNames: string[]): Promise<any> {
    return this.userActivity.getIndustryComparison(entityId, metricNames);
  }

  // Other methods from original MemStorage would go here
  // Remaining unimplemented methods would throw errors
  
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
    return this.clients.getClientById(id);
  }
  
  async getClients(): Promise<Client[]> {
    return this.clients.getClients();
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    return this.clients.createClient(client);
  }
  
  async getEntity(id: number): Promise<Entity | undefined> {
    return this.entities.getEntityById(id);
  }
  
  async getEntities(clientId: number): Promise<Entity[]> {
    return this.entities.getEntitiesByClientId(clientId);
  }
  
  async createEntity(entity: InsertEntity): Promise<Entity> {
    return this.entities.createEntity(entity);
  }

  // Additional methods would need to be implemented
}

// Export singleton instances
export const storage = new DatabaseStorage();
export const memStorage = new MemStorage();