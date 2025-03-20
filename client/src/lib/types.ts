/**
 * Common type definitions for the application
 */

// Account types
export enum AccountType {
  ASSET = "asset",
  LIABILITY = "liability",
  EQUITY = "equity",
  REVENUE = "revenue",
  EXPENSE = "expense"
}

// Journal entry status
export enum JournalEntryStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  POSTED = "posted",
  REJECTED = "rejected",
  VOIDED = "voided"
}

// Journal types
export enum JournalType {
  SALE = "sale",
  PURCHASE = "purchase",
  CASH = "cash",
  BANK = "bank",
  GENERAL = "general"
}

// Budget period types
export enum BudgetPeriodType {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  ANNUAL = "annual",
  CUSTOM = "custom"
}

// Budget status
export enum BudgetStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  APPROVED = "approved",
  ARCHIVED = "archived"
}

// Report types
export enum ReportType {
  BALANCE_SHEET = "balance_sheet",
  INCOME_STATEMENT = "income_statement",
  CASH_FLOW = "cash_flow",
  TRIAL_BALANCE = "trial_balance",
  GENERAL_LEDGER = "general_ledger",
  BUDGET_VARIANCE = "budget_variance"
}

// Financial statement line item categories
export enum FSLICategory {
  ASSETS = "Assets",
  LIABILITIES = "Liabilities",
  EQUITY = "Equity",
  REVENUE = "Revenue",
  EXPENSES = "Expenses"
}

// Chat message role
export enum ChatMessageRole {
  USER = "user",
  ASSISTANT = "assistant"
}

// User roles
export enum UserRole {
  ADMIN = "admin",
  EMPLOYEE = "employee",
  CLIENT = "client",
  GUEST = "guest"
}