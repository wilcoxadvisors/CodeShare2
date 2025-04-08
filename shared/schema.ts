import { pgTable, pgEnum, text, serial, integer, boolean, timestamp, numeric, uuid, json, uniqueIndex, primaryKey, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User Roles
export enum UserRole {
  ADMIN = "admin",
  EMPLOYEE = "employee",
  CLIENT = "client"
}

// Journal Entry Status
export enum JournalEntryStatus {
  DRAFT = "draft",
  POSTED = "posted",
  VOID = "void",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  REJECTED = "rejected",
  VOIDED = "voided"
}

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").$type<UserRole>().notNull().default(UserRole.CLIENT),
  active: boolean("active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  loginCount: integer("login_count").default(0),
  industry: text("industry"),
  companySize: text("company_size"),
  jobTitle: text("job_title"),
  location: text("location"),
  preferredLanguage: text("preferred_language").default("en"),
  deviceInfo: text("device_info"),
  lastSession: json("last_session"),
  sessionCount: integer("session_count").default(0),
  referralSource: text("referral_source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Clients table (users with CLIENT role have a client record)
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(), // Removed unique constraint to allow users to have multiple clients
  name: text("name").notNull(),
  clientCode: text("client_code").unique(), // Supports alphanumeric codes with adequate length (VARCHAR(20))
  legalName: text("legal_name"), // Added legal name field
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  industry: text("industry"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  website: text("website"),
  notes: text("notes"),
  taxId: text("tax_id"), // Added tax ID field
  active: boolean("active").notNull().default(true),
  referralSource: text("referral_source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at") // Added for soft deletion
});

// Entity (company) table
export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  entityCode: text("entity_code"), // New hierarchical entity code
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  clientId: integer("client_id").references(() => clients.id), // Link to client
  active: boolean("active").notNull().default(true),
  fiscalYearStart: text("fiscal_year_start").notNull().default("01-01"),
  fiscalYearEnd: text("fiscal_year_end").notNull().default("12-31"),
  taxId: text("tax_id"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  industry: text("industry"),
  subIndustry: text("sub_industry"),
  employeeCount: integer("employee_count"),
  foundedYear: integer("founded_year"),
  annualRevenue: text("annual_revenue"),
  businessType: text("business_type"), // LLC, Corporation, Partnership, etc.
  publiclyTraded: boolean("publicly_traded").default(false),
  stockSymbol: text("stock_symbol"),
  currency: text("currency").notNull().default("USD"),
  timezone: text("timezone").default("UTC"),
  dataCollectionConsent: boolean("data_collection_consent").default(false),
  lastAuditDate: timestamp("last_audit_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at") // Added for soft deletion
});

// User Entity Access (for multi-entity support)
export const userEntityAccess = pgTable("user_entity_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  entityId: integer("entity_id").references(() => entities.id).notNull(),
  accessLevel: text("access_level").notNull(), // read, write, admin
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Locations table for tracking physical/business locations
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Account Types
export enum AccountType {
  ASSET = "asset",
  LIABILITY = "liability",
  EQUITY = "equity",
  REVENUE = "revenue",
  EXPENSE = "expense"
}

// Journal Types
export enum JournalType {
  SALE = "sale",
  PURCHASE = "purchase",
  CASH = "cash",
  BANK = "bank",
  GENERAL = "general"
}

// Chart of Accounts
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  accountCode: text("account_code").notNull(),
  name: text("name").notNull(),
  type: text("type").$type<AccountType>().notNull(),
  subtype: text("subtype"), // like "current_asset", "fixed_asset", etc.
  isSubledger: boolean("is_subledger").notNull().default(false),
  subledgerType: text("subledger_type"), // "accounts_payable", "accounts_receivable", etc.
  parentId: integer("parent_id").references((): any => accounts.id, { onDelete: 'restrict' }),
  active: boolean("active").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    accountCodeClientUnique: uniqueIndex('account_code_client_unique').on(table.clientId, table.accountCode),
    parentIdx: index('parent_idx').on(table.parentId)
  };
});

// Journals
export const journals = pgTable("journals", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").references(() => entities.id).notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(), // Short code like "SALE", "BANK", etc.
  type: text("type").$type<JournalType>().notNull(),
  description: text("description"),
  defaultAccountId: integer("default_account_id").references(() => accounts.id),
  suspenseAccountId: integer("suspense_account_id").references(() => accounts.id),
  isActive: boolean("is_active").default(true).notNull(),
  showInDashboard: boolean("show_in_dashboard").default(true).notNull(),
  sequence: integer("sequence").default(10),
  sequencePrefix: text("sequence_prefix"), // E.g., "INV-{YYYY}-"
  color: text("color").default("#4A6CF7"), // For visual display
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});



