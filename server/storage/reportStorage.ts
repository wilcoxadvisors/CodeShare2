/**
 * Report Storage Module
 * 
 * This module contains the storage interface and implementation for financial report
 * generation and management.
 */
import { db } from "../db";
import { 
  savedReports, SavedReport, InsertSavedReport,
  accounts, journalEntries, journalEntryLines, entities
} from "@shared/schema";
import { eq, and, desc, sum, count, gt, lt, between, asc, sql } from "drizzle-orm";
import { ApiError } from "../errorHandling";
import { alias } from "drizzle-orm/pg-core";

// Helper function to handle database errors consistently
function handleDbError(error: unknown, operation: string): Error {
  console.error(`Database error during ${operation}:`, error);
  if (error instanceof ApiError) {
    return error;
  }
  return new Error(`An error occurred during ${operation}: ${error instanceof Error ? error.message : String(error)}`);
}

export interface GLOptions {
  startDate?: Date;
  endDate?: Date;
  accountId?: number;
}

export interface GLEntry {
  date: Date;
  journalEntryId: number;
  referenceNumber: string | null;
  description: string;
  accountId: number;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

/**
 * Interface for report storage operations
 */
export interface IReportStorage {
  // Financial statements
  generateTrialBalance(clientId: number, startDate?: Date, endDate?: Date, entityId?: number): Promise<any>;
  generateBalanceSheet(clientId: number, asOfDate?: Date, entityId?: number): Promise<any>;
  generateIncomeStatement(clientId: number, startDate?: Date, endDate?: Date, entityId?: number): Promise<any>;
  generateCashFlow(clientId: number, startDate?: Date, endDate?: Date, entityId?: number): Promise<any>;
  
  // General ledger
  getGeneralLedger(entityId: number, options?: GLOptions): Promise<GLEntry[]>;
  
  // Saved reports
  saveReport(report: InsertSavedReport): Promise<SavedReport>;
  getSavedReport(id: number): Promise<SavedReport | undefined>;
  getSavedReports(userId: number): Promise<SavedReport[]>;
  updateSavedReport(id: number, report: Partial<SavedReport>): Promise<SavedReport | undefined>;
  deleteSavedReport(id: number): Promise<void>;
}

/**
 * Implementation of report storage operations using Drizzle ORM
 */
export class ReportStorage implements IReportStorage {
  /**
   * Generate a trial balance report
   */
  async generateTrialBalance(clientId: number, startDate?: Date, endDate?: Date, entityId?: number): Promise<any> {
    try {
      const debitSubquery = alias(journalEntryLines, 'debit_lines');
      const creditSubquery = alias(journalEntryLines, 'credit_lines');
      
      let query = db
        .select({
          accountId: accounts.id,
          accountName: accounts.name,
          accountCode: accounts.accountCode,
          accountType: accounts.type,
          totalDebit: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntryLines.type} = 'debit' THEN ${journalEntryLines.amount}::numeric ELSE 0 END), 0)`,
          totalCredit: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntryLines.type} = 'credit' THEN ${journalEntryLines.amount}::numeric ELSE 0 END), 0)`,
          balance: sql<number>`
            CASE
              WHEN ${accounts.type} IN ('asset', 'expense') THEN
                COALESCE(SUM(CASE WHEN ${journalEntryLines.type} = 'debit' THEN ${journalEntryLines.amount}::numeric ELSE -${journalEntryLines.amount}::numeric END), 0)
              ELSE
                COALESCE(SUM(CASE WHEN ${journalEntryLines.type} = 'credit' THEN ${journalEntryLines.amount}::numeric ELSE -${journalEntryLines.amount}::numeric END), 0)
            END
          `
        })
        .from(accounts)
        .leftJoin(journalEntryLines, eq(accounts.id, journalEntryLines.accountId))
        .leftJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .leftJoin(entities, eq(accounts.entityId, entities.id))
        .where(eq(entities.clientId, clientId));
      
      if (entityId) {
        query = query.where(eq(accounts.entityId, entityId));
      }
      
      if (startDate) {
        query = query.where(gt(journalEntries.date, startDate));
      }
      
      if (endDate) {
        query = query.where(lt(journalEntries.date, endDate));
      }
      
      query = query
        .groupBy(accounts.id, accounts.name, accounts.accountCode, accounts.type)
        .orderBy(accounts.accountCode, accounts.name);
      
      const results = await query;
      
