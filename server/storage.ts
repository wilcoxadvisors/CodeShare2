/**
 * Storage Module
 * 
 * Main storage interface and implementation that delegates to specialized 
 * storage modules for different parts of the application.
 */
import { 
  // Direct database schema imports for remaining modules
  fixedAssets, FixedAsset, InsertFixedAsset,
  savedReports, SavedReport, ReportType, 
  checklistFiles, ChecklistFile, InsertChecklistFile,
  featureUsage, FeatureUsage, InsertFeatureUsage,
  industryBenchmarks, IndustryBenchmark, InsertIndustryBenchmark,
  contactSubmissions, ContactSubmission, InsertContactSubmission,
  checklistSubmissions, ChecklistSubmission, InsertChecklistSubmission,
  consultationSubmissions, ConsultationSubmission, InsertConsultationSubmission,
  budgets, Budget, InsertBudget, BudgetStatus, BudgetPeriodType,
  budgetItems, BudgetItem, InsertBudgetItem,
  budgetDocuments, BudgetDocument, InsertBudgetDocument,
  forecasts, Forecast, InsertForecast,
  blogSubscribers, BlogSubscriber, InsertBlogSubscriber,
  locations, Location, InsertLocation,
  
  // Schema imports for delegated modules
  accounts, Account, InsertAccount, AccountType,
  journals, Journal, InsertJournal, JournalType,
  journalEntries, JournalEntry, InsertJournalEntry, JournalEntryStatus,
  journalEntryLines, JournalEntryLine, InsertJournalEntryLine,
  journalEntryFiles,
  users, User, InsertUser, UserRole, UserActivityLog, InsertUserActivityLog,
  dataConsent, DataConsent, InsertDataConsent,
  clients, InsertClient,
  entities, InsertEntity,
  Client, Entity, userEntityAccess
} from "@shared/schema";

// Import specialized storage module classes and instances
import { AccountStorage, accountStorage, AccountTreeNode, ImportPreview, ImportSelections, ImportResult, IAccountStorage } from './storage/accountStorage';
import { JournalEntryStorage, journalEntryStorage } from './storage/journalEntryStorage';
import { ClientStorage, clientStorage } from './storage/clientStorage';
import { EntityStorage, entityStorage } from './storage/entityStorage';
import { UserStorage, userStorage } from './storage/userStorage';
import { ConsolidationStorage, consolidationStorage } from './storage/consolidationStorage';

// Define interface for hierarchical account structure
// AccountTreeNode has been moved to accountStorage.ts
import { eq, and, desc, asc, gte, lte, sql, count, sum, isNull, not, ne, inArray, gt, like } from "drizzle-orm";
import { db } from "./db";
import { json } from "drizzle-orm/pg-core";
import { logEntityIdsFallback, logEntityIdsUpdate, logEntityIdsDeprecation } from "../shared/deprecation-logger";
import { ListJournalEntriesFilters } from "../shared/validation";

// Import interface declarations have been moved to accountStorage.ts

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
  // Account methods are now accessed via this property
  accounts: IAccountStorage;
  
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
  getLocation(id: number): Promise<Location | undefined>;
  listLocationsByClient(clientId: number): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<Location>): Promise<Location | undefined>;
  setLocationActiveStatus(id: number, isActive: boolean): Promise<boolean>;
  
  // Budget methods
  getBudget(id: number): Promise<Budget | undefined>;
  getBudgets(entityId: number): Promise<Budget[]>;
  getBudgetsByStatus(entityId: number, status: BudgetStatus): Promise<Budget[]>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, budget: Partial<Budget>): Promise<Budget | undefined>;
  deleteBudget(id: number): Promise<void>;
  
  // Budget Item methods
  getBudgetItem(id: number): Promise<BudgetItem | undefined>;
  getBudgetItems(budgetId: number): Promise<BudgetItem[]>;
  getBudgetItemsByAccount(budgetId: number, accountId: number): Promise<BudgetItem[]>;
  createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  updateBudgetItem(id: number, item: Partial<BudgetItem>): Promise<BudgetItem | undefined>;
  deleteBudgetItem(id: number): Promise<void>;
  
  // Budget Document methods
  getBudgetDocument(id: number): Promise<BudgetDocument | undefined>;
  getBudgetDocuments(budgetId: number): Promise<BudgetDocument[]>;
  createBudgetDocument(document: InsertBudgetDocument): Promise<BudgetDocument>;
  updateBudgetDocument(id: number, processingStatus: string, extractedData?: any): Promise<BudgetDocument | undefined>;
  deleteBudgetDocument(id: number): Promise<void>;
  
  // Forecast methods
  getForecast(id: number): Promise<Forecast | undefined>;
  getForecasts(entityId: number): Promise<Forecast[]>;
  createForecast(forecast: InsertForecast): Promise<Forecast>;
  updateForecast(id: number, forecast: Partial<Forecast>): Promise<Forecast | undefined>;
  deleteForecast(id: number): Promise<void>;
  generateForecast(entityId: number, config: any): Promise<any>;
  
  // -------------------------------------------------------------------------
  // Delegated methods - these methods call their corresponding specialized storage modules
  // -------------------------------------------------------------------------
  
  // Journal Entry Related Methods - delegated to journalEntryStorage
  getJournalEntry(id: number): Promise<any>;
  getJournalEntries(entityId: number, options?: any): Promise<any[]>;
  listJournalEntries(entityId: number, filters?: any): Promise<any[]>;
  getJournalEntriesByStatus(entityId: number, status: JournalEntryStatus): Promise<any[]>;
  createJournalEntry(journalEntry: any): Promise<any>;
  updateJournalEntry(id: number, updates: any): Promise<any>;
  createBatchJournalEntries(entries: any[]): Promise<any[]>;
  getJournalEntryLines(journalEntryId: number): Promise<any[]>;
  createJournalEntryLine(line: any): Promise<any>;
  addJournalEntryLine(journalEntryId: number, line: any): Promise<any>;
  updateJournalEntryLine(id: number, updates: any): Promise<any>;
  deleteJournalEntryLine(id: number): Promise<void>;
  reverseJournalEntry(id: number, reversalDate: Date, description?: string): Promise<any>;
  deleteJournalEntry(id: number): Promise<void>;
  getJournalEntryFiles(journalEntryId: number): Promise<any[]>;
  createJournalEntryFile(journalEntryId: number, file: any): Promise<any>;
  
  // Client Methods - delegated to clientStorage
  getClient(id: number): Promise<Client | undefined>;
  getClients(): Promise<Client[]>;
  getClientsByUserId(userId: number): Promise<Client[]>;
  createClient(client: any): Promise<Client>;
  updateClient(id: number, client: Partial<Client>): Promise<Client | undefined>;
  
  // Entity Methods - delegated to entityStorage
  getEntity(id: number): Promise<Entity | undefined>;
  getEntities(): Promise<Entity[]>;
  getEntitiesByUser(userId: number): Promise<Entity[]>;
  getEntitiesByClient(clientId: number): Promise<Entity[]>;
  createEntity(entity: any): Promise<Entity>;
  updateEntity(id: number, entity: Partial<Entity>): Promise<Entity | undefined>;
  
  // User Methods - delegated to userStorage
  getUser(id: number): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  getUsers(): Promise<any[]>;
  createUser(user: any): Promise<any>;
  updateUser(id: number, updates: any): Promise<any>;
  
  // User Entity Access Methods - delegated to userStorage
  getUserEntityAccess(userId: number, entityId: number): Promise<any>;
  grantUserEntityAccess(userId: number, entityId: number, accessLevel: string): Promise<any>;
  getUserEntityAccessList(userId: number): Promise<any[]>;
  
  // User Activity Tracking methods - delegated to userStorage
  logUserActivity(activity: any): Promise<any>;
  getUserActivitiesByEntity(entityId: number, limit?: number): Promise<any[]>;
  getUserActivitiesByResourceType(resourceType: string, limit?: number): Promise<any[]>;
  
  // Journal methods - delegated to journalEntryStorage
  getJournal(id: number): Promise<any | undefined>;
  getJournals(entityId: number): Promise<any[]>;
  getJournalsByType(entityId: number, type: any): Promise<any[]>;
  createJournal(journal: any): Promise<any>;
  updateJournal(id: number, journal: Partial<any>): Promise<any | undefined>;
  deleteJournal(id: number): Promise<void>;
  
  // Keep account methods for backwards compatibility (deprecated)
  // These will delegate to the accounts property
  seedClientCoA(clientId: number): Promise<void>;
  getAccount(id: number): Promise<Account | undefined>;
  getAccounts(clientId: number): Promise<Account[]>;
  getAccountsByType(clientId: number, type: any): Promise<Account[]>;
  createAccount(account: any): Promise<Account>;
  updateAccount(id: number, account: Partial<Account>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<void>;
  getAccountsTree(clientId: number): Promise<AccountTreeNode[]>;
  getAccountsForClient(clientId: number): Promise<Account[]>;
  generateCoaImportPreview(clientId: number, fileBuffer: Buffer, filename: string): Promise<ImportPreview>;
  importCoaForClient(clientId: number, fileBuffer: Buffer, filename: string, selections?: ImportSelections | null): Promise<ImportResult>;
}

export interface GLOptions {
  accountId?: number;
  startDate?: Date;
  endDate?: Date;
  status?: JournalEntryStatus;
}

export interface GLEntry {
  id: number;
  date: Date;
  journalId: string;
  accountId: number;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  status: JournalEntryStatus;
}

export class MemStorage implements IStorage {
  public accounts: IAccountStorage; // Property for IAccountStorage as required by the IStorage interface
  
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private entities: Map<number, Entity>;
  private journals: Map<number, Journal>;
  // Journal Entry related maps removed and moved to journalEntryStorage module
  private fixedAssets: Map<number, FixedAsset>;
  private savedReports: Map<number, SavedReport>;
  private userEntityAccess: Map<string, string>; // key: userId-entityId, value: accessLevel
  
  // Analytics data storage
  private userActivities: Map<number, UserActivityLog>;
  private featureUsages: Map<number, FeatureUsage>;
  private industryBenchmarks: Map<number, IndustryBenchmark>;
  private dataConsents: Map<number, DataConsent>;
  
  // Form submissions and blog subscribers
  private contactSubmissions: Map<number, ContactSubmission>;
  private checklistSubmissions: Map<number, ChecklistSubmission>;
  private consultationSubmissions: Map<number, ConsultationSubmission>;
  private checklistFiles: Map<number, ChecklistFile>;
  private blogSubscribers: Map<number, BlogSubscriber>;
  private locations: Map<number, Location> = new Map();
  
  private currentUserId: number = 1;
  private currentClientId: number = 1;
  private currentEntityId: number = 1;
  private currentJournalId: number = 1;
  // Journal Entry related counters moved to journalEntryStorage module
  private currentFixedAssetId: number = 1;
  private currentSavedReportId: number = 1;
  private currentUserActivityLogId: number = 1;
  private currentFeatureUsageId: number = 1;
  private currentIndustryBenchmarkId: number = 1;
  private currentDataConsentId: number = 1;
  
  // Budget and forecast storage
  private budgets: Map<number, Budget>;
  private budgetItems: Map<number, BudgetItem>;
  private budgetDocuments: Map<number, BudgetDocument>;
  private forecasts: Map<number, Forecast>;
  // Consolidation-related maps have been removed and moved to consolidationStorage module
  private currentBudgetId: number = 1;
  private currentBudgetItemId: number = 1;
  private currentBudgetDocumentId: number = 1;
  private currentForecastId: number = 1;
  // Consolidation-related counters have been removed and moved to consolidationStorage module
  
  // Form submission IDs
  private currentContactSubmissionId: number = 1;
  private currentChecklistSubmissionId: number = 1;
  private currentChecklistFileId: number = 1;
  private currentConsultationSubmissionId: number = 1;
  private currentBlogSubscriberId: number = 1;
  private currentLocationId: number = 1;

  // Method moved to accountStorage.ts

