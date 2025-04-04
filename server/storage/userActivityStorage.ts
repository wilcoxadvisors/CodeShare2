/**
 * User Activity Storage Module
 * 
 * This module contains the storage interface and implementation for user activity
 * logs, feature usage analytics, and industry benchmark comparisons.
 */
import { db } from "../db";
import { 
  userActivityLogs, UserActivityLog, InsertUserActivityLog,
  featureUsage, FeatureUsage, InsertFeatureUsage,
  industryBenchmarks, IndustryBenchmark, InsertIndustryBenchmark,
  dataConsent, DataConsent, InsertDataConsent
} from "@shared/schema";
import { eq, and, desc, isNull, not, sql, sum, count, inArray } from "drizzle-orm";
import { ApiError } from "../errorHandling";

// Helper function to handle database errors consistently
function handleDbError(error: unknown, operation: string): Error {
  console.error(`Database error during ${operation}:`, error);
  if (error instanceof ApiError) {
    return error;
  }
  return new Error(`An error occurred during ${operation}: ${error instanceof Error ? error.message : String(error)}`);
}

/**
 * Interface for user activity storage operations
 */
export interface IUserActivityStorage {
  // User Activity operations
  logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog>;
  getUserActivities(userId: number, limit?: number): Promise<UserActivityLog[]>;
  getUserActivitiesByEntity(entityId: number, limit?: number): Promise<UserActivityLog[]>;
  getUserActivitiesByResourceType(resourceType: string, limit?: number): Promise<UserActivityLog[]>;
  
  // Feature Usage operations
  recordFeatureUsage(usage: InsertFeatureUsage): Promise<FeatureUsage>;
  getFeatureUsageByUser(userId: number): Promise<FeatureUsage[]>;
  getFeatureUsageStats(): Promise<{ featureName: string, usageCount: number }[]>;
  getFeatureUsageByTime(startDate: Date, endDate: Date): Promise<{ date: Date, usageCount: number }[]>;
  
  // Industry Benchmark operations
  addIndustryBenchmark(benchmark: InsertIndustryBenchmark): Promise<IndustryBenchmark>;
  getIndustryBenchmarks(industry: string): Promise<IndustryBenchmark[]>;
  getIndustryComparison(entityId: number, metricNames: string[]): Promise<any>;
  
  // Data Consent operations
  recordDataConsent(consent: InsertDataConsent): Promise<DataConsent>;
  getDataConsent(userId: number): Promise<DataConsent | undefined>;
  updateDataConsent(userId: number, consent: Partial<DataConsent>): Promise<DataConsent | undefined>;
}

/**
 * Implementation of user activity storage operations using Drizzle ORM
 */
export class UserActivityStorage implements IUserActivityStorage {
  /**
   * Log a user activity event
   */
  async logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog> {
    try {
      const [log] = await db
        .insert(userActivityLogs)
        .values({
          ...activity,
          timestamp: new Date()
        })
        .returning();
      
      return log;
    } catch (error) {
      throw handleDbError(error, "logging user activity");
    }
  }
  