      return {
        reportDate: new Date(),
        startDate,
        endDate,
        entityId,
        accounts: results,
        totals: {
          debit: results.reduce((sum, account) => sum + Number(account.totalDebit), 0),
          credit: results.reduce((sum, account) => sum + Number(account.totalCredit), 0)
        }
      };
    } catch (error) {
      throw handleDbError(error, "generating trial balance");
    }
  }
  
  /**
   * Generate a balance sheet report
   */
  async generateBalanceSheet(clientId: number, asOfDate?: Date, entityId?: number): Promise<any> {
    try {
      // Implementation would be similar to trial balance but filtered to only balance sheet accounts
      // and properly arranging them into assets, liabilities, and equity sections
      
      const trialBalance = await this.generateTrialBalance(clientId, undefined, asOfDate, entityId);
      
      // Group accounts by type
      const assets = trialBalance.accounts.filter(acc => acc.accountType === 'asset');
      const liabilities = trialBalance.accounts.filter(acc => acc.accountType === 'liability');
      const equity = trialBalance.accounts.filter(acc => acc.accountType === 'equity');
      
      // Calculate section totals
      const totalAssets = assets.reduce((sum, account) => sum + Number(account.balance), 0);
      const totalLiabilities = liabilities.reduce((sum, account) => sum + Number(account.balance), 0);
      const totalEquity = equity.reduce((sum, account) => sum + Number(account.balance), 0);
      
      return {
        reportDate: new Date(),
        asOfDate: asOfDate || new Date(),
        entityId,
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
        liabilitiesAndEquity: totalLiabilities + totalEquity
      };
    } catch (error) {
      throw handleDbError(error, "generating balance sheet");
    }
  }
  
  /**
   * Generate an income statement report
   */
  async generateIncomeStatement(clientId: number, startDate?: Date, endDate?: Date, entityId?: number): Promise<any> {
    try {
      // Implementation similar to trial balance but filtered to only income statement accounts
      // and properly arranging them into revenue, expenses, and calculating net income
      
      const trialBalance = await this.generateTrialBalance(clientId, startDate, endDate, entityId);
      
      // Group accounts by type
      const revenue = trialBalance.accounts.filter(acc => acc.accountType === 'revenue');
      const expenses = trialBalance.accounts.filter(acc => acc.accountType === 'expense');
      
      // Calculate section totals
      const totalRevenue = revenue.reduce((sum, account) => sum + Number(account.balance), 0);
      const totalExpenses = expenses.reduce((sum, account) => sum + Number(account.balance), 0);
      const netIncome = totalRevenue - totalExpenses;
      
      return {
        reportDate: new Date(),
        startDate: startDate || new Date(),
        endDate: endDate || new Date(),
        entityId,
        revenue,
        expenses,
        totalRevenue,
        totalExpenses,
        netIncome
      };
    } catch (error) {
      throw handleDbError(error, "generating income statement");
    }
  }
  
  /**
   * Generate a cash flow report
   */
  async generateCashFlow(clientId: number, startDate?: Date, endDate?: Date, entityId?: number): Promise<any> {
    try {
      // Cash flow report is more complex and would need a more sophisticated implementation
      // with proper categorization of cash activities into operating, investing, and financing sections
      
      // This is a simplified implementation
      const balanceSheetStart = await this.generateBalanceSheet(clientId, startDate, entityId);
      const balanceSheetEnd = await this.generateBalanceSheet(clientId, endDate, entityId);
      const incomeStatement = await this.generateIncomeStatement(clientId, startDate, endDate, entityId);
      
      // Calculate cash at beginning and end of period
      const cashStart = balanceSheetStart.assets
        .filter(acc => acc.accountName.toLowerCase().includes('cash'))
        .reduce((sum, account) => sum + Number(account.balance), 0);
      
      const cashEnd = balanceSheetEnd.assets
        .filter(acc => acc.accountName.toLowerCase().includes('cash'))
        .reduce((sum, account) => sum + Number(account.balance), 0);
      
      // Simplistic approach - would need more detail in real implementation
      return {
        reportDate: new Date(),
        startDate: startDate || new Date(),
        endDate: endDate || new Date(),
        entityId,
        sections: {
          operating: {
            netIncome: incomeStatement.netIncome,
            // Would need to add adjustments, changes in working capital, etc.
            total: incomeStatement.netIncome // Simplified
          },
          investing: {
            // Would include investments, fixed asset purchases/sales, etc.
            total: 0 // Placeholder
          },
          financing: {
            // Would include debt issuances, repayments, dividends, etc.
            total: 0 // Placeholder
          }
        },
        cashStart,
        cashEnd,
        netCashChange: cashEnd - cashStart
      };
    } catch (error) {
      throw handleDbError(error, "generating cash flow");
    }
  }
  
  /**
   * Get general ledger entries
   */
  async getGeneralLedger(entityId: number, options?: GLOptions): Promise<GLEntry[]> {
    try {
      let query = db
        .select({
          date: journalEntries.date,
          journalEntryId: journalEntries.id,
          referenceNumber: journalEntries.referenceNumber,
          description: journalEntries.description,
          accountId: journalEntryLines.accountId,
          accountName: accounts.name,
          debit: sql<number>`CASE WHEN ${journalEntryLines.type} = 'debit' THEN ${journalEntryLines.amount}::numeric ELSE 0 END`,
          credit: sql<number>`CASE WHEN ${journalEntryLines.type} = 'credit' THEN ${journalEntryLines.amount}::numeric ELSE 0 END`,
        })
        .from(journalEntryLines)
        .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
        .where(eq(accounts.entityId, entityId));
      
      if (options?.accountId) {
        query = query.where(eq(journalEntryLines.accountId, options.accountId));
      }
      
      if (options?.startDate && options?.endDate) {
        query = query.where(between(journalEntries.date, options.startDate, options.endDate));
      } else if (options?.startDate) {
        query = query.where(gt(journalEntries.date, options.startDate));
      } else if (options?.endDate) {
        query = query.where(lt(journalEntries.date, options.endDate));
      }
      
      query = query.orderBy(accounts.accountCode, journalEntries.date, asc(journalEntries.id));
      
      const results = await query;
      
      // Calculate running balance for each account
      const entriesByAccount: Record<number, GLEntry[]> = {};
      
      results.forEach(entry => {
        if (!entriesByAccount[entry.accountId]) {
          entriesByAccount[entry.accountId] = [];
        }
        entriesByAccount[entry.accountId].push({
          ...entry,
          balance: 0 // Placeholder, will be calculated
        });
      });
      
      // Calculate running balance for each account
      Object.keys(entriesByAccount).forEach(accountIdStr => {
        const accountId = Number(accountIdStr);
        const accountType = results.find(r => r.accountId === accountId)?.accountName?.toLowerCase() || '';
        let balance = 0;
        const isDebitBalance = 
          accountType.includes('asset') || 
          accountType.includes('expense');
        
        entriesByAccount[accountId].forEach(entry => {
          if (isDebitBalance) {
            balance += (Number(entry.debit) - Number(entry.credit));
          } else {
            balance += (Number(entry.credit) - Number(entry.debit));
          }
          entry.balance = balance;
        });
      });
      
      // Flatten back to a single array
      const entries: GLEntry[] = [];
      Object.values(entriesByAccount).forEach(accountEntries => {
        entries.push(...accountEntries);
      });
      
      // Sort by date, then journal entry ID
      entries.sort((a, b) => {
        if (a.date.getTime() !== b.date.getTime()) {
          return a.date.getTime() - b.date.getTime();
        }
        return a.journalEntryId - b.journalEntryId;
      });
      
      return entries;
    } catch (error) {
      throw handleDbError(error, "getting general ledger");
    }
  }
  
  /**
   * Save a report
   */
  async saveReport(report: InsertSavedReport): Promise<SavedReport> {
    try {
      const [savedReport] = await db
        .insert(savedReports)
        .values({
          ...report,
          createdAt: new Date()
        })
        .returning();
      
      return savedReport;
    } catch (error) {
      throw handleDbError(error, "saving report");
    }
  }
  
  /**
   * Get a saved report by ID
   */
  async getSavedReport(id: number): Promise<SavedReport | undefined> {
    try {
      const [report] = await db
        .select()
        .from(savedReports)
        .where(eq(savedReports.id, id))
        .limit(1);
      
      return report;
    } catch (error) {
      throw handleDbError(error, `getting saved report ${id}`);
    }
  }
  
  /**
   * Get all saved reports for a user
   */
  async getSavedReports(userId: number): Promise<SavedReport[]> {
    try {
      return await db
        .select()
        .from(savedReports)
        .where(eq(savedReports.userId, userId))
        .orderBy(desc(savedReports.createdAt));
    } catch (error) {
      throw handleDbError(error, `getting saved reports for user ${userId}`);
    }
  }
  
  /**
   * Update a saved report
   */
  async updateSavedReport(id: number, report: Partial<SavedReport>): Promise<SavedReport | undefined> {
    try {
      const [updated] = await db
        .update(savedReports)
        .set({
          ...report,
          updatedAt: new Date()
        })
        .where(eq(savedReports.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      throw handleDbError(error, `updating saved report ${id}`);
    }
  }
  
  /**
   * Delete a saved report
   */
  async deleteSavedReport(id: number): Promise<void> {
    try {
      await db
        .delete(savedReports)
        .where(eq(savedReports.id, id));
    } catch (error) {
      throw handleDbError(error, `deleting saved report ${id}`);
    }
  }
}

// Export singleton instance
export const reportStorage = new ReportStorage();