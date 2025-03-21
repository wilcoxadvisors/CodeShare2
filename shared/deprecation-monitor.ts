/**
 * Deprecation Monitor
 * 
 * Provides utilities for tracking entity_ids usage over time, generating reports,
 * and sending alerts when unexpected usage patterns are detected.
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";

// Usage statistics table can be created if needed in the future
// For now, we'll store reports in memory with persistence to logs

/**
 * Types of entity_ids usage to track
 */
export enum EntityIdsUsageType {
  DIRECT_ACCESS = 'direct_access',     // Direct access to entity_ids property
  FALLBACK = 'fallback',               // Fallback to entity_ids when junction table has no data
  COMPATIBILITY_UPDATE = 'update'      // Updating entity_ids for backward compatibility
}

/**
 * Structure of an entity_ids usage report
 */
export interface DeprecationReport {
  startDate: Date;
  endDate: Date;
  directAccessCount: number;
  fallbackUsageCount: number;
  updateUsageCount: number;
  byMethod: Record<string, {
    directAccessCount: number;
    fallbackUsageCount: number;
    updateUsageCount: number;
  }>;
  total: number;
}

// In-memory storage for usage statistics
// In a production environment, this would be stored in a database table
const usageStats: {
  timestamp: Date;
  type: EntityIdsUsageType;
  method: string;
  context?: any;
}[] = [];

/**
 * Log entity_ids usage
 * @param type Type of usage
 * @param method Method where usage occurred
 * @param context Additional context
 */
export function logEntityIdsUsage(
  type: EntityIdsUsageType,
  method: string,
  context?: any
): void {
  usageStats.push({
    timestamp: new Date(),
    type,
    method,
    context
  });
  
  // Check thresholds for alerting
  checkUsageThresholds();
}

/**
 * Generate a report of entity_ids usage over a specific time period
 * @param startDate Start date for the report period
 * @param endDate End date for the report period
 * @returns Detailed usage report
 */
export function generateUsageReport(
  startDate: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default to last 7 days
  endDate: Date = new Date()
): DeprecationReport {
  // Filter usage stats by date range
  const relevantStats = usageStats.filter(stat => 
    stat.timestamp >= startDate && stat.timestamp <= endDate
  );
  
  // Count by type
  const directAccessCount = relevantStats.filter(
    stat => stat.type === EntityIdsUsageType.DIRECT_ACCESS
  ).length;
  
  const fallbackUsageCount = relevantStats.filter(
    stat => stat.type === EntityIdsUsageType.FALLBACK
  ).length;
  
  const updateUsageCount = relevantStats.filter(
    stat => stat.type === EntityIdsUsageType.COMPATIBILITY_UPDATE
  ).length;
  
  // Count by method
  const methodStats: Record<string, {
    directAccessCount: number;
    fallbackUsageCount: number;
    updateUsageCount: number;
  }> = {};
  
  relevantStats.forEach(stat => {
    if (!methodStats[stat.method]) {
      methodStats[stat.method] = {
        directAccessCount: 0,
        fallbackUsageCount: 0,
        updateUsageCount: 0
      };
    }
    
    if (stat.type === EntityIdsUsageType.DIRECT_ACCESS) {
      methodStats[stat.method].directAccessCount++;
    } else if (stat.type === EntityIdsUsageType.FALLBACK) {
      methodStats[stat.method].fallbackUsageCount++;
    } else if (stat.type === EntityIdsUsageType.COMPATIBILITY_UPDATE) {
      methodStats[stat.method].updateUsageCount++;
    }
  });
  
  return {
    startDate,
    endDate,
    directAccessCount,
    fallbackUsageCount,
    updateUsageCount,
    byMethod: methodStats,
    total: relevantStats.length
  };
}

/**
 * Check if usage thresholds have been exceeded and trigger alerts if needed
 */
function checkUsageThresholds(): void {
  // Generate report for the last 24 hours
  const oneDayReport = generateUsageReport(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    new Date()
  );
  
  // Define thresholds
  const DIRECT_ACCESS_THRESHOLD = 50;
  const FALLBACK_THRESHOLD = 100;
  
  // Check thresholds and alert if needed
  if (oneDayReport.directAccessCount > DIRECT_ACCESS_THRESHOLD) {
    alertHighUsage('direct_access', oneDayReport.directAccessCount);
  }
  
  if (oneDayReport.fallbackUsageCount > FALLBACK_THRESHOLD) {
    alertHighUsage('fallback', oneDayReport.fallbackUsageCount);
  }
}

/**
 * Send an alert for high entity_ids usage
 * @param usageType Type of usage that triggered the alert
 * @param count Number of occurrences
 */
function alertHighUsage(usageType: string, count: number): void {
  const message = `ALERT: High entity_ids ${usageType} usage detected: ${count} occurrences in the last 24 hours`;
  
  // Log alert
  console.warn(message);
  
  // In a production environment, this would send email/Slack notifications
  // or integrate with an alerting system
  
  // Example: If we had an alerting service
  // alertingService.sendAlert('entity_ids_usage', message, 'warning');
}

/**
 * Schedule regular report generation
 * @param intervalDays Number of days between reports
 */
export function scheduleRegularReports(intervalDays: number = 7): NodeJS.Timer {
  // Convert days to milliseconds
  const interval = intervalDays * 24 * 60 * 60 * 1000;
  
  return setInterval(() => {
    const report = generateUsageReport(
      new Date(Date.now() - intervalDays * 24 * 60 * 60 * 1000),
      new Date()
    );
    
    // Log the report
    console.info(`SCHEDULED REPORT (${intervalDays} days): entity_ids usage`);
    console.info(JSON.stringify(report, null, 2));
    
    // In a production environment, this would be stored in a database
    // and/or sent to stakeholders via email
    
  }, interval);
}

/**
 * Start monitoring entity_ids usage
 * This sets up periodic reports and can be called on application startup
 */
export function startEntityIdsMonitoring(): void {
  // Generate daily reports
  scheduleRegularReports(1);
  
  // Generate weekly reports
  scheduleRegularReports(7);
  
  console.info('entity_ids usage monitoring started');
}

/**
 * Clear usage statistics (mainly for testing purposes)
 */
export function clearUsageStats(): void {
  usageStats.length = 0;
}