// Database enums for journal entries
export const journalEntryStatusEnum = pgEnum('journal_entry_status', ['Draft', 'Posted', 'Reversed']);
export const journalEntryLineTypeEnum = pgEnum('journal_entry_line_type', ['Debit', 'Credit']);

// Journal Entries
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  entityId: integer("entity_id").notNull().references(() => entities.id),
  date: timestamp("date", { mode: 'date' }).notNull(),
  referenceNumber: text("reference_number"),
  description: text("description"),
  isSystemGenerated: boolean("is_system_generated").notNull().default(false),
  status: text("status", { enum: ['draft', 'posted', 'void'] }).notNull().default('draft'),
  // Additional fields for journal type and documentation
  journalType: text("journal_type", { enum: ['JE', 'AJ', 'SJ', 'CL'] }).notNull().default('JE'), // JE=General Journal, AJ=Adjusting Journal, SJ=Statistical Journal, CL=Closing Journal
  supDocId: text("sup_doc_id"), // Supporting document ID/reference
  reversalDate: timestamp("reversal_date", { mode: 'date' }), // Date for reversing entries
  
  // Reversal tracking fields
  isReversal: boolean("is_reversal").default(false), // Indicates this entry is a reversal of another
  reversedEntryId: integer("reversed_entry_id"), // Will be set up with references after table creation
  isReversed: boolean("is_reversed").default(false), // Indicates this entry has been reversed
  reversedByEntryId: integer("reversed_by_entry_id"), // Will be set up with references after table creation
  
  // Existing workflow fields
  requestedBy: integer("requested_by").references(() => users.id),
  requestedAt: timestamp("requested_at"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedBy: integer("rejected_by").references(() => users.id),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  postedBy: integer("posted_by").references(() => users.id),
  postedAt: timestamp("posted_at"),
  // Standard auditing fields
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Journal Entry Lines
export const journalEntryLines = pgTable("journal_entry_lines", {
  id: serial("id").primaryKey(),
  journalEntryId: integer("journal_entry_id").notNull().references(() => journalEntries.id),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  type: text("type", { enum: ['debit', 'credit'] }).notNull(),
  amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
  description: text("description"),
  // Entity code for intercompany transactions
  entityCode: text("entity_code"), // Entity code for intercompany transactions - allows entries across entities
  // Reporting fields moved from accounts
  fsliBucket: text("fsli_bucket"), // Financial Statement Line Item
  internalReportingBucket: text("internal_reporting_bucket"),
  item: text("item"), // For further categorization/detail
  // Existing fields that may be useful
  lineNo: integer("line_no"), // For ordering lines within a journal entry
  reference: text("reference"), // Line-specific reference (e.g., invoice number)
  reconciled: boolean("reconciled").default(false), // Whether this line has been reconciled
  reconciledAt: timestamp("reconciled_at"), // When it was reconciled
  reconciledBy: integer("reconciled_by").references(() => users.id), // Who reconciled it
  // Standard auditing fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Relations for journalEntries and journalEntryLines
export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  client: one(clients, {
    fields: [journalEntries.clientId],
    references: [clients.id],
    relationName: "journalEntries_client",
  }),
  entity: one(entities, {
    fields: [journalEntries.entityId],
    references: [entities.id],
    relationName: "journalEntries_entity",
  }),
  lines: many(journalEntryLines, {
    fields: [journalEntries.id],
    references: [journalEntryLines.journalEntryId],
    relationName: "journalEntries_lines",
  }),
  // Self-references for reversal tracking
  originalEntry: one(journalEntries, {
    fields: [journalEntries.reversedEntryId],
    references: [journalEntries.id],
    relationName: "journalEntries_originalEntry",
  }),
  reversalEntry: one(journalEntries, {
    fields: [journalEntries.reversedByEntryId],
    references: [journalEntries.id],
    relationName: "journalEntries_reversalEntry",
  }),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  journalEntry: one(journalEntries, {
    fields: [journalEntryLines.journalEntryId],
    references: [journalEntries.id],
    relationName: "journalEntryLines_journalEntry",
  }),
  account: one(accounts, {
    fields: [journalEntryLines.accountId],
    references: [accounts.id],
    relationName: "journalEntryLines_account",
  }),
}));

