import { 
  users, User, InsertUser, 
  entities, Entity, InsertEntity,
  accounts, Account, InsertAccount, AccountType,
  journalEntries, JournalEntry, InsertJournalEntry, JournalEntryStatus,
  journalEntryLines, JournalEntryLine, InsertJournalEntryLine,
  fixedAssets, FixedAsset, InsertFixedAsset,
  savedReports, SavedReport, ReportType,
  userEntityAccess
} from "@shared/schema";

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
  private journalEntries: Map<number, JournalEntry>;
  private journalEntryLines: Map<number, JournalEntryLine>;
  private journalEntryFiles: Map<number, any>; // Map for file attachments
  private fixedAssets: Map<number, FixedAsset>;
  private savedReports: Map<number, SavedReport>;
  private userEntityAccess: Map<string, string>; // key: userId-entityId, value: accessLevel
  
  private currentUserId: number = 1;
  private currentEntityId: number = 1;
  private currentAccountId: number = 1;
  private currentJournalEntryId: number = 1;
  private currentJournalEntryLineId: number = 1;
  private currentJournalEntryFileId: number = 1;
  private currentFixedAssetId: number = 1;
  private currentSavedReportId: number = 1;

  constructor() {
    this.users = new Map();
    this.entities = new Map();
    this.accounts = new Map();
    this.journalEntries = new Map();
    this.journalEntryLines = new Map();
    this.journalEntryFiles = new Map();
    this.fixedAssets = new Map();
    this.savedReports = new Map();
    this.userEntityAccess = new Map();
    
    // Create default admin user
    const adminUser: User = {
      id: this.currentUserId++,
      username: 'admin',
      password: '$2a$10$hACwQ5/HsFnbPzk1By9lUeal5o/NfAVe5pqc5vNjBEsVTkeJs6Z5u', // hashed 'password123'
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      active: true,
      createdAt: new Date()
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
      createdAt: new Date()
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
        ...account,
        active: true,
        createdAt: new Date()
      };
      this.accounts.set(newAccount.id, newAccount);
    });
    
    // Create sample journal entries
    const entries = [
      {
        reference: 'JE-2023-0045',
        date: new Date('2023-03-15'),
        description: 'Client payment - ABC Corp',
        status: JournalEntryStatus.POSTED,
        createdBy: adminUser.id,
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
        reference: entry.reference,
        date: entry.date,
        description: entry.description,
        status: entry.status,
        createdBy: entry.createdBy,
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
    const user: User = { ...insertUser, id, createdAt: new Date() };
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
    const entity: Entity = { ...insertEntity, id, createdAt: new Date() };
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
    const account: Account = { ...insertAccount, id, createdAt: new Date() };
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
    const journalEntry: JournalEntry = { 
      ...insertEntry, 
      id, 
      createdAt: new Date(),
      updatedAt: new Date()
    };
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
    const journalEntryLine: JournalEntryLine = { ...insertLine, id, createdAt: new Date() };
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
    const fixedAsset: FixedAsset = { ...insertAsset, id, createdAt: new Date() };
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
      
      const totalDebit = lines.reduce(
        (sum, line) => sum + parseFloat(line.debit), 0
      );
      
      const totalCredit = lines.reduce(
        (sum, line) => sum + parseFloat(line.credit), 0
      );
      
      const balance = totalDebit - totalCredit;
      
      if (totalDebit > 0 || totalCredit > 0) {
        result.push({
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          debit: totalDebit,
          credit: totalCredit,
          balance
        });
      }
    }
    
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
}

export const storage = new MemStorage();