  constructor() {
    this.accounts = accountStorage; // Assign the imported accountStorage instance
    
    this.users = new Map();
    this.clients = new Map();
    this.entities = new Map();
    this.journals = new Map();
    // Journal Entry related maps removed (moved to journalEntryStorage module)
    this.fixedAssets = new Map();
    this.savedReports = new Map();
    this.userEntityAccess = new Map();
    
    // Initialize analytics tables
    this.userActivities = new Map();
    this.featureUsages = new Map();
    this.industryBenchmarks = new Map();
    this.dataConsents = new Map();
    
    // Initialize form submission tables
    this.contactSubmissions = new Map();
    this.checklistSubmissions = new Map();
    this.checklistFiles = new Map();
    this.consultationSubmissions = new Map();
    this.blogSubscribers = new Map();
    this.locations = new Map();
    
    // Initialize budget and forecast tables
    this.budgets = new Map();
    this.budgetItems = new Map();
    this.budgetDocuments = new Map();
    this.forecasts = new Map();
    // Consolidation-related maps have been removed and moved to consolidationStorage module
    
    // Create default admin user
    const adminUser: User = {
      id: this.currentUserId++,
      username: 'admin',
      password: '$2a$10$hACwQ5/HsFnbPzk1By9lUeal5o/NfAVe5pqc5vNjBEsVTkeJs6Z5u', // hashed 'password123'
      email: 'admin@example.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      active: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: null,
      loginCount: 0,
      industry: null,
      companySize: null,
      jobTitle: null,
      location: null,
      preferredLanguage: 'en',
      deviceInfo: null,
      lastSession: null,
      sessionCount: 0,
      referralSource: null
    };
    this.users.set(adminUser.id, adminUser);
    
    // Create default client for admin
    const defaultClient: Client = {
      id: this.currentClientId++,
      name: 'Wilcox Advisors',
      email: 'contact@wilcoxadvisors.com',
      ownerId: adminUser.id,
      active: true,
      phone: '+1-555-123-4567',
      industry: 'Accounting',
      contactName: 'Admin User',
      contactEmail: 'admin@example.com',
      contactPhone: null,
      billingAddress: '123 Business Ave',
      billingCity: 'San Francisco',
      billingState: 'CA',
      billingZip: '94105',
      billingCountry: 'US',
      taxId: null,
      website: 'https://wilcoxadvisors.com',
      notes: 'Our organization',
      createdAt: new Date(),
      updatedAt: null,
      lastContactDate: null,
      clientSince: new Date(),
      logo: null,
      accountManager: adminUser.id,
      tags: ['internal']
    };
    this.clients.set(defaultClient.id, defaultClient);
    
    // Create default entity
    const defaultEntity: Entity = {
      id: this.currentEntityId++,
      name: 'Acme Corporation',
      code: 'ACME',
      ownerId: adminUser.id,
      clientId: defaultClient.id, // Link to default client
      active: true,
      fiscalYearStart: '01-01',
      fiscalYearEnd: '12-31',
      currency: 'USD',
      address: null,
      email: null,
      phone: null,
      taxId: null,
      website: null,
      createdAt: new Date(),
      updatedAt: null,
      city: null,
      state: null,
      country: null,
      postalCode: null,
      industry: null,
      subIndustry: null,
      employeeCount: null,
      foundedYear: null,
      annualRevenue: null,
      businessType: null,
      publiclyTraded: false,
      stockSymbol: null,
      timezone: 'UTC',
      dataCollectionConsent: false,
      lastAuditDate: null
    };
    this.entities.set(defaultEntity.id, defaultEntity);
    
    // Grant admin access
    this.userEntityAccess.set(`${adminUser.id}-${defaultEntity.id}`, 'admin');
    
    // Create basic chart of accounts for default entity
    const accounts = [
      { accountCode: '1000', name: 'Cash', type: AccountType.ASSET, subtype: 'current_asset' },
      { accountCode: '1200', name: 'Accounts Receivable', type: AccountType.ASSET, subtype: 'current_asset', isSubledger: true, subledgerType: 'accounts_receivable' },
      { accountCode: '1500', name: 'Fixed Assets: Equipment', type: AccountType.ASSET, subtype: 'fixed_asset' },
      { accountCode: '1600', name: 'Accumulated Depreciation', type: AccountType.ASSET, subtype: 'fixed_asset' },
      { accountCode: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY, subtype: 'current_liability', isSubledger: true, subledgerType: 'accounts_payable' },
      { accountCode: '3000', name: 'Owner\'s Equity', type: AccountType.EQUITY, subtype: 'equity' },
      { accountCode: '4000', name: 'Revenue', type: AccountType.REVENUE, subtype: 'revenue' },
      { accountCode: '5000', name: 'Cost of Goods Sold', type: AccountType.EXPENSE, subtype: 'cost_of_sales' },
      { accountCode: '6000', name: 'Operating Expenses', type: AccountType.EXPENSE, subtype: 'operating_expense' },
      { accountCode: '6150', name: 'Office Expenses', type: AccountType.EXPENSE, subtype: 'operating_expense' },
    ];
    
    accounts.forEach(account => {
      const newAccount: Account = {
        id: this.currentAccountId++,
        clientId: defaultClient.id,
        accountCode: account.accountCode,
        name: account.name,
        type: account.type,
        subtype: account.subtype || null,
        isSubledger: account.isSubledger || false,
        subledgerType: account.subledgerType || null,
        parentId: null,
        description: null,
        active: true,
        createdAt: new Date()
      };
      this.accounts.set(newAccount.id, newAccount);
    });
    
    // Create default journals
    const defaultJournals = [
      { 
        code: 'SALE', 
        name: 'Sales Journal', 
        type: JournalType.SALE, 
        description: 'For recording sales transactions',
        defaultAccountId: null
      },
      { 
        code: 'PURCH', 
        name: 'Purchase Journal', 
        type: JournalType.PURCHASE, 
        description: 'For recording purchase transactions',
        defaultAccountId: null
      },
      { 
        code: 'CASH', 
        name: 'Cash Journal', 
        type: JournalType.CASH, 
        description: 'For recording cash transactions',
        defaultAccountId: null
      },
      { 
        code: 'BANK', 
        name: 'Bank Journal', 
        type: JournalType.BANK, 
        description: 'For recording bank transactions',
        defaultAccountId: null
      },
      { 
        code: 'GEN', 
        name: 'General Journal', 
        type: JournalType.GENERAL, 
        description: 'For recording general transactions',
        defaultAccountId: null
      }
    ];
    
    // Create journals
    defaultJournals.forEach(journal => {
      const newJournal: Journal = {
        id: this.currentJournalId++,
        entityId: defaultEntity.id,
        name: journal.name,
        code: journal.code,
        type: journal.type,
        description: journal.description || null,
        defaultAccountId: journal.defaultAccountId,
        suspenseAccountId: null,
        isActive: true,
        showInDashboard: true,
        sequence: 10,
        sequencePrefix: null,
        // Note: 'color' field removed as it doesn't exist in the database schema
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.journals.set(newJournal.id, newJournal);
    });
    
    // Create sample journal entries
    // Get default journals for reference
    const cashJournal = Array.from(this.journals.values()).find(j => j.type === JournalType.CASH);
    const salesJournal = Array.from(this.journals.values()).find(j => j.type === JournalType.SALE);
    const purchaseJournal = Array.from(this.journals.values()).find(j => j.type === JournalType.PURCHASE);
    const generalJournal = Array.from(this.journals.values()).find(j => j.type === JournalType.GENERAL);
    
    // Default to general journal if others aren't found
    const defaultJournalId = generalJournal ? generalJournal.id : 1;
    
    // Create sample journal entries using journalEntryStorage
    const cashJournalEntry = {
      referenceNumber: 'JE-2023-0045',
      date: new Date('2023-03-15'),
      description: 'Client payment - ABC Corp',
      status: JournalEntryStatus.POSTED,
      createdById: adminUser.id,
      entityId: defaultEntity.id,
      journalId: cashJournal ? cashJournal.id : defaultJournalId,
      clientId: defaultClient.id,
    };
    
    journalEntryStorage.createJournalEntry(cashJournalEntry).then(async (entry) => {
      // Add the journal entry lines for the cash journal entry
      const cashAccount = Array.from(this.accounts.values())
        .find(a => a.clientId === defaultClient.id && a.accountCode === '1000');
      
      const arAccount = Array.from(this.accounts.values())
        .find(a => a.clientId === defaultClient.id && a.accountCode === '1200');
      
      if (cashAccount && arAccount) {
        // Debit line
        await journalEntryStorage.createJournalEntryLine({
          journalEntryId: entry.id,
          type: "debit",
          accountId: cashAccount.id,
          amount: "5000",
          description: 'Client payment - ABC Corp',
          entityId: defaultEntity.id
        });
        
        // Credit line
        await journalEntryStorage.createJournalEntryLine({
          journalEntryId: entry.id,
          type: "credit",
          accountId: arAccount.id,
          amount: "5000",
          description: 'Client payment - ABC Corp',
          entityId: defaultEntity.id
        });
      }
      
      // Post the entry
      await journalEntryStorage.updateJournalEntry(entry.id, {
        status: JournalEntryStatus.POSTED,
        postedBy: adminUser.id,
        postedAt: new Date()
      });
    });
    
    // Create office supplies entry
    const officeSuppliesEntry = {
      referenceNumber: 'JE-2023-0044',
      date: new Date('2023-03-10'),
      description: 'Office supplies - Vendor XYZ',
      status: JournalEntryStatus.DRAFT,
      createdById: adminUser.id,
      entityId: defaultEntity.id,
      journalId: purchaseJournal ? purchaseJournal.id : defaultJournalId,
      clientId: defaultClient.id,
    };
    
    journalEntryStorage.createJournalEntry(officeSuppliesEntry).then(async (entry) => {
      // Add the journal entry lines
      const apAccount = Array.from(this.accounts.values())
        .find(a => a.clientId === defaultClient.id && a.accountCode === '2000');
      
      const expenseAccount = Array.from(this.accounts.values())
        .find(a => a.clientId === defaultClient.id && a.accountCode === '6150');
      
      if (apAccount && expenseAccount) {
        // Debit line
        await journalEntryStorage.createJournalEntryLine({
          journalEntryId: entry.id,
          type: "debit",
          accountId: apAccount.id,
          amount: "750",
          description: 'Office supplies - Vendor XYZ',
          entityId: defaultEntity.id
        });
        
        // Credit line
        await journalEntryStorage.createJournalEntryLine({
          journalEntryId: entry.id,
          type: "credit",
          accountId: expenseAccount.id,
          amount: "750",
          description: 'Office supplies - Vendor XYZ',
          entityId: defaultEntity.id
        });
      }
      
      // Post the entry
      await journalEntryStorage.updateJournalEntry(entry.id, {
        status: JournalEntryStatus.POSTED,
        postedBy: adminUser.id,
        postedAt: new Date()
      });
    });
    
    // Create computer purchase entry
    const computerPurchaseEntry = {
      referenceNumber: 'JE-2023-0043',
      date: new Date('2023-03-05'),
      description: 'New computer purchase',
      status: JournalEntryStatus.DRAFT,
      createdById: adminUser.id,
      entityId: defaultEntity.id,
      journalId: generalJournal ? generalJournal.id : defaultJournalId,
      clientId: defaultClient.id,
    };
    
    journalEntryStorage.createJournalEntry(computerPurchaseEntry).then(async (entry) => {
      // Add the journal entry lines
      const assetsAccount = Array.from(this.accounts.values())
        .find(a => a.clientId === defaultClient.id && a.accountCode === '1500');
      
      const cashAccount = Array.from(this.accounts.values())
        .find(a => a.clientId === defaultClient.id && a.accountCode === '1000');
      
      if (assetsAccount && cashAccount) {
        // Debit line
        await journalEntryStorage.createJournalEntryLine({
          journalEntryId: entry.id,
          type: "debit",
          accountId: assetsAccount.id,
          amount: "2200",
          description: 'New computer purchase',
          entityId: defaultEntity.id
        });
        
        // Credit line
        await journalEntryStorage.createJournalEntryLine({
          journalEntryId: entry.id,
          type: "credit",
          accountId: cashAccount.id,
          amount: "2200",
          description: 'New computer purchase',
          entityId: defaultEntity.id
        });
      }
      
      // Leave this one as a draft
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return userStorage.getUser(id);
  }
  
  async getUsers(): Promise<User[]> {
    return userStorage.getUsers();
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return userStorage.getUserByUsername(username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return userStorage.createUser(insertUser);
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    return userStorage.updateUser(id, userData);
  }
  
  async findUserByRole(role: UserRole): Promise<User | undefined> {
    return userStorage.findUserByRole(role);
  }

  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }
  
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }
  
  async getClientsByUserId(userId: number): Promise<Client[]> {
    return Array.from(this.clients.values())
      .filter(client => client.userId === userId);
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    const id = this.currentClientId++;
    const newClient: Client = {
      id,
      userId: client.userId,
      name: client.name,
      active: client.active !== undefined ? client.active : true,
      industry: client.industry || null,
      contactName: client.contactName || null,
      contactEmail: client.contactEmail || null,
      contactPhone: client.contactPhone || null,
      address: client.address || null,
      city: client.city || null,
      state: client.state || null,
      country: client.country || null,
      postalCode: client.postalCode || null,
      website: client.website || null,
      notes: client.notes || null,
      referralSource: client.referralSource || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.clients.set(id, newClient);
    
    // Seed the standard Chart of Accounts for the new client
    try {
      await this.seedClientCoA(id);
      console.log(`Automatically seeded standard Chart of Accounts for new client ${id}`);
    } catch (error) {
      console.error(`Failed to seed Chart of Accounts for new client ${id}:`, error);
      // We don't want to fail the client creation if seeding fails
      // Just log the error and continue
    }
    
    return newClient;
  }
  
  async updateClient(id: number, clientData: Partial<Client>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    
    const updatedClient = { ...client, ...clientData, updatedAt: new Date() };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }
  
  // Entity methods
  async getEntity(id: number): Promise<Entity | undefined> {
    return this.entities.get(id);
  }
  
  async getEntities(): Promise<Entity[]> {
    return Array.from(this.entities.values());
  }
  
  async getEntitiesByUser(userId: number): Promise<Entity[]> {
    const userAccessEntries = Array.from(this.userEntityAccess.entries())
      .filter(([key]) => key.startsWith(`${userId}-`))
      .map(([key]) => {
        const entityId = parseInt(key.split('-')[1]);
        return entityId;
      });
    
    return Array.from(this.entities.values())
      .filter(entity => 
        entity.ownerId === userId || userAccessEntries.includes(entity.id)
      );
  }
  
  async getEntitiesByClient(clientId: number): Promise<Entity[]> {
    return Array.from(this.entities.values())
      .filter(entity => entity.clientId === clientId);
  }
  
  async createEntity(insertEntity: InsertEntity): Promise<Entity> {
    console.log("DEBUG Storage CreateEntity: Creating new entity with data:", JSON.stringify(insertEntity));
    
    const id = this.currentEntityId++;
    
    // Process industry data for consistency
    let industryValue = null;
    if (insertEntity.industry !== undefined && insertEntity.industry !== null) {
      if (insertEntity.industry === '') {
        console.log("DEBUG Storage CreateEntity: Empty industry provided, defaulting to 'other'");
        industryValue = 'other';
      } else {
        // Convert any industry value to string for consistent storage
        console.log(`DEBUG Storage CreateEntity: Converting industry value "${insertEntity.industry}" (${typeof insertEntity.industry}) to string`);
        industryValue = String(insertEntity.industry);
      }
    }
    
    const entity: Entity = { 
      id, 
      name: insertEntity.name,
      code: insertEntity.code,
      ownerId: insertEntity.ownerId,
      clientId: insertEntity.clientId,
      active: insertEntity.active !== undefined ? insertEntity.active : true,
      fiscalYearStart: insertEntity.fiscalYearStart || '01-01',
      fiscalYearEnd: insertEntity.fiscalYearEnd || '12-31',
      currency: insertEntity.currency || 'USD',
      email: insertEntity.email || null,
      taxId: insertEntity.taxId || null,
      address: insertEntity.address || null,
      phone: insertEntity.phone || null,
      website: insertEntity.website || null,
      createdAt: new Date(),
      updatedAt: null,
      city: insertEntity.city || null,
      state: insertEntity.state || null,
      country: insertEntity.country || null,
      postalCode: insertEntity.postalCode || null,
      industry: industryValue, // Use our processed industry value
      subIndustry: insertEntity.subIndustry || null,
      employeeCount: insertEntity.employeeCount || null,
      foundedYear: insertEntity.foundedYear || null,
      annualRevenue: insertEntity.annualRevenue || null,
      businessType: insertEntity.businessType || null,
      publiclyTraded: insertEntity.publiclyTraded || false,
      stockSymbol: insertEntity.stockSymbol || null,
      timezone: insertEntity.timezone || 'UTC',
      dataCollectionConsent: insertEntity.dataCollectionConsent || false,
      lastAuditDate: insertEntity.lastAuditDate || null
    };
    this.entities.set(id, entity);
    return entity;
  }
  
  async updateEntity(id: number, entityData: Partial<Entity>): Promise<Entity | undefined> {
    console.log(`DEBUG Storage UpdateEntity: Updating entity with ID ${id}`);
    console.log("DEBUG Storage UpdateEntity: Received entity data:", JSON.stringify(entityData));
    
    // Validate ID
    if (isNaN(id) || id <= 0) {
      console.error(`DEBUG Storage UpdateEntity: Invalid entity ID: ${id}`);
      return undefined;
    }
    
    const entity = this.entities.get(id);
    if (!entity) {
      console.error(`DEBUG Storage UpdateEntity: Entity with ID ${id} not found in database`);
      return undefined;
    }
    
    console.log("DEBUG Storage UpdateEntity: Found existing entity:", JSON.stringify(entity));
    
    // Input validation for critical fields
    if (entityData.name !== undefined) {
      if (!entityData.name || entityData.name.trim() === '') {
        console.error("DEBUG Storage UpdateEntity: Name cannot be empty, keeping original name");
        entityData.name = entity.name; // Keep original name if new one is empty
      } else {
        console.log(`DEBUG Storage UpdateEntity: Name update - Original: "${entity.name}", New: "${entityData.name}"`);
      }
    }
    
    // Industry field validation - ensure we never store null/empty values and always store as string
    if (entityData.industry !== undefined) {
      // Handle null/empty values
      if (entityData.industry === null || entityData.industry === '') {
        console.log("DEBUG Storage UpdateEntity: Empty industry provided, defaulting to 'other'");
        entityData.industry = 'other';
      } else {
        // Ensure industry is stored as string regardless of input type (number, etc.)
        console.log(`DEBUG Storage UpdateEntity: Converting industry value "${entityData.industry}" (${typeof entityData.industry}) to string for storage consistency`);
        entityData.industry = String(entityData.industry);
      }
    }
    
    // Detailed logging for all fields being updated
    console.log("DEBUG Storage UpdateEntity: Field changes for entity ID " + id + ":");
    for (const [key, value] of Object.entries(entityData)) {
      if (entity[key] !== value) {
        console.log(`  - ${key}: "${entity[key]}" -> "${value}"`);
      }
    }
    
    // Type consistency check for clientId
    if (entityData.clientId !== undefined) {
      // Ensure clientId is a number
      if (typeof entityData.clientId !== 'number') {
        console.warn(`DEBUG Storage UpdateEntity: Converting clientId from ${typeof entityData.clientId} to number`);
        entityData.clientId = parseInt(String(entityData.clientId), 10);
        
        if (isNaN(entityData.clientId)) {
          console.error("DEBUG Storage UpdateEntity: Invalid clientId, cannot convert to number");
          entityData.clientId = entity.clientId; // Keep original if invalid
        }
      }
      
      // Log client relationship change
      if (entity.clientId !== entityData.clientId) {
        console.log(`DEBUG Storage UpdateEntity: Client relationship changing from ${entity.clientId} to ${entityData.clientId}`);
      }
    }
    
    // Create updated entity with all merged properties
    const updatedEntity = { 
      ...entity, 
      ...entityData, 
      updatedAt: new Date() 
    };
    
    // Final log before saving
    console.log("DEBUG Storage UpdateEntity: Final updated entity data:", JSON.stringify(updatedEntity));
    
    // Verify the entity still has required fields after update
    if (!updatedEntity.name || updatedEntity.name.trim() === '') {
      console.error("DEBUG Storage UpdateEntity: CRITICAL ERROR - Entity would have no name after update");
      return undefined;
    }
    
    this.entities.set(id, updatedEntity);
    console.log(`DEBUG Storage UpdateEntity: Entity ID ${id} successfully updated`);
    return updatedEntity;
  }
  
  // User Entity Access methods
  async getUserEntityAccess(userId: number, entityId: number): Promise<string | undefined> {
    return userStorage.getUserEntityAccess(userId, entityId);
  }
  
  async grantUserEntityAccess(userId: number, entityId: number, accessLevel: string): Promise<void> {
    return userStorage.grantUserEntityAccess(userId, entityId, accessLevel);
  }
  
  async getUserEntityAccessList(userId: number): Promise<{ entityId: number, accessLevel: string }[]> {
    return userStorage.getUserEntityAccessList(userId);
  }
  
  // Account methods have been moved to accountStorage.ts and are now accessed via the "accounts" property
  
  // Journal methods
  // Journal and Journal Entry methods are delegated to journalEntryStorage
  // These have been removed from MemStorage implementation and moved to journalEntryStorage.ts
  
  // Account methods have been moved to the accounts property 
  // All account-related functionality is now handled by the accounts property via delegation

  // Journal Entry methods - delegated to journalEntryStorage
  // All Journal Entry methods have been moved to journalEntryStorage.ts
  async getBudget(id: number): Promise<Budget | undefined> {
    return this.budgets.get(id);
  }
  
  async getBudgets(entityId: number): Promise<Budget[]> {
    return Array.from(this.budgets.values())
      .filter(budget => budget.entityId === entityId);
  }
  
  async getBudgetsByStatus(entityId: number, status: BudgetStatus): Promise<Budget[]> {
    return Array.from(this.budgets.values())
      .filter(budget => budget.entityId === entityId && budget.status === status);
  }
  
  async createBudget(budget: InsertBudget): Promise<Budget> {
    const id = this.currentBudgetId++;
    const newBudget: Budget = {
      id,
      entityId: budget.entityId,
      name: budget.name,
      description: budget.description || null,
      fiscalYear: budget.fiscalYear,
      startDate: budget.startDate,
      endDate: budget.endDate,
      status: budget.status as BudgetStatus || BudgetStatus.DRAFT,
      periodType: budget.periodType as BudgetPeriodType || BudgetPeriodType.MONTHLY,
      versionNumber: budget.versionNumber || 1,
      basedOnPreviousBudget: budget.basedOnPreviousBudget || false,
      previousBudgetId: budget.previousBudgetId || null,
      departmentId: budget.departmentId || null,
      projectId: budget.projectId || null,
      approvedById: budget.approvedById || null,
      approvedAt: budget.approvedAt || null,
      notes: budget.notes || null,
      totalAmount: budget.totalAmount || 0,
      aiAssisted: budget.aiAssisted || false,
      createdBy: budget.createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.budgets.set(id, newBudget);
    return newBudget;
  }
  
  async updateBudget(id: number, budgetData: Partial<Budget>): Promise<Budget | undefined> {
    const budget = this.budgets.get(id);
    if (!budget) return undefined;
    
    const updatedBudget = { 
      ...budget, 
      ...budgetData,
      updatedAt: new Date()
    };
    this.budgets.set(id, updatedBudget);
    return updatedBudget;
  }
  
  async deleteBudget(id: number): Promise<void> {
    this.budgets.delete(id);
    
    // Delete all associated budget items
    const budgetItems = Array.from(this.budgetItems.values())
      .filter(item => item.budgetId === id);
    
    budgetItems.forEach(item => {
      this.budgetItems.delete(item.id);
    });
    
    // Delete all associated budget documents
    const budgetDocuments = Array.from(this.budgetDocuments.values())
      .filter(doc => doc.budgetId === id);
    
    budgetDocuments.forEach(doc => {
      this.budgetDocuments.delete(doc.id);
    });
  }

  // Budget Item methods
  async getBudgetItem(id: number): Promise<BudgetItem | undefined> {
    return this.budgetItems.get(id);
  }
  
  async getBudgetItems(budgetId: number): Promise<BudgetItem[]> {
    return Array.from(this.budgetItems.values())
      .filter(item => item.budgetId === budgetId);
  }
  
  async getBudgetItemsByAccount(budgetId: number, accountId: number): Promise<BudgetItem[]> {
    return Array.from(this.budgetItems.values())
      .filter(item => item.budgetId === budgetId && item.accountId === accountId);
  }
  
  async createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem> {
    const id = this.currentBudgetItemId++;
    const newItem: BudgetItem = {
      id,
      budgetId: item.budgetId,
      accountId: item.accountId,
      periodNumber: item.periodNumber,
      amount: item.amount,
      description: item.description || null,
      notes: item.notes || null,
      isRecurring: item.isRecurring || false,
      variance: item.variance || null,
      actualAmount: item.actualAmount || null,
      variancePercentage: item.variancePercentage || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.budgetItems.set(id, newItem);
    
    // Update total budget amount
    const budget = this.budgets.get(item.budgetId);
    if (budget) {
      const totalAmount = Array.from(this.budgetItems.values())
        .filter(bi => bi.budgetId === item.budgetId)
        .reduce((sum, bi) => sum + bi.amount, 0);
      
      this.budgets.set(budget.id, {
        ...budget,
        totalAmount,
        updatedAt: new Date()
      });
    }
    
    return newItem;
  }
  
  async updateBudgetItem(id: number, itemData: Partial<BudgetItem>): Promise<BudgetItem | undefined> {
    const item = this.budgetItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { 
      ...item, 
      ...itemData,
      updatedAt: new Date()
    };
    this.budgetItems.set(id, updatedItem);
    
    // If amount changed, update budget total amount
    if (itemData.amount !== undefined && item.amount !== itemData.amount) {
      const budget = this.budgets.get(item.budgetId);
      if (budget) {
        const totalAmount = Array.from(this.budgetItems.values())
          .filter(bi => bi.budgetId === item.budgetId)
          .reduce((sum, bi) => sum + bi.amount, 0);
        
        this.budgets.set(budget.id, {
          ...budget,
          totalAmount,
          updatedAt: new Date()
        });
      }
    }
    
    return updatedItem;
  }
  
  async deleteBudgetItem(id: number): Promise<void> {
    const item = this.budgetItems.get(id);
    if (!item) return;
    
    this.budgetItems.delete(id);
    
    // Update total budget amount
    const budget = this.budgets.get(item.budgetId);
    if (budget) {
      const totalAmount = Array.from(this.budgetItems.values())
        .filter(bi => bi.budgetId === item.budgetId)
        .reduce((sum, bi) => sum + bi.amount, 0);
      
      this.budgets.set(budget.id, {
        ...budget,
        totalAmount,
        updatedAt: new Date()
      });
    }
  }

  // Budget Document methods
  async getBudgetDocument(id: number): Promise<BudgetDocument | undefined> {
    return this.budgetDocuments.get(id);
  }
  
  async getBudgetDocuments(budgetId: number): Promise<BudgetDocument[]> {
    return Array.from(this.budgetDocuments.values())
      .filter(doc => doc.budgetId === budgetId);
  }
  
  async createBudgetDocument(document: InsertBudgetDocument): Promise<BudgetDocument> {
    const id = this.currentBudgetDocumentId++;
    const newDocument: BudgetDocument = {
      id,
      budgetId: document.budgetId,
      filename: document.filename,
      originalFilename: document.originalFilename,
      fileType: document.fileType,
      fileSize: document.fileSize,
      uploadedBy: document.uploadedBy,
      processingStatus: document.processingStatus || 'pending',
      extractedData: document.extractedData || null,
      uploadedAt: new Date()
    };
    this.budgetDocuments.set(id, newDocument);
    return newDocument;
  }
  
  async updateBudgetDocument(id: number, processingStatus: string, extractedData?: any): Promise<BudgetDocument | undefined> {
    const document = this.budgetDocuments.get(id);
    if (!document) return undefined;
    
    const updatedDocument = { 
      ...document, 
      processingStatus,
      extractedData: extractedData || document.extractedData
    };
    this.budgetDocuments.set(id, updatedDocument);
    return updatedDocument;
  }
  
  async deleteBudgetDocument(id: number): Promise<void> {
    this.budgetDocuments.delete(id);
  }

  // Forecast methods
  async getForecast(id: number): Promise<Forecast | undefined> {
    return this.forecasts.get(id);
  }
  
  async getForecasts(entityId: number): Promise<Forecast[]> {
    return Array.from(this.forecasts.values())
      .filter(forecast => forecast.entityId === entityId);
  }
  
  async createForecast(forecast: InsertForecast): Promise<Forecast> {
    const id = this.currentForecastId++;
    const newForecast: Forecast = {
      id,
      entityId: forecast.entityId,
      name: forecast.name,
      description: forecast.description || null,
      startDate: forecast.startDate,
      endDate: forecast.endDate,
      budgetId: forecast.budgetId || null,
      basedOn: forecast.basedOn || 'historical_data',
      createdBy: forecast.createdBy,
      aiGenerated: forecast.aiGenerated || false,
      scenarioType: forecast.scenarioType || 'base_case',
      assumptions: forecast.assumptions || null,
      forecastData: forecast.forecastData || null,
      lastUpdatedBy: forecast.lastUpdatedBy || null,
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    this.forecasts.set(id, newForecast);
    return newForecast;
  }
  
  async updateForecast(id: number, forecastData: Partial<Forecast>): Promise<Forecast | undefined> {
    const forecast = this.forecasts.get(id);
    if (!forecast) return undefined;
    
    const updatedForecast = { 
      ...forecast, 
      ...forecastData,
      lastUpdated: new Date()
    };
    this.forecasts.set(id, updatedForecast);
    return updatedForecast;
  }
  
  async deleteForecast(id: number): Promise<void> {
    this.forecasts.delete(id);
  }
  
  async generateForecast(entityId: number, config: any): Promise<any> {
    // This implements a simple forecasting algorithm based on historical data
    const forecastData = {
      periods: [],
      accounts: [],
      data: {}
    };
    
    // Get accounts to forecast
    const client = Array.from(this.entities.values())
      .find(entity => entity.id === entityId)?.clientId;
      
    if (!client) {
      return null; // Entity not found or no client associated
    }
    
    const accounts = Array.from(this.accounts.values())
      .filter(account => account.clientId === client)
      .filter(account => account.type === AccountType.REVENUE || account.type === AccountType.EXPENSE);
    
    // Add accounts to forecast
    forecastData.accounts = accounts.map(account => ({
      id: account.id,
      name: account.name,
      accountCode: account.accountCode,
      type: account.type
    }));
    
    // Generate periods based on config
    const startDate = config.startDate ? new Date(config.startDate) : new Date();
    const periods = config.periods || 12;
    for (let i = 0; i < periods; i++) {
      const periodDate = new Date(startDate);
      periodDate.setMonth(startDate.getMonth() + i);
      
      const period = {
        index: i,
        name: periodDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        date: periodDate
      };
      
      forecastData.periods.push(period);
      
      // Generate forecast values for each account using previous data
      accounts.forEach(account => {
        const accountId = account.id;
        if (!forecastData.data[accountId]) {
          forecastData.data[accountId] = [];
        }
        
        // Find previous 6 months of data for this account
        const journalLines = Array.from(this.journalEntryLines.values())
          .filter(line => line.accountId === account.id)
          .filter(line => {
            const entry = this.journalEntries.get(line.journalEntryId);
            return entry && entry.status === JournalEntryStatus.POSTED;
          });
          
        // Calculate the trend
        let baseValue = 0;
        
        if (journalLines.length > 0) {
          // Get average value from journal lines
          const total = journalLines.reduce((sum, line) => {
            if (account.type === AccountType.REVENUE) {
              return sum + parseFloat(line.credit);
            } else {
              return sum + parseFloat(line.debit);
            }
          }, 0);
          
          baseValue = total / Math.max(1, journalLines.length);
        } else {
          // No historical data, use placeholder
          baseValue = account.type === AccountType.REVENUE ? 5000 : 3000;
        }
        
        // Apply growth factor (5% monthly growth for revenue, 3% for expenses)
        const growthFactor = account.type === AccountType.REVENUE ? 0.05 : 0.03;
        
        // Apply seasonal adjustments if enabled
        const useSeasonality = config.useSeasonality === undefined ? true : config.useSeasonality;
        
        // Generate amount with trend and seasonality
        const amount = baseValue * Math.pow(1 + growthFactor, i) * 
          (useSeasonality ? (1 + 0.1 * Math.sin(i * Math.PI / 6)) : 1); // Simple seasonal pattern
        
        forecastData.data[accountId].push({
          periodIndex: i,
          amount: Math.round(amount * 100) / 100,
          confidence: 0.9 - (i * 0.05) // Confidence decreases for further periods
        });
      });
    }
    
    return forecastData;
  }

  // Consolidation Group methods have been removed and refactored to consolidationStorage.ts
  
  // Helper methods for consolidation have been moved to consolidationStorage.ts

  // Checklist Files methods
  async createChecklistFile(fileData: InsertChecklistFile): Promise<ChecklistFile> {
    const id = this.currentChecklistFileId++;
    const now = new Date();
    
    // If this is set to be the active checklist, make sure to deactivate others
    if (fileData.isActive) {
      this.checklistFiles.forEach((file, key) => {
        if (file.isActive) {
          this.checklistFiles.set(key, { ...file, isActive: false, updatedAt: now });
        }
      });
    }
    
    const checklistFile: ChecklistFile = {
      id,
      filename: fileData.filename,
      originalFilename: fileData.originalFilename,
      mimeType: fileData.mimeType,
      size: fileData.size,
      path: fileData.path,
      isActive: fileData.isActive ?? true,
      uploadedBy: fileData.uploadedBy ?? null,
      createdAt: now,
      updatedAt: now,
      // Add fileData as a non-schema property
      fileData: fileData.fileData
    };
    
    this.checklistFiles.set(id, checklistFile);
    return checklistFile;
  }
  
  async getChecklistFiles(): Promise<ChecklistFile[]> {
    return Array.from(this.checklistFiles.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by date descending
  }
  
  async getActiveChecklistFile(): Promise<ChecklistFile | undefined> {
    return Array.from(this.checklistFiles.values())
      .find(file => file.isActive);
  }
  
  async getChecklistFileById(id: number): Promise<ChecklistFile | undefined> {
    return this.checklistFiles.get(id);
  }
  
  async updateChecklistFile(id: number, isActive: boolean): Promise<ChecklistFile | undefined> {
    const file = this.checklistFiles.get(id);
    if (!file) return undefined;
    
    const now = new Date();
    
    // If setting this file as active, deactivate others
    if (isActive) {
      this.checklistFiles.forEach((f, key) => {
        if (f.isActive && key !== id) {
          this.checklistFiles.set(key, { ...f, isActive: false, updatedAt: now });
        }
      });
    }
    
    const updatedFile = {
      ...file,
      isActive,
      updatedAt: now
    };
    
    this.checklistFiles.set(id, updatedFile);
    return updatedFile;
  }
  
  async deleteChecklistFile(id: number): Promise<void> {
    this.checklistFiles.delete(id);
  }
}

// Database implementation
export class DatabaseStorage implements IStorage {
  public accounts: IAccountStorage;
  
  constructor() {
    this.accounts = accountStorage;
  }
  // Account methods delegation
  async getAccount(id: number): Promise<Account | undefined> {
    return this.accounts.getAccount(id);
  }
  
  async getAccounts(clientId: number): Promise<Account[]> {
    return this.accounts.getAccounts(clientId);
  }
  
  async getAccountsByType(clientId: number, type: AccountType): Promise<Account[]> {
    return this.accounts.getAccountsByType(clientId, type);
  }
  
  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    return this.accounts.createAccount(insertAccount);
  }
  
  async updateAccount(id: number, accountData: Partial<Account>): Promise<Account | undefined> {
    return this.accounts.updateAccount(id, accountData);
  }
  
  async deleteAccount(id: number): Promise<void> {
    return this.accounts.deleteAccount(id);
  }
  
  async getAccountsTree(clientId: number): Promise<AccountTreeNode[]> {
    return this.accounts.getAccountsTree(clientId);
  }
  
  async getAccountsForClient(clientId: number): Promise<Account[]> {
    return this.accounts.getAccountsByClientId(clientId);
  }
  
  async generateCoaImportPreview(clientId: number, fileBuffer: Buffer, filename: string): Promise<ImportPreview> {
    return this.accounts.generateCoaImportPreview(clientId, fileBuffer, filename);
  }
  
  async importCoaForClient(clientId: number, fileBuffer: Buffer, filename: string, selections?: ImportSelections | null): Promise<ImportResult> {
    return this.accounts.importCoaForClient(clientId, fileBuffer, filename, selections);
  }
  
  async markAccountInactive(id: number, clientId: number): Promise<Account | undefined> {
    return this.accounts.markAccountInactive(id, clientId);
  }
  
  async accountHasTransactions(id: number): Promise<boolean> {
    return this.accounts.accountHasTransactions(id);
  }
  
  // Chart of Accounts Seeding
  async seedClientCoA(clientId: number): Promise<void> {
    // Delegate to accountStorage
    return this.accounts.seedClientCoA(clientId);
  }
  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    return clientStorage.getClient(id);
  }
  
  async getClients(): Promise<Client[]> {
    return clientStorage.getClients();
  }
  
  async getClientsByUserId(userId: number): Promise<Client[]> {
    return clientStorage.getClientsByUserId(userId);
  }
  
  async getClientByUserId(userId: number): Promise<Client | null> {
    return clientStorage.getClientByUserId(userId);
  }

  async createClient(client: InsertClient): Promise<Client> {
    // Create the client using the clientStorage module
    const result = await clientStorage.createClient(client);
    
    // Seed the standard Chart of Accounts for the new client
    try {
      console.log(`VERIFICATION TEST: Starting automatic CoA seeding for new client ${result.id} at ${new Date().toISOString()}`);
      await this.seedClientCoA(result.id);
      console.log(`VERIFICATION TEST: Successfully seeded standard Chart of Accounts for new client ${result.id}`);
    } catch (error) {
      console.error(`VERIFICATION TEST: Failed to seed Chart of Accounts for new client ${result.id}:`, error);
      // We don't want to fail the client creation if seeding fails
      // Just log the error and continue
    }
    
    return result;
  }
  
  async updateClient(id: number, clientData: Partial<Client>): Promise<Client | undefined> {
    return clientStorage.updateClient(id, clientData);
  }
  
  // User methods
  async findUserByRole(role: UserRole): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.role, role))
      .limit(1);
      
    return result[0];
  }
  // Budget methods
  async getBudget(id: number): Promise<Budget | undefined> {
    const result = await db
      .select()
      .from(budgets)
      .where(eq(budgets.id, id))
      .limit(1);
      
    return result[0];
  }
  
  async getBudgets(entityId: number): Promise<Budget[]> {
    return await db
      .select()
      .from(budgets)
      .where(eq(budgets.entityId, entityId))
      .orderBy(desc(budgets.createdAt));
  }
  
  async getBudgetsByStatus(entityId: number, status: BudgetStatus): Promise<Budget[]> {
    return await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.entityId, entityId),
        eq(budgets.status, status)
      ))
      .orderBy(desc(budgets.createdAt));
  }
  
  async createBudget(budget: InsertBudget): Promise<Budget> {
    const [result] = await db
      .insert(budgets)
      .values({
        name: budget.name,
        entityId: budget.entityId,
        createdBy: budget.createdBy,
        fiscalYear: budget.fiscalYear,
        startDate: budget.startDate,
        endDate: budget.endDate,
        description: budget.description || null,
        status: budget.status as BudgetStatus || BudgetStatus.DRAFT,
        periodType: budget.periodType as BudgetPeriodType || BudgetPeriodType.MONTHLY,
        approvedBy: budget.approvedBy || null,
        approvedAt: budget.approvedAt || null,
        notes: budget.notes || null,
        totalAmount: budget.totalAmount || "0", 
        metadata: budget.metadata || null
      })
      .returning();
    return result;
  }
  
  async updateBudget(id: number, budget: Partial<Budget>): Promise<Budget | undefined> {
    const [result] = await db
      .update(budgets)
      .set({
        ...budget,
        updatedAt: new Date()
      })
      .where(eq(budgets.id, id))
      .returning();
    return result;
  }
  
  async deleteBudget(id: number): Promise<void> {
    // First delete all budget items associated with this budget
    await db
      .delete(budgetItems)
      .where(eq(budgetItems.budgetId, id));
      
    // Then delete all budget documents associated with this budget
    await db
      .delete(budgetDocuments)
      .where(eq(budgetDocuments.budgetId, id));
      
    // Finally delete the budget
    await db
      .delete(budgets)
      .where(eq(budgets.id, id));
  }
  
  // Budget Item methods
  async getBudgetItem(id: number): Promise<BudgetItem | undefined> {
    const result = await db
      .select()
      .from(budgetItems)
      .where(eq(budgetItems.id, id))
      .limit(1);
      
    return result[0];
  }
  
  async getBudgetItems(budgetId: number): Promise<BudgetItem[]> {
    return await db
      .select()
      .from(budgetItems)
      .where(eq(budgetItems.budgetId, budgetId))
      .orderBy(asc(budgetItems.periodStart));
  }
  
  async getBudgetItemsByAccount(budgetId: number, accountId: number): Promise<BudgetItem[]> {
    return await db
      .select()
      .from(budgetItems)
      .where(and(
        eq(budgetItems.budgetId, budgetId),
        eq(budgetItems.accountId, accountId)
      ))
      .orderBy(asc(budgetItems.periodStart));
  }
  
  async createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem> {
    const [result] = await db
      .insert(budgetItems)
      .values({
        createdBy: item.createdBy,
        accountId: item.accountId,
        budgetId: item.budgetId,
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        description: item.description || null,
        tags: item.tags || null,
        notes: item.notes || null,
        amount: item.amount || "0",
        category: item.category || null
      })
      .returning();
    return result;
  }
  
  async updateBudgetItem(id: number, item: Partial<BudgetItem>): Promise<BudgetItem | undefined> {
    const [result] = await db
      .update(budgetItems)
      .set({
        ...item,
        updatedAt: new Date()
      })
      .where(eq(budgetItems.id, id))
      .returning();
    return result;
  }
  
  async deleteBudgetItem(id: number): Promise<void> {
    await db
      .delete(budgetItems)
      .where(eq(budgetItems.id, id));
  }
  
  // Budget Document methods
  async getBudgetDocument(id: number): Promise<BudgetDocument | undefined> {
    const result = await db
      .select()
      .from(budgetDocuments)
      .where(eq(budgetDocuments.id, id))
      .limit(1);
      
    return result[0];
  }
  
  async getBudgetDocuments(budgetId: number): Promise<BudgetDocument[]> {
    return await db
      .select()
      .from(budgetDocuments)
      .where(eq(budgetDocuments.budgetId, budgetId))
      .orderBy(desc(budgetDocuments.uploadedAt));
  }
  
  async createBudgetDocument(document: InsertBudgetDocument): Promise<BudgetDocument> {
    const [result] = await db
      .insert(budgetDocuments)
      .values({
        filename: document.filename,
        path: document.path,
        mimeType: document.mimeType,
        size: document.size,
        uploadedBy: document.uploadedBy,
        budgetId: document.budgetId,
        originalFilename: document.originalFilename,
        fileType: document.fileType,
        extractedData: document.extractedData || null,
        processingStatus: document.processingStatus || "pending"
      })
      .returning();
    return result;
  }
  
  async updateBudgetDocument(id: number, processingStatus: string, extractedData?: any): Promise<BudgetDocument | undefined> {
    const [result] = await db
      .update(budgetDocuments)
      .set({
        processingStatus,
        extractedData: extractedData || null,
        updatedAt: new Date()
      })
      .where(eq(budgetDocuments.id, id))
      .returning();
    return result;
  }
  
  async deleteBudgetDocument(id: number): Promise<void> {
    await db
      .delete(budgetDocuments)
      .where(eq(budgetDocuments.id, id));
  }
  
  // Forecast methods
  async getForecast(id: number): Promise<Forecast | undefined> {
    const result = await db
      .select()
      .from(forecasts)
      .where(eq(forecasts.id, id))
      .limit(1);
      
    return result[0];
  }
  
  async getForecasts(entityId: number): Promise<Forecast[]> {
    return await db
      .select()
      .from(forecasts)
      .where(eq(forecasts.entityId, entityId))
      .orderBy(desc(forecasts.createdAt));
  }
  
  async createForecast(forecast: InsertForecast): Promise<Forecast> {
    const [result] = await db
      .insert(forecasts)
      .values({
        name: forecast.name,
        entityId: forecast.entityId,
        createdBy: forecast.createdBy,
        startDate: forecast.startDate,
        endDate: forecast.endDate,
        description: forecast.description || null,
        periodType: forecast.periodType || BudgetPeriodType.MONTHLY,
        baseScenario: forecast.baseScenario || false,
        modelConfig: forecast.modelConfig || null,
        forecastData: forecast.forecastData || null,
        aiInsights: forecast.aiInsights || null,
        confidenceInterval: forecast.confidenceInterval || null
      })
      .returning();
    return result;
  }
  
  async updateForecast(id: number, forecast: Partial<Forecast>): Promise<Forecast | undefined> {
    const [result] = await db
      .update(forecasts)
      .set({
        ...forecast,
        updatedAt: new Date()
      })
      .where(eq(forecasts.id, id))
      .returning();
    return result;
  }
  
  async deleteForecast(id: number): Promise<void> {
    await db
      .delete(forecasts)
      .where(eq(forecasts.id, id));
  }
  
  async generateForecast(entityId: number, config: any): Promise<any> {
    // This method would typically call the ML service
    // For now, return sample data that would come from the ML service
    return {
      forecastData: [],
      modelConfig: config,
      message: "Forecast generated successfully"
    };
  }
  
  // Contact Form submission methods
  async createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission> {
    const [result] = await db
      .insert(contactSubmissions)
      .values({
        name: submission.name,
        email: submission.email,
        phone: submission.phone || null,
        message: submission.message,
        ipAddress: submission.ipAddress || null,
        userAgent: submission.userAgent || null,
        status: submission.status || 'unread'
      })
      .returning();
    return result;
  }
  
  async getContactSubmissions(limit: number = 100, offset: number = 0): Promise<ContactSubmission[]> {
    return await db
      .select()
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
  }
  
  async getContactSubmissionById(id: number): Promise<ContactSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(contactSubmissions)
      .where(eq(contactSubmissions.id, id));
    return submission || undefined;
  }
  
  async updateContactSubmission(id: number, status: string): Promise<ContactSubmission | undefined> {
    const [submission] = await db
      .update(contactSubmissions)
      .set({ status, updatedAt: new Date() })
      .where(eq(contactSubmissions.id, id))
      .returning();
    return submission || undefined;
  }
  
  // Checklist Form submission methods
  async createChecklistSubmission(submission: InsertChecklistSubmission): Promise<ChecklistSubmission> {
    const [result] = await db
      .insert(checklistSubmissions)
      .values({
        name: submission.name,
        email: submission.email,
        company: submission.company,
        revenueRange: submission.revenueRange,
        ipAddress: submission.ipAddress || null,
        userAgent: submission.userAgent || null,
        status: submission.status || 'unread'
      })
      .returning();
    return result;
  }
  
  async getChecklistSubmissions(limit: number = 100, offset: number = 0): Promise<ChecklistSubmission[]> {
    return await db
      .select()
      .from(checklistSubmissions)
      .orderBy(desc(checklistSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
  }
  
  async getChecklistSubmissionById(id: number): Promise<ChecklistSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(checklistSubmissions)
      .where(eq(checklistSubmissions.id, id));
    return submission || undefined;
  }
  
  async updateChecklistSubmission(id: number, status: string): Promise<ChecklistSubmission | undefined> {
    const [submission] = await db
      .update(checklistSubmissions)
      .set({ status })
      .where(eq(checklistSubmissions.id, id))
      .returning();
    return submission || undefined;
  }
  
  // Checklist Files methods
  async createChecklistFile(fileData: any): Promise<ChecklistFile> {
    // If setting this as active, deactivate all others first
    if (fileData.isActive) {
      await db
        .update(checklistFiles)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(checklistFiles.isActive, true));
    }
    
    // Extract the binary file data from the input
    const fileBuffer = fileData.fileData;
    
    // Use raw SQL to insert the file with binary data
    const result = await db.execute<any>(
      `INSERT INTO checklist_files 
       (filename, original_filename, mime_type, size, path, is_active, uploaded_by, file_data, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, filename, original_filename, mime_type, size, path, is_active, uploaded_by, created_at`,
      [
        fileData.filename,
        fileData.originalFilename,
        fileData.mimeType,
        fileData.size,
        fileData.path,
        fileData.isActive,
        fileData.uploadedBy,
        fileBuffer, // This is a Buffer object that PostgreSQL will store as bytea
        new Date()
      ]
    );
    
    // Get the first row from the result
    const file = result[0];
    
    if (!file) {
      throw new Error("Failed to create checklist file");
    }
    
    // Convert snake_case properties to camelCase
    const camelCaseFile = {
      id: file.id,
      filename: file.filename,
      originalFilename: file.original_filename,
      mimeType: file.mime_type,
      size: file.size,
      path: file.path,
      isActive: file.is_active,
      uploadedBy: file.uploaded_by,
      createdAt: file.created_at,
      fileData: fileBuffer // Add the file data back for memory storage compatibility
    };
    
    return camelCaseFile as ChecklistFile;
  }
  
  async getChecklistFiles(): Promise<ChecklistFile[]> {
    return await db
      .select()
      .from(checklistFiles)
      .orderBy(desc(checklistFiles.createdAt));
  }
  
  async getActiveChecklistFile(): Promise<ChecklistFile | undefined> {
    // Select everything including the file_data column
    const [file] = await db.execute<any>(
      `SELECT * FROM checklist_files WHERE is_active = true`,
      []
    );
    
    if (!file) {
      return undefined;
    }
    
    // Convert the bytea data to a Buffer
    if (file.file_data) {
      // @ts-ignore: Adding fileData property to match MemStorage implementation
      file.fileData = Buffer.from(file.file_data);
    } else {
      // If no file data, create an empty buffer
      // @ts-ignore: Adding fileData property
      file.fileData = Buffer.alloc(0);
      console.warn(`No file data found for active checklist file (ID: ${file.id}).`);
    }
    
    // Convert snake_case property names to camelCase for consistency
    const camelCaseFile = {
      id: file.id,
      filename: file.filename,
      originalFilename: file.original_filename,
      mimeType: file.mime_type,
      size: file.size,
      path: file.path,
      isActive: file.is_active,
      uploadedBy: file.uploaded_by,
      createdAt: file.created_at,
      updatedAt: file.updated_at,
      fileData: file.fileData
    };
    
    return camelCaseFile as ChecklistFile;
  }
  
  async getChecklistFileById(id: number): Promise<ChecklistFile | undefined> {
    // Select everything including the file_data column
    const [file] = await db.execute<any>(
      `SELECT * FROM checklist_files WHERE id = $1`,
      [id]
    );
    
    if (file) {
      // Convert the bytea data to a Buffer
      if (file.file_data) {
        // @ts-ignore: Adding fileData property to match MemStorage implementation
        file.fileData = Buffer.from(file.file_data);
      } else {
        // If no file data, create an empty buffer
        // @ts-ignore: Adding fileData property
        file.fileData = Buffer.alloc(0);
        console.warn(`No file data found for checklist file (ID: ${file.id}).`);
      }
      
      // Convert snake_case property names to camelCase for consistency
      const camelCaseFile = {
        id: file.id,
        filename: file.filename,
        originalFilename: file.original_filename,
        mimeType: file.mime_type,
        size: file.size,
        path: file.path,
        isActive: file.is_active,
        uploadedBy: file.uploaded_by,
        createdAt: file.created_at,
        updatedAt: file.updated_at,
        fileData: file.fileData
      };
      
      return camelCaseFile as ChecklistFile;
    }
    
    return undefined;
  }
  
  async updateChecklistFile(id: number, isActive: boolean): Promise<ChecklistFile | undefined> {
    // If setting this as active, deactivate all others first
    if (isActive) {
      // Get all active files except the current one
      const activeFiles = await db
        .select()
        .from(checklistFiles)
        .where(and(
          eq(checklistFiles.isActive, true),
          sql`${checklistFiles.id} != ${id}`
        ));
      
      // Deactivate each file individually
      for (const file of activeFiles) {
        await db
          .update(checklistFiles)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(checklistFiles.id, file.id));
      }
    }
    
    const [file] = await db
      .update(checklistFiles)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(checklistFiles.id, id))
      .returning();
    
    return file || undefined;
  }
  
  async deleteChecklistFile(id: number): Promise<void> {
    await db
      .delete(checklistFiles)
      .where(eq(checklistFiles.id, id));
  }
  
  // Consultation Form submission methods
  async createConsultationSubmission(submission: InsertConsultationSubmission): Promise<ConsultationSubmission> {
    const [result] = await db
      .insert(consultationSubmissions)
      .values({
        companyName: submission.companyName,
        industry: submission.industry,
        companySize: submission.companySize,
        annualRevenue: submission.annualRevenue,
        services: submission.services,
        firstName: submission.firstName,
        lastName: submission.lastName,
        email: submission.email,
        phone: submission.phone || null,
        preferredContact: submission.preferredContact,
        message: submission.message || null,
        ipAddress: submission.ipAddress || null,
        userAgent: submission.userAgent || null,
        status: submission.status || 'unread'
      })
      .returning();
    return result;
  }
  
  async getConsultationSubmissions(limit: number = 100, offset: number = 0): Promise<ConsultationSubmission[]> {
    return await db
      .select()
      .from(consultationSubmissions)
      .orderBy(desc(consultationSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
  }
  
  async getConsultationSubmissionById(id: number): Promise<ConsultationSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(consultationSubmissions)
      .where(eq(consultationSubmissions.id, id));
    return submission || undefined;
  }
  
  async updateConsultationSubmission(id: number, status: string): Promise<ConsultationSubmission | undefined> {
    const [submission] = await db
      .update(consultationSubmissions)
      .set({ status })
      .where(eq(consultationSubmissions.id, id))
      .returning();
    return submission || undefined;
  }
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUsers(): Promise<User[]> {
    const result = await db.select().from(users);
    return result;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username: insertUser.username,
        password: insertUser.password,
        email: insertUser.email,
        name: insertUser.name,
        role: insertUser.role,
        active: insertUser.active ?? true
      })
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getEntity(id: number): Promise<Entity | undefined> {
    return entityStorage.getEntity(id);
  }

  async getEntities(): Promise<Entity[]> {
    return entityStorage.getEntities();
  }

  async getEntitiesByUser(userId: number): Promise<Entity[]> {
    return entityStorage.getEntitiesByUser(userId);
  }

  async getEntitiesByClient(clientId: number): Promise<Entity[]> {
    return entityStorage.getEntitiesByClient(clientId);
  }

  async createEntity(insertEntity: InsertEntity): Promise<Entity> {
    return entityStorage.createEntity(insertEntity);
  }

  async updateEntity(id: number, entityData: Partial<Entity>): Promise<Entity | undefined> {
    return entityStorage.updateEntity(id, entityData);
  }

  async getUserEntityAccess(userId: number, entityId: number): Promise<string | undefined> {
    return userStorage.getUserEntityAccess(userId, entityId);
  }

  async grantUserEntityAccess(userId: number, entityId: number, accessLevel: string): Promise<void> {
    return userStorage.grantUserEntityAccess(userId, entityId, accessLevel);
  }
  
  async getUserEntityAccessList(userId: number): Promise<{ entityId: number, accessLevel: string }[]> {
    return userStorage.getUserEntityAccessList(userId);
  }

  // Account methods have been moved to accountStorage.ts
  async getAccount(id: number): Promise<Account | undefined> {
    // Delegated to accountStorage.ts
    return accountStorage.getAccount(id);
  }

  async getAccounts(clientId: number): Promise<Account[]> {
    // Delegated to accountStorage.ts
    return accountStorage.getAccounts(clientId);
  }

  async getAccountsByType(clientId: number, type: AccountType): Promise<Account[]> {
    // Delegated to accountStorage.ts
    return accountStorage.getAccountsByType(clientId, type);
  }
  
  async getAccountsTree(clientId: number): Promise<AccountTreeNode[]> {
    // Delegated to accountStorage.ts
    return accountStorage.getAccountsTree(clientId);
  }
  // Implementation for Chart of Accounts export
  async getAccountsForClient(clientId: number): Promise<Account[]> {
    // Delegate to the accounts storage module via the accounts property
    console.log(`DEBUG: MemStorage delegating getAccountsForClient for client ${clientId} to this.accounts.getAccountsByClientId`);
    return this.accounts.getAccountsByClientId(clientId);
  }
  
  // Implementation for Chart of Accounts import
  async generateCoaImportPreview(clientId: number, fileBuffer: Buffer, fileName: string): Promise<ImportPreview> {
    // Delegate to the accounts storage module via the accounts property
    console.log(`DEBUG: MemStorage delegating generateCoaImportPreview for client ${clientId} to this.accounts`);
    return this.accounts.generateCoaImportPreview(clientId, fileBuffer, fileName);
      changes: [],
      totalChanges: 0,
      totalAdds: 0,
      totalUpdates: 0,
      totalRemoves: 0,
      totalUnchanged: 0,
      accountsWithTransactions: 0
    };
    
    return await db.transaction(async (tx) => {
      try {
        // ==================== STEP 1: Parse the file ====================
        let rows: any[] = [];
        
        try {
          // Determine if this is an Excel file or CSV based on file extension
          const isExcel = fileName && (fileName.endsWith('.xlsx') || fileName.endsWith('.xls'));
          
          if (isExcel) {
            // Process Excel file
            const XLSX = await import('xlsx');
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON with header option
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Extract headers and transform them
            if (jsonData.length < 2) {
              throw new Error('Excel file is empty or missing data rows');
            }
            
            const headers = (jsonData[0] as string[]).map(header => 
              header ? this.normalizeHeaderField(header) : '');
            
            // Process data rows (skip header row)
            rows = jsonData.slice(1).map(row => {
              const rowData: any = {};
              (row as any[]).forEach((cell, index) => {
                if (index < headers.length && headers[index]) {
                  rowData[headers[index]] = cell;
                }
              });
              return rowData;
            });
          } else {
            // Process CSV file with PapaParse as used in importCoaForClient
            // Parse CSV from buffer
            const csvContent = fileBuffer.toString('utf-8');
            const Papa = await import('papaparse');
            const parseResult = Papa.default.parse(csvContent, {
              header: true,
              skipEmptyLines: true,
              transformHeader: (header: string) => this.normalizeHeaderField(header)
            });
          
            if (parseResult.errors && parseResult.errors.length > 0) {
              throw new Error(`CSV parsing error: ${parseResult.errors[0].message}`);
            }
            
            rows = parseResult.data as any[];
          }
        } catch (error: any) {
          console.error('Error parsing import file', error);
          throw new Error(`Error parsing file: ${error.message}`);
        }
        
        if (rows.length === 0) {
          throw new Error('No data rows found in the imported file');
        }
        
        // ==================== STEP 2: Get existing accounts for this client ====================
        const existingAccounts = await this.getAccounts(clientId);
        
        // Create lookup maps for more efficient processing
        const existingCodeMap = new Map<string, Account>();
        const existingIdMap = new Map<number, Account>();
        
        // Map for faster lookups - storing lowercase codes for case-insensitive matching
        for (const account of existingAccounts) {
          existingCodeMap.set(account.accountCode.toLowerCase(), account);
          existingIdMap.set(account.id, account);
        }
        
        // ==================== STEP 3: Batch query for accounts with transactions ====================
        // Efficiently query which accounts have transactions
        const accountsWithTransactions = new Set<number>();
        
        if (existingAccounts.length > 0) {
          const accountIds = existingAccounts.map(a => a.id);
          
          // Split into chunks of 500 to avoid query size limitations
          const chunkSize = 500;
          for (let i = 0; i < accountIds.length; i += chunkSize) {
            const chunk = accountIds.slice(i, i + chunkSize);
            
            const transactionCounts = await tx
              .select({
                accountId: journalEntryLines.accountId,
                count: count()
              })
              .from(journalEntryLines)
              .where(inArray(journalEntryLines.accountId, chunk))
              .groupBy(journalEntryLines.accountId)
              .having(gt(count(), 0))
              .execute();
            
            transactionCounts.forEach(item => {
              accountsWithTransactions.add(item.accountId);
            });
          }
        }
        
        preview.accountsWithTransactions = accountsWithTransactions.size;
        
        // ==================== STEP 4: Process import data ====================
        // Track account codes seen in the import file
        const importedCodes = new Set<string>();
        let processedCount = 0;
        
        // Process each row in the import file
        for (const row of rows) {
          processedCount++;
          
          // Extract account code from the row (required field)
          const accountCode = this.getCaseInsensitiveValue(row, 'accountCode') || 
                             this.getCaseInsensitiveValue(row, 'accountcode') || 
                             this.getCaseInsensitiveValue(row, 'account_code') ||
                             this.getCaseInsensitiveValue(row, 'code'); // Legacy support
          
          if (!accountCode) {
            // Skip rows without account code
            continue;
          }
          
          // Add to set of imported codes
          importedCodes.add(accountCode.toLowerCase());
          
          // Check if account already exists (case insensitive)
          const existingAccount = existingCodeMap.get(accountCode.toLowerCase());
          
          // Get account name (required field)
          const accountName = this.getCaseInsensitiveValue(row, 'name') || 
                             this.getCaseInsensitiveValue(row, 'accountname') || 
                             this.getCaseInsensitiveValue(row, 'account_name');
          
          if (!accountName) {
            // Skip rows without account name
            continue;
          }
          
          // Get account type (required field) and normalize it
          const accountType = this.getCaseInsensitiveValue(row, 'type') || 
                             this.getCaseInsensitiveValue(row, 'accounttype') || 
                             this.getCaseInsensitiveValue(row, 'account_type');
          
          if (!accountType) {
            // Skip rows without account type
            continue;
          }
          
          // Normalize the account type
          const normalizedType = this.normalizeAccountType(accountType);
          
          // If it's not a valid type, skip this account
          if (!normalizedType) {
            continue;
          }
          
          // Extract parent code if present
          const parentCode = this.getCaseInsensitiveValue(row, 'parentcode') || 
                           this.getCaseInsensitiveValue(row, 'parent_code') || 
                           this.getCaseInsensitiveValue(row, 'parent');
          
          // Create change record
          const change: ImportAccountChange = {
            code: accountCode,
            changeType: existingAccount ? 'update' : 'add',
          };
          
          if (existingAccount) {
            change.id = existingAccount.id;
            change.existingName = existingAccount.name;
            change.existingType = existingAccount.type;
            change.existingSubtype = existingAccount.subtype;
            change.existingDescription = existingAccount.description;
            change.existingIsSubledger = existingAccount.isSubledger;
            change.existingSubledgerType = existingAccount.subledgerType;
            
            // Lookup parent code if existingAccount has parentId
            if (existingAccount.parentId) {
              const parentAccount = existingIdMap.get(existingAccount.parentId);
              if (parentAccount) {
                change.existingParentCode = parentAccount.accountCode;
              }
            }
            
            // Check if account has transactions
            if (existingAccount.id && accountsWithTransactions.has(existingAccount.id)) {
              change.hasTransactions = true;
            }
            
            // Add new values
            change.newName = accountName;
            change.newType = normalizedType as string;
            change.newSubtype = this.getCaseInsensitiveValue(row, 'subtype') || existingAccount.subtype;
            change.newDescription = this.getCaseInsensitiveValue(row, 'description') || existingAccount.description;
            change.newIsSubledger = this.parseIsSubledger(row, existingAccount);
            change.newSubledgerType = this.getSubledgerType(row, existingAccount);
            change.newParentCode = parentCode;
            
            // Check if anything changed
            if (
              change.existingName === change.newName &&
              change.existingType === change.newType &&
              change.existingSubtype === change.newSubtype &&
              change.existingDescription === change.newDescription &&
              change.existingIsSubledger === change.newIsSubledger &&
              change.existingSubledgerType === change.newSubledgerType &&
              change.existingParentCode === change.newParentCode
            ) {
              change.changeType = 'unchanged';
              preview.totalUnchanged++;
            } else {
              preview.totalUpdates++;
            }
          } else {
            // New account
            change.newName = accountName;
            change.newType = normalizedType as string;
            change.newSubtype = this.getCaseInsensitiveValue(row, 'subtype');
            change.newDescription = this.getCaseInsensitiveValue(row, 'description');
            change.newIsSubledger = this.parseIsSubledger(row);
            change.newSubledgerType = this.getSubledgerType(row);
            change.newParentCode = parentCode;
            preview.totalAdds++;
          }
          
          preview.changes.push(change);
        }
        
        // Identify accounts missing from import for potential deactivation
        for (const account of existingAccounts) {
          if (!importedCodes.has(account.accountCode.toLowerCase()) && account.active) {
            const hasTransactions = account.id && accountsWithTransactions.has(account.id);
            
            preview.changes.push({
              id: account.id,
              accountCode: account.accountCode,
              existingName: account.name,
              existingType: account.type,
              existingSubtype: account.subtype,
              existingDescription: account.description,
              existingIsSubledger: account.isSubledger,
              existingSubledgerType: account.subledgerType,
              changeType: 'remove',
              hasTransactions
            });
            
            preview.totalRemoves++;
          }
        }
        
        preview.totalChanges = preview.totalAdds + preview.totalUpdates + preview.totalRemoves;
        
        return preview;
      } catch (error: any) {
        console.error("Error generating import preview:", error);
        throw error;
      }
    });
  }
  
  async importCoaForClient(clientId: number, fileBuffer: Buffer, fileName?: string, selections?: ImportSelections | null): Promise<ImportResult> {
    // Delegate to the accounts storage module via the accounts property
    console.log(`DEBUG: MemStorage delegating importCoaForClient for client ${clientId} to this.accounts`);
    return this.accounts.importCoaForClient(clientId, fileBuffer, fileName, selections);
  }
  
  /* Original importCoaForClient implementation has been completely removed and delegated to accountStorage */

  /* Removed duplicate implementations of:
   * - createAccount
   * - markAccountInactive
   * - accountHasTransactions 
   * These methods are properly delegated in the MemStorage class (line ~275)
   */
            
            // Convert to JSON with header option
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Extract headers and transform them
            if (jsonData.length < 2) {
              result.errors.push('Excel file is empty or missing data rows');
              return result;
            }
            
            const headers = (jsonData[0] as string[]).map(header => 
              header ? this.normalizeHeaderField(header) : '');
            
            // Process data rows (skip header row)
            rows = jsonData.slice(1).map(row => {
              const rowData: any = {};
              (row as any[]).forEach((cell, index) => {
                if (index < headers.length && headers[index]) {
                  rowData[headers[index]] = cell;
                }
              });
              return rowData;
            });
          } else {
            // Parse CSV from buffer
            const csvContent = fileBuffer.toString('utf-8');
            const Papa = await import('papaparse');
            const parseResult = Papa.default.parse(csvContent, {
              header: true,
              skipEmptyLines: true,
              transformHeader: (header: string) => this.normalizeHeaderField(header)
            });
          
            if (parseResult.errors && parseResult.errors.length > 0) {
              for (const error of parseResult.errors) {
                result.errors.push(`CSV parsing error at row ${error.row}: ${error.message}`);
              }
              return result;
            }
            
            rows = parseResult.data as any[];
          }
        } catch (parseError: any) {
          result.errors.push(`File parsing error: ${parseError.message}`);
          return result;
        }
        
        // ==================== STEP 2: Validate and normalize rows ====================
        if (!rows || rows.length === 0) {
          result.errors.push('No accounts found in the imported file');
          return result;
        }
        
        // Process each row to normalize field names and handle case sensitivity
        rows = this.normalizeImportRows(rows);
        console.log(`Normalized ${rows.length} rows from imported file`);
        
        // Pre-validate rows to filter out any with missing required fields
        const validRows: any[] = [];
        const accountCodesInImport = new Set<string>();
        
        for (const row of rows) {
          // Check for accountCode first, then fall back to 'code' for backward compatibility
          const code = this.getCaseInsensitiveValue(row, 'accountCode') || 
                       this.getCaseInsensitiveValue(row, 'account_code') || 
                       this.getCaseInsensitiveValue(row, 'accountcode') || 
                       this.getCaseInsensitiveValue(row, 'code'); // Legacy support
          const name = this.getCaseInsensitiveValue(row, 'name');
          const type = this.getCaseInsensitiveValue(row, 'type');
          
          if (!code || !name || !type) {
            result.skipped++;
            continue;
          }
          
          // Standardize the accountCode format (trim and store original case)
          const trimmedCode = code.trim();
          row.accountCode = trimmedCode;
          
          // Track unique account codes to identify duplicates in the import file
          const lowerCode = trimmedCode.toLowerCase();
          if (accountCodesInImport.has(lowerCode)) {
            result.warnings.push(`Duplicate account code in import: ${trimmedCode}. Only the first entry will be processed.`);
            result.skipped++;
            continue;
          }
          
          accountCodesInImport.add(lowerCode);
          validRows.push(row);
        }
        
        if (validRows.length === 0) {
          result.errors.push('No valid accounts found in the file after filtering rows with missing required fields');
          return result;
        }
        
        console.log(`Found ${validRows.length} valid rows after filtering`);
        
        // ==================== STEP 3: Retrieve existing accounts efficiently ====================
        // Get existing accounts to check for duplicates - do this ONCE to avoid multiple DB queries
        const existingAccounts = await tx
          .select()
          .from(accounts)
          .where(eq(accounts.clientId, clientId))
          .execute();
        
        console.log(`Found ${existingAccounts.length} existing accounts for client ${clientId}`);
        
        // Create lookup maps for efficient access
        const existingCodeMap = new Map<string, Account>();
        const existingIdMap = new Map<number, Account>();
        const codeToIdMap = new Map<string, number>();
        
        // Map for faster lookups - storing lowercase codes for case-insensitive matching
        for (const account of existingAccounts) {
          existingCodeMap.set(account.accountCode.toLowerCase(), account);
          existingIdMap.set(account.id, account);
          codeToIdMap.set(account.accountCode, account.id);
          // Also map lowercase for more robust matching later
          codeToIdMap.set(account.accountCode.toLowerCase(), account.id);
        }
        
        // ==================== STEP 4: Batch query for accounts with transactions ====================
        // Efficiently query which accounts have transactions in one go
        const accountsWithTransactions = new Set<number>();
        
        if (existingAccounts.length > 0) {
          const accountIds = existingAccounts.map(a => a.id);
          
          // Split into chunks of 500 to avoid query size limitations
          const chunkSize = 500;
          for (let i = 0; i < accountIds.length; i += chunkSize) {
            const chunk = accountIds.slice(i, i + chunkSize);
            
            const transactionCounts = await tx
              .select({
                accountId: journalEntryLines.accountId,
                count: count()
              })
              .from(journalEntryLines)
              .where(inArray(journalEntryLines.accountId, chunk))
              .groupBy(journalEntryLines.accountId)
              .having(gt(count(), 0))
              .execute();
            
            transactionCounts.forEach(item => {
              accountsWithTransactions.add(item.accountId);
            });
          }
        }
        
        console.log(`Found ${accountsWithTransactions.size} accounts with transactions`);
        
        // ==================== STEP 5: First pass - create/update accounts ====================
        // Prepare collections for batch operations
        const accountsToCreate: InsertAccount[] = [];
        const accountsToUpdate: { id: number, data: Partial<Account> }[] = [];
        const newAccountCodeToRow = new Map<string, any>();
        
        for (const row of validRows) {
          try {
            const accountCode = row.accountCode;
            const accountName = this.getCaseInsensitiveValue(row, 'name')?.trim();
            const accountTypeRaw = this.getCaseInsensitiveValue(row, 'type');
            
            // Normalize account type to match enum
            let normalizedType;
            try {
              normalizedType = this.normalizeAccountType(accountTypeRaw);
            } catch (typeError: any) {
              result.errors.push(`Account ${accountCode}: ${typeError.message}`);
              result.skipped++;
              continue;
            }
            
            // Check if the account already exists using various matching strategies:
            // 1. First try to match by accountId if provided in the import file
            // 2. Then try to match by accountCode (case-insensitive)
            let existingAccount = null;
            
            // If the import file includes account IDs, try to match by ID first
            if (row.id) {
              const accountId = parseInt(row.id, 10);
              if (!isNaN(accountId) && accountId > 0) {
                existingAccount = existingIdMap.get(accountId);
                if (existingAccount) {
                  console.log(`Found existing account by ID: ${accountId}, code: ${existingAccount.accountCode}`);
                }
              }
            }
            
            // If we didn't find by ID, try to match by accountCode (case-insensitive)
            if (!existingAccount) {
              existingAccount = existingCodeMap.get(accountCode.toLowerCase());
              if (existingAccount) {
                console.log(`Found existing account by code: ${accountCode.toLowerCase()}`);
              }
            }
            
            const isActiveInImport = this.parseIsActive(row, true);
            
            if (existingAccount) {
              // Check if there are selections and this account should be skipped
              if (selections && selections.excludedCodes && selections.excludedCodes.includes(accountCode)) {
                result.skipped++;
                result.count++;
                continue;
              }
              
              // Skip updates if selections specify not to update
              if (selections && selections.updateStrategy === 'none') {
                result.unchanged++;
                result.count++;
                continue;
              }
              
              // If selections specify to update only selected accounts and this account is not included
              if (selections && 
                  selections.updateStrategy === 'selected' && 
                  selections.includedCodes && 
                  !selections.includedCodes.includes(accountCode)) {
                result.unchanged++;
                result.count++;
                continue;
              }
              
              // Check if this account has transactions using our pre-computed set
              const hasTransactions = accountsWithTransactions.has(existingAccount.id);
              
              // Handle active status changes
              if (!isActiveInImport && existingAccount.active) {
                // Mark as inactive
                accountsToUpdate.push({
                  id: existingAccount.id,
                  data: { active: false }
                });
                result.inactive++;
                result.warnings.push(`Account ${accountCode} (${accountName}) has been marked inactive`);
                result.count++;
                continue;
              } else if (!existingAccount.active && isActiveInImport) {
                // Reactivate the account
                accountsToUpdate.push({
                  id: existingAccount.id,
                  data: { active: true }
                });
                result.updated++;
                result.count++;
                continue;
              }
              
              // For accounts with transactions, be very selective about updates
              if (hasTransactions) {
                const typeChanged = normalizedType !== existingAccount.type;
                
                if (typeChanged) {
                  result.warnings.push(`Account ${accountCode} (${accountName}) has transactions and its type cannot be changed`);
                  result.unchanged++;
                  result.count++;
                  continue;
                }
                
                // Only update non-critical fields for accounts with transactions
                const safeUpdate = {
                  name: accountName,
                  description: this.getCaseInsensitiveValue(row, 'description') || existingAccount.description,
                };
                
                // Check if there are actual changes
                const nameChanged = safeUpdate.name !== existingAccount.name;
                const descChanged = safeUpdate.description !== existingAccount.description;
                
                if (nameChanged || descChanged) {
                  accountsToUpdate.push({
                    id: existingAccount.id,
                    data: safeUpdate
                  });
                  result.updated++;
                  result.warnings.push(`Account ${accountCode} has transactions - only name and description were updated`);
                } else {
                  result.unchanged++;
                }
              } else {
                // For accounts without transactions, we can update more fields
                const updateData = {
                  // Allow updating the accountCode itself if changed
                  accountCode: accountCode !== existingAccount.accountCode ? accountCode : existingAccount.accountCode,
                  name: accountName,
                  type: normalizedType as AccountType,
                  subtype: this.getCaseInsensitiveValue(row, 'subtype') || existingAccount.subtype,
                  description: this.getCaseInsensitiveValue(row, 'description') || existingAccount.description,
                  isSubledger: this.parseIsSubledger(row, existingAccount),
                  subledgerType: this.getSubledgerType(row, existingAccount),
                };
                
                // Check if anything actually changed before updating
                const hasChanges = 
                  updateData.accountCode !== existingAccount.accountCode ||
                  updateData.name !== existingAccount.name ||
                  updateData.type !== existingAccount.type ||
                  updateData.subtype !== existingAccount.subtype ||
                  updateData.description !== existingAccount.description ||
                  updateData.isSubledger !== existingAccount.isSubledger ||
                  updateData.subledgerType !== existingAccount.subledgerType;
                
                if (hasChanges) {
                  accountsToUpdate.push({
                    id: existingAccount.id,
                    data: updateData
                  });
                  result.updated++;
                } else {
                  result.unchanged++;
                }
              }
            } else {
              // If selections specify not to add new accounts, skip
              if (selections && selections.updateStrategy === 'none') {
                result.skipped++;
                continue;
              }
              
              // If selections specify to only add selected accounts and this one is not included
              if (selections && 
                  selections.updateStrategy === 'selected' && 
                  selections.includedCodes && 
                  !selections.includedCodes.includes(accountCode)) {
                result.skipped++;
                continue;
              }
              
              // Prepare new account for batch creation
              accountsToCreate.push({
                clientId,
                accountCode: accountCode,
                name: accountName,
                type: normalizedType as AccountType,
                subtype: this.getCaseInsensitiveValue(row, 'subtype') || null,
                isSubledger: this.parseIsSubledger(row),
                subledgerType: this.getSubledgerType(row),
                parentId: null, // We'll update this in the second pass
                description: this.getCaseInsensitiveValue(row, 'description') || null,
                active: isActiveInImport
              });
              
              // Store relationship between code and row for parent resolution
              newAccountCodeToRow.set(accountCode.toLowerCase(), row);
              result.added++;
            }
            
            result.count++;
          } catch (error: any) {
            result.errors.push(`Error processing account ${this.getCaseInsensitiveValue(row, 'accountCode') || 'unknown'}: ${error.message || 'Unknown error'}`);
            result.skipped++;
          }
        }
        
        // ==================== STEP 6: Execute batch creations ====================
        console.log(`Preparing to create ${accountsToCreate.length} new accounts`);
        
        // Create accounts in batches to improve performance
        if (accountsToCreate.length > 0) {
          const batchSize = 100;
          const newAccounts: Account[] = [];
          
          for (let i = 0; i < accountsToCreate.length; i += batchSize) {
            const batch = accountsToCreate.slice(i, i + batchSize);
            try {
              const createdBatch = await tx
                .insert(accounts)
                .values(batch)
                .returning();
              
              newAccounts.push(...createdBatch);
            } catch (batchError: any) {
              console.error(`Error creating batch of accounts:`, batchError);
              result.errors.push(`Failed to create some accounts: ${batchError.message}`);
              // Continue with other batches even if one fails
            }
          }
          
          // Add newly created accounts to our lookup maps
          for (const newAccount of newAccounts) {
            codeToIdMap.set(newAccount.accountCode, newAccount.id);
            codeToIdMap.set(newAccount.accountCode.toLowerCase(), newAccount.id); // Add lowercase version too
            existingCodeMap.set(newAccount.accountCode.toLowerCase(), newAccount);
            existingIdMap.set(newAccount.id, newAccount);
          }
          
          console.log(`Successfully created ${newAccounts.length} new accounts`);
        }
        
        // ==================== STEP 7: Execute batch updates ====================
        console.log(`Preparing to update ${accountsToUpdate.length} existing accounts`);
        
        if (accountsToUpdate.length > 0) {
          const batchSize = 100;
          const updatedAccounts: Account[] = [];
          
          for (let i = 0; i < accountsToUpdate.length; i += batchSize) {
            const batch = accountsToUpdate.slice(i, i + batchSize);
            
            // Execute updates individually within the transaction
            for (const update of batch) {
              try {
                console.log(`Updating account ID ${update.id} with data:`, update.data);
                
                // Execute update and return the updated record
                const [updatedAccount] = await tx
                  .update(accounts)
                  .set(update.data)
                  .where(eq(accounts.id, update.id))
                  .returning();
                
                if (updatedAccount) {
                  updatedAccounts.push(updatedAccount);
                  console.log(`Successfully updated account: ${updatedAccount.accountCode} (${updatedAccount.name})`);
                } else {
                  console.warn(`No rows updated for account ID ${update.id}`);
                }
              } catch (updateError: any) {
                console.error(`Error updating account ${update.id}:`, updateError);
                result.errors.push(`Failed to update account with ID ${update.id}: ${updateError.message}`);
              }
            }
          }
          
          console.log(`Successfully updated ${updatedAccounts.length} accounts out of ${accountsToUpdate.length} attempted`);
        }
        
        // ==================== STEP 8: Handle missing accounts ====================
        console.log(`Processing accounts present in database but missing from import file`);
        console.log(`DEBUG: Selections update strategy: ${selections?.updateStrategy || 'all (default)'}`);
        console.log(`DEBUG: Selections remove strategy: ${selections?.removeStrategy || 'inactive (default)'}`);
        
        if (selections?.includedCodes) {
          console.log(`DEBUG: Selected accounts count: ${selections.includedCodes.length}`);
          console.log(`DEBUG: First 5 selected accounts: ${selections.includedCodes.slice(0, 5).join(', ')}`);
        }
        
        // Track account codes in the import file (using a Set for faster lookups)
        const importedAccountCodes = new Set<string>();
        for (const row of validRows) {
          const accountCode = row.accountCode.toLowerCase();
          importedAccountCodes.add(accountCode);
        }
        console.log(`DEBUG: Found ${importedAccountCodes.size} account codes in import file`);
        
        // Find accounts in the database that were not in the import file
        const missingAccounts: number[] = [];
        
        // Determine how to handle accounts not in the import
        // Options:
        // - 'inactive': Mark accounts as inactive (default)
        // - 'delete': Delete accounts (if they don't have transactions)
        // - 'none': Leave accounts unchanged
        const removeStrategy = selections?.removeStrategy || 'inactive'; // Default to 'inactive' if not specified
        
        // If selections specify not to make any updates or removeStrategy is 'none', skip marking accounts
        if ((selections && selections.updateStrategy === 'none') || removeStrategy === 'none') {
          console.log(`Skipping processing of missing accounts due to ${selections?.updateStrategy === 'none' ? 'updateStrategy = none' : 'removeStrategy = none'}`);
        } else {
          console.log(`DEBUG: Starting check for missing accounts from ${existingAccounts.length} existing accounts`);
          let skipInactiveCount = 0;
          let skipImportedCount = 0;
          let skipTransactionsCount = 0;
          let skipNotSelectedCount = 0;
          
          for (const account of existingAccounts) {
            // Skip accounts that are already inactive
            if (!account.active) {
              skipInactiveCount++;
              continue;
            }
            
            const lowerAccountCode = account.accountCode.toLowerCase();
            // Skip if the account was in the import
            if (importedAccountCodes.has(lowerAccountCode)) {
              skipImportedCount++;
              continue;
            }
            
            // Skip accounts with transactions (we don't want to deactivate these)
            if (accountsWithTransactions.has(account.id)) {
              console.log(`Account ${account.accountCode} (${account.name}) has transactions and is missing from import - keeping active`);
              result.warnings.push(`Account ${account.accountCode} (${account.name}) has transactions and is missing from import - keeping active`);
              skipTransactionsCount++;
              continue;
            }
            
            // If selections specify to only update selected accounts and this is not included, skip
            if (selections && 
                selections.updateStrategy === 'selected' &&
                selections.includedCodes) {
              // For missing accounts, we'll skip if this account is not explicitly selected for update
              if (!selections.includedCodes.includes(account.accountCode)) {
                console.log(`Account ${account.accountCode} (${account.name}) is missing from import but not selected for update - keeping active`);
                skipNotSelectedCount++;
                continue;
              }
            }
            
            console.log(`Account ${account.accountCode} (${account.name}) is missing from import file - will mark inactive`);
            missingAccounts.push(account.id);
          }
          
          console.log(`DEBUG: Skipped marking inactive - Already inactive: ${skipInactiveCount}, Present in import: ${skipImportedCount}, Has transactions: ${skipTransactionsCount}, Not selected: ${skipNotSelectedCount}`);
        }
        
        // Process accounts to mark as inactive or delete (accounts that exist in DB but aren't in import)
        console.log(`Found ${missingAccounts.length} accounts missing from import to process with strategy: ${removeStrategy}`);
        
        if (missingAccounts.length > 0) {
          // Skip if removeStrategy is 'none'
          if (removeStrategy === 'none') {
            console.log(`Skipping processing of missing accounts due to removeStrategy = none`);
          } else {
            // Process each missing account based on the action specified in missingAccountActions
            for (const accountId of missingAccounts) {
              // Get the original account data for the log message
              const account = existingIdMap.get(accountId);
              if (!account) {
                console.error(`Missing account ID ${accountId} not found in existingIdMap`);
                continue;
              }
              
              // Determine action for this account (default to removeStrategy if no specific action)
              let action = removeStrategy;
              
              // Check if we have a specific action for this account in missingAccountActions
              if (selections?.missingAccountActions && 
                  account.accountCode in selections.missingAccountActions) {
                action = selections.missingAccountActions[account.accountCode];
                console.log(`Using specified action '${action}' for account ${account.accountCode}`);
              } else {
                console.log(`Using default action '${action}' for account ${account.accountCode}`);
              }
              
              try {
                if (action === 'inactive') {
                  // Mark the account as inactive
                  await tx
                    .update(accounts)
                    .set({ active: false })
                    .where(eq(accounts.id, accountId));
                  
                  console.log(`Marked account ${account.accountCode} (${account.name}) as inactive`);
                  result.inactive++;
                  result.count++;
                } else if (action === 'delete') {
                  // Check if the account has transactions - don't delete if it does
                  if (accountsWithTransactions.has(accountId)) {
                    console.log(`Cannot delete account ${account.accountCode} (${account.name}) as it has transactions - marking inactive instead`);
                    result.warnings.push(`Account ${account.accountCode} (${account.name}) has transactions and cannot be deleted - marked inactive instead`);
                    
                    // Mark as inactive instead
                    await tx
                      .update(accounts)
                      .set({ active: false })
                      .where(eq(accounts.id, accountId));
                      
                    result.inactive++;
                  } else {
                    // Check if this account has any child accounts
                    const childAccounts = await tx
                      .select({ count: count() })
                      .from(accounts)
                      .where(eq(accounts.parentId, accountId));
                    
                    // If there are child accounts, don't allow deletion
                    if (childAccounts[0]?.count > 0) {
                      console.log(`Cannot delete account ${account.accountCode} (${account.name}) as it has child accounts - marking inactive instead`);
                      result.warnings.push(`Account ${account.accountCode} (${account.name}) has child accounts and cannot be deleted - marked inactive instead`);
                      
                      // Mark as inactive instead
                      await tx
                        .update(accounts)
                        .set({ active: false })
                        .where(eq(accounts.id, accountId));
                        
                      result.inactive++;
                    } else {
                      // Delete the account - it has no transactions and no child accounts
                      await tx
                        .delete(accounts)
                        .where(eq(accounts.id, accountId));
                      
                      console.log(`Deleted account ${account.accountCode} (${account.name})`);
                      result.deleted++; // Track accounts that were actually deleted
                    }
                  }
                  result.count++;
                }
              } catch (processError) {
                console.error(`Error processing missing account ${account.accountCode}:`, processError);
                result.errors.push(`Failed to process missing account ${account.accountCode}: ${(processError as Error).message || 'Unknown error'}`);
              }
            }
          }
        }
        
        // ==================== STEP 9: Second pass - parent-child relationships ====================
        console.log(`Processing parent-child relationships`);
        
        // Skip parent relationship processing if selections specify not to make updates
        if (selections && selections.updateStrategy === 'none') {
          console.log('Skipping parent relationship processing due to updateStrategy = none');
          return result;
        }
        
        // First gather all parent relationships to resolve
        const parentUpdates: { accountId: number, parentId: number, accountCode: string, parentCode: string }[] = [];
        
        // Process existing accounts that may need parent updates
        for (const row of validRows) {
          try {
            const accountCode = row.accountCode;
            const lowerAccountCode = accountCode.toLowerCase();
            
            // If selections specify to only update selected accounts and this is not included, skip
            if (selections && 
                selections.updateStrategy === 'selected' && 
                selections.includedCodes && 
                !selections.includedCodes.includes(accountCode)) {
              continue;
            }
            
            // If this is a new account or an existing one that doesn't have transactions
            const accountId = codeToIdMap.get(lowerAccountCode);
            if (!accountId) continue; // Skip if account wasn't successfully created/found
            
            // Skip accounts with transactions since we don't update parent relationships for those
            if (accountsWithTransactions.has(accountId)) continue;
            
            // Extract parent code with comprehensive case-insensitive handling
            const parentCode = this.getParentCode(row);
            if (!parentCode) continue; // No parent specified
            
            const lowerParentCode = parentCode.toLowerCase();
            
            // Get the parent ID, trying different case variations
            const parentId = codeToIdMap.get(parentCode) || codeToIdMap.get(lowerParentCode);
            
            if (!parentId) {
              result.warnings.push(`Cannot establish parent relationship: Parent account ${parentCode} not found for ${accountCode}`);
              continue;
            }
            
            // Don't allow self-referencing parent
            if (accountId === parentId) {
              result.warnings.push(`Account ${accountCode} cannot be its own parent`);
              continue;
            }
            
            // Check for circular references
            let potentialParentId = parentId;
            let isCircular = false;
            const visited = new Set<number>();
            
            while (potentialParentId) {
              if (visited.has(potentialParentId)) {
                isCircular = true;
                break;
              }
              
              visited.add(potentialParentId);
              
              const parent = existingIdMap.get(potentialParentId);
              potentialParentId = parent?.parentId || null;
              
              // Would this create a circular reference?
              if (potentialParentId === accountId) {
                isCircular = true;
                break;
              }
            }
            
            if (isCircular) {
              result.warnings.push(`Cannot set parent for ${accountCode}: Would create a circular reference`);
              continue;
            }
            
            // Queue up the parent relationship update
            parentUpdates.push({
              accountId,
              parentId,
              accountCode,
              parentCode
            });
            
          } catch (error: any) {
            const accountCode = row.accountCode || 'unknown';
            console.error(`Error resolving parent for ${accountCode}:`, error);
            result.warnings.push(`Error resolving parent for account ${accountCode}: ${error.message || 'Unknown error'}`);
          }
        }
        
        // ==================== STEP 9: Execute parent relationship updates ====================
        console.log(`Applying ${parentUpdates.length} parent relationship updates`);
        
        if (parentUpdates.length > 0) {
          for (const update of parentUpdates) {
            try {
              await tx
                .update(accounts)
                .set({ parentId: update.parentId })
                .where(eq(accounts.id, update.accountId));
                
              console.log(`Updated parent relationship: ${update.accountCode} -> ${update.parentCode}`);
            } catch (updateError: any) {
              console.error(`Error updating parent relationship for account ${update.accountCode}:`, updateError);
              result.warnings.push(`Failed to update parent for account ${update.accountCode}: ${updateError.message}`);
            }
          }
        }
        
        console.log(`Chart of Accounts import completed successfully for client ${clientId}`);
        return result;
      } catch (error: any) {
        console.error(`Chart of Accounts import failed:`, error);
        result.errors.push(`Import failed: ${error.message || 'Unknown error'}`);
        throw error; // This will trigger a rollback of the transaction
      }
    });
  }
  
  /**
   * Helper to normalize CSV/Excel header fields for consistent access
   */
  private normalizeHeaderField(header: string): string {
    if (!header) return '';
    return header.trim().toLowerCase();
  }
  
  /**
   * Normalize import rows to handle case sensitivity and field variations
   */
  private normalizeImportRows(rows: any[]): any[] {
    return rows.map(row => {
      // Create a new object with all lowercase keys
      const normalizedRow: any = {};
      
      for (const key in row) {
        const normalizedKey = key.toLowerCase();
        normalizedRow[normalizedKey] = row[key];
        
        // Also preserve the original key for backward compatibility
        normalizedRow[key] = row[key];
      }
      
      return normalizedRow;
    });
  }
  
  /**
   * Helper to get value from a row with case-insensitive access
   * Enhanced to handle different field naming conventions
   */
  private getCaseInsensitiveValue(row: any, fieldName: string): any {
    if (!row) return null;
    
    // Try direct access first
    if (row[fieldName] !== undefined) return row[fieldName];
    
    // Create variants of field names to try
    const variants = new Set<string>();
    
    // Lowercase and uppercase variants
    const lowerFieldName = fieldName.toLowerCase();
    const upperFieldName = fieldName.toUpperCase();
    variants.add(lowerFieldName);
    variants.add(upperFieldName);
    
    // Handle camelCase, snake_case, kebab-case, and PascalCase conversions
    // Convert to snake_case
    const snakeCaseField = lowerFieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
    variants.add(snakeCaseField);
    
    // Convert to kebab-case
    const kebabCaseField = lowerFieldName.replace(/([A-Z])/g, '-$1').toLowerCase();
    variants.add(kebabCaseField);
    
    // Convert to camelCase
    const camelCaseField = lowerFieldName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    variants.add(camelCaseField);
    
    // Convert to PascalCase
    const pascalCaseField = lowerFieldName.charAt(0).toUpperCase() + 
                            lowerFieldName.slice(1).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    variants.add(pascalCaseField);
    
    // Try common variations with spaces
    variants.add(lowerFieldName.replace(/_/g, ' '));
    variants.add(lowerFieldName.replace(/-/g, ' '));
    
    // Check all variants
    for (const variant of variants) {
      if (row[variant] !== undefined) {
        return row[variant];
      }
    }
    
    // Last resort: check all keys case-insensitively
    for (const key in row) {
      if (key.toLowerCase() === lowerFieldName) {
        return row[key];
      }
    }
    
    // Look for variant-like matches (partial matches or similar fields)
    for (const key in row) {
      const keyLower = key.toLowerCase();
      // Check if the key contains the field name or vice versa
      if (keyLower.includes(lowerFieldName) || lowerFieldName.includes(keyLower)) {
        // Only match if at least 3 characters in length and the match is significant
        if (lowerFieldName.length >= 3 && keyLower.length >= 3) {
          return row[key];
        }
      }
    }
    
    return null;
  }
  
  /**
   * Helper to extract parent code from row with comprehensive case handling
   */
  private getParentCode(row: any): string | null {
    if (!row) return null;
    
    // Check for ParentCode field first (from our new export format)
    const parentCodeValue = this.getCaseInsensitiveValue(row, 'ParentCode');
    if (parentCodeValue !== null && parentCodeValue !== undefined && parentCodeValue !== '') {
      const trimmed = typeof parentCodeValue === 'string' ? parentCodeValue.trim() : String(parentCodeValue).trim();
      if (trimmed) {
        return trimmed;
      }
    }
    
    // Array of possible parent code field names - expanded with more variations
    const parentCodeFields = [
      'parentcode', 'parentCode', 'PARENTCODE', 'ParentCODE', 'parent code', 'parent_code',
      'PARENT_CODE', 'parent-code', 'PARENT-CODE', 'parent', 'Parent', 'PARENT', 'parentaccountnumber',
      'parentAccountNumber', 'ParentAccountNumber', 'PARENTACCOUNTNUMBER', 'parent_account_number',
      'parent account number', 'Parent Account Number', 'parent_account', 'parent account'
    ];
    
    // Try each possible field name
    for (const field of parentCodeFields) {
      const value = this.getCaseInsensitiveValue(row, field);
      if (value !== null && value !== undefined && value !== '') {
        // Convert to string, trim, and check if it's not just whitespace
        const trimmed = typeof value === 'string' ? value.trim() : String(value).trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Helper to parse active status with comprehensive case handling
   */
  private parseIsActive(row: any, defaultValue: boolean = true): boolean {
    const activeValue = this.getCaseInsensitiveValue(row, 'active') || 
                        this.getCaseInsensitiveValue(row, 'isactive') || 
                        this.getCaseInsensitiveValue(row, 'is_active');
    
    if (activeValue === undefined || activeValue === null) {
      return defaultValue;
    }
    
    if (typeof activeValue === 'boolean') {
      return activeValue;
    }
    
    const normalizedValue = String(activeValue).toLowerCase().trim();
    
    // Recognize common "false" values
    if (normalizedValue === 'no' || 
        normalizedValue === 'false' || 
        normalizedValue === 'n' || 
        normalizedValue === '0' || 
        normalizedValue === 'inactive') {
      return false;
    }
    
    // Anything else is considered true (yes, true, 1, active, etc.)
    return true;
  }
  
  // Helper method to normalize account types from imported data
  private normalizeAccountType(type: string): AccountType {
    if (!type) {
      throw new Error("Account type is required");
    }
    
    switch (type.trim().toUpperCase()) {
      case 'ASSET':
      case 'ASSETS':
        return AccountType.ASSET;
      
      case 'LIABILITY':
      case 'LIABILITIES':
        return AccountType.LIABILITY;
      
      case 'EQUITY':
        return AccountType.EQUITY;
      
      case 'REVENUE':
      case 'INCOME':
      case 'REVENUES':
      case 'INCOMES':
        return AccountType.REVENUE;
      
      case 'EXPENSE':
      case 'EXPENSES':
        return AccountType.EXPENSE;
      
      default:
        throw new Error(`Invalid account type: ${type}`);
    }
  }
  
  /**
   * Helper method to parse isSubledger field with case-insensitive handling
   * This handles different case variations and formats (yes/no, true/false, 1/0)
   */
  private parseIsSubledger(row: any, existingAccount?: Account): boolean {
    // Check all possible case variations of isSubledger field
    const isSubledgerField = row.issubledger || row.isSubledger || row.IsSubledger || row.ISSUBLEDGER;
    
    if (isSubledgerField === undefined && existingAccount) {
      return existingAccount.isSubledger;
    }
    
    if (typeof isSubledgerField === 'boolean') {
      return isSubledgerField;
    }
    
    // Check string values
    if (isSubledgerField) {
      const normalized = isSubledgerField.toString().toLowerCase().trim();
      if (normalized === 'yes' || normalized === '1' || normalized === 'true') {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Helper method to get subledger type with case-insensitive handling
   */
  private getSubledgerType(row: any, existingAccount?: Account): string | null {
    // Check all possible case variations of subledgerType field
    const subledgerType = row.subledgertype || row.subledgerType || row.SubledgerType || row.SUBLEDGERTYPE;
    
    if (subledgerType) {
      return subledgerType.trim();
    }
    
    if (existingAccount) {
      return existingAccount.subledgerType;
    }
    
    return null;
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    // Delegated to accountStorage.ts
    return accountStorage.createAccount(insertAccount);
  }

  async updateAccount(id: number, accountData: Partial<Account>): Promise<Account | undefined> {
    // Get clientId from accountData or from account
    let clientId: number;
    if (accountData.clientId) {
      clientId = accountData.clientId;
    } else {
      const account = await this.getAccount(id);
      if (!account) {
        return undefined;
      }
      clientId = account.clientId;
    }
    
    // Delegated to accountStorage.ts with the necessary clientId
    try {
      return await accountStorage.updateAccount(id, clientId, accountData) || undefined;
    } catch (e) {
      console.error(`Error updating account ${id}:`, e);
      return undefined;
    }
  }

  async deleteAccount(id: number, clientId?: number): Promise<void> {
    // Get clientId from account if not provided
    if (!clientId) {
      const account = await this.getAccount(id);
      if (!account) {
        throw new ApiError(404, `Account with ID ${id} not found.`);
      }
      clientId = account.clientId;
    }
    
    // Delegated to accountStorage.ts
    return accountStorage.deleteAccount(id, clientId);
  }
  
  /**
   * Marks an account as inactive instead of deleting it
   * This is used when an account has transactions and cannot be deleted
   */
  async markAccountInactive(id: number, clientId?: number): Promise<Account | undefined> {
    // Implementation has been moved to accountStorage.ts
    // This method now delegates to accountStorage
    
    // Get clientId from account if not provided
    if (!clientId) {
      const account = await this.getAccount(id);
      if (!account) {
        return undefined;
      }
      clientId = account.clientId;
    }
    
    return accountStorage.markAccountInactive(id, clientId);
  }
  
  /**
   * Checks if an account has any transactions
   */
  async accountHasTransactions(id: number): Promise<boolean> {
    return accountStorage.accountHasTransactions(id);
  }

  // Journal Entry methods have been moved to server/storage/journalEntryStorage.ts
  // These methods are now implemented in the JournalEntryStorage class
  // Original implementation has been removed to reduce code duplication


  async getFixedAsset(id: number): Promise<FixedAsset | undefined> {
    const [asset] = await db
      .select()
      .from(fixedAssets)
      .where(eq(fixedAssets.id, id));
    return asset || undefined;
  }

  async getFixedAssets(entityId: number): Promise<FixedAsset[]> {
    return await db
      .select()
      .from(fixedAssets)
      .where(eq(fixedAssets.entityId, entityId));
  }

  async createFixedAsset(insertAsset: InsertFixedAsset): Promise<FixedAsset> {
    const [asset] = await db
      .insert(fixedAssets)
      .values({
        name: insertAsset.name,
        entityId: insertAsset.entityId,
        description: insertAsset.description,
        createdBy: insertAsset.createdBy,
        status: insertAsset.status || "active",
        acquisitionDate: insertAsset.acquisitionDate,
        acquisitionCost: insertAsset.acquisitionCost,
        depreciationMethod: insertAsset.depreciationMethod,
        usefulLife: insertAsset.usefulLife,
        assetAccountId: insertAsset.assetAccountId,
        accumulatedDepreciationAccountId: insertAsset.accumulatedDepreciationAccountId,
        depreciationExpenseAccountId: insertAsset.depreciationExpenseAccountId,
        salvageValue: insertAsset.salvageValue || "0",
        disposalDate: insertAsset.disposalDate,
        disposalAmount: insertAsset.disposalAmount
      })
      .returning();
    return asset;
  }

  async updateFixedAsset(id: number, assetData: Partial<FixedAsset>): Promise<FixedAsset | undefined> {
    const [asset] = await db
      .update(fixedAssets)
      .set(assetData)
      .where(eq(fixedAssets.id, id))
      .returning();
    return asset || undefined;
  }

  async generateTrialBalance(clientId: number, startDate?: Date, endDate?: Date): Promise<any> {
    // This is a more complex query that will need to aggregate data from journal entries
    // For now, return a simple implementation
    const accounts = await this.getAccounts(clientId);
    const result = [];
    
    for (const account of accounts) {
      const balance = await this.calculateAccountBalance(account.id, startDate, endDate);
      
      // Determine debit and credit columns based on balance
      let debit = 0;
      let credit = 0;
      
      if (balance > 0) {
        if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
          debit = balance;
        } else {
          credit = balance;
        }
      } else if (balance < 0) {
        if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
          credit = Math.abs(balance);
        } else {
          debit = Math.abs(balance);
        }
      }
      
      result.push({
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.name,
        debit,
        credit
      });
    }
    
    return result;
  }

  async generateBalanceSheet(clientId: number, asOfDate?: Date): Promise<any> {
    const assets = await this.getAccountsByType(clientId, AccountType.ASSET);
    const liabilities = await this.getAccountsByType(clientId, AccountType.LIABILITY);
    const equity = await this.getAccountsByType(clientId, AccountType.EQUITY);
    
    const assetItems = [];
    const liabilityItems = [];
    const equityItems = [];
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    
    // Calculate assets
    for (const account of assets) {
      const balance = await this.calculateAccountBalance(account.id, undefined, asOfDate);
      
      assetItems.push({
        accountId: account.id,
        accountName: account.name,
        accountCode: account.accountCode,
        balance
      });
      
      totalAssets += balance;
    }
    
    // Calculate liabilities
    for (const account of liabilities) {
      const balance = await this.calculateAccountBalance(account.id, undefined, asOfDate);
      
      liabilityItems.push({
        accountId: account.id,
        accountName: account.name,
        accountCode: account.accountCode,
        balance
      });
      
      totalLiabilities += balance;
    }
    
    // Calculate equity
    for (const account of equity) {
      const balance = await this.calculateAccountBalance(account.id, undefined, asOfDate);
      
      equityItems.push({
        accountId: account.id,
        accountName: account.name,
        accountCode: account.accountCode,
        balance
      });
      
      totalEquity += balance;
    }
    
    return {
      assets: assetItems,
      liabilities: liabilityItems,
      equity: equityItems,
      totalAssets,
      totalLiabilities,
      totalEquity,
      liabilitiesAndEquity: totalLiabilities + totalEquity
    };
  }

  async generateIncomeStatement(clientId: number, startDate?: Date, endDate?: Date): Promise<any> {
    const revenues = await this.getAccountsByType(clientId, AccountType.REVENUE);
    const expenses = await this.getAccountsByType(clientId, AccountType.EXPENSE);
    
    const revenueItems = [];
    const expenseItems = [];
    
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    // Calculate revenue
    for (const account of revenues) {
      const balance = await this.calculateAccountBalance(account.id, startDate, endDate);
      
      revenueItems.push({
        accountId: account.id,
        accountName: account.name,
        accountCode: account.accountCode,
        balance: Math.abs(balance) // Revenue is normally credited, so positive balance is negative
      });
      
      totalRevenue += Math.abs(balance);
    }
    
    // Calculate expenses
    for (const account of expenses) {
      const balance = await this.calculateAccountBalance(account.id, startDate, endDate);
      
      expenseItems.push({
        accountId: account.id,
        accountName: account.name,
        accountCode: account.accountCode,
        balance // Expenses are normally debited, so positive balance is positive
      });
      
      totalExpenses += balance;
    }
    
    const netIncome = totalRevenue - totalExpenses;
    
    return {
      revenue: revenueItems,
      expenses: expenseItems,
      totalRevenue,
      totalExpenses,
      netIncome
    };
  }

  async generateCashFlow(clientId: number, startDate?: Date, endDate?: Date): Promise<any> {
    // This is a complex calculation that requires categorizing activities
    // For now, return a simplified structure
    return {
      cashFlows: [
        {
          category: "Operating Activities",
          items: [],
          total: 0
        },
        {
          category: "Investing Activities",
          items: [],
          total: 0
        },
        {
          category: "Financing Activities",
          items: [],
          total: 0
        }
      ],
      netCashFlow: 0
    };
  }

  async getGeneralLedger(entityId: number, options?: GLOptions): Promise<GLEntry[]> {
    // Base query selecting from journal entry lines
    let query = db.select({
      id: journalEntryLines.id,
      date: journalEntries.date,
      journalId: journalEntries.reference,
      accountId: journalEntryLines.accountId,
      accountCode: accounts.accountCode,
      accountName: accounts.name,
      description: journalEntryLines.description,
      debit: journalEntryLines.debit,
      credit: journalEntryLines.credit,
      status: journalEntries.status
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
    .where(eq(journalEntries.entityId, entityId));
    
    // Apply filters based on options
    if (options) {
      if (options.accountId) {
        query = query.where(eq(journalEntryLines.accountId, options.accountId));
      }
      
      if (options.startDate) {
        query = query.where(gte(journalEntries.date, options.startDate));
      }
      
      if (options.endDate) {
        query = query.where(lte(journalEntries.date, options.endDate));
      }
      
      if (options.status) {
        query = query.where(eq(journalEntries.status, options.status));
      }
    }
    
    // Order by date and journal entry ID
    query = query.orderBy(journalEntries.date, journalEntries.id);
    
    // Execute query
    const results = await query;
    
    // Calculate running balance
    let balance = 0;
    const entries: GLEntry[] = [];
    
    for (const row of results) {
      // Calculate the impact on balance based on account type
      const account = await this.getAccount(row.accountId);
      if (!account) continue;
      
      const debitValue = parseFloat(row.debit as any) || 0;
      const creditValue = parseFloat(row.credit as any) || 0;
      
      // Update balance based on account type
      if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
        balance += debitValue - creditValue;
      } else {
        balance += creditValue - debitValue;
      }
      
      entries.push({
        ...row,
        balance
      } as GLEntry);
    }
    
    return entries;
  }

  // Helper method to calculate account balance
  private async calculateAccountBalance(accountId: number, startDate?: Date, endDate?: Date): Promise<number> {
    const account = await this.getAccount(accountId);
    if (!account) return 0;
    
    // Build a query to sum debits and credits for the account
    let query = db.select({
      totalDebit: sql<number>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
      totalCredit: sql<number>`COALESCE(SUM(${journalEntryLines.credit}), 0)`
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .where(and(
      eq(journalEntryLines.accountId, accountId),
      eq(journalEntries.status, JournalEntryStatus.POSTED)
    ));
    
    // Apply date filters if provided
    if (startDate) {
      query = query.where(gte(journalEntries.date, startDate));
    }
    
    if (endDate) {
      query = query.where(lte(journalEntries.date, endDate));
    }
    
    // Execute query
    const [result] = await query;
    
    if (!result) return 0;
    
    const { totalDebit, totalCredit } = result;
    
    // Calculate balance based on account type
    if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
      return totalDebit - totalCredit;
    } else {
      return totalCredit - totalDebit;
    }
  }

  // User Activity Tracking methods
  async logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog> {
    const [result] = await db.insert(userActivityLogs).values({
      userId: activity.userId,
      entityId: activity.entityId,
      action: activity.action,
      resourceType: activity.resourceType,
      resourceId: activity.resourceId,
      details: activity.details,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent
    }).returning();
    
    return result;
  }
  
  async getUserActivities(userId: number, limit: number = 100): Promise<UserActivityLog[]> {
    return await db.select()
      .from(userActivityLogs)
      .where(eq(userActivityLogs.userId, userId))
      .orderBy(desc(userActivityLogs.timestamp))
      .limit(limit);
  }
  
  async getUserActivitiesByEntity(entityId: number, limit: number = 100): Promise<UserActivityLog[]> {
    return await db.select()
      .from(userActivityLogs)
      .where(eq(userActivityLogs.entityId, entityId))
      .orderBy(desc(userActivityLogs.timestamp))
      .limit(limit);
  }
  
  async getUserActivitiesByResourceType(resourceType: string, limit: number = 100): Promise<UserActivityLog[]> {
    return await db.select()
      .from(userActivityLogs)
      .where(eq(userActivityLogs.resourceType, resourceType))
      .orderBy(desc(userActivityLogs.timestamp))
      .limit(limit);
  }
  
  // Feature Usage Analytics methods
  async recordFeatureUsage(usage: InsertFeatureUsage): Promise<FeatureUsage> {
    // Check if this feature has been used by this user before
    const [existingUsage] = await db.select()
      .from(featureUsage)
      .where(and(
        eq(featureUsage.userId, usage.userId),
        eq(featureUsage.featureName, usage.featureName)
      ));
    
    if (existingUsage) {
      // Update existing usage record
      const [updatedUsage] = await db.update(featureUsage)
        .set({
          usageCount: Number(existingUsage.usageCount) + 1,
          lastUsed: new Date(),
          useTime: usage.useTime,
          successful: usage.successful
        })
        .where(eq(featureUsage.id, existingUsage.id))
        .returning();
      
      return updatedUsage;
    } else {
      // Create new usage record
      const [newUsage] = await db.insert(featureUsage)
        .values({
          userId: usage.userId,
          entityId: usage.entityId,
          featureName: usage.featureName,
          usageCount: 1,
          useTime: usage.useTime,
          successful: usage.successful !== undefined ? usage.successful : true
        })
        .returning();
      
      return newUsage;
    }
  }
  
  async updateFeatureUsage(id: number, data: Partial<FeatureUsage>): Promise<FeatureUsage | undefined> {
    const [updatedUsage] = await db.update(featureUsage)
      .set(data)
      .where(eq(featureUsage.id, id))
      .returning();
    
    return updatedUsage;
  }
  
  async getFeatureUsage(userId: number, featureName: string): Promise<FeatureUsage | undefined> {
    const [usage] = await db.select()
      .from(featureUsage)
      .where(and(
        eq(featureUsage.userId, userId),
        eq(featureUsage.featureName, featureName)
      ));
    
    return usage;
  }
  
  async getFeatureUsageStats(featureName: string): Promise<{
    totalUsageCount: number,
    uniqueUsers: number,
    avgUseTime?: number
  }> {
    const [stats] = await db.select({
      totalUsageCount: sum(featureUsage.usageCount),
      uniqueUsers: count(featureUsage.userId, { distinct: true })
    })
    .from(featureUsage)
    .where(eq(featureUsage.featureName, featureName));
    
    const [timeStats] = await db.select({
      avgUseTime: sql`AVG(${featureUsage.useTime})`
    })
    .from(featureUsage)
    .where(and(
      eq(featureUsage.featureName, featureName),
      not(isNull(featureUsage.useTime))
    ));
    
    return {
      totalUsageCount: Number(stats.totalUsageCount) || 0,
      uniqueUsers: Number(stats.uniqueUsers) || 0,
      avgUseTime: timeStats?.avgUseTime ? Number(timeStats.avgUseTime) : undefined
    };
  }
  
  // Industry Benchmark methods
  async addIndustryBenchmark(benchmark: InsertIndustryBenchmark): Promise<IndustryBenchmark> {
    const [result] = await db.insert(industryBenchmarks)
      .values({
        industry: benchmark.industry,
        subIndustry: benchmark.subIndustry,
        metricName: benchmark.metricName,
        metricValue: benchmark.metricValue,
        entitySizeRange: benchmark.entitySizeRange,
        year: benchmark.year,
        quarter: benchmark.quarter,
        dataSource: benchmark.dataSource,
        confidenceLevel: benchmark.confidenceLevel,
        sampleSize: benchmark.sampleSize
      })
      .returning();
    
    return result;
  }
  
  async getIndustryBenchmarks(industry: string, year: number): Promise<IndustryBenchmark[]> {
    return await db.select()
      .from(industryBenchmarks)
      .where(and(
        eq(industryBenchmarks.industry, industry),
        eq(industryBenchmarks.year, year)
      ));
  }
  
  async getBenchmarksByMetric(metricName: string): Promise<IndustryBenchmark[]> {
    return await db.select()
      .from(industryBenchmarks)
      .where(eq(industryBenchmarks.metricName, metricName))
      .orderBy(desc(industryBenchmarks.year), desc(industryBenchmarks.quarter || 0));
  }
  
  async getIndustryComparison(entityId: number, metricNames: string[]): Promise<any> {
    // Get entity details to determine industry
    const entity = await this.getEntity(entityId);
    if (!entity || !entity.industry) {
      return { 
        entityMetrics: [],
        industryBenchmarks: [],
        comparison: {}
      };
    }
    
    // Get industry benchmarks for the requested metrics
    const benchmarks = await Promise.all(
      metricNames.map(metricName => 
        db.select()
          .from(industryBenchmarks)
          .where(and(
            eq(industryBenchmarks.industry, entity.industry as string),
            eq(industryBenchmarks.metricName, metricName)
          ))
          .orderBy(desc(industryBenchmarks.year), desc(industryBenchmarks.quarter || 0))
          .limit(1)
      )
    );
    
    // Process the benchmarks for the comparison
    const comparison = metricNames.reduce((result, metricName, index) => {
      const benchmark = benchmarks[index][0];
      if (benchmark) {
        result[metricName] = {
          entityValue: null, // Would need to calculate this based on entity data
          benchmarkValue: benchmark.metricValue,
          difference: null // Would calculate this once entity value is determined
        };
      }
      return result;
    }, {} as Record<string, any>);
    
    return {
      entityMetrics: [], // Would contain entity-specific metric values
      industryBenchmarks: benchmarks.flatMap(b => b),
      comparison
    };
  }
  
  // Data Consent methods
  async recordDataConsent(consent: InsertDataConsent): Promise<DataConsent> {
    const [result] = await db.insert(dataConsent)
      .values({
        userId: consent.userId,
        entityId: consent.entityId,
        consentType: consent.consentType,
        granted: consent.granted,
        grantedAt: consent.granted ? new Date() : null,
        revokedAt: !consent.granted ? new Date() : null,
        consentVersion: consent.consentVersion,
        ipAddress: consent.ipAddress
      })
      .returning();
    
    return result;
  }
  
  async getUserConsent(userId: number, consentType: string): Promise<DataConsent | undefined> {
    const [consent] = await db.select()
      .from(dataConsent)
      .where(and(
        eq(dataConsent.userId, userId),
        eq(dataConsent.consentType, consentType)
      ))
      .orderBy(desc(dataConsent.lastUpdated))
      .limit(1);
    
    return consent;
  }
  
  async updateUserConsent(id: number, granted: boolean): Promise<DataConsent | undefined> {
    const updateData: any = {
      granted,
      lastUpdated: new Date()
    };
    
    if (granted) {
      updateData.grantedAt = new Date();
      updateData.revokedAt = null;
    } else {
      updateData.revokedAt = new Date();
    }
    
    const [updatedConsent] = await db.update(dataConsent)
      .set(updateData)
      .where(eq(dataConsent.id, id))
      .returning();
    
    return updatedConsent;
  }
  
  async hasUserConsented(userId: number, consentType: string): Promise<boolean> {
    const consent = await this.getUserConsent(userId, consentType);
    return !!consent && consent.granted;
  }
  
  // User Activity Tracking methods
  async logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog> {
    const [result] = await db.insert(userActivityLogs).values({
      userId: activity.userId,
      entityId: activity.entityId,
      action: activity.action,
      resourceType: activity.resourceType,
      resourceId: activity.resourceId,
      details: activity.details,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent
    }).returning();
    
    return result;
  }
  
  async getUserActivities(userId: number, limit: number = 100): Promise<UserActivityLog[]> {
    return await db.select()
      .from(userActivityLogs)
      .where(eq(userActivityLogs.userId, userId))
      .orderBy(desc(userActivityLogs.timestamp))
      .limit(limit);
  }
  
  async getUserActivitiesByEntity(entityId: number, limit: number = 100): Promise<UserActivityLog[]> {
    return await db.select()
      .from(userActivityLogs)
      .where(eq(userActivityLogs.entityId, entityId))
      .orderBy(desc(userActivityLogs.timestamp))
      .limit(limit);
  }
  
  async getUserActivitiesByResourceType(resourceType: string, limit: number = 100): Promise<UserActivityLog[]> {
    return await db.select()
      .from(userActivityLogs)
      .where(eq(userActivityLogs.resourceType, resourceType))
      .orderBy(desc(userActivityLogs.timestamp))
      .limit(limit);
  }
  
  // Feature Usage Analytics methods
  async recordFeatureUsage(usage: InsertFeatureUsage): Promise<FeatureUsage> {
    // Check if this feature has been used by this user before
    const [existingUsage] = await db.select()
      .from(featureUsage)
      .where(and(
        eq(featureUsage.userId, usage.userId),
        eq(featureUsage.featureName, usage.featureName)
      ));
    
    if (existingUsage) {
      // Update existing usage record
      const [updatedUsage] = await db.update(featureUsage)
        .set({
          usageCount: Number(existingUsage.usageCount) + 1,
          lastUsed: new Date(),
          useTime: usage.useTime,
          successful: usage.successful
        })
        .where(eq(featureUsage.id, existingUsage.id))
        .returning();
      
      return updatedUsage;
    } else {
      // Create new usage record
      const [newUsage] = await db.insert(featureUsage)
        .values({
          userId: usage.userId,
          entityId: usage.entityId,
          featureName: usage.featureName,
          usageCount: 1,
          useTime: usage.useTime,
          successful: usage.successful !== undefined ? usage.successful : true
        })
        .returning();
      
      return newUsage;
    }
  }
  
  async updateFeatureUsage(id: number, data: Partial<FeatureUsage>): Promise<FeatureUsage | undefined> {
    const [updatedUsage] = await db.update(featureUsage)
      .set(data)
      .where(eq(featureUsage.id, id))
      .returning();
    
    return updatedUsage;
  }
  
  async getFeatureUsage(userId: number, featureName: string): Promise<FeatureUsage | undefined> {
    const [usage] = await db.select()
      .from(featureUsage)
      .where(and(
        eq(featureUsage.userId, userId),
        eq(featureUsage.featureName, featureName)
      ));
    
    return usage;
  }
  
  async getFeatureUsageStats(featureName: string): Promise<{
    totalUsageCount: number,
    uniqueUsers: number,
    avgUseTime?: number
  }> {
    const [stats] = await db.select({
      totalUsageCount: sum(featureUsage.usageCount),
      uniqueUsers: count(featureUsage.userId, { distinct: true })
    })
    .from(featureUsage)
    .where(eq(featureUsage.featureName, featureName));
    
    const [timeStats] = await db.select({
      avgUseTime: sql`AVG(${featureUsage.useTime})`
    })
    .from(featureUsage)
    .where(and(
      eq(featureUsage.featureName, featureName),
      not(isNull(featureUsage.useTime))
    ));
    
    return {
      totalUsageCount: Number(stats?.totalUsageCount) || 0,
      uniqueUsers: Number(stats?.uniqueUsers) || 0,
      avgUseTime: timeStats?.avgUseTime ? Number(timeStats.avgUseTime) : undefined
    };
  }
  
  // Industry Benchmark methods
  async addIndustryBenchmark(benchmark: InsertIndustryBenchmark): Promise<IndustryBenchmark> {
    const [result] = await db.insert(industryBenchmarks)
      .values({
        industry: benchmark.industry,
        subIndustry: benchmark.subIndustry,
        metricName: benchmark.metricName,
        metricValue: benchmark.metricValue,
        entitySizeRange: benchmark.entitySizeRange,
        year: benchmark.year,
        quarter: benchmark.quarter,
        dataSource: benchmark.dataSource,
        confidenceLevel: benchmark.confidenceLevel,
        sampleSize: benchmark.sampleSize
      })
      .returning();
    
    return result;
  }
  
  async getIndustryBenchmarks(industry: string, year: number): Promise<IndustryBenchmark[]> {
    return await db.select()
      .from(industryBenchmarks)
      .where(and(
        eq(industryBenchmarks.industry, industry),
        eq(industryBenchmarks.year, year)
      ));
  }
  
  async getBenchmarksByMetric(metricName: string): Promise<IndustryBenchmark[]> {
    return await db.select()
      .from(industryBenchmarks)
      .where(eq(industryBenchmarks.metricName, metricName))
      .orderBy(desc(industryBenchmarks.year), desc(industryBenchmarks.quarter || 0));
  }
  
  async getIndustryComparison(entityId: number, metricNames: string[]): Promise<any> {
    // Get entity details to determine industry
    const entity = await this.getEntity(entityId);
    if (!entity || !entity.industry) {
      return { 
        entityMetrics: [],
        industryBenchmarks: [],
        comparison: {}
      };
    }
    
    // Get industry benchmarks for the requested metrics
    const benchmarks = await Promise.all(
      metricNames.map(metricName => 
        db.select()
          .from(industryBenchmarks)
          .where(and(
            eq(industryBenchmarks.industry, entity.industry as string),
            eq(industryBenchmarks.metricName, metricName)
          ))
          .orderBy(desc(industryBenchmarks.year), desc(industryBenchmarks.quarter || 0))
          .limit(1)
      )
    );
    
    // Process the benchmarks for the comparison
    const comparison = metricNames.reduce((result, metricName, index) => {
      const benchmark = benchmarks[index][0];
      if (benchmark) {
        result[metricName] = {
          entityValue: null, // Would need to calculate this based on entity data
          benchmarkValue: benchmark.metricValue,
          difference: null // Would calculate this once entity value is determined
        };
      }
      return result;
    }, {} as Record<string, any>);
    
    return {
      entityMetrics: [], // Would contain entity-specific metric values
      industryBenchmarks: benchmarks.flatMap(b => b),
      comparison
    };
  }
  
  // Data Consent methods
  async recordDataConsent(consent: InsertDataConsent): Promise<DataConsent> {
    const [result] = await db.insert(dataConsent)
      .values({
        userId: consent.userId,
        entityId: consent.entityId,
        consentType: consent.consentType,
        granted: consent.granted,
        grantedAt: consent.granted ? new Date() : null,
        revokedAt: !consent.granted ? new Date() : null,
        consentVersion: consent.consentVersion,
        ipAddress: consent.ipAddress
      })
      .returning();
    
    return result;
  }
  
  async getUserConsent(userId: number, consentType: string): Promise<DataConsent | undefined> {
    const [consent] = await db.select()
      .from(dataConsent)
      .where(and(
        eq(dataConsent.userId, userId),
        eq(dataConsent.consentType, consentType)
      ))
      .orderBy(desc(dataConsent.lastUpdated))
      .limit(1);
    
    return consent;
  }
  
  async updateUserConsent(id: number, granted: boolean): Promise<DataConsent | undefined> {
    const updateData: any = {
      granted,
      lastUpdated: new Date()
    };
    
    if (granted) {
      updateData.grantedAt = new Date();
      updateData.revokedAt = null;
    } else {
      updateData.revokedAt = new Date();
    }
    
    const [updatedConsent] = await db.update(dataConsent)
      .set(updateData)
      .where(eq(dataConsent.id, id))
      .returning();
    
    return updatedConsent;
  }

  // Form Submission methods
  
  // Contact Form submissions
  async createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission> {
    const [result] = await db.insert(contactSubmissions)
      .values({
        name: submission.name,
        email: submission.email,
        phone: submission.phone,
        message: submission.message,
        ipAddress: submission.ipAddress,
        userAgent: submission.userAgent,
        status: submission.status || 'unread'
      })
      .returning();
    
    return result;
  }

  async getContactSubmissions(limit: number = 100, offset: number = 0): Promise<ContactSubmission[]> {
    const results = await db.select()
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
    
    return results;
  }

  async getContactSubmissionById(id: number): Promise<ContactSubmission | undefined> {
    const [result] = await db.select()
      .from(contactSubmissions)
      .where(eq(contactSubmissions.id, id))
      .limit(1);
    
    return result;
  }

  async updateContactSubmission(id: number, status: string): Promise<ContactSubmission | undefined> {
    const [result] = await db.update(contactSubmissions)
      .set({
        status: status,
        updatedAt: new Date()
      })
      .where(eq(contactSubmissions.id, id))
      .returning();
    
    return result;
  }

  // Checklist Form submissions
  async createChecklistSubmission(submission: InsertChecklistSubmission): Promise<ChecklistSubmission> {
    const [result] = await db.insert(checklistSubmissions)
      .values({
        name: submission.name,
        email: submission.email,
        company: submission.company,
        revenueRange: submission.revenueRange,
        ipAddress: submission.ipAddress,
        userAgent: submission.userAgent,
        status: submission.status || 'unread'
      })
      .returning();
    
    return result;
  }

  async getChecklistSubmissions(limit: number = 100, offset: number = 0): Promise<ChecklistSubmission[]> {
    const results = await db.select()
      .from(checklistSubmissions)
      .orderBy(desc(checklistSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
    
    return results;
  }

  async getChecklistSubmissionById(id: number): Promise<ChecklistSubmission | undefined> {
    const [result] = await db.select()
      .from(checklistSubmissions)
      .where(eq(checklistSubmissions.id, id))
      .limit(1);
    
    return result;
  }

  async updateChecklistSubmission(id: number, status: string): Promise<ChecklistSubmission | undefined> {
    const [result] = await db.update(checklistSubmissions)
      .set({
        status: status,
        updatedAt: new Date()
      })
      .where(eq(checklistSubmissions.id, id))
      .returning();
    
    return result;
  }

  // Consultation Form submissions
  async createConsultationSubmission(submission: InsertConsultationSubmission): Promise<ConsultationSubmission> {
    const [result] = await db.insert(consultationSubmissions)
      .values({
        firstName: submission.firstName,
        lastName: submission.lastName,
        email: submission.email,
        phone: submission.phone,
        companyName: submission.companyName,
        industry: submission.industry,
        companySize: submission.companySize,
        annualRevenue: submission.annualRevenue,
        preferredContact: submission.preferredContact,
        message: submission.message,
        services: submission.services,
        ipAddress: submission.ipAddress,
        userAgent: submission.userAgent,
        status: submission.status || 'unread'
      })
      .returning();
    
    return result;
  }

  async getConsultationSubmissions(limit: number = 100, offset: number = 0): Promise<ConsultationSubmission[]> {
    const results = await db.select()
      .from(consultationSubmissions)
      .orderBy(desc(consultationSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
    
    return results;
  }

  async getConsultationSubmissionById(id: number): Promise<ConsultationSubmission | undefined> {
    const [result] = await db.select()
      .from(consultationSubmissions)
      .where(eq(consultationSubmissions.id, id))
      .limit(1);
    
    return result;
  }

  async updateConsultationSubmission(id: number, status: string): Promise<ConsultationSubmission | undefined> {
    const [result] = await db.update(consultationSubmissions)
      .set({
        status: status,
        updatedAt: new Date()
      })
      .where(eq(consultationSubmissions.id, id))
      .returning();
    
    return result;
  }

  // Blog subscriber methods
  async createBlogSubscriber(subscriber: InsertBlogSubscriber): Promise<BlogSubscriber> {
    const [result] = await db
      .insert(blogSubscribers)
      .values({
        email: subscriber.email,
        name: subscriber.name || null,
        ipAddress: subscriber.ipAddress || null,
        userAgent: subscriber.userAgent || null,
        active: true
      })
      .returning();
    
    return result;
  }

  async getBlogSubscribers(includeInactive: boolean = false): Promise<BlogSubscriber[]> {
    const query = includeInactive 
      ? db.select().from(blogSubscribers)
      : db.select().from(blogSubscribers).where(eq(blogSubscribers.active, true));
    
    return await query;
  }

  async getBlogSubscriberByEmail(email: string): Promise<BlogSubscriber | undefined> {
    const [result] = await db
      .select()
      .from(blogSubscribers)
      .where(eq(blogSubscribers.email, email));
    
    return result;
  }

  async updateBlogSubscriber(id: number, data: Partial<BlogSubscriber>): Promise<BlogSubscriber | undefined> {
    const [updatedSubscriber] = await db
      .update(blogSubscribers)
      .set(data)
      .where(eq(blogSubscribers.id, id))
      .returning();
    
    return updatedSubscriber;
  }

  async deleteBlogSubscriber(id: number): Promise<void> {
    await db
      .delete(blogSubscribers)
      .where(eq(blogSubscribers.id, id));
  }
  
  // Location methods
  async createLocation(location: InsertLocation): Promise<Location> {
    const [result] = await db
      .insert(locations)
      .values({
        clientId: location.clientId,
        name: location.name,
        code: location.code || null,
        description: location.description || null,
        isActive: location.isActive !== undefined ? location.isActive : true
      })
      .returning();
    
    return result;
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [result] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id));
    
    return result;
  }

  async listLocationsByClient(clientId: number): Promise<Location[]> {
    return await db
      .select()
      .from(locations)
      .where(and(
        eq(locations.clientId, clientId),
        eq(locations.isActive, true)
      ));
  }

  async updateLocation(id: number, data: Partial<Location>): Promise<Location | undefined> {
    const [updatedLocation] = await db
      .update(locations)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(locations.id, id))
      .returning();
    
    return updatedLocation;
  }

  async setLocationActiveStatus(id: number, isActive: boolean): Promise<boolean> {
    const [result] = await db
      .update(locations)
      .set({
        isActive: isActive,
        updatedAt: new Date()
      })
      .where(eq(locations.id, id))
      .returning();
    
    return !!result;
  }

  // Checklist Files methods
  async createChecklistFile(fileData: any): Promise<any> {
    const buffer = fileData.fileData;
    delete fileData.fileData;

    const [result] = await db.insert(checklistFiles)
      .values({
        filename: fileData.filename,
        originalFilename: fileData.originalFilename, // This maps to original_filename in the database
        mimeType: fileData.mimeType,
        size: fileData.size,
        path: fileData.path,
        isActive: fileData.isActive ?? false,
        uploadedBy: fileData.uploadedBy
      })
      .returning();

    if (result) {
      // Execute a raw SQL query to update the BYTEA column 'file_data'
      await db.execute(
        sql`UPDATE checklist_files SET file_data = ${buffer} WHERE id = ${result.id}`
      );

      // Retrieve the file again with the binary data
      const fileRow = await db.execute(
        sql`SELECT id, filename, original_filename as "originalFilename", mime_type as "mimeType", size, path, is_active as "isActive", uploaded_by as "uploadedBy", 
            created_at as "createdAt", file_data as "fileData" 
            FROM checklist_files WHERE id = ${result.id}`
      );

      if (fileRow && fileRow.rows && fileRow.rows.length > 0) {
        return fileRow.rows[0];
      }
    }
    
    return result;
  }

  async getChecklistFiles(): Promise<any[]> {
    // Don't fetch the binary data in the listing
    const results = await db.select({
      id: checklistFiles.id,
      filename: checklistFiles.filename,
      originalFilename: checklistFiles.originalFilename,
      mimeType: checklistFiles.mimeType,
      size: checklistFiles.size,
      path: checklistFiles.path,
      isActive: checklistFiles.isActive,
      uploadedBy: checklistFiles.uploadedBy,
      createdAt: checklistFiles.createdAt,
      updatedAt: checklistFiles.updatedAt
    })
    .from(checklistFiles)
    .orderBy(desc(checklistFiles.createdAt));
    
    return results;
  }

  async getActiveChecklistFile(): Promise<any | undefined> {
    // Include binary data for the active file
    const fileRow = await db.execute(
      sql`SELECT id, filename, original_filename as "originalFilename", mime_type as "mimeType", size, path, is_active as "isActive", uploaded_by as "uploadedBy", 
          created_at as "createdAt", file_data as "fileData" 
          FROM checklist_files WHERE is_active = true LIMIT 1`
    );
    
    if (fileRow && fileRow.rows && fileRow.rows.length > 0) {
      return fileRow.rows[0];
    }
    
    return undefined;
  }

  async getChecklistFileById(id: number): Promise<any | undefined> {
    // Include binary data for specific file
    const fileRow = await db.execute(
      sql`SELECT id, filename, original_filename as "originalFilename", mime_type as "mimeType", size, path, is_active as "isActive", uploaded_by as "uploadedBy", 
          created_at as "createdAt", file_data as "fileData" 
          FROM checklist_files WHERE id = ${id} LIMIT 1`
    );
    
    if (fileRow && fileRow.rows && fileRow.rows.length > 0) {
      return fileRow.rows[0];
    }
    
    return undefined;
  }

  async updateChecklistFile(id: number, isActive: boolean): Promise<any | undefined> {
    // If marking as active, deactivate all other files
    if (isActive) {
      await db.update(checklistFiles)
        .set({ isActive: false })
        .where(ne(checklistFiles.id, id));
    }
    
    const [result] = await db.update(checklistFiles)
      .set({
        isActive: isActive,
        updatedAt: new Date()
      })
      .where(eq(checklistFiles.id, id))
      .returning();
    
    return result;
  }

  async deleteChecklistFile(id: number): Promise<void> {
    await db.delete(checklistFiles)
      .where(eq(checklistFiles.id, id));
  }

  // -------------------------------------------------------------------------
  // Delegated methods - these methods call their corresponding specialized storage modules
  // -------------------------------------------------------------------------
  
  // Account methods delegation
  async getAccount(id: number): Promise<Account | undefined> {
    return accountStorage.getAccount(id);
  }
  
  async getAccounts(clientId: number): Promise<Account[]> {
    return accountStorage.getAccounts(clientId);
  }
  
  async getAccountsByType(clientId: number, type: AccountType): Promise<Account[]> {
    return accountStorage.getAccountsByType(clientId, type);
  }
  
  async createAccount(account: InsertAccount): Promise<Account> {
    return accountStorage.createAccount(account);
  }
  
  async updateAccount(id: number, account: Partial<Account>): Promise<Account | undefined> {
    return accountStorage.updateAccount(id, account);
  }
  
  async deleteAccount(id: number): Promise<void> {
    return accountStorage.deleteAccount(id);
  }
  
  async getAccountsTree(clientId: number): Promise<AccountTreeNode[]> {
    return accountStorage.getAccountsTree(clientId);
  }

  async seedClientCoA(clientId: number): Promise<void> {
    // Delegate to the accounts storage module via the accounts property
    console.log(`DEBUG: DatabaseStorage delegating seedClientCoA for client ${clientId} to this.accounts`);
    return this.accounts.seedClientCoA(clientId);
  }

  async getAccountsForClient(clientId: number): Promise<Account[]> {
    // Delegate to the accounts storage module via the accounts property
    console.log(`DEBUG: DatabaseStorage delegating getAccountsForClient for client ${clientId} to this.accounts.getAccountsByClientId`);
    return this.accounts.getAccountsByClientId(clientId);
  }

  async generateCoaImportPreview(clientId: number, fileBuffer: Buffer, fileName: string): Promise<ImportPreview> {
    // Delegate to the accounts storage module via the accounts property
    console.log(`DEBUG: DatabaseStorage delegating generateCoaImportPreview for client ${clientId} to this.accounts`);
    return this.accounts.generateCoaImportPreview(clientId, fileBuffer, fileName);
  }

  async importCoaForClient(clientId: number, fileBuffer: Buffer, fileName: string, selections?: ImportSelections | null): Promise<ImportResult> {
    // Delegate to the accounts storage module via the accounts property
    console.log(`DEBUG: DatabaseStorage delegating importCoaForClient for client ${clientId} to this.accounts`);
    return this.accounts.importCoaForClient(clientId, fileBuffer, fileName, selections);
  }
  
  // Journal Entry methods delegation
  async getJournalEntry(id: number): Promise<any> {
    return journalEntryStorage.getJournalEntry(id);
  }
  
  async getJournalEntries(entityId: number, options?: any): Promise<any[]> {
    return journalEntryStorage.getJournalEntries(entityId, options);
  }
  
  async listJournalEntries(entityId: number, filters?: any): Promise<any[]> {
    return journalEntryStorage.listJournalEntries(entityId, filters);
  }
  
  async getJournalEntriesByStatus(entityId: number, status: JournalEntryStatus): Promise<any[]> {
    return journalEntryStorage.getJournalEntriesByStatus(entityId, status);
  }
  
  async createJournalEntry(journalEntry: any): Promise<any> {
    return journalEntryStorage.createJournalEntry(journalEntry);
  }
  
  async updateJournalEntry(id: number, updates: any): Promise<any> {
    return journalEntryStorage.updateJournalEntry(id, updates);
  }
  
  async createBatchJournalEntries(entries: any[]): Promise<any[]> {
    return journalEntryStorage.createBatchJournalEntries(entries);
  }
  
  async getJournalEntryLines(journalEntryId: number): Promise<any[]> {
    return journalEntryStorage.getJournalEntryLines(journalEntryId);
  }
  
  async createJournalEntryLine(line: any): Promise<any> {
    return journalEntryStorage.createJournalEntryLine(line);
  }
  
  async addJournalEntryLine(journalEntryId: number, line: any): Promise<any> {
    return journalEntryStorage.addJournalEntryLine(journalEntryId, line);
  }
  
  async updateJournalEntryLine(id: number, updates: any): Promise<any> {
    return journalEntryStorage.updateJournalEntryLine(id, updates);
  }
  
  async deleteJournalEntryLine(id: number): Promise<void> {
    return journalEntryStorage.deleteJournalEntryLine(id);
  }
  
  async reverseJournalEntry(id: number, reversalDate: Date, description?: string): Promise<any> {
    return journalEntryStorage.reverseJournalEntry(id, reversalDate, description);
  }
  
  async deleteJournalEntry(id: number): Promise<void> {
    return journalEntryStorage.deleteJournalEntry(id);
  }
  
  async getJournalEntryFiles(journalEntryId: number): Promise<any[]> {
    return journalEntryStorage.getJournalEntryFiles(journalEntryId);
  }
  
  async createJournalEntryFile(journalEntryId: number, file: any): Promise<any> {
    return journalEntryStorage.createJournalEntryFile(journalEntryId, file);
  }
  
  async validateJournalEntryBalance(id: number): Promise<boolean> {
    return journalEntryStorage.validateJournalEntryBalance(id);
  }
  
  async validateAccountIds(accountIds: number[], clientId: number): Promise<boolean> {
    return journalEntryStorage.validateAccountIds(accountIds, clientId);
  }
  
  // Client methods delegation
  async getClient(id: number): Promise<Client | undefined> {
    return clientStorage.getClient(id);
  }
  
  async getClients(): Promise<Client[]> {
    return clientStorage.getClients();
  }
  
  async getClientsByUserId(userId: number): Promise<Client[]> {
    return clientStorage.getClientsByUserId(userId);
  }
  
  async createClient(client: any): Promise<Client> {
    return clientStorage.createClient(client);
  }
  
  async updateClient(id: number, client: Partial<Client>): Promise<Client | undefined> {
    return clientStorage.updateClient(id, client);
  }
  
  // Entity methods delegation
  async getEntity(id: number): Promise<Entity | undefined> {
    return entityStorage.getEntity(id);
  }
  
  async getEntities(): Promise<Entity[]> {
    return entityStorage.getEntities();
  }
  
  async getEntitiesByUser(userId: number): Promise<Entity[]> {
    return entityStorage.getEntitiesByUser(userId);
  }
  
  async getEntitiesByClient(clientId: number): Promise<Entity[]> {
    return entityStorage.getEntitiesByClient(clientId);
  }
  
  async createEntity(entity: any): Promise<Entity> {
    return entityStorage.createEntity(entity);
  }
  
  async updateEntity(id: number, entity: Partial<Entity>): Promise<Entity | undefined> {
    return entityStorage.updateEntity(id, entity);
  }
  
  // User methods delegation
  async getUser(id: number): Promise<any> {
    return userStorage.getUser(id);
  }
  
  async getUserByUsername(username: string): Promise<any> {
    return userStorage.getUserByUsername(username);
  }
  
  async getUsers(): Promise<any[]> {
    return userStorage.getUsers();
  }
  
  async createUser(user: any): Promise<any> {
    return userStorage.createUser(user);
  }
  
  async updateUser(id: number, updates: any): Promise<any> {
    return userStorage.updateUser(id, updates);
  }
  
  // User Entity Access methods delegation
  async getUserEntityAccess(userId: number, entityId: number): Promise<any> {
    return userStorage.getUserEntityAccess(userId, entityId);
  }
  
  async grantUserEntityAccess(userId: number, entityId: number, accessLevel: string): Promise<any> {
    return userStorage.grantUserEntityAccess(userId, entityId, accessLevel);
  }
  
  async getUserEntityAccessList(userId: number): Promise<any[]> {
    return userStorage.getUserEntityAccessList(userId);
  }
  
  // User Activity Tracking methods delegation
  async logUserActivity(activity: any): Promise<any> {
    return userStorage.logUserActivity(activity);
  }
  
  async getUserActivitiesByEntity(entityId: number, limit?: number): Promise<any[]> {
    return userStorage.getUserActivitiesByEntity(entityId, limit);
  }
  
  async getUserActivitiesByResourceType(resourceType: string, limit?: number): Promise<any[]> {
    return userStorage.getUserActivitiesByResourceType(resourceType, limit);
  }
  
  // Journal methods delegation
  async getJournal(id: number): Promise<any | undefined> {
    return journalEntryStorage.getJournal(id);
  }
  
  async getJournals(entityId: number): Promise<any[]> {
    return journalEntryStorage.getJournals(entityId);
  }
  
  async getJournalsByType(entityId: number, type: any): Promise<any[]> {
    return journalEntryStorage.getJournalsByType(entityId, type);
  }
  
  async createJournal(journal: any): Promise<any> {
    return journalEntryStorage.createJournal(journal);
  }
  
  async updateJournal(id: number, journal: Partial<any>): Promise<any | undefined> {
    return journalEntryStorage.updateJournal(id, journal);
  }
  
  async deleteJournal(id: number): Promise<void> {
    return journalEntryStorage.deleteJournal(id);
  }
  
  // Consolidation Group methods delegation
  // All consolidation-related methods have been moved to the consolidationStorage module
}

// Storage is initialized in index.ts, not here