// Journal Entry Files (supporting documents)
export const journalEntryFiles = pgTable("journal_entry_files", {
  id: serial("id").primaryKey(),
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id).notNull(),
  filename: text("filename").notNull(),
  path: text("path").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull()
});

// Fixed Assets
export const fixedAssets = pgTable("fixed_assets", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").references(() => entities.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  acquisitionDate: timestamp("acquisition_date").notNull(),
  acquisitionCost: numeric("acquisition_cost").notNull(),
  depreciationMethod: text("depreciation_method").notNull(), // straight_line, declining_balance
  usefulLife: integer("useful_life").notNull(), // in months
  salvageValue: numeric("salvage_value").notNull().default("0"),
  assetAccountId: integer("asset_account_id").references(() => accounts.id).notNull(),
  accumulatedDepreciationAccountId: integer("accumulated_depreciation_account_id").references(() => accounts.id).notNull(),
  depreciationExpenseAccountId: integer("depreciation_expense_account_id").references(() => accounts.id).notNull(),
  status: text("status").notNull().default("active"), // active, disposed, fully_depreciated
  disposalDate: timestamp("disposal_date"),
  disposalAmount: numeric("disposal_amount"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Financial Report Types
export enum ReportType {
  BALANCE_SHEET = "balance_sheet",
  INCOME_STATEMENT = "income_statement",
  CASH_FLOW = "cash_flow",
  TRIAL_BALANCE = "trial_balance",
  GENERAL_LEDGER = "general_ledger",
  BUDGET_VARIANCE = "budget_variance"
}

// Budget Period Types
export enum BudgetPeriodType {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  ANNUAL = "annual",
  CUSTOM = "custom"
}

// Budget Status
export enum BudgetStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  APPROVED = "approved",
  ARCHIVED = "archived"
}

// Saved Reports
export const savedReports = pgTable("saved_reports", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").references(() => entities.id).notNull(),
  name: text("name").notNull(),
  type: text("type").$type<ReportType>().notNull(),
  filters: json("filters").notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastRun: timestamp("last_run"),
  runCount: integer("run_count").default(0),
  exportCount: integer("export_count").default(0),
  isPublic: boolean("is_public").default(false),
  tags: text("tags").array()
});

