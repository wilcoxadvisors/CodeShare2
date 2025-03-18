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
  createdAt: timestamp("created_at").defaultNow().notNull()
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
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at").defaultNow().notNull()
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
  reference: text("reference").notNull(), // JE-2023-0001
  date: timestamp("date").notNull(),
  description: text("description"),
  status: text("status").$type<JournalEntryStatus>().notNull().default(JournalEntryStatus.DRAFT),
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
  lastRun: timestamp("last_run")
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
