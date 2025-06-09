/**
 * Utility functions for generating enterprise-scale journal entry IDs
 * Supports unlimited entries per entity while maintaining readability
 */

export interface JournalEntryIdComponents {
  entityId: number;
  year: string;
  sequenceId: number;
}

/**
 * Generates a scalable journal entry display ID
 * Format: JE-{entityId}-{year}-{sequenceId}
 * Example: JE-391-2025-142857
 * 
 * This format supports:
 * - Unlimited entities (entityId can be any number)
 * - Unlimited entries per entity per year
 * - Clear year-based organization
 * - Unique identification across the entire system
 */
export function generateJournalEntryDisplayId(
  entityId: number,
  year: string | number,
  sequenceId: number
): string {
  const yearStr = typeof year === 'string' ? year : year.toString();
  return `JE-${entityId}-${yearStr}-${sequenceId}`;
}

/**
 * Alternative compact format for very high-volume systems
 * Format: JE{year}{entityId}_{sequenceId}
 * Example: JE2025391_142857
 * 
 * More compact but still enterprise-scalable
 */
export function generateCompactJournalEntryId(
  entityId: number,
  year: string | number,
  sequenceId: number
): string {
  const yearStr = typeof year === 'string' ? year : year.toString();
  return `JE${yearStr}${entityId}_${sequenceId}`;
}

/**
 * Parses a journal entry display ID back to its components
 */
export function parseJournalEntryDisplayId(displayId: string): JournalEntryIdComponents | null {
  // Match format: JE-{entityId}-{year}-{sequenceId}
  const match = displayId.match(/^JE-(\d+)-(\d{4})-(\d+)$/);
  if (match) {
    return {
      entityId: parseInt(match[1]),
      year: match[2],
      sequenceId: parseInt(match[3])
    };
  }
  
  // Match compact format: JE{year}{entityId}_{sequenceId}
  const compactMatch = displayId.match(/^JE(\d{4})(\d+)_(\d+)$/);
  if (compactMatch) {
    return {
      entityId: parseInt(compactMatch[2]),
      year: compactMatch[1],
      sequenceId: parseInt(compactMatch[3])
    };
  }
  
  return null;
}

/**
 * Legacy format support for backward compatibility
 * Handles the old JE-{year}-{id} format
 */
export function generateLegacyCompatibleId(
  year: string | number,
  id: number
): string {
  const yearStr = typeof year === 'string' ? year : year.toString();
  return `JE-${yearStr}-${id}`;
}

/**
 * Generates a unique reference prefix that cannot be changed by users
 * Format: REF-{entityId}-{year}-{timestamp}
 * Example: REF-391-2025-1749509234567
 * 
 * This ensures enterprise-scale uniqueness across:
 * - Multiple entities
 * - Multiple years
 * - High-frequency operations (timestamp precision)
 */
export function generateUniqueReferencePrefix(
  entityId: number,
  year?: string | number
): string {
  const currentYear = year ? 
    (typeof year === 'string' ? year : year.toString()) : 
    new Date().getFullYear().toString();
  const timestamp = Date.now();
  
  return `REF-${entityId}-${currentYear}-${timestamp}`;
}

/**
 * Combines the auto-generated prefix with optional user suffix
 * Format: {prefix}[:{userSuffix}]
 * Examples: 
 * - REF-391-2025-1749509234567 (no user suffix)
 * - REF-391-2025-1749509234567:ACCRUAL_ADJ (with user suffix)
 */
export function buildFullReference(
  prefix: string,
  userSuffix?: string
): string {
  if (!userSuffix || userSuffix.trim() === '') {
    return prefix;
  }
  
  // Sanitize user suffix - remove special characters that could cause issues
  const sanitizedSuffix = userSuffix.trim().replace(/[^\w\-_]/g, '_').toUpperCase();
  return `${prefix}:${sanitizedSuffix}`;
}

/**
 * Parses a full reference back to its components
 */
export function parseFullReference(fullReference: string): {
  prefix: string;
  userSuffix?: string;
  entityId?: number;
  year?: string;
  timestamp?: number;
} | null {
  const parts = fullReference.split(':');
  const prefix = parts[0];
  const userSuffix = parts.length > 1 ? parts[1] : undefined;
  
  // Parse prefix: REF-{entityId}-{year}-{timestamp}
  const prefixMatch = prefix.match(/^REF-(\d+)-(\d{4})-(\d+)$/);
  if (prefixMatch) {
    return {
      prefix,
      userSuffix,
      entityId: parseInt(prefixMatch[1]),
      year: prefixMatch[2],
      timestamp: parseInt(prefixMatch[3])
    };
  }
  
  return {
    prefix,
    userSuffix
  };
}