// User Activity Tracking
export const userActivityLogs = pgTable("user_activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  entityId: integer("entity_id").references(() => entities.id),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(), // users, entities, accounts, journal_entries, etc.
  resourceId: integer("resource_id"),
  details: json("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});

// Feature Usage Analytics
export const featureUsage = pgTable("feature_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  entityId: integer("entity_id").references(() => entities.id),
  featureName: text("feature_name").notNull(),
  usageCount: integer("usage_count").default(1),
  firstUsed: timestamp("first_used").defaultNow().notNull(),
  lastUsed: timestamp("last_used").defaultNow().notNull(),
  useTime: integer("use_time"), // in seconds
  successful: boolean("successful").default(true)
});

// Industry Benchmarks
export const industryBenchmarks = pgTable("industry_benchmarks", {
  id: serial("id").primaryKey(),
  industry: text("industry").notNull(),
  subIndustry: text("sub_industry"),
  metricName: text("metric_name").notNull(), // revenue_growth, profit_margin, etc.
  metricValue: numeric("metric_value").notNull(),
  entitySizeRange: text("entity_size_range"), // small, medium, large
  year: integer("year").notNull(),
  quarter: integer("quarter"),
  dataSource: text("data_source"),
  confidenceLevel: numeric("confidence_level"), // 0-1 value representing statistical confidence
  sampleSize: integer("sample_size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Consent and Data Sharing Preferences
export const dataConsent = pgTable("data_consent", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  entityId: integer("entity_id").references(() => entities.id),
  consentType: text("consent_type").notNull(), // analytics, marketing, benchmarking, etc.
  granted: boolean("granted").default(false),
  grantedAt: timestamp("granted_at"),
  revokedAt: timestamp("revoked_at"),
  consentVersion: text("consent_version").notNull(),
  ipAddress: text("ip_address"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull()
});

// Budget table
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").references(() => entities.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  fiscalYear: integer("fiscal_year").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  periodType: text("period_type").$type<BudgetPeriodType>().notNull().default(BudgetPeriodType.MONTHLY),
  status: text("status").$type<BudgetStatus>().notNull().default(BudgetStatus.DRAFT),
  isActive: boolean("is_active").default(true).notNull(),
  isTemplate: boolean("is_template").default(false).notNull(),
  baseScenario: boolean("base_scenario").default(true).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  totalAmount: numeric("total_amount").default("0").notNull(),
  metadata: json("metadata") // For additional configurations
});

// Budget Line Items table
export const budgetItems = pgTable("budget_items", {
  id: serial("id").primaryKey(),
  budgetId: integer("budget_id").references(() => budgets.id).notNull(),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  description: text("description"),
  amount: numeric("amount").notNull().default("0"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  category: text("category"), // Additional categorization beyond account
  tags: text("tags").array(),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Document Uploads for Budget Supporting Materials
export const budgetDocuments = pgTable("budget_documents", {
  id: serial("id").primaryKey(),
  budgetId: integer("budget_id").references(() => budgets.id).notNull(),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  extractedData: json("extracted_data"), // Data extracted from PDFs or Excel files
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  fileType: text("file_type").notNull(), // pdf, excel, etc.
  processingStatus: text("processing_status").default("pending").notNull() // pending, processed, failed
});

// Consolidation Groups table
export const consolidationGroups = pgTable("consolidation_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  // entity_ids column has been completely removed - using junction table exclusively now
  currency: text("currency").notNull().default("USD"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  periodType: text("period_type").$type<BudgetPeriodType>().notNull().default(BudgetPeriodType.MONTHLY),
  rules: json("rules"), // Rules for consolidation (e.g., intercompany eliminations)
  isActive: boolean("is_active").default(true).notNull(),
  lastRun: timestamp("last_run"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Entity-Group Junction Table
export const consolidationGroupEntities = pgTable("consolidation_group_entities", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => consolidationGroups.id).notNull(),
  entityId: integer("entity_id").references(() => entities.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  unq: uniqueIndex("group_entity_idx").on(table.groupId, table.entityId),
}));

// Forecasts table
export const forecasts = pgTable("forecasts", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").references(() => entities.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  periodType: text("period_type").$type<BudgetPeriodType>().notNull().default(BudgetPeriodType.MONTHLY),
  baseScenario: boolean("base_scenario").default(true).notNull(),
  modelConfig: json("model_config"), // Configuration for the forecasting model
  forecastData: json("forecast_data"), // The actual forecast data
  aiInsights: text("ai_insights"), // Insights generated by AI
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  confidenceInterval: numeric("confidence_interval").default("0.95") // Statistical confidence interval
});

// Schema for User insertion
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLogin: true,
  createdAt: true
});

// Schema for Client insertion
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Schema for Entity insertion
export const insertEntitySchema = createInsertSchema(entities).omit({
  id: true,
  createdAt: true,
  entityCode: true // Omitting entityCode since it will be auto-generated
});

// Schema for Journal insertion
export const insertJournalSchema = createInsertSchema(journals).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Schema for Account insertion
export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true
});

// Schema for Journal Entry insertion
export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  requestedAt: true,
  approvedAt: true,
  rejectedAt: true,
  postedAt: true,
  createdAt: true,
  updatedAt: true
});

// Schema for Reversal Journal Entry creation
export const insertReversalJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  requestedAt: true,
  approvedAt: true,
  rejectedAt: true,
  postedAt: true,
  createdAt: true,
  updatedAt: true
}).extend({
  reversedEntryId: z.number(), // Original entry ID being reversed
  isReversal: z.boolean().default(true), // Mark as reversal entry
  date: z.date(), // Date for the reversal entry
  description: z.string().optional(), // Optional description override
  createdBy: z.number(), // Who created the reversal
});

// Schema for Journal Entry Line insertion
export const insertJournalEntryLineSchema = createInsertSchema(journalEntryLines).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Schema for Fixed Asset insertion
export const insertFixedAssetSchema = createInsertSchema(fixedAssets).omit({
  id: true,
  createdAt: true
});

// Insert schemas for our analytics tables
export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs).omit({
  id: true,
  timestamp: true
});

export const insertFeatureUsageSchema = createInsertSchema(featureUsage).omit({
  id: true,
  firstUsed: true,
  lastUsed: true
});

export const insertIndustryBenchmarkSchema = createInsertSchema(industryBenchmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertDataConsentSchema = createInsertSchema(dataConsent).omit({
  id: true,
  lastUpdated: true
});

// Budget insertion schemas
export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBudgetDocumentSchema = createInsertSchema(budgetDocuments).omit({
  id: true,
  uploadedAt: true
});

// Schema for Consolidation Group insertion
export const insertConsolidationGroupSchema = createInsertSchema(consolidationGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRun: true
});