  /**
   * Get activities for a user
   */
  async getUserActivities(userId: number, limit?: number): Promise<UserActivityLog[]> {
    try {
      let query = db
        .select()
        .from(userActivityLogs)
        .where(eq(userActivityLogs.userId, userId))
        .orderBy(desc(userActivityLogs.timestamp));
      
      if (limit) {
        query = query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      throw handleDbError(error, `getting user activities for user ${userId}`);
    }
  }
  
  /**
   * Get activities for an entity
   */
  async getUserActivitiesByEntity(entityId: number, limit?: number): Promise<UserActivityLog[]> {
    try {
      let query = db
        .select()
        .from(userActivityLogs)
        .where(eq(userActivityLogs.entityId, entityId))
        .orderBy(desc(userActivityLogs.timestamp));
      
      if (limit) {
        query = query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      throw handleDbError(error, `getting user activities for entity ${entityId}`);
    }
  }
  
  /**
   * Get activities by resource type
   */
  async getUserActivitiesByResourceType(resourceType: string, limit?: number): Promise<UserActivityLog[]> {
    try {
      let query = db
        .select()
        .from(userActivityLogs)
        .where(eq(userActivityLogs.resourceType, resourceType))
        .orderBy(desc(userActivityLogs.timestamp));
      
      if (limit) {
        query = query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      throw handleDbError(error, `getting user activities for resource type ${resourceType}`);
    }
  }
  
  /**
   * Record feature usage
   */
  async recordFeatureUsage(usage: InsertFeatureUsage): Promise<FeatureUsage> {
    try {
      // Check if this feature was used by this user in the current session
      const existingUsage = await db
        .select()
        .from(featureUsage)
        .where(
          and(
            eq(featureUsage.userId, usage.userId),
            eq(featureUsage.featureName, usage.featureName),
            eq(featureUsage.sessionId, usage.sessionId || '')
          )
        )
        .limit(1);
      
      // If the feature was already used in this session, update the count
      if (existingUsage.length > 0) {
        const [updated] = await db
          .update(featureUsage)
          .set({
            usageCount: (existingUsage[0].usageCount || 0) + 1,
            updatedAt: new Date()
          })
          .where(eq(featureUsage.id, existingUsage[0].id))
          .returning();
        
        return updated;
      }
      
      // Otherwise, create a new record
      const [newUsage] = await db
        .insert(featureUsage)
        .values({
          ...usage,
          usageCount: 1,
          timestamp: new Date()
        })
        .returning();
      
      return newUsage;
    } catch (error) {
      throw handleDbError(error, "recording feature usage");
    }
  }
  
  /**
   * Get feature usage for a user
   */
  async getFeatureUsageByUser(userId: number): Promise<FeatureUsage[]> {
    try {
      return await db
        .select()
        .from(featureUsage)
        .where(eq(featureUsage.userId, userId))
        .orderBy(desc(featureUsage.timestamp));
    } catch (error) {
      throw handleDbError(error, `getting feature usage for user ${userId}`);
    }
  }
  
  /**
   * Get feature usage statistics
   */
  async getFeatureUsageStats(): Promise<{ featureName: string, usageCount: number }[]> {
    try {
      const results = await db
        .select({
          featureName: featureUsage.featureName,
          usageCount: sum(featureUsage.usageCount).as('usageCount'),
          userCount: count(featureUsage.userId).as('userCount')
        })
        .from(featureUsage)
        .groupBy(featureUsage.featureName)
        .orderBy(sql`usageCount DESC`);
      
      return results.map(result => ({
        featureName: result.featureName,
        usageCount: Number(result.usageCount) || 0
      }));
    } catch (error) {
      throw handleDbError(error, "getting feature usage statistics");
    }
  }
  
  /**
   * Get feature usage by time
   */
  async getFeatureUsageByTime(startDate: Date, endDate: Date): Promise<{ date: Date, usageCount: number }[]> {
    try {
      const results = await db
        .select({
          date: sql<Date>`DATE(${featureUsage.timestamp})`,
          usageCount: sum(featureUsage.usageCount).as('usageCount')
        })
        .from(featureUsage)
        .where(
          and(
            featureUsage.timestamp >= startDate,
            featureUsage.timestamp <= endDate,
            not(isNull(featureUsage.timestamp))
          )
        )
        .groupBy(sql`DATE(${featureUsage.timestamp})`)
        .orderBy(sql`DATE(${featureUsage.timestamp})`);
      
      return results.map(result => ({
        date: result.date,
        usageCount: Number(result.usageCount) || 0
      }));
    } catch (error) {
      throw handleDbError(error, "getting feature usage by time");
    }
  }
  
  /**
   * Add an industry benchmark record
   */
  async addIndustryBenchmark(benchmark: InsertIndustryBenchmark): Promise<IndustryBenchmark> {
    try {
      const [newBenchmark] = await db
        .insert(industryBenchmarks)
        .values({
          ...benchmark,
          createdAt: new Date()
        })
        .returning();
      
      return newBenchmark;
    } catch (error) {
      throw handleDbError(error, "adding industry benchmark");
    }
  }
  
  /**
   * Get industry benchmarks by industry
   */
  async getIndustryBenchmarks(industry: string): Promise<IndustryBenchmark[]> {
    try {
      return await db
        .select()
        .from(industryBenchmarks)
        .where(
          and(
            eq(industryBenchmarks.industry, industry),
            eq(industryBenchmarks.isActive, true)
          )
        )
        .orderBy(desc(industryBenchmarks.effectiveDate), desc(industryBenchmarks.createdAt));
    } catch (error) {
      throw handleDbError(error, `getting industry benchmarks for ${industry}`);
    }
  }
  
  /**
   * Get industry comparison data for an entity
   */
  async getIndustryComparison(entityId: number, metricNames: string[]): Promise<any> {
    try {
      // Get entity data first (including its industry)
      const [entity] = await db
        .execute(sql`
          SELECT e.id, e.name, e.industry, e.size, e.annual_revenue
          FROM entities e
          WHERE e.id = ${entityId}
        `);
      
      if (!entity) {
        throw new Error(`Entity ${entityId} not found`);
      }
      
      // Get relevant benchmarks
      const benchmarks = await db
        .select()
        .from(industryBenchmarks)
        .where(
          and(
            eq(industryBenchmarks.industry, entity.industry),
            inArray(industryBenchmarks.metricName, metricNames),
            eq(industryBenchmarks.isActive, true)
          )
        )
        .orderBy(desc(industryBenchmarks.effectiveDate), desc(industryBenchmarks.createdAt));
      
      // Get entity's actual metrics
      // This would normally involve more complex calculations from accounting data
      const entityMetrics = await db
        .execute(sql`
          WITH account_totals AS (
            SELECT
              a.name,
              SUM(CASE WHEN jel.type = 'debit' THEN jel.amount::numeric ELSE -jel.amount::numeric END) as total_amount
            FROM accounts a
            JOIN journal_entry_lines jel ON a.id = jel.account_id
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            WHERE a.entity_id = ${entityId}
            GROUP BY a.name
          )
          SELECT 
            at.name as metric_name,
            at.total_amount as actual_value
          FROM account_totals at
          WHERE at.name = ANY(${metricNames})
        `);
      
      // Build comparison result
      const comparisonData = metricNames.map(metricName => {
        const benchmark = benchmarks.find(b => b.metricName === metricName);
        const entityMetric = entityMetrics.find((m: any) => m.metric_name === metricName);
        
        return {
          metricName,
          industryAverage: benchmark?.value || null,
          entityValue: entityMetric?.actual_value || null,
          variance: entityMetric ? 
            (entityMetric.actual_value - (benchmark?.value || 0)) : null,
          percentVariance: benchmark?.value && entityMetric ? 
            ((entityMetric.actual_value / benchmark.value) * 100) - 100 : null
        };
      });
      
      return {
        entityId,
        entityName: entity.name,
        industry: entity.industry,
        comparisonDate: new Date(),
        metrics: comparisonData
      };
    } catch (error) {
      throw handleDbError(error, `getting industry comparison for entity ${entityId}`);
    }
  }
  
  /**
   * Record data consent
   */
  async recordDataConsent(consent: InsertDataConsent): Promise<DataConsent> {
    try {
      // Check if consent already exists for this user
      const existingConsent = await db
        .select()
        .from(dataConsent)
        .where(
          and(
            eq(dataConsent.userId, consent.userId),
            eq(dataConsent.consentType, consent.consentType)
          )
        )
        .orderBy(desc(dataConsent.createdAt))
        .limit(1);
      
      // If consent exists, update it
      if (existingConsent.length > 0) {
        const [updated] = await db
          .update(dataConsent)
          .set({
            ...consent,
            updatedAt: new Date(),
            lastUpdated: new Date()
          })
          .where(eq(dataConsent.id, existingConsent[0].id))
          .returning();
        
        return updated;
      }
      
      // Otherwise, create a new record
      const [newConsent] = await db
        .insert(dataConsent)
        .values({
          ...consent,
          createdAt: new Date(),
          lastUpdated: new Date(),
        })
        .returning();
      
      return newConsent;
    } catch (error) {
      throw handleDbError(error, "recording data consent");
    }
  }
  
  /**
   * Get data consent for a user
   */
  async getDataConsent(userId: number): Promise<DataConsent | undefined> {
    try {
      const [consent] = await db
        .select()
        .from(dataConsent)
        .where(
          and(
            eq(dataConsent.userId, userId),
            eq(dataConsent.isActive, true)
          )
        )
        .orderBy(desc(dataConsent.updatedAt))
        .limit(1);
      
      return consent;
    } catch (error) {
      throw handleDbError(error, `getting data consent for user ${userId}`);
    }
  }
  
  /**
   * Update data consent for a user
   */
  async updateDataConsent(userId: number, consent: Partial<DataConsent>): Promise<DataConsent | undefined> {
    try {
      // Get the current consent record
      const [currentConsent] = await db
        .select()
        .from(dataConsent)
        .where(eq(dataConsent.userId, userId))
        .orderBy(desc(dataConsent.createdAt))
        .limit(1);
      
      if (!currentConsent) {
        return undefined;
      }
      
      // Update the consent record
      const [updated] = await db
        .update(dataConsent)
        .set({
          ...consent,
          updatedAt: new Date(),
          lastUpdated: new Date()
        })
        .where(eq(dataConsent.id, currentConsent.id))
        .returning();
      
      return updated;
    } catch (error) {
      throw handleDbError(error, `updating data consent for user ${userId}`);
    }
  }
}

/**
 * In-memory implementation of user activity storage for testing
 */
export class MemUserActivityStorage implements IUserActivityStorage {
  private userActivities: UserActivityLog[] = [];
  private featureUsages: FeatureUsage[] = [];
  private industryBenchmarks: IndustryBenchmark[] = [];
  private dataConsents: DataConsent[] = [];
  private currentActivityId = 1;
  private currentFeatureUsageId = 1;
  private currentBenchmarkId = 1;
  private currentDataConsentId = 1;
  
  /**
   * Log a user activity event
   */
  async logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog> {
    const id = this.currentActivityId++;
    const logEntry: UserActivityLog = {
      id,
      userId: activity.userId,
      entityId: activity.entityId,
      action: activity.action,
      resourceType: activity.resourceType,
      resourceId: activity.resourceId,
      details: activity.details,
      ipAddress: activity.ipAddress || null,
      userAgent: activity.userAgent || null,
      timestamp: activity.timestamp || new Date(),
      createdAt: new Date(),
      updatedAt: null
    };
    
    this.userActivities.push(logEntry);
    return logEntry;
  }
  
  /**
   * Get activities for a user
   */
  async getUserActivities(userId: number, limit?: number): Promise<UserActivityLog[]> {
    const activities = this.userActivities
      .filter(a => a.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? activities.slice(0, limit) : activities;
  }
  
  /**
   * Get activities for an entity
   */
  async getUserActivitiesByEntity(entityId: number, limit?: number): Promise<UserActivityLog[]> {
    const activities = this.userActivities
      .filter(a => a.entityId === entityId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? activities.slice(0, limit) : activities;
  }
  
  /**
   * Get activities by resource type
   */
  async getUserActivitiesByResourceType(resourceType: string, limit?: number): Promise<UserActivityLog[]> {
    const activities = this.userActivities
      .filter(a => a.resourceType === resourceType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? activities.slice(0, limit) : activities;
  }
  
  /**
   * Record feature usage
   */
  async recordFeatureUsage(usage: InsertFeatureUsage): Promise<FeatureUsage> {
    // Check if this feature was used by this user in the current session
    const existingUsage = this.featureUsages.find(
      u => u.userId === usage.userId &&
          u.featureName === usage.featureName &&
          u.sessionId === (usage.sessionId || '')
    );
    
    // If the feature was already used in this session, update the count
    if (existingUsage) {
      existingUsage.usageCount = (existingUsage.usageCount || 0) + 1;
      existingUsage.updatedAt = new Date();
      return existingUsage;
    }
    
    // Otherwise, create a new record
    const id = this.currentFeatureUsageId++;
    const newUsage: FeatureUsage = {
      id,
      userId: usage.userId,
      featureName: usage.featureName,
      entityId: usage.entityId || null,
      sessionId: usage.sessionId || null,
      usageCount: 1,
      useTime: usage.useTime || null,
      successful: usage.successful || null,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: null
    };
    
    this.featureUsages.push(newUsage);
    return newUsage;
  }
  
  /**
   * Get feature usage for a user
   */
  async getFeatureUsageByUser(userId: number): Promise<FeatureUsage[]> {
    return this.featureUsages
      .filter(u => u.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  /**
   * Get feature usage statistics
   */
  async getFeatureUsageStats(): Promise<{ featureName: string, usageCount: number }[]> {
    const stats: Record<string, number> = {};
    
    this.featureUsages.forEach(usage => {
      if (!stats[usage.featureName]) {
        stats[usage.featureName] = 0;
      }
      stats[usage.featureName] += (usage.usageCount || 1);
    });
    
    return Object.entries(stats).map(([featureName, usageCount]) => ({
      featureName,
      usageCount
    })).sort((a, b) => b.usageCount - a.usageCount);
  }
  
  /**
   * Get feature usage by time
   */
  async getFeatureUsageByTime(startDate: Date, endDate: Date): Promise<{ date: Date, usageCount: number }[]> {
    const dateMap: Record<string, number> = {};
    
    this.featureUsages.forEach(usage => {
      if (usage.timestamp >= startDate && usage.timestamp <= endDate) {
        const dateKey = usage.timestamp.toISOString().split('T')[0];
        if (!dateMap[dateKey]) {
          dateMap[dateKey] = 0;
        }
        dateMap[dateKey] += (usage.usageCount || 1);
      }
    });
    
    return Object.entries(dateMap).map(([dateStr, usageCount]) => ({
      date: new Date(dateStr),
      usageCount
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }
  
  /**
   * Add an industry benchmark record
   */
  async addIndustryBenchmark(benchmark: InsertIndustryBenchmark): Promise<IndustryBenchmark> {
    const id = this.currentBenchmarkId++;
    const newBenchmark: IndustryBenchmark = {
      id,
      industry: benchmark.industry,
      subIndustry: benchmark.subIndustry || null,
      metricName: benchmark.metricName,
      metricValue: benchmark.metricValue,
      value: benchmark.value,
      unit: benchmark.unit || null,
      entitySizeRange: benchmark.entitySizeRange || null,
      year: benchmark.year,
      quarter: benchmark.quarter || null,
      dataSource: benchmark.dataSource || null,
      confidenceLevel: benchmark.confidenceLevel || null,
      sampleSize: benchmark.sampleSize || null,
      isActive: benchmark.isActive ?? true,
      effectiveDate: benchmark.effectiveDate || new Date(),
      expirationDate: benchmark.expirationDate || null,
      createdAt: new Date(),
      updatedAt: null
    };
    
    this.industryBenchmarks.push(newBenchmark);
    return newBenchmark;
  }
  
  /**
   * Get industry benchmarks by industry
   */
  async getIndustryBenchmarks(industry: string): Promise<IndustryBenchmark[]> {
    return this.industryBenchmarks
      .filter(b => b.industry === industry && b.isActive)
      .sort((a, b) => {
        // Sort by effectiveDate (desc) then by createdAt (desc)
        if (a.effectiveDate.getTime() !== b.effectiveDate.getTime()) {
          return b.effectiveDate.getTime() - a.effectiveDate.getTime();
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }
  
  /**
   * Get industry comparison data for an entity
   */
  async getIndustryComparison(entityId: number, metricNames: string[]): Promise<any> {
    // This would be a mock implementation
    // In a real app, you would have to get the entity's industry first
    const mockEntity = {
      id: entityId,
      name: `Entity ${entityId}`,
      industry: 'Technology',
      size: 'Medium',
      annualRevenue: 5000000
    };
    
    // Mock benchmarks
    const benchmarks = this.industryBenchmarks
      .filter(b => b.industry === mockEntity.industry && 
                  metricNames.includes(b.metricName) &&
                  b.isActive);
    
    // Mock entity metrics (just example values)
    const entityMetrics = metricNames.map(name => ({
      metric_name: name,
      actual_value: Math.random() * 100 // Random value for demo
    }));
    
    // Build comparison result
    const comparisonData = metricNames.map(metricName => {
      const benchmark = benchmarks.find(b => b.metricName === metricName);
      const entityMetric = entityMetrics.find(m => m.metric_name === metricName);
      
      return {
        metricName,
        industryAverage: benchmark?.value || null,
        entityValue: entityMetric?.actual_value || null,
        variance: entityMetric && benchmark ? 
          (entityMetric.actual_value - benchmark.value) : null,
        percentVariance: benchmark?.value && entityMetric ? 
          ((entityMetric.actual_value / benchmark.value) * 100) - 100 : null
      };
    });
    
    return {
      entityId,
      entityName: mockEntity.name,
      industry: mockEntity.industry,
      comparisonDate: new Date(),
      metrics: comparisonData
    };
  }
  
  /**
   * Record data consent
   */
  async recordDataConsent(consent: InsertDataConsent): Promise<DataConsent> {
    // Check if consent already exists for this user
    const existingConsentIndex = this.dataConsents.findIndex(
      c => c.userId === consent.userId && c.consentType === consent.consentType
    );
    
    // If consent exists, update it
    if (existingConsentIndex >= 0) {
      const existingConsent = this.dataConsents[existingConsentIndex];
      const updatedConsent: DataConsent = {
        ...existingConsent,
        ...consent,
        updatedAt: new Date(),
        lastUpdated: new Date()
      };
      
      this.dataConsents[existingConsentIndex] = updatedConsent;
      return updatedConsent;
    }
    
    // Otherwise, create a new record
    const id = this.currentDataConsentId++;
    const newConsent: DataConsent = {
      id,
      userId: consent.userId,
      consentType: consent.consentType,
      consentVersion: consent.consentVersion,
      consentGiven: consent.consentGiven,
      consentText: consent.consentText || null,
      expirationDate: consent.expirationDate || null,
      dataCategories: consent.dataCategories || null,
      isActive: consent.isActive ?? true,
      revokedAt: consent.revokedAt || null,
      createdAt: new Date(),
      updatedAt: null,
      lastUpdated: new Date(),
    };
    
    this.dataConsents.push(newConsent);
    return newConsent;
  }
  
  /**
   * Get data consent for a user
   */
  async getDataConsent(userId: number): Promise<DataConsent | undefined> {
    return this.dataConsents
      .filter(c => c.userId === userId && c.isActive)
      .sort((a, b) => {
        return b.updatedAt ? b.updatedAt.getTime() : b.createdAt.getTime() - 
               (a.updatedAt ? a.updatedAt.getTime() : a.createdAt.getTime());
      })[0];
  }
  
  /**
   * Update data consent for a user
   */
  async updateDataConsent(userId: number, consentUpdate: Partial<DataConsent>): Promise<DataConsent | undefined> {
    const consentIndex = this.dataConsents.findIndex(c => c.userId === userId);
    
    if (consentIndex === -1) {
      return undefined;
    }
    
    const consent = this.dataConsents[consentIndex];
    const updatedConsent: DataConsent = {
      ...consent,
      ...consentUpdate,
      updatedAt: new Date(),
      lastUpdated: new Date()
    };
    
    this.dataConsents[consentIndex] = updatedConsent;
    return updatedConsent;
  }
}

// Export singleton instance
export const userActivityStorage = new UserActivityStorage();