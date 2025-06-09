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