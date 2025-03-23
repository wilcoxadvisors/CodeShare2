/**
 * Deprecation Logger
 * 
 * Provides utility functions for logging deprecation warnings
 * and tracking usage of deprecated features.
 */

import { 
  logEntityIdsUsage, 
  EntityIdsUsageType, 
  startEntityIdsMonitoring 
} from './deprecation-monitor';

// Start monitoring on import
// This ensures monitoring begins as soon as the application starts
// Comment this out during testing to avoid duplicate monitoring
startEntityIdsMonitoring();

/**
 * Log a deprecation warning for entity_ids usage
 * @param method The method or function name where entity_ids is being used
 * @param context Additional context about the usage (e.g. groupId)
 */
export function logEntityIdsDeprecation(method: string, context?: any): void {
  const contextStr = context ? ` (Context: ${JSON.stringify(context)})` : '';
  
  // Log to console for immediate visibility
  console.warn(
    `[DEPRECATION] entity_ids array accessed in ${method}${contextStr}. ` +
    `This approach is deprecated and will be removed in Q1 2026. ` +
    `Use consolidation_group_entities junction table instead.`
  );
  
  // Track in monitoring system
  logEntityIdsUsage(EntityIdsUsageType.DIRECT_ACCESS, method, context);
}

/**
 * Log a fallback to entity_ids when junction table has no data
 * This is less severe than direct entity_ids access, as it's part of 
 * our backward compatibility strategy
 */
export function logEntityIdsFallback(method: string, groupId?: number): void {
  const context = groupId ? { groupId } : undefined;
  
  // Log to console for immediate visibility
  console.info(
    `[COMPATIBILITY] Falling back to entity_ids array in ${method}` +
    (groupId ? ` for group ${groupId}` : '') +
    `. This is expected during transition period.`
  );
  
  // Track in monitoring system
  logEntityIdsUsage(EntityIdsUsageType.FALLBACK, method, context);
}

/**
 * Log updates to entity_ids array for backward compatibility
 */
export function logEntityIdsUpdate(method: string, groupId?: number): void {
  const context = groupId ? { groupId } : undefined;
  
  // Log to console for immediate visibility
  console.info(
    `[COMPATIBILITY] Updating entity_ids array in ${method}` +
    (groupId ? ` for group ${groupId}` : '') +
    ` for backward compatibility.`
  );
  
  // Track in monitoring system
  logEntityIdsUsage(EntityIdsUsageType.COMPATIBILITY_UPDATE, method, context);
}