export const insertForecastSchema = createInsertSchema(forecasts).omit({
  id: true,
  createdAt: true,
  lastUpdated: true
});

// Chat message roles
export enum ChatMessageRole {
  USER = "user",
  ASSISTANT = "assistant"
}

// Chat conversation table
export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  entityId: integer("entity_id").references(() => entities.id),
  title: text("title"),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  totalMessages: integer("total_messages").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => chatConversations.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  role: text("role").$type<ChatMessageRole>().notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  tokenCount: integer("token_count").default(0)
});

// Chat usage limits table
export const chatUsageLimits = pgTable("chat_usage_limits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  entityId: integer("entity_id").references(() => entities.id),
  maxMessagesPerDay: integer("max_messages_per_day").default(50).notNull(),
  maxTokensPerDay: integer("max_tokens_per_day").default(5000).notNull(),
  limitResetTime: timestamp("limit_reset_time").notNull(),
  messagesUsedToday: integer("messages_used_today").default(0).notNull(),
  tokensUsedToday: integer("tokens_used_today").default(0).notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Insert schemas for chat tables
export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({
  id: true,
  lastMessageAt: true,
  totalMessages: true,
  createdAt: true,
  updatedAt: true
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true
});

export const insertChatUsageLimitSchema = createInsertSchema(chatUsageLimits).omit({
  id: true,
  messagesUsedToday: true,
  tokensUsedToday: true,
  lastUsedAt: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Entity = typeof entities.$inferSelect;
export type InsertEntity = z.infer<typeof insertEntitySchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Journal = typeof journals.$inferSelect;
export type InsertJournal = z.infer<typeof insertJournalSchema>;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type InsertReversalJournalEntry = z.infer<typeof insertReversalJournalEntrySchema>;

export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type InsertJournalEntryLine = z.infer<typeof insertJournalEntryLineSchema>;

export type FixedAsset = typeof fixedAssets.$inferSelect;
export type InsertFixedAsset = z.infer<typeof insertFixedAssetSchema>;

export type SavedReport = typeof savedReports.$inferSelect;

// Additional types for analytics and data collection
export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;

export type FeatureUsage = typeof featureUsage.$inferSelect;
export type InsertFeatureUsage = z.infer<typeof insertFeatureUsageSchema>;

export type IndustryBenchmark = typeof industryBenchmarks.$inferSelect;
export type InsertIndustryBenchmark = z.infer<typeof insertIndustryBenchmarkSchema>;

export type DataConsent = typeof dataConsent.$inferSelect;
export type InsertDataConsent = z.infer<typeof insertDataConsentSchema>;

// Chat types
export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type ChatUsageLimit = typeof chatUsageLimits.$inferSelect;
export type InsertChatUsageLimit = z.infer<typeof insertChatUsageLimitSchema>;

// Budget and Forecast types
export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;

export type BudgetItem = typeof budgetItems.$inferSelect;
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;

export type BudgetDocument = typeof budgetDocuments.$inferSelect;
export type InsertBudgetDocument = z.infer<typeof insertBudgetDocumentSchema>;

// The base ConsolidationGroup type from the database
export type ConsolidationGroup = typeof consolidationGroups.$inferSelect & {
  // Add the entities property for junction table relationships
  entities?: number[];
};
// We extend the schema to allow specifying an initial entity when creating a group
export const extendedInsertConsolidationGroupSchema = insertConsolidationGroupSchema.extend({
  initialEntityId: z.number().optional(), // For creating a group with a single initial entity
  entities: z.array(z.number()).optional() // Array of entity IDs for the group
});
export type InsertConsolidationGroup = z.infer<typeof extendedInsertConsolidationGroupSchema>;

export type ConsolidationGroupEntity = typeof consolidationGroupEntities.$inferSelect;
// Create insert schema for the junction table
export const insertConsolidationGroupEntitySchema = createInsertSchema(consolidationGroupEntities);
export type InsertConsolidationGroupEntity = z.infer<typeof insertConsolidationGroupEntitySchema>;

export type Forecast = typeof forecasts.$inferSelect;
export type InsertForecast = z.infer<typeof insertForecastSchema>;

// Contact Form Submissions
export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").default("unread").notNull(), // unread, read, replied, archived
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Financial Checklist Form Submissions
export const checklistSubmissions = pgTable("checklist_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  revenueRange: text("revenue_range").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").default("unread").notNull(), // unread, read, contacted, archived
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Checklist Files
export const checklistFiles = pgTable("checklist_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
  // Note: fileData is stored in the database as BYTEA column but not included in the schema
  // as it's handled specially in the storage implementation
});

// Consultation Form Submissions
export const consultationSubmissions = pgTable("consultation_submissions", {
  id: serial("id").primaryKey(),
  // Company Information
  companyName: text("companyName").notNull(),
  industry: text("industry").notNull(),
  companySize: text("companySize").notNull(),
  annualRevenue: text("annualRevenue").notNull(),
  
  // Services Selection (stored as JSON array)
  services: json("services").notNull(),
  
  // Contact Information
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  preferredContact: text("preferredContact").notNull(),
  message: text("message"),
  
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  status: text("status").default("unread").notNull(), // unread, read, scheduled, completed, archived
  createdAt: timestamp("createdAt").defaultNow().notNull()
  // updatedAt column might not exist in the database yet, so we're not including it here
});

// Schemas for form submission insertions
export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertChecklistSubmissionSchema = createInsertSchema(checklistSubmissions).omit({
  id: true,
  createdAt: true
});

export const insertConsultationSubmissionSchema = createInsertSchema(consultationSubmissions).omit({
  id: true,
  createdAt: true
});

// Insert schema for checklist files
export const insertChecklistFileSchema = createInsertSchema(checklistFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types for form submissions
export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;

export type ChecklistSubmission = typeof checklistSubmissions.$inferSelect;
export type InsertChecklistSubmission = z.infer<typeof insertChecklistSubmissionSchema>;

export type ConsultationSubmission = typeof consultationSubmissions.$inferSelect;
export type InsertConsultationSubmission = z.infer<typeof insertConsultationSubmissionSchema>;

export type ChecklistFile = typeof checklistFiles.$inferSelect;
export type InsertChecklistFile = z.infer<typeof insertChecklistFileSchema>;

// Blog Subscribers table

// Audit Logs for tracking admin actions
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  performedBy: integer("performed_by").references(() => users.id).notNull(),
  details: text("details").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Insert schema for audit logs
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true
});

// Insert type for audit logs
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
// Select type for audit logs
export type AuditLog = typeof auditLogs.$inferSelect;

export const blogSubscribers = pgTable("blog_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  subscriptionDate: timestamp("subscription_date").defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at"),
  confirmed: boolean("confirmed").default(false).notNull(),
  verificationToken: text("verification_token"),
  verificationExpires: timestamp("verification_expires"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  active: boolean("active").default(true).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  lastEmailSent: timestamp("last_email_sent"),
  emailCount: integer("email_count").default(0),
  industry: text("industry"),
  source: text("source"),
  unsubscribeToken: text("unsubscribe_token").notNull().default('')
});

