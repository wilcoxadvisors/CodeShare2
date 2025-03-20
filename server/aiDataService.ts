import { db } from './db';
import { accounts, journalEntries, journalEntryLines, entities, users, fixedAssets } from '../shared/schema';
import { eq, and, gte, lte, sql, desc, asc } from 'drizzle-orm';
import type { IStorage } from './storage';

/**
 * AiDataService provides a controlled interface for AI to access database data
 * with appropriate privacy safeguards to prevent exposure of sensitive information.
 */
class AiDataService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Get financial analytics for an entity with privacy controls
   */
  async getEntityAnalytics(entityId: number) {
    try {
      const entity = await this.storage.getEntity(entityId);
      
      if (!entity) {
        throw new Error('Entity not found');
      }
      
      // Remove sensitive information
      const safeEntity = {
        id: entity.id,
        name: entity.name,
        code: entity.code,
        industry: entity.industry,
        fiscalYearStart: entity.fiscalYearStart,
        fiscalYearEnd: entity.fiscalYearEnd,
        active: entity.active
      };
      
      // Get account summary without sensitive details
      const accountsData = await this.getAccountSummary(entityId);
      
      // Get financial ratios
      const financialRatios = await this.getFinancialRatios(entityId);
      
      // Get journal entry activity summary (without actual entries)
      const journalActivitySummary = await this.getJournalActivitySummary(entityId);
      
      // Return safe, aggregated analytics
      return {
        entity: safeEntity,
        accountsSummary: accountsData,
        financialRatios,
        journalActivitySummary
      };
    } catch (error) {
      console.error('Error in getEntityAnalytics:', error);
      throw new Error('Failed to get entity analytics');
    }
  }
  
  /**
   * Get summarized account data (no individual transactions)
   */
  private async getAccountSummary(entityId: number) {
    const allAccounts = await this.storage.getAccounts(entityId);
    
    // Group accounts by type and calculate totals
    const summary = allAccounts.reduce((acc: any, account) => {
      if (!acc[account.type]) {
        acc[account.type] = {
          count: 0,
          totalAccounts: 0,
          types: {}
        };
      }
      
      acc[account.type].count++;
      
      // Group by category if available
      const category = account.category || 'Uncategorized';
      if (!acc[account.type].types[category]) {
        acc[account.type].types[category] = 0;
      }
      acc[account.type].types[category]++;
      
      return acc;
    }, {});
    
    return summary;
  }
  
  /**
   * Calculate financial ratios without exposing raw financial data
   */
  private async getFinancialRatios(entityId: number) {
    try {
      // Generate balance sheet data
      const balanceSheet = await this.storage.generateBalanceSheet(entityId);
      const incomeStatement = await this.storage.generateIncomeStatement(entityId);
      
      // Calculate only the ratios, not the raw data
      const totalAssets = balanceSheet.totalAssets || 0;
      const totalLiabilities = balanceSheet.totalLiabilities || 0;
      const totalEquity = balanceSheet.totalEquity || 0;
      const totalRevenue = incomeStatement.totalRevenue || 0;
      const totalExpenses = incomeStatement.totalExpenses || 0;
      const netIncome = incomeStatement.netIncome || 0;
      
      // Calculate financial ratios
      const ratios = {
        debtToEquity: totalLiabilities > 0 && totalEquity > 0 ? 
          +(totalLiabilities / totalEquity).toFixed(2) : null,
        currentRatio: totalLiabilities > 0 ? 
          +(totalAssets / totalLiabilities).toFixed(2) : null,
        profitMargin: totalRevenue > 0 ? 
          +((netIncome / totalRevenue) * 100).toFixed(2) : null,
        returnOnAssets: totalAssets > 0 ? 
          +((netIncome / totalAssets) * 100).toFixed(2) : null,
        returnOnEquity: totalEquity > 0 ? 
          +((netIncome / totalEquity) * 100).toFixed(2) : null
      };
      
      return ratios;
    } catch (error) {
      console.error('Error calculating financial ratios:', error);
      return null;
    }
  }
  
  /**
   * Get journal entry activity summary without exposing actual entries
   */
  private async getJournalActivitySummary(entityId: number) {
    try {
      const entries = await this.storage.getJournalEntries(entityId);
      
      // Get counts by status
      const countsByStatus = entries.reduce((acc: any, entry) => {
        if (!acc[entry.status]) {
          acc[entry.status] = 0;
        }
        acc[entry.status]++;
        return acc;
      }, {});
      
      // Get monthly activity counts
      const last6Months = new Array(6).fill(0).map((_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return date.toISOString().substring(0, 7); // YYYY-MM format
      });
      
      const monthlyActivity = last6Months.reduce((acc: any, month) => {
        acc[month] = 0;
        return acc;
      }, {});
      
      // Count entries by month
      entries.forEach(entry => {
        const entryMonth = new Date(entry.date).toISOString().substring(0, 7);
        if (monthlyActivity[entryMonth] !== undefined) {
          monthlyActivity[entryMonth]++;
        }
      });
      
      return {
        totalEntries: entries.length,
        countsByStatus,
        monthlyActivity
      };
    } catch (error) {
      console.error('Error getting journal activity summary:', error);
      return null;
    }
  }

  /**
   * Get summarized insights about an account without exposing transaction details
   */
  async getAccountInsights(entityId: number, accountId: number) {
    try {
      const account = await this.storage.getAccount(accountId);
      
      if (!account || account.entityId !== entityId) {
        throw new Error('Account not found or not part of this entity');
      }
      
      // Get GL entries for the account
      const startOfYear = new Date();
      startOfYear.setMonth(0, 1);
      startOfYear.setHours(0, 0, 0, 0);
      
      const glEntries = await this.storage.getGeneralLedger(entityId, {
        accountId,
        startDate: startOfYear
      });
      
      // Calculate monthly totals without exposing individual transactions
      const monthlyTotals: Record<string, { debits: number, credits: number }> = {};
      
      glEntries.forEach(entry => {
        const month = new Date(entry.date).toISOString().substring(0, 7);
        if (!monthlyTotals[month]) {
          monthlyTotals[month] = { debits: 0, credits: 0 };
        }
        
        monthlyTotals[month].debits += Number(entry.debit) || 0;
        monthlyTotals[month].credits += Number(entry.credit) || 0;
      });
      
      // Calculate useful metrics
      const totalDebits = glEntries.reduce((sum, entry) => sum + Number(entry.debit), 0);
      const totalCredits = glEntries.reduce((sum, entry) => sum + Number(entry.credit), 0);
      const netChange = account.type === 'asset' || account.type === 'expense' 
        ? totalDebits - totalCredits 
        : totalCredits - totalDebits;
      
      // Remove sensitive data from account
      const safeAccount = {
        id: account.id,
        name: account.name,
        code: account.code,
        type: account.type,
        category: account.category,
        active: account.active
      };
      
      return {
        account: safeAccount,
        summary: {
          transactionCount: glEntries.length,
          monthlyTotals,
          totalDebits,
          totalCredits,
          netChange,
          currentBalance: account.balance
        }
      };
    } catch (error) {
      console.error('Error getting account insights:', error);
      throw new Error('Failed to get account insights');
    }
  }
  
  /**
   * Get entity list with minimal information
   */
  async getEntityList() {
    try {
      const entities = await this.storage.getEntities();
      
      // Return only non-sensitive entity info
      return entities.map(entity => ({
        id: entity.id,
        name: entity.name,
        code: entity.code,
        industry: entity.industry,
        active: entity.active
      }));
    } catch (error) {
      console.error('Error getting entity list:', error);
      throw new Error('Failed to get entity list');
    }
  }
  
  /**
   * Get transaction patterns and anomalies without exposing specific transactions
   */
  async getTransactionPatterns(entityId: number) {
    try {
      const entries = await this.storage.getJournalEntries(entityId);
      
      // Skip if no entries
      if (!entries.length) return null;
      
      // Get all entry lines
      const entryLinesPromises = entries.map(entry => 
        this.storage.getJournalEntryLines(entry.id)
      );
      
      const allEntryLines = await Promise.all(entryLinesPromises);
      const flattenedLines = allEntryLines.flat();
      
      // Calculate average transaction size
      const totalDebit = flattenedLines.reduce(
        (sum, line) => sum + parseFloat(line.debit || '0'), 
        0
      );
      
      const avgTransactionSize = totalDebit / flattenedLines.length;
      
      // Get transaction frequency by day of week
      const dayFrequency = entries.reduce((acc: Record<string, number>, entry) => {
        const day = new Date(entry.date).getDay();
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
        acc[dayName] = (acc[dayName] || 0) + 1;
        return acc;
      }, {});
      
      return {
        avgTransactionSize,
        transactionCount: entries.length,
        lineItemCount: flattenedLines.length,
        avgLinesPerTransaction: flattenedLines.length / entries.length,
        dayFrequency
      };
    } catch (error) {
      console.error('Error getting transaction patterns:', error);
      return null;
    }
  }
}

export default AiDataService;