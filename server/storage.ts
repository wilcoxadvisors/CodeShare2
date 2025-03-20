import { 
  users, User, InsertUser, UserRole,
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
  forecasts, Forecast, InsertForecast
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql, count, sum, isNull, not, ne } from "drizzle-orm";
import { db } from "./db";

// Storage interface for data access
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
  // Entity methods
  getEntity(id: number): Promise<Entity | undefined>;
  getEntities(): Promise<Entity[]>;
  getEntitiesByUser(userId: number): Promise<Entity[]>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  updateEntity(id: number, entity: Partial<Entity>): Promise<Entity | undefined>;
  
  // User Entity Access methods
  getUserEntityAccess(userId: number, entityId: number): Promise<string | undefined>;
  grantUserEntityAccess(userId: number, entityId: number, accessLevel: string): Promise<void>;
  
  // Account methods
  getAccount(id: number): Promise<Account | undefined>;
  getAccounts(entityId: number): Promise<Account[]>;
  getAccountsByType(entityId: number, type: AccountType): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, account: Partial<Account>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<void>;
  
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
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: number, entry: Partial<JournalEntry>): Promise<JournalEntry | undefined>;
  
  // Journal Entry Line methods
  getJournalEntryLines(journalEntryId: number): Promise<JournalEntryLine[]>;
  createJournalEntryLine(line: InsertJournalEntryLine): Promise<JournalEntryLine>;
  
  // Journal Entry File methods
  getJournalEntryFiles(journalEntryId: number): Promise<any[]>;
  createJournalEntryFile(journalEntryId: number, file: any): Promise<any>;
  
  // Fixed Asset methods
  getFixedAsset(id: number): Promise<FixedAsset | undefined>;
  getFixedAssets(entityId: number): Promise<FixedAsset[]>;
  createFixedAsset(asset: InsertFixedAsset): Promise<FixedAsset>;
  updateFixedAsset(id: number, asset: Partial<FixedAsset>): Promise<FixedAsset | undefined>;
  
  // Report methods
  generateTrialBalance(entityId: number, startDate?: Date, endDate?: Date): Promise<any>;
  generateBalanceSheet(entityId: number, asOfDate?: Date): Promise<any>;
  generateIncomeStatement(entityId: number, startDate?: Date, endDate?: Date): Promise<any>;
  generateCashFlow(entityId: number, startDate?: Date, endDate?: Date): Promise<any>;
  
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
  
  private currentUserId: number = 1;
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
  private currentBudgetId: number = 1;
  private currentBudgetItemId: number = 1;
  private currentBudgetDocumentId: number = 1;
  private currentForecastId: number = 1;
  
  // Form submission storage
  private contactSubmissions: Map<number, ContactSubmission>;
  private checklistSubmissions: Map<number, ChecklistSubmission>;
  private checklistFiles: Map<number, ChecklistFile>;
  private consultationSubmissions: Map<number, ConsultationSubmission>;
  private currentContactSubmissionId: number = 1;
  private currentChecklistSubmissionId: number = 1;
  private currentChecklistFileId: number = 1;
  private currentConsultationSubmissionId: number = 1;

  constructor() {
    this.users = new Map();
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
    
    // Initialize budget and forecast tables
    this.budgets = new Map();
    this.budgetItems = new Map();
    this.budgetDocuments = new Map();
    this.forecasts = new Map();
    
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
    
    // Create default entity
    const defaultEntity: Entity = {
      id: this.currentEntityId++,
      name: 'Acme Corporation',
      code: 'ACME',
      ownerId: adminUser.id,
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
      { code: '1000', name: 'Cash', type: AccountType.ASSET, subtype: 'current_asset' },
      { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET, subtype: 'current_asset', isSubledger: true, subledgerType: 'accounts_receivable' },
      { code: '1500', name: 'Fixed Assets: Equipment', type: AccountType.ASSET, subtype: 'fixed_asset' },
      { code: '1600', name: 'Accumulated Depreciation', type: AccountType.ASSET, subtype: 'fixed_asset' },
      { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY, subtype: 'current_liability', isSubledger: true, subledgerType: 'accounts_payable' },
      { code: '3000', name: 'Owner\'s Equity', type: AccountType.EQUITY, subtype: 'equity' },
      { code: '4000', name: 'Revenue', type: AccountType.REVENUE, subtype: 'revenue' },
      { code: '5000', name: 'Cost of Goods Sold', type: AccountType.EXPENSE, subtype: 'cost_of_sales' },
      { code: '6000', name: 'Operating Expenses', type: AccountType.EXPENSE, subtype: 'operating_expense' },
      { code: '6150', name: 'Office Expenses', type: AccountType.EXPENSE, subtype: 'operating_expense' },
    ];
    
    accounts.forEach(account => {
      const newAccount: Account = {
        id: this.currentAccountId++,
        entityId: defaultEntity.id,
        code: account.code,
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
        color: "#4A6CF7",
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
          .find(a => a.entityId === defaultEntity.id && a.code === line.accountCode);
        
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
  
  async createEntity(insertEntity: InsertEntity): Promise<Entity> {
    const id = this.currentEntityId++;
    const entity: Entity = { 
      id, 
      name: insertEntity.name,
      code: insertEntity.code,
      ownerId: insertEntity.ownerId,
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
      industry: insertEntity.industry || null,
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
    const entity = this.entities.get(id);
    if (!entity) return undefined;
    
    const updatedEntity = { ...entity, ...entityData };
    this.entities.set(id, updatedEntity);
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
  
  async getAccounts(entityId: number): Promise<Account[]> {
    return Array.from(this.accounts.values())
      .filter(account => account.entityId === entityId);
  }
  
  async getAccountsByType(entityId: number, type: AccountType): Promise<Account[]> {
    return Array.from(this.accounts.values())
      .filter(account => account.entityId === entityId && account.type === type);
  }
  
  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const id = this.currentAccountId++;
    const account: Account = { 
      id,
      entityId: insertAccount.entityId,
      name: insertAccount.name,
      code: insertAccount.code,
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
      color: insertJournal.color || "#4A6CF7",
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
  
  async createJournalEntry(insertEntry: InsertJournalEntry): Promise<JournalEntry> {
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
      createdBy: insertEntry.createdBy,
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
  async generateTrialBalance(entityId: number, startDate?: Date, endDate?: Date): Promise<any> {
    const accounts = await this.getAccounts(entityId);
    const result = [];
    
    let totalDebits = 0;
    let totalCredits = 0;
    
    for (const account of accounts) {
      const lines = Array.from(this.journalEntryLines.values())
        .filter(line => {
          const entry = this.journalEntries.get(line.journalEntryId);
          if (!entry || entry.entityId !== entityId || entry.status !== JournalEntryStatus.POSTED) {
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
          accountCode: account.code,
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
  
  async generateBalanceSheet(entityId: number, asOfDate?: Date): Promise<any> {
    // Get all asset, liability, and equity accounts
    const assetAccounts = await this.getAccountsByType(entityId, AccountType.ASSET);
    const liabilityAccounts = await this.getAccountsByType(entityId, AccountType.LIABILITY);
    const equityAccounts = await this.getAccountsByType(entityId, AccountType.EQUITY);
    
    // Calculate balances for each account
    const calculateBalance = async (account: Account) => {
      const lines = Array.from(this.journalEntryLines.values())
        .filter(line => {
          const entry = this.journalEntries.get(line.journalEntryId);
          if (!entry || entry.entityId !== entityId || entry.status !== JournalEntryStatus.POSTED) {
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
        accountCode: account.code,
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
  
  async generateIncomeStatement(entityId: number, startDate?: Date, endDate?: Date): Promise<any> {
    // Get all revenue and expense accounts
    const revenueAccounts = await this.getAccountsByType(entityId, AccountType.REVENUE);
    const expenseAccounts = await this.getAccountsByType(entityId, AccountType.EXPENSE);
    
    // Calculate balances for each account
    const calculateBalance = async (account: Account) => {
      const lines = Array.from(this.journalEntryLines.values())
        .filter(line => {
          const entry = this.journalEntries.get(line.journalEntryId);
          if (!entry || entry.entityId !== entityId || entry.status !== JournalEntryStatus.POSTED) {
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
        accountCode: account.code,
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
  
  async generateCashFlow(entityId: number, startDate?: Date, endDate?: Date): Promise<any> {
    // For this simple implementation, we'll just return the cash account balance changes
    const cashAccounts = Array.from(this.accounts.values())
      .filter(account => 
        account.entityId === entityId && 
        account.type === AccountType.ASSET && 
        account.code.startsWith('1000')
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
          if (!entry || entry.entityId !== entityId || entry.status !== JournalEntryStatus.POSTED) {
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
          accountCode: account.code,
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
    const accounts = Array.from(this.accounts.values())
      .filter(account => account.entityId === entityId)
      .filter(account => account.type === AccountType.REVENUE || account.type === AccountType.EXPENSE);
    
    // Add accounts to forecast
    forecastData.accounts = accounts.map(account => ({
      id: account.id,
      name: account.name,
      code: account.code,
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
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      mimeType: fileData.mimeType,
      fileData: fileData.fileData,
      isActive: fileData.isActive,
      createdAt: now,
      updatedAt: now
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
    delete fileData.fileData; // Remove it from the object to avoid schema mismatch
    
    const [file] = await db
      .insert(checklistFiles)
      .values({
        filename: fileData.filename,
        originalFilename: fileData.originalFilename,
        mimeType: fileData.mimeType,
        size: fileData.size,
        path: fileData.path,
        isActive: fileData.isActive,
        uploadedBy: fileData.uploadedBy
      })
      .returning();
    
    // Add the file data back (for memory storage compatibility)
    file.fileData = fileBuffer;
    
    return file;
  }
  
  async getChecklistFiles(): Promise<ChecklistFile[]> {
    return await db
      .select()
      .from(checklistFiles)
      .orderBy(desc(checklistFiles.createdAt));
  }
  
  async getActiveChecklistFile(): Promise<ChecklistFile | undefined> {
    const [file] = await db
      .select()
      .from(checklistFiles)
      .where(eq(checklistFiles.isActive, true));
    
    if (file) {
      // Fetch the file data from a separate table or storage mechanism
      // For now, we'll use a mock implementation with a sample buffer
      // @ts-ignore: Adding fileData property
      file.fileData = Buffer.from("Sample PDF content");
      
      // In a real implementation, you would fetch the binary data from:
      // 1. Another database table with a one-to-one relationship
      // 2. A file storage system referenced by the file path
      // 3. A binary column in the same table (if you're using bytea in PostgreSQL)
    }
    
    return file || undefined;
  }
  
  async getChecklistFileById(id: number): Promise<ChecklistFile | undefined> {
    const [file] = await db
      .select()
      .from(checklistFiles)
      .where(eq(checklistFiles.id, id));
    
    if (file) {
      // Fetch the file data from a separate table or storage mechanism
      // For now, we'll use a mock implementation with a sample buffer
      // @ts-ignore: Adding fileData property
      file.fileData = Buffer.from("Sample PDF content for file ID: " + id);
      
      // In a real implementation, you would fetch the binary data from:
      // 1. Another database table with a one-to-one relationship
      // 2. A file storage system referenced by the file path
      // 3. A binary column in the same table (if you're using bytea in PostgreSQL)
    }
    
    return file || undefined;
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

  async createEntity(insertEntity: InsertEntity): Promise<Entity> {
    const [entity] = await db
      .insert(entities)
      .values({
        name: insertEntity.name,
        code: insertEntity.code,
        ownerId: insertEntity.ownerId,
        active: insertEntity.active ?? true,
        fiscalYearStart: insertEntity.fiscalYearStart ?? "01-01",
        fiscalYearEnd: insertEntity.fiscalYearEnd ?? "12-31",
        taxId: insertEntity.taxId,
        address: insertEntity.address,
        phone: insertEntity.phone,
        email: insertEntity.email,
        website: insertEntity.website,
        currency: insertEntity.currency ?? "USD"
      })
      .returning();
    return entity;
  }

  async updateEntity(id: number, entityData: Partial<Entity>): Promise<Entity | undefined> {
    const [entity] = await db
      .update(entities)
      .set(entityData)
      .where(eq(entities.id, id))
      .returning();
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

  async getAccounts(entityId: number): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(eq(accounts.entityId, entityId))
      .orderBy(accounts.code);
  }

  async getAccountsByType(entityId: number, type: AccountType): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.entityId, entityId),
        eq(accounts.type, type)
      ))
      .orderBy(accounts.code);
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const [account] = await db
      .insert(accounts)
      .values({
        name: insertAccount.name,
        code: insertAccount.code,
        type: insertAccount.type,
        entityId: insertAccount.entityId,
        active: insertAccount.active ?? true,
        subtype: insertAccount.subtype,
        isSubledger: insertAccount.isSubledger ?? false,
        subledgerType: insertAccount.subledgerType,
        parentId: insertAccount.parentId,
        description: insertAccount.description
      })
      .returning();
    return account;
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
    await db
      .delete(accounts)
      .where(eq(accounts.id, id));
  }

  async getJournalEntry(id: number): Promise<JournalEntry | undefined> {
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, id));
    return entry || undefined;
  }

  async getJournalEntries(entityId: number): Promise<JournalEntry[]> {
    return await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.entityId, entityId))
      .orderBy(desc(journalEntries.date));
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

  async createJournalEntry(insertEntry: InsertJournalEntry): Promise<JournalEntry> {
    const [entry] = await db
      .insert(journalEntries)
      .values({
        date: insertEntry.date,
        entityId: insertEntry.entityId,
        reference: insertEntry.reference,
        createdBy: insertEntry.createdBy,
        status: insertEntry.status || JournalEntryStatus.DRAFT,
        description: insertEntry.description,
        requestedBy: insertEntry.requestedBy || null,
        approvedBy: insertEntry.approvedBy || null,
        rejectedBy: insertEntry.rejectedBy || null,
        rejectionReason: insertEntry.rejectionReason || null,
        postedBy: insertEntry.postedBy || null,
        postedAt: insertEntry.postedAt || null,
        voidedBy: insertEntry.voidedBy || null,
        voidedAt: insertEntry.voidedAt || null,
        voidReason: insertEntry.voidReason || null
      })
      .returning();
    return entry;
  }

  async updateJournalEntry(id: number, entryData: Partial<JournalEntry>): Promise<JournalEntry | undefined> {
    const [entry] = await db
      .update(journalEntries)
      .set(entryData)
      .where(eq(journalEntries.id, id))
      .returning();
    return entry || undefined;
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

  async generateTrialBalance(entityId: number, startDate?: Date, endDate?: Date): Promise<any> {
    // This is a more complex query that will need to aggregate data from journal entries
    // For now, return a simple implementation
    const accounts = await this.getAccounts(entityId);
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
        accountCode: account.code,
        accountName: account.name,
        debit,
        credit
      });
    }
    
    return result;
  }

  async generateBalanceSheet(entityId: number, asOfDate?: Date): Promise<any> {
    const assets = await this.getAccountsByType(entityId, AccountType.ASSET);
    const liabilities = await this.getAccountsByType(entityId, AccountType.LIABILITY);
    const equity = await this.getAccountsByType(entityId, AccountType.EQUITY);
    
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
        accountCode: account.code,
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
        accountCode: account.code,
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
        accountCode: account.code,
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

  async generateIncomeStatement(entityId: number, startDate?: Date, endDate?: Date): Promise<any> {
    const revenues = await this.getAccountsByType(entityId, AccountType.REVENUE);
    const expenses = await this.getAccountsByType(entityId, AccountType.EXPENSE);
    
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
        accountCode: account.code,
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
        accountCode: account.code,
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

  async generateCashFlow(entityId: number, startDate?: Date, endDate?: Date): Promise<any> {
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
      accountCode: accounts.code,
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
}

// Use the database storage implementation
export const storage = new DatabaseStorage();