// Blog posts table schema
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt").notNull(),
  author: text("author").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("draft"), // draft, published, archived
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  tags: text("tags"), // Comma-separated list of tags
  readTime: text("read_time"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" })
});

// Schema for blog post insertion
export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true
});

// Schema for blog subscriber insertion
export const insertBlogSubscriberSchema = createInsertSchema(blogSubscribers).omit({
  id: true,
  subscriptionDate: true,
  confirmedAt: true,
  confirmed: true,
  verificationExpires: true,
  unsubscribedAt: true,
  lastEmailSent: true,
  emailCount: true,
  unsubscribeToken: true,
  verificationToken: true
});

// Types for blog subscribers
export type BlogSubscriber = typeof blogSubscribers.$inferSelect;
export type InsertBlogSubscriber = z.infer<typeof insertBlogSubscriberSchema>;

// Types for blog posts
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;

// Homepage content table schema
export const homepageContent = pgTable('homepage_content', {
  id: serial('id').primaryKey(),
  section: text('section').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  displayOrder: integer('display_order').default(0),
  metaTitle: text('meta_title'), // SEO title
  metaDescription: text('meta_description'), // SEO description
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Schema for homepage content insertion
export const insertHomepageContentSchema = createInsertSchema(homepageContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types for homepage content
export type HomepageContent = typeof homepageContent.$inferSelect;
export type InsertHomepageContent = z.infer<typeof insertHomepageContentSchema>;

// Locations relation to client
export const locationsRelations = relations(locations, ({ one }) => ({
  client: one(clients, {
    fields: [locations.clientId],
    references: [clients.id]
  })
}));

// Update clients relation to include locations
export const clientsRelations = relations(clients, ({ many }) => ({
  locations: many(locations)
}));

// Schema for location insertion
export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types for locations
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
