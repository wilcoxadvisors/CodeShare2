import { 
  users, User, InsertUser, UserRole,
  clients, Client, InsertClient,
  entities, Entity, InsertEntity,
  accounts, Account, InsertAccount, AccountType,
  journals, Journal, InsertJournal, JournalType,
  journalEntries, JournalEntry, InsertJournalEntry, JournalEntryStatus,
  journalEntryLines, JournalEntryLine, InsertJournalEntryLine,
  journalEntryFiles,
  fixedAssets, FixedAsset, InsertFixedAsset,
  savedReports, SavedReport, ReportType,
  userEntityAccess,
  checklistFiles, ChecklistFile, InsertChecklistFile,
  userActivityLogs, UserActivityLog, InsertUserActivityLog,
  featureUsage, FeatureUsage, InsertFeatureUsage,
  industryBenchmarks, IndustryBenchmark, InsertIndustryBenchmark,
  dataConsent, DataConsent, InsertDataConsent,
  contactSubmissions, ContactSubmission, InsertContactSubmission,
  checklistSubmissions, ChecklistSubmission, InsertChecklistSubmission,
  consultationSubmissions, ConsultationSubmission, InsertConsultationSubmission,
  budgets, Budget, InsertBudget, BudgetStatus, BudgetPeriodType,
  budgetItems, BudgetItem, InsertBudgetItem,
  budgetDocuments, BudgetDocument, InsertBudgetDocument,
  forecasts, Forecast, InsertForecast,
  blogSubscribers, BlogSubscriber, InsertBlogSubscriber,
  consolidationGroups, ConsolidationGroup, InsertConsolidationGroup,
  consolidationGroupEntities, InsertConsolidationGroupEntity,
  locations, Location, InsertLocation
} from "@shared/schema";

// Define interface for hierarchical account structure
export interface AccountTreeNode extends Account {
  children: AccountTreeNode[];
  // These fields have been moved to journal entry lines but we need them in the interface
  // for backward compatibility during the transition
  fsliBucket?: string | null;
  internalReportingBucket?: string | null;
  item?: string | null;
}
import { eq, and, desc, asc, gte, lte, sql, count, sum, isNull, not, ne, inArray, gt, like } from "drizzle-orm";
import { db } from "./db";
import { json } from "drizzle-orm/pg-core";
import { logEntityIdsFallback, logEntityIdsUpdate, logEntityIdsDeprecation } from "../shared/deprecation-logger";
import { ListJournalEntriesFilters } from "../shared/validation";

// Interface for import results
export interface ImportResult {
  count: number;       // Total accounts successfully processed
  added: number;       // New accounts added
  updated: number;     // Existing accounts updated
  unchanged: number;   // Existing accounts that were left unchanged
  skipped: number;     // Accounts that weren't processed (e.g., due to validation failures)
  inactive: number;    // Accounts marked as inactive 
  deleted: number;     // Accounts that were deleted
  errors: string[];    // Error messages
  warnings: string[];  // Warning messages (less severe than errors)
}

// Storage interface for data access
// Types for the import preview and selections
export interface ImportAccountChange {
  id?: number;
  code: string;  
  existingName?: string;
  newName?: string;
  existingType?: string;
  newType?: string;
  existingSubtype?: string | null;
  newSubtype?: string | null;
  existingDescription?: string | null;
  newDescription?: string | null;
  existingIsSubledger?: boolean;
  newIsSubledger?: boolean;
  existingSubledgerType?: string | null;
  newSubledgerType?: string | null;
  existingParentCode?: string | null;
  newParentCode?: string | null;
  changeType: 'add' | 'update' | 'remove' | 'unchanged';
  hasTransactions?: boolean;
}

export interface ImportPreview {
  changes: ImportAccountChange[];
  totalChanges: number;
  totalAdds: number;
  totalUpdates: number;
  totalRemoves: number;
  totalUnchanged: number;
  accountsWithTransactions: number;
}

export interface ImportSelections {
  updateStrategy: 'all' | 'selected' | 'none';
  includedCodes?: string[];
  excludedCodes?: string[];
  removeStrategy?: 'inactive' | 'delete' | 'none';
  missingAccountActions?: Record<string, 'inactive' | 'delete'>;
}

export interface IStorage {
  // Chart of Accounts Seeding
  seedClientCoA(clientId: number): Promise<void>;
  
  // Chart of Accounts Import/Export
  getAccountsForClient(clientId: number): Promise<Account[]>;
  generateCoaImportPreview(clientId: number, fileBuffer: Buffer, filename: string): Promise<ImportPreview>;
  importCoaForClient(clientId: number, fileBuffer: Buffer, filename: string, selections?: ImportSelections | null): Promise<ImportResult>;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  findUserByRole(role: UserRole): Promise<User | undefined>;
  
