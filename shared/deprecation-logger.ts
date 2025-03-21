/**
 * Deprecation Logger
 * 
 * Provides utility functions for logging deprecation warnings
 * and tracking usage of deprecated features.
 */

/**
 * Log a deprecation warning for entity_ids usage
 * @param method The method or function name where entity_ids is being used
 * @param context Additional context about the usage (e.g. groupId)
 */
export function logEntityIdsDeprecation(method: string, context?: any): void {
  const contextStr = context ? ` (Context: ${JSON.stringify(context)})` : '';
  
  // In production, we could send these logs to a monitoring service
  console.warn(
    `[DEPRECATION] entity_ids array accessed in ${method}${contextStr}. ` +
    `This approach is deprecated and will be removed in Q1 2026. ` +
    `Use consolidation_group_entities junction table instead.`
  );
  
  // If we had a monitoring service, we would log this for tracking:
  // monitoringService.logDeprecationWarning('entity_ids', method, context);
}

/**
 * Log a fallback to entity_ids when junction table has no data
 * This is less severe than direct entity_ids access, as it's part of 
 * our backward compatibility strategy
 */
export function logEntityIdsFallback(method: string, groupId?: number): void {
  console.info(
    `[COMPATIBILITY] Falling back to entity_ids array in ${method}` +
    (groupId ? ` for group ${groupId}` : '') +
    `. This is expected during transition period.`
  );
}

/**
 * Log updates to entity_ids array for backward compatibility
 */
export function logEntityIdsUpdate(method: string, groupId?: number): void {
  console.info(
    `[COMPATIBILITY] Updating entity_ids array in ${method}` +
    (groupId ? ` for group ${groupId}` : '') +
    ` for backward compatibility.`
  );
}