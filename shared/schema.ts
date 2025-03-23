import { pgTable, text, serial, integer, boolean, timestamp, numeric, uuid, json, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Roles
export enum UserRole {
  ADMIN = "admin",
  EMPLOYEE = "employee",
  CLIENT = "client"
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

// Entity (company) table
export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
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
  updatedAt: timestamp("updated_at").defaultNow()
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
  entityId: integer("entity_id").references(() => entities.id).notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type").$type<AccountType>().notNull(),
  subtype: text("subtype"), // like "current_asset", "fixed_asset", etc.
  isSubledger: boolean("is_subledger").notNull().default(false),
  subledgerType: text("subledger_type"), // "accounts_payable", "accounts_receivable", etc.
  parentId: integer("parent_id").references((): any => accounts.id),
  active: boolean("active").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull()
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

// Journal Entry Status
export enum JournalEntryStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  POSTED = "posted",
  REJECTED = "rejected",
  VOIDED = "voided"
}

// Journal Entries
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").references(() => entities.id).notNull(),
  journalId: integer("journal_id").references(() => journals.id).notNull(),
  reference: text("reference").notNull(), // JE-2023-0001
  date: timestamp("date").notNull(),
  description: text("description"),
  status: text("status").$type<JournalEntryStatus>().notNull().default(JournalEntryStatus.DRAFT),
  needsReview: boolean("needs_review").default(false), // Flag for entries that need additional review
  isRecurring: boolean("is_recurring").default(false), // Flag for recurring entries
  recurringFrequency: text("recurring_frequency"), // monthly, quarterly, etc.
  recurringEndDate: timestamp("recurring_end_date"),
  requestedBy: integer("requested_by").references(() => users.id),
  requestedAt: timestamp("requested_at"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedBy: integer("rejected_by").references(() => users.id),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  postedBy: integer("posted_by").references(() => users.id),
  postedAt: timestamp("posted_at"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Journal Entry Lines
export const journalEntryLines = pgTable("journal_entry_lines", {
  id: serial("id").primaryKey(),
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id).notNull(),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  description: text("description"),
  debit: numeric("debit").notNull().default("0"),
  credit: numeric("credit").notNull().default("0"),
  entityId: integer("entity_id").references(() => entities.id).notNull(),
  lineNo: integer("line_no"), // For ordering lines within a journal entry
  reference: text("reference"), // Line-specific reference (e.g., invoice number)
  date: timestamp("date"), // Line-specific date if different from journal entry
  taxId: integer("tax_id"), // For tax-related entries
  taxAmount: numeric("tax_amount"), // Amount of tax
  reconciled: boolean("reconciled").default(false), // Whether this line has been reconciled
  reconciledAt: timestamp("reconciled_at"), // When it was reconciled
  reconciledBy: integer("reconciled_by").references(() => users.id), // Who reconciled it
  reconciledWith: integer("reconciled_with"), // ID of the matching entry line
  createdAt: timestamp("created_at").defaultNow().notNull()
});

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

// Schema for Entity insertion
export const insertEntitySchema = createInsertSchema(entities).omit({
  id: true,
  createdAt: true
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

// Schema for Journal Entry Line insertion
export const insertJournalEntryLineSchema = createInsertSchema(journalEntryLines).omit({
  id: true,
  createdAt: true
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

export type Entity = typeof entities.$inferSelect;
export type InsertEntity = z.infer<typeof insertEntitySchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Journal = typeof journals.$inferSelect;
export type InsertJournal = z.infer<typeof insertJournalSchema>;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;

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

export type ConsolidationGroup = typeof consolidationGroups.$inferSelect;
// We extend the schema to include an entityIds property for backward compatibility
export const extendedInsertConsolidationGroupSchema = insertConsolidationGroupSchema.extend({
  entityIds: z.array(z.number()).optional(),
  initialEntityId: z.number().optional() // For creating a group with a single initial entity
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
  unsubscribeToken: text("unsubscribe_token").notNull()
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
  emailCount: true
});

// Types for blog subscribers
export type BlogSubscriber = typeof blogSubscribers.$inferSelect;
export type InsertBlogSubscriber = z.infer<typeof insertBlogSubscriberSchema>;