  // Client methods
  getClient(id: number): Promise<Client | undefined>;
  getClients(): Promise<Client[]>;
  getClientsByUserId(userId: number): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<Client>): Promise<Client | undefined>;
  
  // Entity methods
  getEntity(id: number): Promise<Entity | undefined>;
  getEntities(): Promise<Entity[]>;
  getEntitiesByUser(userId: number): Promise<Entity[]>;
  getEntitiesByClient(clientId: number): Promise<Entity[]>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  updateEntity(id: number, entity: Partial<Entity>): Promise<Entity | undefined>;
  
  // User Entity Access methods
  getUserEntityAccess(userId: number, entityId: number): Promise<string | undefined>;
  
  // Location methods
  createLocation(location: InsertLocation): Promise<Location>;
  getLocation(id: number): Promise<Location | undefined>;
  listLocationsByClient(clientId: number): Promise<Location[]>;
  updateLocation(id: number, location: Partial<Location>): Promise<Location | undefined>;
  setLocationActiveStatus(id: number, isActive: boolean): Promise<boolean>;
  
  // Journal Entry methods
  createJournalEntry(clientId: number, createdById: number, entryData: InsertJournalEntry, linesData: InsertJournalEntryLine[]): Promise<JournalEntry & { lines: JournalEntryLine[] }>;
  getJournalEntry(id: number): Promise<(JournalEntry & { lines: JournalEntryLine[] }) | undefined>;
  updateJournalEntry(id: number, entryData: Partial<JournalEntry>, linesData: (Partial<JournalEntryLine> & { id?: number })[]): Promise<JournalEntry & { lines: JournalEntryLine[] }>;
  deleteJournalEntry(id: number): Promise<void>;
  listJournalEntries(filters?: ListJournalEntriesFilters): Promise<JournalEntry[]>;
  reverseJournalEntry(journalEntryId: number, options: {
    date?: Date;
    description?: string;
    createdBy: number;
    referenceNumber?: string;
  }): Promise<(JournalEntry & { lines: JournalEntryLine[] }) | undefined>;
  
  // Journal Entry Line methods
  updateJournalEntryLine(id: number, line: Partial<JournalEntryLine>): Promise<JournalEntryLine | undefined>;
  deleteJournalEntryLine(id: number): Promise<void>;
  grantUserEntityAccess(userId: number, entityId: number, accessLevel: string): Promise<void>;
  
  // Account methods
  getAccount(id: number): Promise<Account | undefined>;
  getAccounts(clientId: number): Promise<Account[]>;
  getAccountsByType(clientId: number, type: AccountType): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, account: Partial<Account>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<void>;
  getAccountsTree(clientId: number): Promise<AccountTreeNode[]>;
  getAccountsForClient(clientId: number): Promise<Account[]>; // For CoA export
  importCoaForClient(clientId: number, fileBuffer: Buffer, fileName?: string): Promise<ImportResult>;
  
  // Journal methods
  getJournal(id: number): Promise<Journal | undefined>;
  getJournals(entityId: number): Promise<Journal[]>;
  getJournalsByType(entityId: number, type: JournalType): Promise<Journal[]>;
  createJournal(journal: InsertJournal): Promise<Journal>;
  updateJournal(id: number, journal: Partial<Journal>): Promise<Journal | undefined>;
  deleteJournal(id: number): Promise<void>;
  
  // Journal Entry methods
  getJournalEntry(id: number): Promise<JournalEntry | undefined>;
  getJournalEntries(entityId: number): Promise<JournalEntry[]>;
  getJournalEntriesByStatus(entityId: number, status: JournalEntryStatus): Promise<JournalEntry[]>;
  createJournalEntry(clientId: number, createdById: number, entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: number, entry: Partial<JournalEntry>): Promise<JournalEntry | undefined>;
  
  // Journal Entry Line methods
  getJournalEntryLines(journalEntryId: number): Promise<JournalEntryLine[]>;
  createJournalEntryLine(line: InsertJournalEntryLine): Promise<JournalEntryLine>;
  addJournalEntryLine(line: InsertJournalEntryLine): Promise<JournalEntryLine>; // Alias for createJournalEntryLine
  
  // Journal Entry File methods
  getJournalEntryFiles(journalEntryId: number): Promise<any[]>;
  createJournalEntryFile(journalEntryId: number, file: any): Promise<any>;
  
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

  // User Activity Tracking methods
  logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog>;
  getUserActivities(userId: number, limit?: number): Promise<UserActivityLog[]>;
  getUserActivitiesByEntity(entityId: number, limit?: number): Promise<UserActivityLog[]>;
  getUserActivitiesByResourceType(resourceType: string, limit?: number): Promise<UserActivityLog[]>;
  
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
  
  // Data Consent methods
  recordDataConsent(consent: InsertDataConsent): Promise<DataConsent>;
  getUserConsent(userId: number, consentType: string): Promise<DataConsent | undefined>;
  updateUserConsent(id: number, granted: boolean): Promise<DataConsent | undefined>;
  hasUserConsented(userId: number, consentType: string): Promise<boolean>;
  
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
  
  // Consolidation Group methods
  getConsolidationGroup(id: number): Promise<ConsolidationGroup | undefined>;
  getConsolidationGroups(userId: number): Promise<ConsolidationGroup[]>;
  getConsolidationGroupsByEntity(entityId: number): Promise<ConsolidationGroup[]>;
  createConsolidationGroup(group: InsertConsolidationGroup): Promise<ConsolidationGroup>;
  updateConsolidationGroup(id: number, group: Partial<ConsolidationGroup>): Promise<ConsolidationGroup | undefined>;
  deleteConsolidationGroup(id: number): Promise<void>;
  addEntityToConsolidationGroup(groupId: number, entityId: number): Promise<ConsolidationGroup>;
  removeEntityFromConsolidationGroup(groupId: number, entityId: number): Promise<ConsolidationGroup>;
  generateConsolidatedReport(groupId: number, reportType: ReportType, startDate?: Date, endDate?: Date): Promise<any>;
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
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private entities: Map<number, Entity>;
  private accounts: Map<number, Account>;
  private journals: Map<number, Journal>;
  private journalEntries: Map<number, JournalEntry>;
  private journalEntryLines: Map<number, JournalEntryLine>;
  private journalEntryFiles: Map<number, any>; // Map for file attachments
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
  private currentAccountId: number = 1;
  private currentJournalId: number = 1;
  private currentJournalEntryId: number = 1;
  private currentJournalEntryLineId: number = 1;
  private currentJournalEntryFileId: number = 1;
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
  private consolidationGroups: Map<number, ConsolidationGroup>;
  private consolidationGroupEntitiesMap: Map<number, Set<number>>; // Map storing group-entity relationships
  // No longer needed: private consolidationGroupEntities: Map<string, boolean>;
  private currentBudgetId: number = 1;
  private currentBudgetItemId: number = 1;
  private currentBudgetDocumentId: number = 1;
  private currentForecastId: number = 1;
  private currentConsolidationGroupId: number = 1;
  
  // Form submission IDs
  private currentContactSubmissionId: number = 1;
  private currentChecklistSubmissionId: number = 1;
  private currentChecklistFileId: number = 1;
  private currentConsultationSubmissionId: number = 1;
  private currentBlogSubscriberId: number = 1;
  private currentLocationId: number = 1;

  async seedClientCoA(clientId: number): Promise<void> {
    console.log(`MemStorage: Seeding Chart of Accounts for client ID: ${clientId}`);
    
    // Import the standard template
    const { standardCoaTemplate } = await import('./coaTemplate');
    
    // Check if accounts already exist for this client
    const existingAccounts = Array.from(this.accounts.values())
      .filter(account => account.clientId === clientId);
    
    if (existingAccounts.length > 0) {
      console.log(`MemStorage: Client ${clientId} already has ${existingAccounts.length} accounts. Skipping seed.`);
      return;
    }
    
    // Map to store account codes to their generated IDs for parentId resolution
    const codeToIdMap = new Map<string, number>();
    
    // Process each template account
    for (const templateAccount of standardCoaTemplate) {
      // Determine parentId by looking up the parent code in our map
      let parentId: number | null = null;
      
      if (templateAccount.parentCode) {
        parentId = codeToIdMap.get(templateAccount.parentCode) || null;
        if (!parentId && templateAccount.parentCode) {
          console.warn(`MemStorage: Parent account with code ${templateAccount.parentCode} not found for ${templateAccount.accountCode} (${templateAccount.name})`);
        }
      }
      
      // Create the account
      const account = await this.createAccount({
        clientId,
        accountCode: templateAccount.accountCode,
        name: templateAccount.name,
        type: templateAccount.type,
        subtype: templateAccount.subtype,
        isSubledger: templateAccount.isSubledger || false,
        subledgerType: templateAccount.subledgerType,
        parentId,
        description: templateAccount.description,
        active: true
      });
      
      // Store the generated ID mapped to the account code
      codeToIdMap.set(templateAccount.accountCode, account.id);
    }
    
    console.log(`MemStorage: Successfully seeded ${standardCoaTemplate.length} accounts for client ID: ${clientId}`);
  }

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.entities = new Map();
    this.accounts = new Map();
    this.journals = new Map();
    this.journalEntries = new Map();
    this.journalEntryLines = new Map();
    this.journalEntryFiles = new Map();
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
    this.consolidationGroups = new Map();
    this.consolidationGroupEntitiesMap = new Map();
    // No longer needed: this.consolidationGroupEntities = new Map();
    
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
    
    const entries = [
      {
        reference: 'JE-2023-0045',
        date: new Date('2023-03-15'),
        description: 'Client payment - ABC Corp',
        status: JournalEntryStatus.POSTED,
        createdBy: adminUser.id,
        journalId: cashJournal ? cashJournal.id : defaultJournalId,
        lines: [
          { accountCode: '1000', debit: 5000, credit: 0, description: 'Client payment - ABC Corp' },
          { accountCode: '1200', debit: 0, credit: 5000, description: 'Client payment - ABC Corp' }
        ]
      },
      {
        reference: 'JE-2023-0044',
        date: new Date('2023-03-10'),
        description: 'Office supplies - Vendor XYZ',
        status: JournalEntryStatus.POSTED,
        createdBy: adminUser.id,
        journalId: purchaseJournal ? purchaseJournal.id : defaultJournalId,
        lines: [
          { accountCode: '2000', debit: 750, credit: 0, description: 'Office supplies - Vendor XYZ' },
          { accountCode: '6150', debit: 0, credit: 750, description: 'Office supplies - Vendor XYZ' }
        ]
      },
      {
        reference: 'JE-2023-0043',
        date: new Date('2023-03-05'),
        description: 'New computer purchase',
        status: JournalEntryStatus.DRAFT,
        createdBy: adminUser.id,
        journalId: generalJournal ? generalJournal.id : defaultJournalId,
        lines: [
          { accountCode: '1500', debit: 2200, credit: 0, description: 'New computer purchase' },
          { accountCode: '1000', debit: 0, credit: 2200, description: 'New computer purchase' }
        ]
      }
    ];
    
    entries.forEach(entry => {
      const journalEntry: JournalEntry = {
        id: this.currentJournalEntryId++,
        entityId: defaultEntity.id,
        journalId: entry.journalId,
        reference: entry.reference,
        date: entry.date,
        description: entry.description,
        status: entry.status,
        needsReview: false,
        isRecurring: false,
        recurringFrequency: null,
        recurringEndDate: null,
        createdBy: entry.createdBy,
        requestedBy: null,
        requestedAt: null,
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        postedBy: null,
        postedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      if (entry.status === JournalEntryStatus.POSTED) {
        journalEntry.postedBy = adminUser.id;
        journalEntry.postedAt = new Date();
      }
      
      this.journalEntries.set(journalEntry.id, journalEntry);
      
      // Add journal entry lines
      entry.lines.forEach(line => {
        const accountEntry = Array.from(this.accounts.values())
          .find(a => a.clientId === defaultClient.id && a.accountCode === line.accountCode);
        
        if (accountEntry) {
          const journalEntryLine: JournalEntryLine = {
            id: this.currentJournalEntryLineId++,
            journalEntryId: journalEntry.id,
            accountId: accountEntry.id,
            description: line.description,
            debit: line.debit.toString(),
            credit: line.credit.toString(),
            entityId: defaultEntity.id,
            date: null,
            lineNo: null,
            reference: null,
            taxId: null,
            taxAmount: null,
            reconciled: false,
            reconciledAt: null,
            reconciledBy: null,
            reconciledWith: null,
            createdAt: new Date()
          };
          this.journalEntryLines.set(journalEntryLine.id, journalEntryLine);
        }
      });
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      id, 
      username: insertUser.username, 
      password: insertUser.password,
      email: insertUser.email,
      name: insertUser.name,
      role: (insertUser.role as UserRole) || UserRole.CLIENT,
      active: insertUser.active !== undefined ? insertUser.active : true,
      lastLogin: null,
      loginCount: 0,
      industry: insertUser.industry || null,
      companySize: insertUser.companySize || null,
      jobTitle: insertUser.jobTitle || null,
      location: insertUser.location || null,
      preferredLanguage: insertUser.preferredLanguage || 'en',
      deviceInfo: insertUser.deviceInfo || null,
      lastSession: insertUser.lastSession || null,
      sessionCount: 0,
      referralSource: insertUser.referralSource || null,
      createdAt: new Date(),
      updatedAt: null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async findUserByRole(role: UserRole): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.role === role);
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
    return this.userEntityAccess.get(`${userId}-${entityId}`);
  }
  
  async grantUserEntityAccess(userId: number, entityId: number, accessLevel: string): Promise<void> {
    this.userEntityAccess.set(`${userId}-${entityId}`, accessLevel);
  }
  
  // Account methods
  async getAccount(id: number): Promise<Account | undefined> {
    return this.accounts.get(id);
  }
  
  async getAccounts(clientId: number): Promise<Account[]> {
    return Array.from(this.accounts.values())
      .filter(account => account.clientId === clientId);
  }
  
  async getAccountsByType(clientId: number, type: AccountType): Promise<Account[]> {
    return Array.from(this.accounts.values())
      .filter(account => account.clientId === clientId && account.type === type);
  }
  
  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const id = this.currentAccountId++;
    const account: Account = { 
      id,
      clientId: insertAccount.clientId,
      name: insertAccount.name,
      accountCode: insertAccount.accountCode,
      type: insertAccount.type as AccountType,
      subtype: insertAccount.subtype || null,
      isSubledger: insertAccount.isSubledger || false,
      subledgerType: insertAccount.subledgerType || null,
      parentId: insertAccount.parentId || null,
      description: insertAccount.description || null,
      active: insertAccount.active !== undefined ? insertAccount.active : true,
      createdAt: new Date()
    };
    this.accounts.set(id, account);
    return account;
  }
  
  async updateAccount(id: number, accountData: Partial<Account>): Promise<Account | undefined> {
    const account = this.accounts.get(id);
    if (!account) return undefined;
    
    const updatedAccount = { ...account, ...accountData };
    this.accounts.set(id, updatedAccount);
    return updatedAccount;
  }
  
  async deleteAccount(id: number): Promise<void> {
    if (this.accounts.has(id)) {
      this.accounts.delete(id);
    }
  }
  
  async getAccountsTree(clientId: number): Promise<AccountTreeNode[]> {
    // Get all accounts for the given client
    const clientAccounts = Array.from(this.accounts.values())
      .filter(account => account.clientId === clientId)
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    
    if (clientAccounts.length === 0) {
      return [];
    }

    // Create a map of accounts by ID with empty children arrays
    const accountsMap: Record<number, AccountTreeNode> = {};
    
    // First pass: Add all accounts to the map with empty children arrays
    for (const account of clientAccounts) {
      accountsMap[account.id] = {
        ...account,
        children: []
      };
    }
    
    // Second pass: Populate children arrays based on parentId relationships
    const rootAccounts: AccountTreeNode[] = [];
    
    for (const account of clientAccounts) {
      if (account.parentId === null || account.parentId === undefined || !accountsMap[account.parentId]) {
        // This is a root account (no parent or parent doesn't exist in this client)
        rootAccounts.push(accountsMap[account.id]);
      } else {
        // This account has a parent, add it to the parent's children array
        accountsMap[account.parentId].children.push(accountsMap[account.id]);
      }
    }
    
    return rootAccounts;
  }
  
  // Journal methods
  async getJournal(id: number): Promise<Journal | undefined> {
    return this.journals.get(id);
  }
  
  async getJournals(entityId: number): Promise<Journal[]> {
    return Array.from(this.journals.values())
      .filter(journal => journal.entityId === entityId);
  }
  
  async getJournalsByType(entityId: number, type: JournalType): Promise<Journal[]> {
    return Array.from(this.journals.values())
      .filter(journal => journal.entityId === entityId && journal.type === type);
  }
  
  async createJournal(insertJournal: InsertJournal): Promise<Journal> {
    const id = this.currentJournalId++;
    const journal: Journal = {
      id,
      entityId: insertJournal.entityId,
      name: insertJournal.name,
      code: insertJournal.code,
      type: insertJournal.type as JournalType,
      description: insertJournal.description || null,
      defaultAccountId: insertJournal.defaultAccountId || null,
      suspenseAccountId: insertJournal.suspenseAccountId || null,
      isActive: insertJournal.isActive !== undefined ? insertJournal.isActive : true,
      showInDashboard: insertJournal.showInDashboard !== undefined ? insertJournal.showInDashboard : true,
      sequence: insertJournal.sequence || 10,
      sequencePrefix: insertJournal.sequencePrefix || null,
      // Note: 'color' field removed as it doesn't exist in the database schema
      createdBy: insertJournal.createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.journals.set(id, journal);
    return journal;
  }
  
  async updateJournal(id: number, journalData: Partial<Journal>): Promise<Journal | undefined> {
    const journal = this.journals.get(id);
    if (!journal) return undefined;
    
    const updatedJournal = { ...journal, ...journalData, updatedAt: new Date() };
    this.journals.set(id, updatedJournal);
    return updatedJournal;
  }
  
  async deleteJournal(id: number): Promise<void> {
    if (this.journals.has(id)) {
      // Check if any journal entries are linked to this journal
      const linkedEntries = Array.from(this.journalEntries.values())
        .filter(entry => 'journalId' in entry && entry.journalId === id);
      
      if (linkedEntries.length === 0) {
        // Safe to delete if no entries are linked
        this.journals.delete(id);
      } else {
        throw new Error('Cannot delete journal with linked entries');
      }
    }
  }
  
  // Journal Entry methods
  async getJournalEntry(id: number): Promise<JournalEntry | undefined> {
    return this.journalEntries.get(id);
  }
  
  async getJournalEntries(entityId: number): Promise<JournalEntry[]> {
    return Array.from(this.journalEntries.values())
      .filter(entry => entry.entityId === entityId)
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending
  }
  
  async getJournalEntriesByStatus(entityId: number, status: JournalEntryStatus): Promise<JournalEntry[]> {
    return Array.from(this.journalEntries.values())
      .filter(entry => entry.entityId === entityId && entry.status === status)
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending
  }
  
  async createJournalEntry(clientId: number, createdById: number, insertEntry: InsertJournalEntry): Promise<JournalEntry> {
    const id = this.currentJournalEntryId++;
    const now = new Date();
    
    // Create base journal entry
    const journalEntry = {
      id, 
      entityId: insertEntry.entityId,
      journalId: insertEntry.journalId,
      date: insertEntry.date,
      reference: insertEntry.reference,
      description: insertEntry.description || null,
      status: insertEntry.status as JournalEntryStatus,
      needsReview: insertEntry.needsReview || false,
      isRecurring: insertEntry.isRecurring || false,
      recurringFrequency: insertEntry.recurringFrequency || null,
      recurringEndDate: insertEntry.recurringEndDate || null,
      createdBy: createdById,
      requestedBy: insertEntry.requestedBy || null,
      requestedAt: null as Date | null,
      approvedBy: insertEntry.approvedBy || null,
      approvedAt: null as Date | null,
      rejectedBy: insertEntry.rejectedBy || null,
      rejectedAt: null as Date | null,
      rejectionReason: insertEntry.rejectionReason || null,
      postedBy: insertEntry.postedBy || null,
      postedAt: null as Date | null,
      createdAt: now,
      updatedAt: now
    };
    
    // Set status-related timestamps based on the initial status
    if (journalEntry.status === JournalEntryStatus.PENDING_APPROVAL && journalEntry.requestedBy) {
      journalEntry.requestedAt = now;
    } else if (journalEntry.status === JournalEntryStatus.APPROVED && journalEntry.approvedBy) {
      journalEntry.approvedAt = now;
    } else if (journalEntry.status === JournalEntryStatus.REJECTED && journalEntry.rejectedBy) {
      journalEntry.rejectedAt = now;
    } else if (journalEntry.status === JournalEntryStatus.POSTED && journalEntry.postedBy) {
      journalEntry.postedAt = now;
    }
    
    this.journalEntries.set(id, journalEntry);
    return journalEntry;
  }
  
  async updateJournalEntry(id: number, entryData: Partial<JournalEntry>): Promise<JournalEntry | undefined> {
    const entry = this.journalEntries.get(id);
    if (!entry) return undefined;
    
    const updatedEntry = { 
      ...entry, 
      ...entryData,
      updatedAt: new Date()
    };
    this.journalEntries.set(id, updatedEntry);
    return updatedEntry;
  }
  
  // Journal Entry Line methods
  async getJournalEntryLines(journalEntryId: number): Promise<JournalEntryLine[]> {
    return Array.from(this.journalEntryLines.values())
      .filter(line => line.journalEntryId === journalEntryId);
  }
  
  async createJournalEntryLine(insertLine: InsertJournalEntryLine): Promise<JournalEntryLine> {
    const id = this.currentJournalEntryLineId++;
    const journalEntryLine: JournalEntryLine = { 
      id,
      journalEntryId: insertLine.journalEntryId,
      accountId: insertLine.accountId,
      entityId: insertLine.entityId,
      description: insertLine.description || null,
      debit: insertLine.debit || "0",
      credit: insertLine.credit || "0",
      date: insertLine.date || null,
      lineNo: insertLine.lineNo || null,
      reference: insertLine.reference || null,
      taxId: insertLine.taxId || null,
      taxAmount: insertLine.taxAmount || null,
      reconciled: insertLine.reconciled || false,
      reconciledAt: insertLine.reconciledAt || null,
      reconciledBy: insertLine.reconciledBy || null,
      reconciledWith: insertLine.reconciledWith || null,
      createdAt: new Date() 
    };
    this.journalEntryLines.set(id, journalEntryLine);
    return journalEntryLine;
  }

  // Alias for createJournalEntryLine to maintain API compatibility with IStorage interface
  async addJournalEntryLine(insertLine: InsertJournalEntryLine): Promise<JournalEntryLine> {
    return this.createJournalEntryLine(insertLine);
  }
  
  
  // Journal Entry File methods
  async getJournalEntryFiles(journalEntryId: number): Promise<any[]> {
    return Array.from(this.journalEntryFiles.values())
      .filter(file => file.journalEntryId === journalEntryId);
  }
  
  async createJournalEntryFile(journalEntryId: number, file: any): Promise<any> {
    const id = this.currentJournalEntryFileId++;
    const journalEntryFile = {
      id,
      journalEntryId,
      filename: file.filename || `file-${id}`,
      contentType: file.contentType || 'application/octet-stream',
      size: file.size || 0,
      data: file.data || null,
      createdAt: new Date(),
      uploadedBy: file.uploadedBy || null
    };
    
    this.journalEntryFiles.set(id, journalEntryFile);
    return journalEntryFile;
  }
  
  async reverseJournalEntry(journalEntryId: number, options: {
    date?: Date;
    description?: string;
    createdBy: number;
    referenceNumber?: string;
  }): Promise<(JournalEntry & { lines: JournalEntryLine[] }) | undefined> {
    // 1. Get the original journal entry with lines
    const originalEntry = this.journalEntries.get(journalEntryId);
    if (!originalEntry) {
      throw new Error("Journal entry not found");
    }
    
    // 2. Check if journal entry can be reversed (must be posted)
    if (originalEntry.status !== "posted") {
      throw new Error("Only posted journal entries can be reversed");
    }
    
    // Get the lines for the original entry
    const originalLines = Array.from(this.journalEntryLines.values())
      .filter(line => line.journalEntryId === journalEntryId);
    
    // 3. Create the reversing journal entry
    const id = this.currentJournalEntryId++;
    const date = options.date || new Date();
    const now = new Date();
    
    const reversalEntry: JournalEntry = {
      id,
      clientId: originalEntry.clientId,
      entityId: originalEntry.entityId,
      date: date,
      description: options.description || `Reversal of ${originalEntry.referenceNumber || journalEntryId}`,
      referenceNumber: options.referenceNumber || `REV-${originalEntry.referenceNumber || journalEntryId}`,
      createdBy: options.createdBy,
      journalType: originalEntry.journalType,
      status: "draft", // Start as draft, to be reviewed
      isSystemGenerated: true, // Mark as system-generated
      isReversal: true, // Flag as a reversal entry
      reversedEntryId: journalEntryId, // Reference to the original entry
      createdAt: now,
      updatedAt: now,
      postedBy: null,
      postedAt: null,
      currency: originalEntry.currency,
      locationId: originalEntry.locationId,
      exchange_rate: originalEntry.exchange_rate
    };
    
    this.journalEntries.set(id, reversalEntry);
    
    // 4. Create the reversed lines (with debits/credits flipped)
    const reversalLines: JournalEntryLine[] = [];
    
    for (const line of originalLines) {
      // Flip the type (debit/credit)
      const reversedType = line.type === "debit" ? "credit" : "debit";
      
      const lineId = this.currentJournalEntryLineId++;
      
      // Create the reversal line
      const reversalLine: JournalEntryLine = {
        id: lineId,
        journalEntryId: id,
        accountId: line.accountId,
        type: reversedType,
        amount: line.amount,
        description: line.description,
        locationId: line.locationId,
        lineNo: line.lineNo,
        reference: line.reference,
        reconciled: false, // New line is not reconciled
        reconciledAt: null,
        reconciledBy: null,
        taxAmount: line.taxAmount,
        taxId: line.taxId,
        createdAt: now,
        updatedAt: now
      };
      
      this.journalEntryLines.set(lineId, reversalLine);
      reversalLines.push(reversalLine);
    }
    
    // 5. Return the new entry with its lines
    return {
      ...reversalEntry,
      lines: reversalLines
    };
  }
  
  // Fixed Asset methods
  async getFixedAsset(id: number): Promise<FixedAsset | undefined> {
    return this.fixedAssets.get(id);
  }
  
  async getFixedAssets(entityId: number): Promise<FixedAsset[]> {
    return Array.from(this.fixedAssets.values())
      .filter(asset => asset.entityId === entityId);
  }
  
  async createFixedAsset(insertAsset: InsertFixedAsset): Promise<FixedAsset> {
    const id = this.currentFixedAssetId++;
    const now = new Date();
    const fixedAsset: FixedAsset = { 
      id, 
      name: insertAsset.name,
      entityId: insertAsset.entityId,
      description: insertAsset.description || null,
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
      disposalDate: insertAsset.disposalDate || null,
      disposalAmount: insertAsset.disposalAmount || null,
      createdAt: now
    };
    this.fixedAssets.set(id, fixedAsset);
    return fixedAsset;
  }
  
  async updateFixedAsset(id: number, assetData: Partial<FixedAsset>): Promise<FixedAsset | undefined> {
    const asset = this.fixedAssets.get(id);
    if (!asset) return undefined;
    
    const updatedAsset = { ...asset, ...assetData };
    this.fixedAssets.set(id, updatedAsset);
    return updatedAsset;
  }
  
  // Report methods
  async generateTrialBalance(clientId: number, startDate?: Date, endDate?: Date, entityId?: number): Promise<any> {
    const accounts = await this.getAccounts(clientId);
    const result = [];
    
    let totalDebits = 0;
    let totalCredits = 0;
    
    for (const account of accounts) {
      const lines = Array.from(this.journalEntryLines.values())
        .filter(line => {
          const entry = this.journalEntries.get(line.journalEntryId);
          if (!entry || entry.status !== JournalEntryStatus.POSTED) {
            return false;
          }
          
          // Filter by entityId if provided - important as we share Chart of Accounts across entities
          if (entityId && entry.entityId !== entityId) {
            return false;
          }
          
          if (line.accountId !== account.id) {
            return false;
          }
          
          if (startDate && entry.date < startDate) {
            return false;
          }
          
          if (endDate && entry.date > endDate) {
            return false;
          }
          
          return true;
        });
      
      // Calculate debits and credits - ensure proper parsing with defaults
      const totalDebit = lines.reduce(
        (sum, line) => sum + (parseFloat(line.debit || "0") || 0), 0
      );
      
      const totalCredit = lines.reduce(
        (sum, line) => sum + (parseFloat(line.credit || "0") || 0), 0
      );
      
      // Properly format numbers to 2 decimal places
      const formattedDebit = Math.round(totalDebit * 100) / 100;
      const formattedCredit = Math.round(totalCredit * 100) / 100;
      
      // Add to running totals
      totalDebits += formattedDebit;
      totalCredits += formattedCredit;
      
      // Only include accounts with activity or balances
      if (formattedDebit > 0 || formattedCredit > 0) {
        result.push({
          accountId: account.id,
          accountCode: account.accountCode,
          accountName: account.name,
          type: account.type,
          debit: formattedDebit,
          credit: formattedCredit
        });
      }
    }
    
    // Add a totals row to the result
    result.push({
      accountId: -1,
      accountCode: "",
      accountName: "TOTAL",
      type: "TOTAL",
      debit: Math.round(totalDebits * 100) / 100,
      credit: Math.round(totalCredits * 100) / 100
    });
    
    return result;
  }
  
  async generateBalanceSheet(clientId: number, asOfDate?: Date, entityId?: number): Promise<any> {
    // Get all asset, liability, and equity accounts
    const assetAccounts = await this.getAccountsByType(clientId, AccountType.ASSET);
    const liabilityAccounts = await this.getAccountsByType(clientId, AccountType.LIABILITY);
    const equityAccounts = await this.getAccountsByType(clientId, AccountType.EQUITY);
    
    // Calculate balances for each account
    const calculateBalance = async (account: Account) => {
      const lines = Array.from(this.journalEntryLines.values())
        .filter(line => {
          const entry = this.journalEntries.get(line.journalEntryId);
          if (!entry || entry.status !== JournalEntryStatus.POSTED) {
            return false;
          }
          
          // Filter by entityId if provided - important as we share Chart of Accounts across entities
          if (entityId && entry.entityId !== entityId) {
            return false;
          }
          
          if (line.accountId !== account.id) {
            return false;
          }
          
          if (asOfDate && entry.date > asOfDate) {
            return false;
          }
          
          return true;
        });
      
      const totalDebit = lines.reduce(
        (sum, line) => sum + parseFloat(line.debit), 0
      );
      
      const totalCredit = lines.reduce(
        (sum, line) => sum + parseFloat(line.credit), 0
      );
      
      let balance = totalDebit - totalCredit;
      
      // Asset accounts normally have debit balances, 
      // while liability and equity accounts normally have credit balances
      if (account.type === AccountType.LIABILITY || account.type === AccountType.EQUITY) {
        balance = -balance;
      }
      
      return {
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.name,
        subtype: account.subtype,
        balance
      };
    };
    
    // Calculate balances
    const assetBalances = await Promise.all(assetAccounts.map(calculateBalance));
    const liabilityBalances = await Promise.all(liabilityAccounts.map(calculateBalance));
    const equityBalances = await Promise.all(equityAccounts.map(calculateBalance));
    
    // Calculate totals
    const totalAssets = assetBalances.reduce((sum, account) => sum + account.balance, 0);
    const totalLiabilities = liabilityBalances.reduce((sum, account) => sum + account.balance, 0);
    const totalEquity = equityBalances.reduce((sum, account) => sum + account.balance, 0);
    
    return {
      asOfDate: asOfDate || new Date(),
      assets: assetBalances,
      totalAssets,
      liabilities: liabilityBalances,
      totalLiabilities,
      equity: equityBalances,
      totalEquity,
      liabilitiesAndEquity: totalLiabilities + totalEquity
    };
  }
  
  async generateIncomeStatement(clientId: number, startDate?: Date, endDate?: Date, entityId?: number): Promise<any> {
    // Get all revenue and expense accounts
    const revenueAccounts = await this.getAccountsByType(clientId, AccountType.REVENUE);
    const expenseAccounts = await this.getAccountsByType(clientId, AccountType.EXPENSE);
    
    // Calculate balances for each account
    const calculateBalance = async (account: Account) => {
      const lines = Array.from(this.journalEntryLines.values())
        .filter(line => {
          const entry = this.journalEntries.get(line.journalEntryId);
          if (!entry || entry.status !== JournalEntryStatus.POSTED) {
            return false;
          }
          
          // Filter by entityId if provided - important as we share Chart of Accounts across entities
          if (entityId && entry.entityId !== entityId) {
            return false;
          }
          
          if (line.accountId !== account.id) {
            return false;
          }
          
          if (startDate && entry.date < startDate) {
            return false;
          }
          
          if (endDate && entry.date > endDate) {
            return false;
          }
          
          return true;
        });
      
      const totalDebit = lines.reduce(
        (sum, line) => sum + parseFloat(line.debit), 0
      );
      
      const totalCredit = lines.reduce(
        (sum, line) => sum + parseFloat(line.credit), 0
      );
      
      let balance = totalCredit - totalDebit;
      
      // For expenses, the normal balance is a debit
      if (account.type === AccountType.EXPENSE) {
        balance = -balance;
      }
      
      return {
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.name,
        subtype: account.subtype,
        balance
      };
    };
    
    // Calculate balances
    const revenueBalances = await Promise.all(revenueAccounts.map(calculateBalance));
    const expenseBalances = await Promise.all(expenseAccounts.map(calculateBalance));
    
    // Calculate totals
    const totalRevenue = revenueBalances.reduce((sum, account) => sum + account.balance, 0);
    const totalExpenses = expenseBalances.reduce((sum, account) => sum + account.balance, 0);
    const netIncome = totalRevenue - totalExpenses;
    
    return {
      startDate: startDate || new Date(),
      endDate: endDate || new Date(),
      revenue: revenueBalances,
      totalRevenue,
      expenses: expenseBalances,
      totalExpenses,
      netIncome
    };
  }
  
  async generateCashFlow(clientId: number, startDate?: Date, endDate?: Date, entityId?: number): Promise<any> {
    // For this simple implementation, we'll just return the cash account balance changes
    const cashAccounts = Array.from(this.accounts.values())
      .filter(account => 
        account.clientId === clientId && 
        account.type === AccountType.ASSET && 
        account.accountCode.startsWith('1000')
      );
    
    if (cashAccounts.length === 0) {
      return {
        startDate: startDate || new Date(),
        endDate: endDate || new Date(),
        cashFlows: [],
        netCashFlow: 0
      };
    }
    
    const cashFlows = [];
    let netCashFlow = 0;
    
    for (const cashAccount of cashAccounts) {
      const lines = Array.from(this.journalEntryLines.values())
        .filter(line => {
          const entry = this.journalEntries.get(line.journalEntryId);
          if (!entry || entry.status !== JournalEntryStatus.POSTED) {
            return false;
          }
          
          // Filter by entityId if provided - important as we share Chart of Accounts across entities
          if (entityId && entry.entityId !== entityId) {
            return false;
          }
          
          if (line.accountId !== cashAccount.id) {
            return false;
          }
          
          if (startDate && entry.date < startDate) {
            return false;
          }
          
          if (endDate && entry.date > endDate) {
            return false;
          }
          
          return true;
        });
      
      // Group by journal entry for cash flow categorization
      const entriesMap = new Map();
      
      for (const line of lines) {
        const entry = this.journalEntries.get(line.journalEntryId);
        if (!entry) continue;
        
        const entryKey = entry.id.toString();
        if (!entriesMap.has(entryKey)) {
          entriesMap.set(entryKey, {
            date: entry.date,
            reference: entry.reference,
            description: entry.description,
            amount: 0
          });
        }
        
        const flowItem = entriesMap.get(entryKey);
        const amount = parseFloat(line.debit) - parseFloat(line.credit);
        flowItem.amount += amount;
      }
      
      // Add to cash flows
      for (const [_, flowItem] of entriesMap.entries()) {
        if (flowItem.amount !== 0) {
          cashFlows.push(flowItem);
          netCashFlow += flowItem.amount;
        }
      }
    }
    
    return {
      startDate: startDate || new Date(),
      endDate: endDate || new Date(),
      cashFlows: cashFlows.sort((a, b) => a.date.getTime() - b.date.getTime()),
      netCashFlow
    };
  }
  
  // GL reporting
  async getGeneralLedger(entityId: number, options?: GLOptions): Promise<GLEntry[]> {
    const result: GLEntry[] = [];
    
    // Get journal entries filtered by options
    let entries = Array.from(this.journalEntries.values())
      .filter(entry => entry.entityId === entityId);
    
    if (options?.startDate) {
      entries = entries.filter(entry => entry.date >= options.startDate);
    }
    
    if (options?.endDate) {
      entries = entries.filter(entry => entry.date <= options.endDate);
    }
    
    if (options?.status) {
      entries = entries.filter(entry => entry.status === options.status);
    }
    
    // Sort entries by date
    entries.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Process each entry
    for (const entry of entries) {
      const lines = await this.getJournalEntryLines(entry.id);
      
      // Filter by account if specified
      const filteredLines = options?.accountId 
        ? lines.filter(line => line.accountId === options.accountId)
        : lines;
      
      for (const line of filteredLines) {
        const account = await this.getAccount(line.accountId);
        if (!account) continue;
        
        const debit = parseFloat(line.debit);
        const credit = parseFloat(line.credit);
        
        // Calculate running balance (simplified version - not considering account type)
        const balance = debit - credit;
        
        result.push({
          id: line.id,
          date: entry.date,
          journalId: entry.reference,
          accountId: line.accountId,
          accountCode: account.accountCode,
          accountName: account.name,
          description: line.description || entry.description || '',
          debit,
          credit,
          balance,
          status: entry.status
        });
      }
    }
    
    return result;
  }
  
  // User Activity Tracking methods
  async logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog> {
    const id = this.currentUserActivityLogId++;
    const newActivity: UserActivityLog = {
      id,
      userId: activity.userId,
      entityId: activity.entityId,
      action: activity.action,
      resourceType: activity.resourceType,
      resourceId: activity.resourceId,
      details: activity.details,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent,
      timestamp: new Date()
    };
    
    this.userActivities.set(id, newActivity);
    return newActivity;
  }
  
  async getUserActivities(userId: number, limit: number = 100): Promise<UserActivityLog[]> {
    return Array.from(this.userActivities.values())
      .filter(activity => activity.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  async getUserActivitiesByEntity(entityId: number, limit: number = 100): Promise<UserActivityLog[]> {
    return Array.from(this.userActivities.values())
      .filter(activity => activity.entityId === entityId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  async getUserActivitiesByResourceType(resourceType: string, limit: number = 100): Promise<UserActivityLog[]> {
    return Array.from(this.userActivities.values())
      .filter(activity => activity.resourceType === resourceType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  // Feature Usage Analytics methods
  async recordFeatureUsage(usage: InsertFeatureUsage): Promise<FeatureUsage> {
    // Check if this feature has been used by this user before
    const existingUsage = Array.from(this.featureUsages.values()).find(
      fu => fu.userId === usage.userId && fu.featureName === usage.featureName
    );
    
    if (existingUsage) {
      // Update existing usage record
      const updatedUsage: FeatureUsage = {
        ...existingUsage,
        usageCount: (existingUsage.usageCount || 0) + 1,
        lastUsed: new Date(),
        useTime: usage.useTime,
        successful: usage.successful
      };
      
      this.featureUsages.set(existingUsage.id, updatedUsage);
      return updatedUsage;
    } else {
      // Create new usage record
      const id = this.currentFeatureUsageId++;
      const newUsage: FeatureUsage = {
        id,
        userId: usage.userId,
        entityId: usage.entityId,
        featureName: usage.featureName,
        usageCount: 1,
        firstUsed: new Date(),
        lastUsed: new Date(),
        useTime: usage.useTime,
        successful: usage.successful !== undefined ? usage.successful : true
      };
      
      this.featureUsages.set(id, newUsage);
      return newUsage;
    }
  }
  
  async updateFeatureUsage(id: number, data: Partial<FeatureUsage>): Promise<FeatureUsage | undefined> {
    const usage = this.featureUsages.get(id);
    if (!usage) return undefined;
    
    const updatedUsage = { ...usage, ...data };
    this.featureUsages.set(id, updatedUsage);
    return updatedUsage;
  }
  
  async getFeatureUsage(userId: number, featureName: string): Promise<FeatureUsage | undefined> {
    return Array.from(this.featureUsages.values()).find(
      fu => fu.userId === userId && fu.featureName === featureName
    );
  }
  
  async getFeatureUsageStats(featureName: string): Promise<{
    totalUsageCount: number,
    uniqueUsers: number,
    avgUseTime?: number
  }> {
    const usages = Array.from(this.featureUsages.values())
      .filter(fu => fu.featureName === featureName);
    
    if (usages.length === 0) {
      return {
        totalUsageCount: 0,
        uniqueUsers: 0
      };
    }
    
    const totalUsageCount = usages.reduce((sum, fu) => sum + (fu.usageCount || 0), 0);
    const uniqueUserIds = new Set(usages.map(fu => fu.userId));
    
    // Calculate average use time if available
    const usagesWithTime = usages.filter(fu => fu.useTime !== null && fu.useTime !== undefined);
    let avgUseTime: number | undefined = undefined;
    
    if (usagesWithTime.length > 0) {
      const totalTime = usagesWithTime.reduce((sum, fu) => sum + (fu.useTime || 0), 0);
      avgUseTime = totalTime / usagesWithTime.length;
    }
    
    return {
      totalUsageCount,
      uniqueUsers: uniqueUserIds.size,
      avgUseTime
    };
  }
  
  // Industry Benchmark methods
  async addIndustryBenchmark(benchmark: InsertIndustryBenchmark): Promise<IndustryBenchmark> {
    const id = this.currentIndustryBenchmarkId++;
    const newBenchmark: IndustryBenchmark = {
      id,
      industry: benchmark.industry,
      subIndustry: benchmark.subIndustry,
      metricName: benchmark.metricName,
      metricValue: benchmark.metricValue,
      entitySizeRange: benchmark.entitySizeRange,
      year: benchmark.year,
      quarter: benchmark.quarter,
      dataSource: benchmark.dataSource,
      confidenceLevel: benchmark.confidenceLevel,
      sampleSize: benchmark.sampleSize,
      createdAt: new Date(),
      updatedAt: null
    };
    
    this.industryBenchmarks.set(id, newBenchmark);
    return newBenchmark;
  }
  
  async getIndustryBenchmarks(industry: string, year: number): Promise<IndustryBenchmark[]> {
    return Array.from(this.industryBenchmarks.values())
      .filter(benchmark => benchmark.industry === industry && benchmark.year === year);
  }
  
  async getBenchmarksByMetric(metricName: string): Promise<IndustryBenchmark[]> {
    return Array.from(this.industryBenchmarks.values())
      .filter(benchmark => benchmark.metricName === metricName)
      .sort((a, b) => {
        // Sort by year descending, then by quarter descending if available
        if (a.year !== b.year) return b.year - a.year;
        const aQuarter = a.quarter || 0;
        const bQuarter = b.quarter || 0;
        return bQuarter - aQuarter;
      });
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
    
    // Find latest benchmarks for each requested metric
    const benchmarks = [];
    for (const metricName of metricNames) {
      const metricBenchmarks = Array.from(this.industryBenchmarks.values())
        .filter(bm => bm.industry === entity.industry && bm.metricName === metricName)
        .sort((a, b) => {
          // Sort by year descending, then by quarter descending
          if (a.year !== b.year) return b.year - a.year;
          const aQuarter = a.quarter || 0;
          const bQuarter = b.quarter || 0;
          return bQuarter - aQuarter;
        });
      
      // Get the most recent benchmark for this metric
      if (metricBenchmarks.length > 0) {
        benchmarks.push(metricBenchmarks[0]);
      }
    }
    
    // Process the benchmarks for the comparison
    const comparison = metricNames.reduce((result, metricName) => {
      const benchmark = benchmarks.find(bm => bm.metricName === metricName);
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
      industryBenchmarks: benchmarks,
      comparison
    };
  }
  
  // Data Consent methods
  async recordDataConsent(consent: InsertDataConsent): Promise<DataConsent> {
    const id = this.currentDataConsentId++;
    const now = new Date();
    
    const newConsent: DataConsent = {
      id,
      userId: consent.userId,
      entityId: consent.entityId,
      consentType: consent.consentType,
      granted: consent.granted || false,
      grantedAt: consent.granted ? now : null,
      revokedAt: !consent.granted ? now : null,
      consentVersion: consent.consentVersion,
      ipAddress: consent.ipAddress,
      lastUpdated: now
    };
    
    this.dataConsents.set(id, newConsent);
    return newConsent;
  }
  
  async getUserConsent(userId: number, consentType: string): Promise<DataConsent | undefined> {
    // Get all consents for this user and type, sorted by last updated
    const userConsents = Array.from(this.dataConsents.values())
      .filter(consent => consent.userId === userId && consent.consentType === consentType)
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
    
    // Return the most recent consent record if any
    return userConsents.length > 0 ? userConsents[0] : undefined;
  }
  
  async updateUserConsent(id: number, granted: boolean): Promise<DataConsent | undefined> {
    const consent = this.dataConsents.get(id);
    if (!consent) return undefined;
    
    const now = new Date();
    const updatedConsent: DataConsent = {
      ...consent,
      granted,
      lastUpdated: now,
      grantedAt: granted ? now : consent.grantedAt,
      revokedAt: !granted ? now : consent.revokedAt
    };
    
    this.dataConsents.set(id, updatedConsent);
    return updatedConsent;
  }
  
  async hasUserConsented(userId: number, consentType: string): Promise<boolean> {
    const consent = await this.getUserConsent(userId, consentType);
    return !!consent && !!consent.granted;
  }
  
  // Contact Form submission methods
  async createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission> {
    const id = this.currentContactSubmissionId++;
    const now = new Date();
    
    const newSubmission: ContactSubmission = {
      id,
      name: submission.name,
      email: submission.email,
      phone: submission.phone || null,
      message: submission.message,
      ipAddress: submission.ipAddress || null,
      userAgent: submission.userAgent || null,
      status: submission.status || 'unread',
      createdAt: now,
      updatedAt: now
    };
    
    this.contactSubmissions.set(id, newSubmission);
    return newSubmission;
  }
  
  async getContactSubmissions(limit: number = 100, offset: number = 0): Promise<ContactSubmission[]> {
    return Array.from(this.contactSubmissions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }
  
  async getContactSubmissionById(id: number): Promise<ContactSubmission | undefined> {
    return this.contactSubmissions.get(id);
  }
  
  async updateContactSubmission(id: number, status: string): Promise<ContactSubmission | undefined> {
    const submission = this.contactSubmissions.get(id);
    if (!submission) return undefined;
    
    const updatedSubmission = { 
      ...submission, 
      status,
      updatedAt: new Date()
    };
    
    this.contactSubmissions.set(id, updatedSubmission);
    return updatedSubmission;
  }
  
  // Checklist Form submission methods
  async createChecklistSubmission(submission: InsertChecklistSubmission): Promise<ChecklistSubmission> {
    const id = this.currentChecklistSubmissionId++;
    const now = new Date();
    
    const newSubmission: ChecklistSubmission = {
      id,
      name: submission.name,
      email: submission.email,
      company: submission.company,
      revenueRange: submission.revenueRange,
      ipAddress: submission.ipAddress || null,
      userAgent: submission.userAgent || null,
      status: submission.status || 'unread',
      createdAt: now
    };
    
    this.checklistSubmissions.set(id, newSubmission);
    return newSubmission;
  }
  
  async getChecklistSubmissions(limit: number = 100, offset: number = 0): Promise<ChecklistSubmission[]> {
    return Array.from(this.checklistSubmissions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }
  
  async getChecklistSubmissionById(id: number): Promise<ChecklistSubmission | undefined> {
    return this.checklistSubmissions.get(id);
  }
  
  async updateChecklistSubmission(id: number, status: string): Promise<ChecklistSubmission | undefined> {
    const submission = this.checklistSubmissions.get(id);
    if (!submission) return undefined;
    
    const updatedSubmission = { 
      ...submission, 
      status
    };
    
    this.checklistSubmissions.set(id, updatedSubmission);
    return updatedSubmission;
  }
  
  // Consultation Form submission methods
  async createConsultationSubmission(submission: InsertConsultationSubmission): Promise<ConsultationSubmission> {
    const id = this.currentConsultationSubmissionId++;
    const now = new Date();
    
    const newSubmission: ConsultationSubmission = {
      id,
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
      status: submission.status || 'unread',
      createdAt: now
    };
    
    this.consultationSubmissions.set(id, newSubmission);
    return newSubmission;
  }
  
  async getConsultationSubmissions(limit: number = 100, offset: number = 0): Promise<ConsultationSubmission[]> {
    return Array.from(this.consultationSubmissions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }
  
  async getConsultationSubmissionById(id: number): Promise<ConsultationSubmission | undefined> {
    return this.consultationSubmissions.get(id);
  }
  
  async updateConsultationSubmission(id: number, status: string): Promise<ConsultationSubmission | undefined> {
    const submission = this.consultationSubmissions.get(id);
    if (!submission) return undefined;
    
    const updatedSubmission = { 
      ...submission, 
      status
    };
    
    this.consultationSubmissions.set(id, updatedSubmission);
    return updatedSubmission;
  }

  // Blog Subscribers methods
  async createBlogSubscriber(subscriber: InsertBlogSubscriber): Promise<BlogSubscriber> {
    const id = this.currentBlogSubscriberId++;
    const newSubscriber: BlogSubscriber = {
      id,
      email: subscriber.email,
      name: subscriber.name || null,
      subscriptionDate: new Date(),
      confirmedAt: null,
      confirmed: false,
      unsubscribedAt: null,
      active: true,
      ipAddress: subscriber.ipAddress || null,
      userAgent: subscriber.userAgent || null,
      lastEmailSent: null,
      emailCount: 0
    };
    
    this.blogSubscribers.set(id, newSubscriber);
    return newSubscriber;
  }
  
  async getBlogSubscribers(includeInactive: boolean = false): Promise<BlogSubscriber[]> {
    if (includeInactive) {
      return Array.from(this.blogSubscribers.values());
    } else {
      return Array.from(this.blogSubscribers.values())
        .filter(subscriber => subscriber.active);
    }
  }
  
  async getBlogSubscriberByEmail(email: string): Promise<BlogSubscriber | undefined> {
    return Array.from(this.blogSubscribers.values())
      .find(subscriber => subscriber.email.toLowerCase() === email.toLowerCase());
  }
  
  async updateBlogSubscriber(id: number, data: Partial<BlogSubscriber>): Promise<BlogSubscriber | undefined> {
    const subscriber = this.blogSubscribers.get(id);
    if (!subscriber) return undefined;
    
    const updatedSubscriber = { ...subscriber, ...data };
    this.blogSubscribers.set(id, updatedSubscriber);
    return updatedSubscriber;
  }
  
  async deleteBlogSubscriber(id: number): Promise<void> {
    this.blogSubscribers.delete(id);
  }
  
  // Location methods
  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }
  
  async listLocationsByClient(clientId: number): Promise<Location[]> {
    return Array.from(this.locations.values())
      .filter(location => location.clientId === clientId);
  }
  
  async createLocation(location: InsertLocation): Promise<Location> {
    const id = this.currentLocationId++;
    const newLocation: Location = {
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      name: location.name,
      code: location.code || null,
      description: location.description || null,
      clientId: location.clientId,
      isActive: location.isActive !== undefined ? location.isActive : true,
      address: location.address || null,
      city: location.city || null,
      state: location.state || null,
      country: location.country || null,
      postalCode: location.postalCode || null
    };
    
    this.locations.set(id, newLocation);
    return newLocation;
  }
  
  async updateLocation(id: number, data: Partial<Location>): Promise<Location | undefined> {
    const location = this.locations.get(id);
    if (!location) return undefined;
    
    const updatedLocation: Location = {
      ...location,
      ...data,
      updatedAt: new Date()
    };
    
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }
  
  async setLocationActiveStatus(id: number, isActive: boolean): Promise<boolean> {
    const location = this.locations.get(id);
    if (!location) return false;
    
    location.isActive = isActive;
    location.updatedAt = new Date();
    this.locations.set(id, location);
    
    return true;
  }

  // Budget methods
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

  // Consolidation Group methods
  async getConsolidationGroup(id: number): Promise<ConsolidationGroup | undefined> {
    return this.consolidationGroups.get(id);
  }

  async getConsolidationGroups(userId: number): Promise<ConsolidationGroup[]> {
    return Array.from(this.consolidationGroups.values())
      .filter(group => group.createdBy === userId);
  }

  async getConsolidationGroupsByEntity(entityId: number): Promise<ConsolidationGroup[]> {
    // In a real database implementation, this would use a join with the junction table
    // For MemStorage, we retrieve all consolidation groups and check if the entity
    // is associated with each group through our getConsolidationGroupEntities method
    
    const activeGroups = Array.from(this.consolidationGroups.values())
      .filter(group => group.isActive);
    
    // Check each active group to see if it contains this entity
    const result: ConsolidationGroup[] = [];
    
    for (const group of activeGroups) {
      const entities = await this.getConsolidationGroupEntities(group.id);
      if (entities.includes(entityId)) {
        result.push(group);
      }
    }
    
    return result;
  }
  
  async getConsolidationGroupEntities(groupId: number): Promise<number[]> {
    // For MemStorage implementation, use the junction table map
    if (this.consolidationGroupEntitiesMap.has(groupId)) {
      return Array.from(this.consolidationGroupEntitiesMap.get(groupId) || []);
    }
    return [];
  }

  async createConsolidationGroup(group: InsertConsolidationGroup): Promise<ConsolidationGroup> {
    const id = this.currentConsolidationGroupId++;
    const newGroup: ConsolidationGroup = {
      id,
      name: group.name,
      description: group.description || null,
      createdBy: group.createdBy,
      ownerId: group.ownerId, 
      currency: group.currency || 'USD',
      startDate: group.startDate,
      endDate: group.endDate,
      isActive: group.isActive !== undefined ? group.isActive : true,
      createdAt: new Date(),
      updatedAt: null,
      lastRun: null,
      periodType: group.periodType || BudgetPeriodType.MONTHLY,
      rules: group.rules || {}
    };
    
    this.consolidationGroups.set(id, newGroup);
    
    // Handle initialEntityId if provided
    if (group.initialEntityId) {
      if (!this.consolidationGroupEntitiesMap.has(id)) {
        this.consolidationGroupEntitiesMap.set(id, new Set());
      }
      this.consolidationGroupEntitiesMap.get(id)?.add(group.initialEntityId);
    }
    
    return newGroup as ConsolidationGroup;
  }

  async updateConsolidationGroup(id: number, group: Partial<ConsolidationGroup>): Promise<ConsolidationGroup | undefined> {
    const existingGroup = this.consolidationGroups.get(id);
    if (!existingGroup) return undefined;
    
    const updatedGroup = { ...existingGroup, ...group, updatedAt: new Date() };
    this.consolidationGroups.set(id, updatedGroup);
    return updatedGroup;
  }

  async deleteConsolidationGroup(id: number): Promise<void> {
    // Remove the group from the consolidation groups map
    this.consolidationGroups.delete(id);
    
    // Remove all entity associations for this group from the junction table map
    this.consolidationGroupEntitiesMap.delete(id);
  }

  async addEntityToConsolidationGroup(groupId: number, entityId: number): Promise<ConsolidationGroup> {
    const group = await this.getConsolidationGroup(groupId);
    if (!group) throw new Error(`Consolidation group with ID ${groupId} not found`);
    
    // Check if entity exists
    const entity = await this.getEntity(entityId);
    if (!entity) throw new Error(`Entity with ID ${entityId} not found`);
    
    // First check if entity already exists in the group
    const existingEntities = await this.getConsolidationGroupEntities(groupId);
    if (!existingEntities.includes(entityId)) {
      // Add entity to the consolidation group via the junction table map
      if (!this.consolidationGroupEntitiesMap.has(groupId)) {
        this.consolidationGroupEntitiesMap.set(groupId, new Set());
      }
      this.consolidationGroupEntitiesMap.get(groupId)?.add(entityId);
      
      // Update the group's updatedAt timestamp
      const updatedGroup = await this.updateConsolidationGroup(groupId, { updatedAt: new Date() });
      if (!updatedGroup) throw new Error(`Failed to update consolidation group ${groupId}`);
      
      return updatedGroup;
    }
    
    // Return the group if entity was already in the group
    return group;
  }

  async removeEntityFromConsolidationGroup(groupId: number, entityId: number): Promise<ConsolidationGroup> {
    const group = await this.getConsolidationGroup(groupId);
    if (!group) throw new Error(`Consolidation group with ID ${groupId} not found`);
    
    // Check if entity exists in the group
    const existingEntities = await this.getConsolidationGroupEntities(groupId);
    if (existingEntities.includes(entityId)) {
      // Remove entity from the consolidation group via the junction table map
      if (this.consolidationGroupEntitiesMap.has(groupId)) {
        const entitySet = this.consolidationGroupEntitiesMap.get(groupId);
        if (entitySet) {
          entitySet.delete(entityId);
        }
      }
      
      // Update the group's updatedAt timestamp
      const updatedGroup = await this.updateConsolidationGroup(groupId, { updatedAt: new Date() });
      if (!updatedGroup) throw new Error(`Failed to update consolidation group ${groupId}`);
      
      return updatedGroup;
    }
    
    // Return the group if entity was not in the group
    return group;
  }

  async generateConsolidatedReport(groupId: number, reportType: ReportType, startDate?: Date, endDate?: Date): Promise<any> {
    const group = await this.getConsolidationGroup(groupId);
    if (!group) throw new Error(`Consolidation group with ID ${groupId} not found`);
    
    // Get entity IDs from the consolidation group entities
    const entityIds = await this.getConsolidationGroupEntities(groupId);
    
    if (entityIds.length === 0) {
      throw new Error('Cannot generate consolidated report for an empty group');
    }
    
    // Set default dates if not provided
    const effectiveEndDate = endDate || new Date();
    let effectiveStartDate = startDate;
    
    if (!effectiveStartDate) {
      // Default to beginning of fiscal year
      // Use the first entity in the group's entities as the primary entity
      const primaryEntity = entityIds.length > 0 
        ? await this.getEntity(entityIds[0])
        : null;
      
      if (primaryEntity) {
        const fiscalYearStart = primaryEntity.fiscalYearStart || '01-01'; // Default to Jan 1
        const [month, day] = fiscalYearStart.split('-').map(Number);
        
        effectiveStartDate = new Date(effectiveEndDate.getFullYear(), month - 1, day);
        if (effectiveStartDate > effectiveEndDate) {
          // If fiscal year start is after the end date, use previous year
          effectiveStartDate.setFullYear(effectiveStartDate.getFullYear() - 1);
        }
      } else {
        // Default to 1 year ago
        effectiveStartDate = new Date(effectiveEndDate);
        effectiveStartDate.setFullYear(effectiveStartDate.getFullYear() - 1);
      }
    }
    
    // Generate reports for each entity in the group
    const entityReports = await Promise.all(entityIds.map(async (entityId) => {
      let report;
      
      switch (reportType) {
        case ReportType.BALANCE_SHEET:
          report = await this.generateBalanceSheet(entityId, effectiveEndDate);
          break;
        case ReportType.INCOME_STATEMENT:
          report = await this.generateIncomeStatement(entityId, effectiveStartDate, effectiveEndDate);
          break;
        case ReportType.CASH_FLOW:
          report = await this.generateCashFlow(entityId, effectiveStartDate, effectiveEndDate);
          break;
        case ReportType.TRIAL_BALANCE:
          report = await this.generateTrialBalance(entityId, effectiveStartDate, effectiveEndDate);
          break;
        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }
      
      return { entityId, report };
    }));
    
    // Consolidate the reports based on report type
    let consolidatedReport;
    
    switch (reportType) {
      case ReportType.BALANCE_SHEET:
        consolidatedReport = this.consolidateBalanceSheets(entityReports.map(er => er.report));
        break;
      case ReportType.INCOME_STATEMENT:
        consolidatedReport = this.consolidateIncomeStatements(entityReports.map(er => er.report));
        break;
      case ReportType.CASH_FLOW:
        consolidatedReport = this.consolidateCashFlows(entityReports.map(er => er.report));
        break;
      case ReportType.TRIAL_BALANCE:
        consolidatedReport = this.consolidateTrialBalances(entityReports.map(er => er.report));
        break;
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
    
    // Update last run timestamp
    await this.updateConsolidationGroup(groupId, { lastRun: new Date() });
    
    return {
      ...consolidatedReport,
      entities: entityIds, // Use the junction table entities instead of entity_ids
      groupName: group.name,
      groupId: group.id,
      reportType,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      generatedAt: new Date()
    };
  }
  
  // Helper methods for consolidation
  private consolidateBalanceSheets(reports: any[]): any {
    // Initialize consolidated structure
    const consolidated = {
      assets: [] as any[],
      liabilities: [] as any[],
      equity: [] as any[],
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      liabilitiesAndEquity: 0
    };
    
    // Mapping to track accounts across entities by code
    const accountMap: {[code: string]: any} = {};
    
    // Process each entity's report
    reports.forEach(report => {
      // Process assets
      if (report.assets) {
        report.assets.forEach((asset: any) => {
          const key = `${asset.accountCode || ''}-${asset.accountName}`;
          if (!accountMap[key]) {
            accountMap[key] = {
              accountId: asset.accountId,
              accountName: asset.accountName,
              accountCode: asset.accountCode,
              balance: 0
            };
            consolidated.assets.push(accountMap[key]);
          }
          accountMap[key].balance += asset.balance;
        });
      }
      
      // Process liabilities
      if (report.liabilities) {
        report.liabilities.forEach((liability: any) => {
          const key = `${liability.accountCode || ''}-${liability.accountName}`;
          if (!accountMap[key]) {
            accountMap[key] = {
              accountId: liability.accountId,
              accountName: liability.accountName,
              accountCode: liability.accountCode,
              balance: 0
            };
            consolidated.liabilities.push(accountMap[key]);
          }
          accountMap[key].balance += liability.balance;
        });
      }
      
      // Process equity
      if (report.equity) {
        report.equity.forEach((equity: any) => {
          const key = `${equity.accountCode || ''}-${equity.accountName}`;
          if (!accountMap[key]) {
            accountMap[key] = {
              accountId: equity.accountId,
              accountName: equity.accountName,
              accountCode: equity.accountCode,
              balance: 0
            };
            consolidated.equity.push(accountMap[key]);
          }
          accountMap[key].balance += equity.balance;
        });
      }
    });
    
    // Calculate totals
    consolidated.totalAssets = consolidated.assets.reduce((sum, asset) => sum + asset.balance, 0);
    consolidated.totalLiabilities = consolidated.liabilities.reduce((sum, liability) => sum + liability.balance, 0);
    consolidated.totalEquity = consolidated.equity.reduce((sum, equity) => sum + equity.balance, 0);
    consolidated.liabilitiesAndEquity = consolidated.totalLiabilities + consolidated.totalEquity;
    
    return consolidated;
  }
  
  private consolidateIncomeStatements(reports: any[]): any {
    // Initialize consolidated structure
    const consolidated = {
      revenue: [] as any[],
      expenses: [] as any[],
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0
    };
    
    // Mapping to track accounts across entities by code
    const accountMap: {[code: string]: any} = {};
    
    // Process each entity's report
    reports.forEach(report => {
      // Process revenue
      if (report.revenue) {
        report.revenue.forEach((rev: any) => {
          const key = `${rev.accountCode || ''}-${rev.accountName}`;
          if (!accountMap[key]) {
            accountMap[key] = {
              accountId: rev.accountId,
              accountName: rev.accountName,
              accountCode: rev.accountCode,
              balance: 0
            };
            consolidated.revenue.push(accountMap[key]);
          }
          accountMap[key].balance += rev.balance;
        });
      }
      
      // Process expenses
      if (report.expenses) {
        report.expenses.forEach((expense: any) => {
          const key = `${expense.accountCode || ''}-${expense.accountName}`;
          if (!accountMap[key]) {
            accountMap[key] = {
              accountId: expense.accountId,
              accountName: expense.accountName,
              accountCode: expense.accountCode,
              balance: 0
            };
            consolidated.expenses.push(accountMap[key]);
          }
          accountMap[key].balance += expense.balance;
        });
      }
    });
    
    // Calculate totals
    consolidated.totalRevenue = consolidated.revenue.reduce((sum, rev) => sum + rev.balance, 0);
    consolidated.totalExpenses = consolidated.expenses.reduce((sum, expense) => sum + expense.balance, 0);
    consolidated.netIncome = consolidated.totalRevenue - consolidated.totalExpenses;
    
    return consolidated;
  }
  
  private consolidateCashFlows(reports: any[]): any {
    // Initialize consolidated structure
    const consolidated = {
      cashFlows: [] as any[],
      netCashFlow: 0
    };
    
    // Track cash flow categories and items
    const categories: {[category: string]: any} = {};
    
    // Process each entity's report
    reports.forEach(report => {
      if (report.cashFlows) {
        report.cashFlows.forEach((cf: any) => {
          if (!categories[cf.category]) {
            categories[cf.category] = {
              category: cf.category,
              items: [],
              total: 0
            };
            consolidated.cashFlows.push(categories[cf.category]);
          }
          
          // Map items by name
          if (cf.items) {
            cf.items.forEach((item: any) => {
              const existingItem = categories[cf.category].items.find(
                (i: any) => i.accountName === item.accountName
              );
              
              if (existingItem) {
                existingItem.balance += item.balance;
              } else {
                categories[cf.category].items.push({...item});
              }
            });
          }
          
          // Update category total
          categories[cf.category].total += cf.total;
        });
      }
    });
    
    // Calculate net cash flow
    consolidated.netCashFlow = consolidated.cashFlows.reduce((sum, cf) => sum + cf.total, 0);
    
    return consolidated;
  }
  
  private consolidateTrialBalances(reports: any[]): any {
    // Initialize consolidated structure
    const consolidated = {
      items: [] as any[],
      totalDebits: 0,
      totalCredits: 0
    };
    
    // Mapping to track accounts across entities by code
    const accountMap: {[code: string]: any} = {};
    
    // Process each entity's report
    reports.forEach(report => {
      if (report.items) {
        report.items.forEach((item: any) => {
          const key = `${item.accountCode || ''}-${item.accountName}`;
          if (!accountMap[key]) {
            accountMap[key] = {
              accountId: item.accountId,
              accountName: item.accountName,
              accountCode: item.accountCode,
              debit: 0,
              credit: 0,
              balance: 0
            };
            consolidated.items.push(accountMap[key]);
          }
          accountMap[key].debit += item.debit;
          accountMap[key].credit += item.credit;
          accountMap[key].balance = accountMap[key].debit - accountMap[key].credit;
        });
      }
    });
    
    // Calculate totals
    consolidated.totalDebits = consolidated.items.reduce((sum, item) => sum + item.debit, 0);
    consolidated.totalCredits = consolidated.items.reduce((sum, item) => sum + item.credit, 0);
    
    return consolidated;
  }

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
  // Chart of Accounts Seeding
  async seedClientCoA(clientId: number): Promise<void> {
    try {
      console.log(`SEEDING: Starting Chart of Accounts seed for client ID ${clientId}`);
      console.log(`SEEDING: VERIFICATION TEST - CoA seeding triggered at ${new Date().toISOString()}`);
      
      // Import the standard template
      const { standardCoaTemplate } = await import('./coaTemplate');
      console.log(`SEEDING: VERIFICATION TEST - Loaded template with ${standardCoaTemplate.length} accounts`);
      
      // Check if accounts already exist for this client
      const existingAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.clientId, clientId))
        .limit(1);
      
      if (existingAccounts.length > 0) {
        console.log(`SEEDING: Client ${clientId} already has accounts configured. Skipping seed.`);
        return;
      }
      
      // Map to store account codes to their generated IDs for parentId resolution
      const codeToIdMap = new Map<string, number>();
      
      // Use a transaction to ensure data consistency
      await db.transaction(async (tx) => {
        console.log(`SEEDING: Processing ${standardCoaTemplate.length} account records in transaction`);
        
        // Process each template account
        for (const templateAccount of standardCoaTemplate) {
          // Determine parentId by looking up the parent code in our map
          let parentId: number | null = null;
          
          if (templateAccount.parentCode) {
            parentId = codeToIdMap.get(templateAccount.parentCode) || null;
            if (!parentId && templateAccount.parentCode) {
              console.warn(`SEEDING WARNING: Parent account with accountCode ${templateAccount.parentCode} not found for ${templateAccount.accountCode} (${templateAccount.name})`);
            }
          }
          
          // Insert the account
          const [newAccount] = await tx
            .insert(accounts)
            .values({
              clientId,
              accountCode: templateAccount.accountCode,
              name: templateAccount.name,
              type: templateAccount.type,
              subtype: templateAccount.subtype,
              isSubledger: templateAccount.isSubledger || false,
              subledgerType: templateAccount.subledgerType,
              parentId,
              description: templateAccount.description,
              active: true
            })
            .returning({ id: accounts.id });
          
          // Store the generated ID mapped to the account code
          if (newAccount && newAccount.id) {
            codeToIdMap.set(templateAccount.accountCode, newAccount.id);
          } else {
            console.error(`SEEDING ERROR: Failed to insert account ${templateAccount.accountCode}`);
          }
        }
      });
      
      console.log(`SEEDING: Successfully seeded ${standardCoaTemplate.length} accounts for client ID: ${clientId}`);
    } catch (error) {
      console.error(`SEEDING ERROR: Failed to seed Chart of Accounts for client ${clientId}:`, error);
      throw error;
    }
  }
  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    const result = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);
      
    return result[0];
  }
  
  async getClients(): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .orderBy(asc(clients.name));
  }
  
  async getClientsByUserId(userId: number): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(eq(clients.userId, userId))
      .orderBy(asc(clients.name));
  }
  
  async getClientByUserId(userId: number): Promise<Client | null> {
    try {
      const results = await db
        .select()
        .from(clients)
        .where(eq(clients.userId, userId))
        .limit(1);
      
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error("Error in getClientByUserId:", error);
      return null;
    }
  }

  async createClient(client: InsertClient): Promise<Client> {
    // Note: We previously checked for existing clients and updated them,
    // but this caused a bug where clients were being replaced/deleted
    // when creating new clients during the setup process. Now we always
    // create a new client regardless of whether the user already has one.
    
    // Always create a new client
    const [result] = await db
      .insert(clients)
      .values({
        name: client.name,
        userId: client.userId,
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
        referralSource: client.referralSource || null
      })
      .returning();
    
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
    const [result] = await db
      .update(clients)
      .set({
        ...clientData,
        updatedAt: new Date()
      })
      .where(eq(clients.id, id))
      .returning();
    return result;
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
    // Check if ID exceeds PostgreSQL integer range (2147483647)
    if (id > 2147483647) {
      console.log(`DEBUG Storage.getEntity: ID ${id} exceeds PostgreSQL integer range`);
      throw new Error(`Cannot query database with temporary ID ${id} - value exceeds integer range`);
    }
    
    const [entity] = await db.select().from(entities).where(eq(entities.id, id));
    return entity || undefined;
  }

  async getEntities(): Promise<Entity[]> {
    return await db.select().from(entities);
  }

  async getEntitiesByUser(userId: number): Promise<Entity[]> {
    const userEntities = await db
      .select()
      .from(entities)
      .where(eq(entities.ownerId, userId))
      .orderBy(entities.name);
    
    const accessEntities = await db
      .select({
        entity: entities
      })
      .from(userEntityAccess)
      .innerJoin(entities, eq(userEntityAccess.entityId, entities.id))
      .where(eq(userEntityAccess.userId, userId));
    
    const accessEntitiesData = accessEntities.map(row => row.entity);
    
    // Combine both sets of entities and return unique by ID
    const combinedEntities = [...userEntities, ...accessEntitiesData];
    const uniqueEntities = combinedEntities.filter((entity, index, self) =>
      index === self.findIndex((e) => e.id === entity.id)
    );
    
    return uniqueEntities;
  }

  async getEntitiesByClient(clientId: number): Promise<Entity[]> {
    return await db
      .select()
      .from(entities)
      .where(eq(entities.clientId, clientId))
      .orderBy(entities.name);
  }

  async createEntity(insertEntity: InsertEntity): Promise<Entity> {
    console.log("DEBUG DB CreateEntity: Creating new entity with data:", JSON.stringify(insertEntity));
    
    // Process industry data for consistency, similar to updateEntity method
    let industryValue = insertEntity.industry;
    
    // Handle null/empty values
    if (industryValue === null || industryValue === '' || industryValue === undefined) {
      console.log("DEBUG DB CreateEntity: Empty/null industry provided, defaulting to 'other'");
      industryValue = 'other';
    } else {
      // Ensure industry is stored as string regardless of input type (number, etc.)
      console.log(`DEBUG DB CreateEntity: Converting industry value "${industryValue}" (${typeof industryValue}) to string for storage consistency`);
      industryValue = String(industryValue);
    }
    
    console.log(`DEBUG DB CreateEntity: Final industry value to be stored: "${industryValue}"`);
    
    try {
      // Use Drizzle ORM for entity creation, but ensure industry is properly set
      const [result] = await db
        .insert(entities)
        .values({
          name: insertEntity.name,
          code: insertEntity.code,
          ownerId: insertEntity.ownerId,
          clientId: insertEntity.clientId || null,
          active: insertEntity.active ?? true,
          fiscalYearStart: insertEntity.fiscalYearStart ?? "01-01",
          fiscalYearEnd: insertEntity.fiscalYearEnd ?? "12-31",
          taxId: insertEntity.taxId || null,
          address: insertEntity.address || null,
          phone: insertEntity.phone || null,
          website: insertEntity.website || null,
          currency: insertEntity.currency ?? "USD",
          industry: industryValue // Explicitly include processed industry value
        })
        .returning();
      
      if (result) {
        console.log("DEBUG DB CreateEntity: Entity created successfully with Drizzle ORM. Industry value:", result.industry);
        
        // Verify the industry value was stored correctly
        if (result.industry !== industryValue) {
          console.log(`DEBUG DB CreateEntity: WARNING - Industry mismatch after creation. Expected "${industryValue}" but got "${result.industry}"`);
          
          // Fix it with a direct update if needed
          const updatedEntity = await this.updateEntity(result.id, { industry: industryValue });
          
          if (updatedEntity) {
            console.log(`DEBUG DB CreateEntity: Fixed industry value to "${updatedEntity.industry}"`);
            return updatedEntity;
          }
        }
        
        return result;
      } else {
        throw new Error("Entity creation failed - no result returned from insertion");
      }
    } catch (error) {
      console.error("DEBUG DB CreateEntity: Error creating entity:", error);
      
      // Fallback to direct SQL if ORM approach fails
      try {
        console.log("DEBUG DB CreateEntity: Falling back to direct SQL for entity creation");
        
        // Use the same approach that worked in our test
        const now = new Date();
        
        // Build the SQL query with just the essential fields
        const insertSql = `
          INSERT INTO entities (
            name, code, owner_id, client_id, active, 
            fiscal_year_start, fiscal_year_end, industry,
            created_at, updated_at, currency
          ) VALUES (
            $1, $2, $3, $4, $5, 
            $6, $7, $8,
            $9, $10, $11
          ) RETURNING *
        `;
        
        // Prepare parameters with proper defaults
        const params = [
          insertEntity.name,
          insertEntity.code,
          insertEntity.ownerId,
          insertEntity.clientId || null,
          insertEntity.active ?? true,
          insertEntity.fiscalYearStart ?? "01-01",
          insertEntity.fiscalYearEnd ?? "12-31",
          industryValue, // Explicitly include processed industry value
          now, // created_at
          now, // updated_at
          insertEntity.currency ?? "USD"
        ];
        
        console.log("DEBUG DB CreateEntity: Executing SQL with parameters:", params);
        
        // Import pool from ./db at the top of the file if not already imported
        const { pool } = require('./db');
        
        const result = await pool.query(insertSql, params);
        
        if (result.rows && result.rows.length > 0) {
          const entity = result.rows[0];
          console.log("DEBUG DB CreateEntity: Entity created successfully with SQL. Industry value:", entity.industry);
          
          // Now fetch the complete entity with the ORM to ensure consistent types
          const [fullEntity] = await db
            .select()
            .from(entities)
            .where(eq(entities.id, entity.id));
            
          if (fullEntity) {
            return fullEntity;
          }
          
          // If that fails, manually convert from SQL result
          return {
            id: entity.id,
            name: entity.name,
            code: entity.code,
            ownerId: entity.owner_id,
            clientId: entity.client_id,
            active: entity.active,
            fiscalYearStart: entity.fiscal_year_start,
            fiscalYearEnd: entity.fiscal_year_end,
            industry: entity.industry,
            createdAt: entity.created_at,
            updatedAt: entity.updated_at,
            currency: entity.currency,
            // Set reasonable defaults for required fields
            taxId: entity.tax_id || null,
            address: entity.address || null,
            phone: entity.phone || null,
            email: null,
            website: entity.website || null,
            referralSource: null,
            userId: entity.user_id || 0,
            contactName: null,
            contactEmail: null,
            contactPhone: null,
            fiscalYearLocked: false,
            notes: null,
            state: null,
            city: null,
            country: null,
            postalCode: null,
            subIndustry: null,
            employeeCount: null,
            foundedYear: null,
            stockSymbol: null,
            registrationNumber: null,
            taxExempt: false,
            taxExemptId: null,
            fiscalYearType: null,
            lastTaxFiling: null,
            lastAuditDate: null
          } as Entity;
        } else {
          throw new Error("Entity creation failed - no rows returned from SQL insertion");
        }
      } catch (fallbackError) {
        console.error("DEBUG DB CreateEntity: Fallback approach also failed:", fallbackError);
        throw error; // Throw the original error
      }
    }
  }

  async updateEntity(id: number, entityData: Partial<Entity>): Promise<Entity | undefined> {
    console.log(`DEBUG DB UpdateEntity: Updating entity with ID ${id}`);
    console.log("DEBUG DB UpdateEntity: Received entity data:", JSON.stringify(entityData));
    
    // Check if ID exceeds PostgreSQL integer range (2147483647)
    if (id > 2147483647) {
      console.log(`DEBUG DB UpdateEntity: ID ${id} exceeds PostgreSQL integer range`);
      throw new Error(`Cannot update database with temporary ID ${id} - value exceeds integer range`);
    }
    
    // First get the existing entity to log what's changing
    const [existingEntity] = await db.select().from(entities).where(eq(entities.id, id));
    
    if (!existingEntity) {
      console.log(`DEBUG DB UpdateEntity: Entity with ID ${id} not found`);
      return undefined;
    }
    
    console.log("DEBUG DB UpdateEntity: Found existing entity:", JSON.stringify(existingEntity));
    
    // Additional log to check for name changes specifically
    if (entityData.name !== undefined) {
      console.log(`DEBUG DB UpdateEntity: Name update - Original: "${existingEntity.name}", New: "${entityData.name}"`);
    }
    
    // Process industry field if it's included in the update
    if ('industry' in entityData) {
      let industryValue = entityData.industry;
      
      // Handle null/empty values
      if (industryValue === null || industryValue === '' || industryValue === undefined) {
        console.log("DEBUG DB UpdateEntity: Empty/null industry provided, defaulting to 'other'");
        industryValue = 'other';
      } else {
        // Ensure industry is stored as string regardless of input type
        console.log(`DEBUG DB UpdateEntity: Converting industry value "${industryValue}" (${typeof industryValue}) to string for storage consistency`);
        industryValue = String(industryValue);
      }
      
      console.log(`DEBUG DB UpdateEntity: Final industry value to be stored: "${industryValue}"`);
      
      // Update the industry field in the data
      entityData.industry = industryValue;
    }
    
    // Add updatedAt timestamp to the update data
    const updateData = {
      ...entityData,
      updatedAt: new Date()
    };
    
    console.log("DEBUG DB UpdateEntity: Executing update query with data:", JSON.stringify(updateData));
    
    const [entity] = await db
      .update(entities)
      .set(updateData)
      .where(eq(entities.id, id))
      .returning();
    
    console.log("DEBUG DB UpdateEntity: Update complete, returned entity:", JSON.stringify(entity));
    
    return entity || undefined;
  }

  async getUserEntityAccess(userId: number, entityId: number): Promise<string | undefined> {
    const [access] = await db
      .select()
      .from(userEntityAccess)
      .where(and(
        eq(userEntityAccess.userId, userId),
        eq(userEntityAccess.entityId, entityId)
      ));
    return access?.accessLevel;
  }

  async grantUserEntityAccess(userId: number, entityId: number, accessLevel: string): Promise<void> {
    await db
      .insert(userEntityAccess)
      .values({ userId, entityId, accessLevel })
      .onConflictDoUpdate({
        target: [userEntityAccess.userId, userEntityAccess.entityId],
        set: { accessLevel }
      });
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id));
    return account || undefined;
  }

  async getAccounts(clientId: number): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(eq(accounts.clientId, clientId))
      .orderBy(accounts.accountCode);
  }

  async getAccountsByType(clientId: number, type: AccountType): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.clientId, clientId),
        eq(accounts.type, type)
      ))
      .orderBy(accounts.accountCode);
  }
  
  async getAccountsTree(clientId: number): Promise<AccountTreeNode[]> {
    // Get all accounts for the given client
    console.log(`DEBUG: getAccountsTree - Fetching accounts for clientId: ${clientId}`);
    
    let clientAccounts: any[] = [];
    
    try {
      // First get all accounts, then sort them in memory for complex sorting logic
      clientAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.clientId, clientId));

      // Sort accounts - first by active status (active first), then by accountCode
      clientAccounts.sort((a, b) => {
        // First sort by active status (active first)
        if (a.active !== b.active) {
          return a.active ? -1 : 1;
        }
        // Then sort by accountCode
        return a.accountCode.localeCompare(b.accountCode);
      });

      console.log(`DEBUG: getAccountsTree - Found ${clientAccounts.length} accounts`);
      
      if (clientAccounts.length === 0) {
        return [];
      }
    } catch (error) {
      console.error("DEBUG: getAccountsTree - Error fetching accounts:", error);
      throw error;
    }

    // Create a map of accounts by ID with empty children arrays
    const accountsMap: Record<number, AccountTreeNode> = {};
    
    // First pass: Add all accounts to the map with empty children arrays
    for (const account of clientAccounts) {
      accountsMap[account.id] = {
        ...account,
        children: []
      };
    }
    
    // Second pass: Populate children arrays based on parentId relationships
    const rootAccounts: AccountTreeNode[] = [];
    
    for (const account of clientAccounts) {
      if (account.parentId === null || account.parentId === undefined || !accountsMap[account.parentId]) {
        // This is a root account (no parent or parent doesn't exist in this client)
        rootAccounts.push(accountsMap[account.id]);
      } else {
        // This account has a parent, add it to the parent's children array
        accountsMap[account.parentId].children.push(accountsMap[account.id]);
      }
    }
    
    // Third pass: Recursively sort children arrays in each node by active status and then by accountCode
    const sortAccountNodes = (nodes: AccountTreeNode[]) => {
      // Sort the nodes array - active accounts first, then by accountCode
      nodes.sort((a, b) => {
        // First sort by active status (active first)
        if (a.active !== b.active) {
          return a.active ? -1 : 1;
        }
        // Then sort by accountCode
        return a.accountCode.localeCompare(b.accountCode);
      });
      
      // Recursively sort children
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          sortAccountNodes(node.children);
        }
      }
    };
    
    // Sort children at all levels
    for (const root of rootAccounts) {
      if (root.children && root.children.length > 0) {
        sortAccountNodes(root.children);
      }
    }
    
    return rootAccounts;
  }  
  // Implementation for Chart of Accounts export
  async getAccountsForClient(clientId: number): Promise<Account[]> {
    // We can reuse the getAccounts method as it already fetches accounts by clientId
    return this.getAccounts(clientId);
  }
  
  // Implementation for Chart of Accounts import
  async generateCoaImportPreview(clientId: number, fileBuffer: Buffer, fileName: string): Promise<ImportPreview> {
    console.log(`Generating Chart of Accounts import preview. Client ID: ${clientId}`);
    
    const preview: ImportPreview = {
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
    const result: ImportResult = {
      count: 0,     // Total accounts processed
      added: 0,     // New accounts added
      updated: 0,   // Existing accounts updated
      unchanged: 0, // Existing accounts unchanged
      skipped: 0,   // Accounts skipped (validation failure)
      inactive: 0,  // Accounts marked inactive
      deleted: 0,   // Accounts that were deleted
      errors: [],   // Error messages
      warnings: []  // Warning messages
    };
    
    return await db.transaction(async (tx) => {
      try {
        // ==================== STEP 1: Parse the file ====================
        let rows: any[] = [];
        console.log(`Parsing file for Chart of Accounts import. Client ID: ${clientId}`);
        
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
    console.log(`VERIFICATION TEST: storage.createAccount called with:`, JSON.stringify(insertAccount, null, 2));

    try {
      const [account] = await db
        .insert(accounts)
        .values({
          name: insertAccount.name,
          accountCode: insertAccount.accountCode,
          type: insertAccount.type,
          clientId: insertAccount.clientId,
          active: insertAccount.active ?? true,
          subtype: insertAccount.subtype,
          isSubledger: insertAccount.isSubledger ?? false,
          subledgerType: insertAccount.subledgerType,
          parentId: insertAccount.parentId,
          description: insertAccount.description
        })
        .returning();
      
      console.log(`VERIFICATION TEST: Account inserted successfully:`, JSON.stringify(account, null, 2));
      return account;
    } catch (error) {
      console.error(`VERIFICATION TEST: Error in createAccount:`, error);
      throw error;
    }
  }

  async updateAccount(id: number, accountData: Partial<Account>): Promise<Account | undefined> {
    const [account] = await db
      .update(accounts)
      .set(accountData)
      .where(eq(accounts.id, id))
      .returning();
    return account || undefined;
  }

  async deleteAccount(id: number): Promise<void> {
    // First check if this account has any transactions associated with it
    const journalLines = await db
      .select({ count: count() })
      .from(journalEntryLines)
      .where(eq(journalEntryLines.accountId, id));
    
    // If there are transactions, don't allow deletion
    if (journalLines[0]?.count > 0) {
      throw new Error('Cannot delete account with existing transactions. Mark it as inactive instead.');
    }
    
    // Check if this account has any child accounts
    const childAccounts = await db
      .select({ count: count() })
      .from(accounts)
      .where(eq(accounts.parentId, id));
    
    // If there are child accounts, don't allow deletion
    if (childAccounts[0]?.count > 0) {
      throw new Error('Cannot delete account with child accounts. Remove child accounts first or mark this account as inactive.');
    }
    
    // If no transactions and no child accounts exist, proceed with deletion
    await db
      .delete(accounts)
      .where(eq(accounts.id, id));
  }
  
  /**
   * Marks an account as inactive instead of deleting it
   * This is used when an account has transactions and cannot be deleted
   */
  async markAccountInactive(id: number): Promise<Account | undefined> {
    return this.updateAccount(id, { active: false });
  }
  
  /**
   * Checks if an account has any transactions
   */
  async accountHasTransactions(id: number): Promise<boolean> {
    const journalLines = await db
      .select({ count: count() })
      .from(journalEntryLines)
      .where(eq(journalEntryLines.accountId, id));
    
    return journalLines[0]?.count > 0;
  }

  async getJournalEntry(id: number): Promise<(JournalEntry & { lines: JournalEntryLine[] }) | undefined> {
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, id));
    
    if (!entry) return undefined;
    
    // Get the lines for this journal entry
    const lines = await this.getJournalEntryLines(id);
    
    return {
      ...entry,
      lines
    };
  }

  async getJournalEntries(entityId: number): Promise<JournalEntry[]> {
    return await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.entityId, entityId))
      .orderBy(desc(journalEntries.date));
  }
  
  async listJournalEntries(filters?: ListJournalEntriesFilters): Promise<JournalEntry[]> {
    let query = db.select().from(journalEntries);
    
    // Apply filters based on options
    if (filters) {
      const conditions = [];
      
      if (filters.clientId) {
        conditions.push(eq(journalEntries.clientId, filters.clientId));
      }
      
      if (filters.entityId) {
        conditions.push(eq(journalEntries.entityId, filters.entityId));
      }
      
      if (filters.startDate) {
        conditions.push(gte(journalEntries.date, filters.startDate));
      }
      
      if (filters.endDate) {
        conditions.push(lte(journalEntries.date, filters.endDate));
      }
      
      if (filters.status) {
        conditions.push(eq(journalEntries.status, filters.status));
      }
      
      if (filters.journalType) {
        conditions.push(eq(journalEntries.journalType, filters.journalType));
      }
      
      if (filters.referenceNumber) {
        conditions.push(like(journalEntries.referenceNumber, `%${filters.referenceNumber}%`));
      }
      
      // Apply all conditions if there are any
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      // Apply sorting
      let sortColumn;
      switch (filters.sortBy) {
        case 'date':
          sortColumn = journalEntries.date;
          break;
        case 'referenceNumber':
          sortColumn = journalEntries.referenceNumber;
          break;
        case 'description':
          sortColumn = journalEntries.description;
          break;
        default:
          sortColumn = journalEntries.date;
      }
      
      // Apply sort direction
      if (filters.sortDirection === 'asc') {
        query = query.orderBy(asc(sortColumn), journalEntries.id);
      } else {
        query = query.orderBy(desc(sortColumn), journalEntries.id);
      }
      
      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.offset(filters.offset);
      }
    } else {
      // Default order by date (most recent first) and then by ID if no filters specified
      query = query.orderBy(desc(journalEntries.date), journalEntries.id)
        .limit(25); // Default limit
    }
    
    return await query;
  }

  async getJournalEntriesByStatus(entityId: number, status: JournalEntryStatus): Promise<JournalEntry[]> {
    return await db
      .select()
      .from(journalEntries)
      .where(and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, status)
      ))
      .orderBy(desc(journalEntries.date));
  }

  async createJournalEntry(clientId: number, createdById: number, entryData: InsertJournalEntry, linesData: InsertJournalEntryLine[]): Promise<JournalEntry & { lines: JournalEntryLine[] }> {
    // Check if there's at least one line
    if (!linesData || linesData.length === 0) {
      throw new Error("Journal entry must have at least one line");
    }
    
    // Calculate the sum of debits and credits
    let totalDebits = 0;
    let totalCredits = 0;
    
    linesData.forEach(line => {
      const amount = parseFloat(line.amount.toString());
      
      if (line.type === 'debit') {
        totalDebits += amount;
      } else if (line.type === 'credit') {
        totalCredits += amount;
      }
    });
    
    // Verify that debits = credits (within a small epsilon for floating point comparisons)
    const epsilon = 0.001;
    if (Math.abs(totalDebits - totalCredits) > epsilon) {
      throw new Error("Journal entry must balance: total debits must equal total credits");
    }
    
    // Verify the total is not zero
    if (totalDebits < epsilon) {
      throw new Error("Journal entry total amount cannot be zero");
    }
    
    // Start a transaction for creating the entry and its lines
    return await db.transaction(async (tx) => {
      // Insert the journal entry
      const [entry] = await tx
        .insert(journalEntries)
        .values({
          clientId: entryData.clientId,
          entityId: entryData.entityId,
          date: entryData.date,
          referenceNumber: entryData.referenceNumber,
          description: entryData.description,
          isSystemGenerated: entryData.isSystemGenerated || false,
          status: entryData.status || 'draft',
          journalType: entryData.journalType || 'JE',
          supDocId: entryData.supDocId,
          reversalDate: entryData.reversalDate,
          isReversal: entryData.isReversal || false,
          reversedEntryId: entryData.reversedEntryId,
          isReversed: entryData.isReversed || false,
          reversedByEntryId: entryData.reversedByEntryId,
          requestedBy: entryData.requestedBy,
          requestedAt: entryData.requestedAt,
          approvedBy: entryData.approvedBy,
          approvedAt: entryData.approvedAt,
          rejectedBy: entryData.rejectedBy,
          rejectedAt: entryData.rejectedAt,
          rejectionReason: entryData.rejectionReason,
          postedBy: entryData.postedBy,
          postedAt: entryData.postedAt,
          createdBy: createdById
        })
        .returning();
      
      // Insert all journal entry lines
      const insertedLines: JournalEntryLine[] = [];
      
      for (const lineData of linesData) {
        const [line] = await tx
          .insert(journalEntryLines)
          .values({
            journalEntryId: entry.id,
            accountId: lineData.accountId,
            type: lineData.type,
            amount: lineData.amount,
            description: lineData.description,
            locationId: lineData.locationId,
            lineNo: lineData.lineNo,
            reference: lineData.reference,
            reconciled: lineData.reconciled || false,
            reconciledAt: lineData.reconciledAt,
            reconciledBy: lineData.reconciledBy
          })
          .returning();
        
        insertedLines.push(line);
      }
      
      // Return the full created entry with its lines
      return {
        ...entry,
        lines: insertedLines
      };
    });
  }

  async updateJournalEntry(id: number, entryData: Partial<JournalEntry>, linesData?: (Partial<JournalEntryLine> & { id?: number })[]): Promise<(JournalEntry & { lines: JournalEntryLine[] }) | undefined> {
    // Start a transaction for updating entry and its lines
    return await db.transaction(async (tx) => {
      // Get the existing entry first to check its status
      const [existingEntry] = await tx
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.id, id));
        
      if (!existingEntry) {
        throw new Error("Journal entry not found");
      }
      
      // Prevent updates to posted or voided entries (business rule)
      if (existingEntry.status === 'posted' || existingEntry.status === 'void') {
        // Allow only specific fields to be updated based on status
        if (entryData.status === 'void' && existingEntry.status === 'posted') {
          // Allow voiding a posted entry
        } else if (!entryData.description && Object.keys(entryData).length > 1) {
          // Only description changes are allowed for posted/voided entries
          throw new Error(`Cannot modify a journal entry with status '${existingEntry.status}' except for description`);
        }
      }
      
      // Update the journal entry
      const [updatedEntry] = await tx
        .update(journalEntries)
        .set({
          ...entryData,
          updatedAt: new Date()
        })
        .where(eq(journalEntries.id, id))
        .returning();
      
      if (!updatedEntry) return undefined;
      
      // If we have lines data and the entry is not posted/voided, update the lines
      if (linesData && linesData.length > 0 && existingEntry.status !== 'posted' && existingEntry.status !== 'void') {
        // Get existing lines to determine what needs to be deleted
        const existingLines = await tx
          .select()
          .from(journalEntryLines)
          .where(eq(journalEntryLines.journalEntryId, id));
        
        // Find line IDs that are in existingLines but not in linesData (to be deleted)
        const existingLineIds = existingLines.map(line => line.id);
        const updatedLineIds = linesData.filter(line => line.id).map(line => line.id);
        const linesToDelete = existingLineIds.filter(id => !updatedLineIds.includes(id));
        
        // Delete lines that are no longer needed
        for (const lineId of linesToDelete) {
          await tx
            .delete(journalEntryLines)
            .where(eq(journalEntryLines.id, lineId));
        }
        
        // Handle each line - either update existing or create new
        for (const lineData of linesData) {
          if (lineData.id) {
            // Update existing line
            await tx
              .update(journalEntryLines)
              .set({
                ...lineData,
                updatedAt: new Date()
              })
              .where(eq(journalEntryLines.id, lineData.id));
          } else {
            // Create new line
            await tx
              .insert(journalEntryLines)
              .values({
                journalEntryId: id,
                accountId: lineData.accountId!,
                type: lineData.type!,
                amount: lineData.amount!,
                description: lineData.description || null,
                locationId: lineData.locationId || null,
                lineNo: lineData.lineNo || null,
                reference: lineData.reference || null,
                reconciled: lineData.reconciled || false,
                reconciledAt: lineData.reconciledAt || null,
                reconciledBy: lineData.reconciledBy || null
              });
          }
        }
      }
      
      // Get the updated lines for this journal entry
      const lines = await tx
        .select()
        .from(journalEntryLines)
        .where(eq(journalEntryLines.journalEntryId, id))
        .orderBy(journalEntryLines.lineNo);
      
      // Only verify balance if we updated lines and entry is still in draft
      if (linesData && linesData.length > 0 && updatedEntry.status === 'draft') {
        // Validate that debits = credits
        let totalDebits = 0;
        let totalCredits = 0;
        
        lines.forEach(line => {
          const amount = parseFloat(line.amount.toString());
          
          if (line.type === 'debit') {
            totalDebits += amount;
          } else if (line.type === 'credit') {
            totalCredits += amount;
          }
        });
        
        // Verify that debits = credits (within a small epsilon for floating point comparisons)
        const epsilon = 0.001;
        if (Math.abs(totalDebits - totalCredits) > epsilon) {
          throw new Error("Journal entry must balance: total debits must equal total credits");
        }
        
        // Verify the total is not zero
        if (totalDebits < epsilon) {
          throw new Error("Journal entry total amount cannot be zero");
        }
      }
      
      // Return the entry with lines
      return {
        ...updatedEntry,
        lines
      };
    });
  }

  async getJournalEntryLines(journalEntryId: number): Promise<JournalEntryLine[]> {
    return await db
      .select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, journalEntryId))
      .orderBy(journalEntryLines.lineNo);
  }

  async createJournalEntryLine(insertLine: InsertJournalEntryLine): Promise<JournalEntryLine> {
    const [line] = await db
      .insert(journalEntryLines)
      .values(insertLine)
      .returning();
    return line;
  }
  
  // Alias for createJournalEntryLine to maintain API compatibility with IStorage interface
  async addJournalEntryLine(insertLine: InsertJournalEntryLine): Promise<JournalEntryLine> {
    return this.createJournalEntryLine(insertLine);
  }
  
  async updateJournalEntryLine(id: number, lineData: Partial<JournalEntryLine>): Promise<JournalEntryLine | undefined> {
    const [updatedLine] = await db
      .update(journalEntryLines)
      .set({
        ...lineData,
        updatedAt: new Date()
      })
      .where(eq(journalEntryLines.id, id))
      .returning();
    
    return updatedLine || undefined;
  }
  
  async deleteJournalEntryLine(id: number): Promise<boolean> {
    const result = await db
      .delete(journalEntryLines)
      .where(eq(journalEntryLines.id, id));
    
    return result.rowCount > 0;
  }
  
  async reverseJournalEntry(journalEntryId: number, options: {
    date?: Date;
    description?: string;
    createdBy: number;
    referenceNumber?: string;
  }): Promise<(JournalEntry & { lines: JournalEntryLine[] }) | undefined> {
    // Start a transaction for creating the reversing entry and its lines
    return await db.transaction(async (tx) => {
      // 1. Get the original journal entry with lines
      const originalEntry = await this.getJournalEntry(journalEntryId);
      if (!originalEntry) {
        throw new Error("Journal entry not found");
      }
      
      // 2. Check if journal entry can be reversed (must be posted)
      if (originalEntry.status !== "posted") {
        throw new Error("Only posted journal entries can be reversed");
      }
      
      // 3. Create the reversing journal entry
      const date = options.date || new Date();
      const currentDate = new Date();
      
      const [reversalEntry] = await tx
        .insert(journalEntries)
        .values({
          clientId: originalEntry.clientId,
          entityId: originalEntry.entityId,
          date: date,
          description: options.description || `Reversal of ${originalEntry.referenceNumber || journalEntryId}`,
          referenceNumber: options.referenceNumber || `REV-${originalEntry.referenceNumber || journalEntryId}`,
          createdBy: options.createdBy,
          journalType: originalEntry.journalType,
          status: "draft", // Start as draft, to be reviewed
          isSystemGenerated: true, // Mark as system-generated
          isReversal: true, // Flag as a reversal entry
          reversedEntryId: journalEntryId, // Reference to the original entry
          createdAt: currentDate,
          updatedAt: currentDate
        })
        .returning();
        
      if (!reversalEntry) {
        throw new Error("Failed to create reversal journal entry");
      }
      
      // 4. Create the reversed lines (with debits/credits flipped)
      const lines: JournalEntryLine[] = [];
      
      for (const line of originalEntry.lines) {
        // Flip the type (debit/credit)
        const reversedType = line.type === "debit" ? "credit" : "debit";
        
        // Create the reversal line
        const [reversalLine] = await tx
          .insert(journalEntryLines)
          .values({
            journalEntryId: reversalEntry.id,
            accountId: line.accountId,
            type: reversedType,
            amount: line.amount,
            description: line.description,
            locationId: line.locationId,
            lineNo: line.lineNo,
            reference: line.reference,
            reconciled: false, // New line is not reconciled
            createdAt: currentDate,
            updatedAt: currentDate
          })
          .returning();
          
        lines.push(reversalLine);
      }
      
      // 5. Return the new entry with its lines
      return {
        ...reversalEntry,
        lines
      };
    });
  }
  
  async deleteJournalEntry(id: number): Promise<boolean> {
    // Check if journal entry exists and get its status
    const entry = await this.getJournalEntry(id);
    if (!entry) return false;
    
    // Only draft entries can be deleted (to ensure data integrity)
    if (entry.status !== "draft") {
      throw new Error("Cannot delete a journal entry that is not in 'draft' status");
    }
    
    // Start a transaction for deleting the entry and its lines
    return await db.transaction(async (tx) => {
      // Delete all lines first
      await tx
        .delete(journalEntryLines)
        .where(eq(journalEntryLines.journalEntryId, id));
      
      // Delete files associated with the entry if any
      await tx
        .delete(journalEntryFiles)
        .where(eq(journalEntryFiles.journalEntryId, id));
      
      // Finally delete the journal entry
      const result = await tx
        .delete(journalEntries)
        .where(eq(journalEntries.id, id));
      
      return result.rowCount > 0;
    });
  }

  async getJournalEntryFiles(journalEntryId: number): Promise<any[]> {
    return await db
      .select()
      .from(journalEntryFiles)
      .where(eq(journalEntryFiles.journalEntryId, journalEntryId));
  }

  async createJournalEntryFile(journalEntryId: number, file: any): Promise<any> {
    const [newFile] = await db
      .insert(journalEntryFiles)
      .values({ ...file, journalEntryId })
      .returning();
    return newFile;
  }

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

  // Consolidation Group methods
  async getConsolidationGroup(id: number): Promise<ConsolidationGroup | undefined> {
    try {
      // Get the consolidation group data
      const result = await db
        .select()
        .from(consolidationGroups)
        .where(eq(consolidationGroups.id, id))
        .limit(1);
      
      if (!result || result.length === 0) return undefined;
      
      // Get all associated entities from the junction table
      const entityRelations = await db
        .select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, id));
      
      // Extract entity IDs from the junction table
      const entities = entityRelations.map(relation => relation.entityId);
      
      // Create a ConsolidationGroup object with the entities property
      // populated from the junction table relationships
      return {
        ...result[0],
        entities: entities
      } as ConsolidationGroup;
    } catch (error) {
      console.error('Error retrieving consolidation group:', error);
      throw error;
    }
  }

  async getConsolidationGroups(): Promise<ConsolidationGroup[]> {
    try {
      // Get all active consolidation groups
      const groups = await db
        .select()
        .from(consolidationGroups)
        .where(eq(consolidationGroups.isActive, true));
      
      // Get entity relationships for all groups
      const entityRelations = await db
        .select()
        .from(consolidationGroupEntities);
      
      // Group entity relationships by group ID
      const entityRelationsByGroup = entityRelations.reduce((acc, relation) => {
        if (!acc[relation.groupId]) {
          acc[relation.groupId] = [];
        }
        acc[relation.groupId].push(relation.entityId);
        return acc;
      }, {} as Record<number, number[]>);
      
      // Create ConsolidationGroup objects with the entities property
      // populated from the junction table relationships
      return groups.map(group => ({
        ...group,
        entities: entityRelationsByGroup[group.id] || []
      }) as ConsolidationGroup);
    } catch (error) {
      console.error('Error retrieving consolidation groups:', error);
      throw error;
    }
  }

  async getConsolidationGroupsByUser(userId: number): Promise<ConsolidationGroup[]> {
    try {
      // Get all active consolidation groups owned by the user
      const groups = await db
        .select()
        .from(consolidationGroups)
        .where(
          and(
            eq(consolidationGroups.ownerId, userId),
            eq(consolidationGroups.isActive, true)
          )
        );
      
      if (groups.length === 0) {
        return [];
      }
      
      // Get group IDs
      const groupIds = groups.map(g => g.id);
      
      // Get entity relationships for these groups from the junction table
      const entityRelations = await db
        .select()
        .from(consolidationGroupEntities)
        .where(inArray(consolidationGroupEntities.groupId, groupIds));
      
      // Group entity relationships by group ID
      const entityRelationsByGroup = entityRelations.reduce((acc, relation) => {
        if (!acc[relation.groupId]) {
          acc[relation.groupId] = [];
        }
        acc[relation.groupId].push(relation.entityId);
        return acc;
      }, {} as Record<number, number[]>);
      
      // Create ConsolidationGroup objects with the entities property
      // populated from the junction table relationships
      return groups.map(group => ({
        ...group,
        entities: entityRelationsByGroup[group.id] || []
      }) as ConsolidationGroup);
    } catch (error) {
      console.error('Error retrieving user consolidation groups:', error);
      throw error;
    }
  }

  async getConsolidationGroupsByEntity(entityId: number): Promise<ConsolidationGroup[]> {
    try {
      // Use the junction table to find all groups that contain this entity
      const result = await db
        .select({
          group: consolidationGroups
        })
        .from(consolidationGroupEntities)
        .innerJoin(
          consolidationGroups,
          eq(consolidationGroupEntities.groupId, consolidationGroups.id)
        )
        .where(
          and(
            eq(consolidationGroupEntities.entityId, entityId),
            eq(consolidationGroups.isActive, true)
          )
        );
      
      // Extract the group objects
      const groups = result.map(row => row.group);
      
      // Since we're using only the junction table now, no need to fetch
      // entity IDs again - they're not actually used in the code
      return groups;
    } catch (error) {
      console.error('Error retrieving entity consolidation groups:', error);
      throw error;
    }
  }

  async createConsolidationGroup(group: InsertConsolidationGroup): Promise<ConsolidationGroup> {
    try {
      // Start a transaction to ensure both the group and entity associations are created atomically
      return await db.transaction(async (tx) => {
        // Extract entities array from the request if provided (from InsertConsolidationGroupSchema.entities)
        const entities = group.entities || [];
        
        // Create the consolidation group
        const [result] = await tx.insert(consolidationGroups)
          .values({
            name: group.name,
            description: group.description || null,
            ownerId: group.ownerId,
            currency: group.currency || 'USD',
            startDate: group.startDate,
            endDate: group.endDate,
            periodType: group.periodType,
            rules: group.rules || null,
            isActive: group.isActive !== undefined ? group.isActive : true,
            createdBy: group.createdBy,
            createdAt: new Date(),
            updatedAt: null,
            icon: group.icon || null
          })
          .returning();
        
        // Create entity associations in the junction table
        if (entities.length > 0) {
          const junctionValues = entities.map(entityId => ({
            groupId: result.id,
            entityId: entityId,
            createdAt: new Date()
          }));
          
          await tx.insert(consolidationGroupEntities)
            .values(junctionValues)
            .onConflictDoNothing();
        }
        
        // The result already has the correct structure expected by the application
        return result;
      });
    } catch (error) {
      console.error('Error creating consolidation group:', error);
      throw error;
    }
  }

  async updateConsolidationGroup(id: number, group: Partial<ConsolidationGroup>): Promise<ConsolidationGroup | undefined> {
    try {
      // Create update data without entity relationships (handled separately if needed)
      const updateData: any = { ...group };
      
      // Ensure we don't have any references to the legacy properties
      delete updateData.entityIds;
      delete updateData.entity_ids;
      
      // Add the updated timestamp
      updateData.updatedAt = new Date();
      
      // Check if entities were provided for updating relationships
      let handleEntityUpdate = false;
      let newEntities: number[] = [];
      
      if (group.entities !== undefined) {
        handleEntityUpdate = true;
        newEntities = group.entities || [];
      }
      
      return await db.transaction(async (tx) => {
        // Update the group metadata
        const [result] = await tx.update(consolidationGroups)
          .set(updateData)
          .where(eq(consolidationGroups.id, id))
          .returning();
        
        if (!result) return undefined;
        
        // If entity relationships need updating
        if (handleEntityUpdate) {
          // Clear existing relationships
          await tx.delete(consolidationGroupEntities)
            .where(eq(consolidationGroupEntities.groupId, id));
          
          // Insert new relationships if any
          if (newEntities.length > 0) {
            const junctionValues = newEntities.map(entityId => ({
              groupId: id,
              entityId: entityId,
              createdAt: new Date()
            }));
            
            await tx.insert(consolidationGroupEntities)
              .values(junctionValues)
              .onConflictDoNothing();
          }
        }
        
        // Return the updated group
        return result;
      });
    } catch (error) {
      console.error('Error updating consolidation group:', error);
      throw error;
    }
  }

  async deleteConsolidationGroup(id: number): Promise<void> {
    // Soft delete by setting isActive to false
    await db.update(consolidationGroups)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(consolidationGroups.id, id));
  }

  async addEntityToConsolidationGroup(groupId: number, entityId: number): Promise<ConsolidationGroup> {
    try {
      // Check if group exists
      const group = await this.getConsolidationGroup(groupId);
      if (!group) {
        throw new Error(`Consolidation group with ID ${groupId} not found`);
      }
      
      return await db.transaction(async (tx) => {
        // Add the entity to the junction table if it doesn't already exist
        await tx.insert(consolidationGroupEntities)
          .values({
            groupId,
            entityId,
            createdAt: new Date()
          })
          .onConflictDoNothing(); // Prevent duplicate entries
        
        // Update the timestamp on the group
        await tx.update(consolidationGroups)
          .set({ 
            updatedAt: new Date() 
          })
          .where(eq(consolidationGroups.id, groupId));
        
        // Get the updated group
        const [updatedGroup] = await tx.select()
          .from(consolidationGroups)
          .where(eq(consolidationGroups.id, groupId))
          .limit(1);
        
        return updatedGroup;
      });
    } catch (error) {
      console.error('Error adding entity to consolidation group:', error);
      throw error;
    }
  }

  async removeEntityFromConsolidationGroup(groupId: number, entityId: number): Promise<ConsolidationGroup> {
    try {
      // Check if group exists
      const group = await this.getConsolidationGroup(groupId);
      if (!group) {
        throw new Error(`Consolidation group with ID ${groupId} not found`);
      }
      
      return await db.transaction(async (tx) => {
        // Remove the entity from the junction table
        await tx.delete(consolidationGroupEntities)
          .where(
            and(
              eq(consolidationGroupEntities.groupId, groupId),
              eq(consolidationGroupEntities.entityId, entityId)
            )
          );
        
        // Update the timestamp on the group
        await tx.update(consolidationGroups)
          .set({ 
            updatedAt: new Date() 
          })
          .where(eq(consolidationGroups.id, groupId));
        
        // Get the updated group
        const [updatedGroup] = await tx.select()
          .from(consolidationGroups)
          .where(eq(consolidationGroups.id, groupId))
          .limit(1);
        
        return updatedGroup;
      });
    } catch (error) {
      console.error('Error removing entity from consolidation group:', error);
      throw error;
    }
  }

  async generateConsolidatedReport(groupId: number, reportType: ReportType, startDate?: Date, endDate?: Date): Promise<any> {
    try {
      // Get consolidation group directly from the database
      const groupResult = await db
        .select()
        .from(consolidationGroups)
        .where(eq(consolidationGroups.id, groupId))
        .limit(1);
      
      if (!groupResult || groupResult.length === 0) {
        throw new Error('Consolidation group not found');
      }
      
      const group = groupResult[0];
      
      // Get entity IDs from the junction table
      const junctionEntities = await db
        .select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, groupId));
      
      const entityIds: number[] = junctionEntities.map(je => je.entityId);
      
      if (entityIds.length === 0) {
        throw new Error('No entities associated with this consolidation group');
      }
      
      const reports = [];
      
      // Generate reports for each entity in the group
      for (const entityId of entityIds) {
        let report;
        
        switch (reportType) {
          case ReportType.BALANCE_SHEET:
            report = await this.generateBalanceSheet(entityId, endDate);
            break;
          case ReportType.INCOME_STATEMENT:
            report = await this.generateIncomeStatement(entityId, startDate, endDate);
            break;
          case ReportType.CASH_FLOW:
            report = await this.generateCashFlow(entityId, startDate, endDate);
            break;
          case ReportType.TRIAL_BALANCE:
            report = await this.generateTrialBalance(entityId, startDate, endDate);
            break;
          default:
            throw new Error('Unsupported report type for consolidation');
        }
        
        reports.push(report);
      }
    
      // Consolidate reports
      let consolidatedReport;
      
      switch (reportType) {
        case ReportType.BALANCE_SHEET:
          consolidatedReport = this.consolidateBalanceSheets(reports);
          break;
        case ReportType.INCOME_STATEMENT:
          consolidatedReport = this.consolidateIncomeStatements(reports);
          break;
        case ReportType.CASH_FLOW:
          consolidatedReport = this.consolidateCashFlows(reports);
          break;
        case ReportType.TRIAL_BALANCE:
          consolidatedReport = this.consolidateTrialBalances(reports);
          break;
        default:
          throw new Error('Unsupported report type for consolidation');
      }
      
      // Update last run date
      await this.updateConsolidationGroup(groupId, { lastRun: new Date() });
      
      return consolidatedReport;
    } catch (error) {
      console.error('Error generating consolidated report:', error);
      throw error;
    }
  }

  private consolidateBalanceSheets(reports: any[]): any {
    // Implementation similar to MemoryStorage
    const consolidatedReport = {
      assets: [],
      liabilities: [],
      equity: [],
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      liabilitiesAndEquity: 0
    };

    // Process each entity's balance sheet
    reports.forEach(report => {
      // Consolidate assets
      report.assets.forEach((asset: any) => {
        const existingAsset = consolidatedReport.assets.find(a => a.accountId === asset.accountId);
        if (existingAsset) {
          existingAsset.balance += asset.balance;
        } else {
          consolidatedReport.assets.push({ ...asset });
        }
      });

      // Consolidate liabilities
      report.liabilities.forEach((liability: any) => {
        const existingLiability = consolidatedReport.liabilities.find(l => l.accountId === liability.accountId);
        if (existingLiability) {
          existingLiability.balance += liability.balance;
        } else {
          consolidatedReport.liabilities.push({ ...liability });
        }
      });

      // Consolidate equity
      report.equity.forEach((equity: any) => {
        const existingEquity = consolidatedReport.equity.find(e => e.accountId === equity.accountId);
        if (existingEquity) {
          existingEquity.balance += equity.balance;
        } else {
          consolidatedReport.equity.push({ ...equity });
        }
      });
    });

    // Recalculate totals
    consolidatedReport.totalAssets = consolidatedReport.assets.reduce((sum: number, asset: any) => sum + asset.balance, 0);
    consolidatedReport.totalLiabilities = consolidatedReport.liabilities.reduce((sum: number, liability: any) => sum + liability.balance, 0);
    consolidatedReport.totalEquity = consolidatedReport.equity.reduce((sum: number, equity: any) => sum + equity.balance, 0);
    consolidatedReport.liabilitiesAndEquity = consolidatedReport.totalLiabilities + consolidatedReport.totalEquity;

    return consolidatedReport;
  }

  private consolidateIncomeStatements(reports: any[]): any {
    // Implement income statement consolidation
    const consolidatedReport = {
      revenue: [],
      expenses: [],
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0
    };

    // Process each entity's income statement
    reports.forEach(report => {
      // Consolidate revenue
      report.revenue.forEach((revenue: any) => {
        const existingRevenue = consolidatedReport.revenue.find(r => r.accountId === revenue.accountId);
        if (existingRevenue) {
          existingRevenue.balance += revenue.balance;
        } else {
          consolidatedReport.revenue.push({ ...revenue });
        }
      });

      // Consolidate expenses
      report.expenses.forEach((expense: any) => {
        const existingExpense = consolidatedReport.expenses.find(e => e.accountId === expense.accountId);
        if (existingExpense) {
          existingExpense.balance += expense.balance;
        } else {
          consolidatedReport.expenses.push({ ...expense });
        }
      });
    });

    // Recalculate totals
    consolidatedReport.totalRevenue = consolidatedReport.revenue.reduce((sum: number, revenue: any) => sum + revenue.balance, 0);
    consolidatedReport.totalExpenses = consolidatedReport.expenses.reduce((sum: number, expense: any) => sum + expense.balance, 0);
    consolidatedReport.netIncome = consolidatedReport.totalRevenue - consolidatedReport.totalExpenses;

    return consolidatedReport;
  }

  private consolidateCashFlows(reports: any[]): any {
    // Implement cash flow consolidation
    const consolidatedReport = {
      cashFlows: [],
      netCashFlow: 0
    };

    // Map to keep track of categories we've processed
    const categoryMap = new Map();

    // Process each entity's cash flow
    reports.forEach(report => {
      report.cashFlows.forEach((categoryGroup: any) => {
        const { category, items, total } = categoryGroup;
        
        // If we've already processed this category, update it
        if (categoryMap.has(category)) {
          const existingCategory = categoryMap.get(category);
          
          // Merge items
          items.forEach((item: any) => {
            const existingItem = existingCategory.items.find((i: any) => i.accountId === item.accountId);
            if (existingItem) {
              existingItem.balance += item.balance;
            } else {
              existingCategory.items.push({ ...item });
            }
          });
          
          // Update total
          existingCategory.total += total;
        } else {
          // New category, clone the items and add to our map
          categoryMap.set(category, {
            category,
            items: items.map((item: any) => ({ ...item })),
            total
          });
        }
      });
    });

    // Convert the map back to an array
    consolidatedReport.cashFlows = Array.from(categoryMap.values());
    
    // Calculate the total net cash flow
    consolidatedReport.netCashFlow = consolidatedReport.cashFlows.reduce((sum: number, flow: any) => sum + flow.total, 0);

    return consolidatedReport;
  }

  private consolidateTrialBalances(reports: any[]): any {
    // Implement trial balance consolidation
    const consolidatedReport = {
      entries: [],
      totalDebit: 0,
      totalCredit: 0
    };

    // Map to track accounts we've processed
    const accountMap = new Map();

    // Process each entity's trial balance
    reports.forEach(report => {
      report.entries.forEach((entry: any) => {
        const key = `${entry.accountCode}-${entry.accountName}`;
        
        if (accountMap.has(key)) {
          const existingEntry = accountMap.get(key);
          existingEntry.debit += entry.debit;
          existingEntry.credit += entry.credit;
          existingEntry.balance += entry.balance;
        } else {
          accountMap.set(key, { ...entry });
        }
      });
    });

    // Convert the map to an array
    consolidatedReport.entries = Array.from(accountMap.values());
    
    // Recalculate totals
    consolidatedReport.totalDebit = consolidatedReport.entries.reduce((sum: number, entry: any) => sum + entry.debit, 0);
    consolidatedReport.totalCredit = consolidatedReport.entries.reduce((sum: number, entry: any) => sum + entry.credit, 0);

    return consolidatedReport;
  }
}

// Storage is initialized in index.ts, not here
