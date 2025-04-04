/**
 * Storage Module
 * 
 * Main storage interface and implementation that delegates to specialized 
 * storage modules for different parts of the application.
 */
import { ApiError } from "./errorHandling";
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
    // Need to get the clientId from accountData or the existing account
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
    
    return this.accounts.updateAccount(id, clientId, accountData);
  }
  
  async deleteAccount(id: number): Promise<void> {
    // Delegate to the accounts storage module via the accounts property
    console.log(`DEBUG: DatabaseStorage delegating deleteAccount for account ${id} to this.accounts`);
    
    // Need to get the clientId from the existing account
    const account = await this.getAccount(id);
    if (!account) {
      throw new ApiError(404, `Account with ID ${id} not found.`);
    }
    
    const result = await this.accounts.deleteAccount(id, account.clientId);
    if (!result) {
      throw new ApiError(500, `Failed to delete account with ID ${id}.`);
    }
  }
  
  async getAccountsTree(clientId: number): Promise<AccountTreeNode[]> {
    return this.accounts.getAccountsTree(clientId);
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
  
  async markAccountInactive(id: number, clientId: number): Promise<Account | undefined> {
    // Delegate to the accounts storage module via the accounts property
    console.log(`DEBUG: DatabaseStorage delegating markAccountInactive for account ${id}, client ${clientId} to this.accounts`);
    return this.accounts.markAccountInactive(id, clientId);
  }
  
  async accountHasTransactions(id: number): Promise<boolean> {
    // Delegate to the accounts storage module via the accounts property
    console.log(`DEBUG: DatabaseStorage delegating accountHasTransactions for account ${id} to this.accounts`);
    return this.accounts.accountHasTransactions(id);
  }
  
  // Chart of Accounts Seeding
  async seedClientCoA(clientId: number): Promise<void> {
    // Delegate to the accounts storage module via the accounts property
    console.log(`DEBUG: DatabaseStorage delegating seedClientCoA for client ${clientId} to this.accounts`);
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
    // Delegated to the accounts storage module via the accounts property
    console.log(`DEBUG: MemStorage delegating getAccount for account ${id} to this.accounts`);
    return this.accounts.getAccount(id);
  }

  async getAccounts(clientId: number): Promise<Account[]> {
    // Delegated to the accounts storage module via the accounts property
    console.log(`DEBUG: MemStorage delegating getAccounts for client ${clientId} to this.accounts`);
    return this.accounts.getAccounts(clientId);
  }

  async getAccountsByType(clientId: number, type: AccountType): Promise<Account[]> {
    // Delegated to the accounts storage module via the accounts property
    console.log(`DEBUG: MemStorage delegating getAccountsByType for client ${clientId}, type ${type} to this.accounts`);
    return this.accounts.getAccountsByType(clientId, type);
  }
  
  async getAccountsTree(clientId: number): Promise<AccountTreeNode[]> {
    // Delegated to the accounts storage module via the accounts property
    console.log(`DEBUG: MemStorage delegating getAccountsTree for client ${clientId} to this.accounts`);
    return this.accounts.getAccountsTree(clientId);
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
  }
  
  /* Original generateCoaImportPreview implementation has been completely removed and delegated to accountStorage */
  
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
   * - importCoaForClient
   * - generateCoaImportPreview
   * These methods are properly delegated in the MemStorage class
   */
        
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
  

  

  

  
  // getParentCode has been moved to accountStorage.ts
  // This method is no longer needed in DatabaseStorage
  
  // parseIsActive has been moved to accountStorage.ts
  // This method is no longer needed in DatabaseStorage
  
  // normalizeAccountType has been moved to accountStorage.ts
  // This method is no longer needed in DatabaseStorage
  
  // parseIsSubledger has been moved to accountStorage.ts
  // This method is no longer needed in DatabaseStorage
  
  // getSubledgerType has been moved to accountStorage.ts
  // This method is no longer needed in DatabaseStorage

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    // Delegate to the accounts storage module via the accounts property
    console.log(`DEBUG: MemStorage delegating createAccount to this.accounts`);
    return this.accounts.createAccount(insertAccount);
  }

  async updateAccount(id: number, accountData: Partial<Account>): Promise<Account | undefined> {
    // Delegate to the accounts storage module via the accounts property
    console.log(`DEBUG: MemStorage delegating updateAccount for account ${id} to this.accounts`);
    
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
    
    return this.accounts.updateAccount(id, clientId, accountData);
  }

  async deleteAccount(id: number): Promise<void> {
    // Delegate to the accounts storage module via the accounts property
    console.log(`DEBUG: MemStorage delegating deleteAccount for account ${id} to this.accounts`);
    
    // Need to get the clientId from the existing account
    const account = await this.getAccount(id);
    if (!account) {
      throw new ApiError(404, `Account with ID ${id} not found.`);
    }
    
    const result = await this.accounts.deleteAccount(id, account.clientId);
    if (!result) {
      throw new ApiError(500, `Failed to delete account with ID ${id}.`);
    }
  }
  
  /**
   * Marks an account as inactive instead of deleting it
   * This is used when an account has transactions and cannot be deleted
   */
  /* markAccountInactive method has been moved to the main DatabaseStorage class implementation above.
     Removed from here as part of the account storage refactoring. */
  
  /**
   * Checks if an account has any transactions
   */
  /* accountHasTransactions method has been moved to the main DatabaseStorage class implementation above.
     Removed from here as part of the account storage refactoring. */

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
  
  /* All account methods are now properly delegated through this.accounts in the DatabaseStorage class above.
     These duplicate implementations have been removed to complete the account storage refactoring. */

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

  /* importCoaForClient method has been moved to the main DatabaseStorage class implementation above.
     Removed from here as part of the account storage refactoring. */
  
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
