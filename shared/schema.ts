import { pgTable, text, serial, integer, boolean, timestamp, numeric, uuid, json, uniqueIndex } from "drizzle-orm/pg-core";
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
  GENERAL_LEDGER = "general_ledger"
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
});

// Consultation Form Submissions
export const consultationSubmissions = pgTable("consultation_submissions", {
  id: serial("id").primaryKey(),
  // Company Information
  companyName: text("company_name").notNull(),
  industry: text("industry").notNull(),
  companySize: text("company_size").notNull(),
  annualRevenue: text("annual_revenue").notNull(),
  
  // Services Selection (stored as JSON array)
  services: json("services").notNull(),
  
  // Contact Information
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  preferredContact: text("preferred_contact").notNull(),
  message: text("message"),
  
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").default("unread").notNull(), // unread, read, scheduled, completed, archived
  createdAt: timestamp("created_at").defaultNow().notNull()
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
