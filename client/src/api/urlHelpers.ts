/**
 * API URL Helper Functions
 * 
 * This module provides helper functions for constructing API URLs.
 * It follows the full hierarchy route pattern:
 * /api/clients/:clientId/entities/:entityId/journal-entries/:jeId/files
 * 
 * These functions should be used exclusively for all API requests to ensure
 * consistency and to avoid hardcoding paths.
 */

/**
 * Constructs the base URL for clients
 */
export function getClientsBaseUrl(): string {
  return '/api/clients';
}

/**
 * Constructs a URL for a specific client
 */
export function getClientUrl(clientId: number | string): string {
  return `${getClientsBaseUrl()}/${clientId}`;
}

/**
 * Constructs the base URL for entities under a client
 */
export function getEntitiesBaseUrl(clientId: number | string): string {
  return `${getClientUrl(clientId)}/entities`;
}

/**
 * Constructs a URL for a specific entity
 */
export function getEntityUrl(clientId: number | string, entityId: number | string): string {
  return `${getEntitiesBaseUrl(clientId)}/${entityId}`;
}

/**
 * Constructs the base URL for journal entries under an entity
 */
export function getJournalEntriesBaseUrl(clientId: number | string, entityId: number | string): string {
  return `${getEntityUrl(clientId, entityId)}/journal-entries`;
}

/**
 * Constructs a URL for a specific journal entry
 */
export function getJournalEntryUrl(clientId: number | string, entityId: number | string, journalEntryId: number | string): string {
  return `${getJournalEntriesBaseUrl(clientId, entityId)}/${journalEntryId}`;
}

/**
 * Constructs the base URL for files under a journal entry
 */
export function getJournalEntryFilesBaseUrl(clientId: number | string, entityId: number | string, journalEntryId: number | string): string {
  return `${getJournalEntryUrl(clientId, entityId, journalEntryId)}/files`;
}

/**
 * Constructs a URL for a specific file
 */
export function getJournalEntryFileUrl(clientId: number | string, entityId: number | string, journalEntryId: number | string, fileId: number | string): string {
  return `${getJournalEntryFilesBaseUrl(clientId, entityId, journalEntryId)}/${fileId}`;
}

/**
 * Constructs a URL for downloading a specific file
 */
export function getJournalEntryFileDownloadUrl(clientId: number | string, entityId: number | string, journalEntryId: number | string, fileId: number | string): string {
  return `${getJournalEntryFileUrl(clientId, entityId, journalEntryId, fileId)}/download`;
}

/**
 * Constructs a URL for dimensions
 */
export function getDimensionsBaseUrl(clientId: number | string, entityId: number | string): string {
  return `${getEntityUrl(clientId, entityId)}/dimensions`;
}

/**
 * Constructs a URL for a specific dimension
 */
export function getDimensionUrl(clientId: number | string, entityId: number | string, dimensionId: number | string): string {
  return `${getDimensionsBaseUrl(clientId, entityId)}/${dimensionId}`;
}

/**
 * Constructs the base URL for batch upload
 */
export function getBatchUploadUrl(clientId: number | string, entityId: number | string): string {
  return `${getJournalEntriesBaseUrl(clientId, entityId)}/batch`;
}

// Legacy URL helpers for backward compatibility
// These will return a 302 redirect with a Deprecation header

/**
 * @deprecated Use getJournalEntryFilesBaseUrl instead
 */
export function getLegacyJournalEntryFilesUrl(journalEntryId: number | string): string {
  console.warn('DEPRECATED: Using legacy URL pattern. Please update to use the full hierarchy route pattern.');
  return `/api/journal-entries/${journalEntryId}/files`;
}

/**
 * @deprecated Use getJournalEntryFileUrl instead
 */
export function getLegacyJournalEntryFileUrl(journalEntryId: number | string, fileId: number | string): string {
  console.warn('DEPRECATED: Using legacy URL pattern. Please update to use the full hierarchy route pattern.');
  return `${getLegacyJournalEntryFilesUrl(journalEntryId)}/${fileId}`;
}

/**
 * @deprecated Use getJournalEntryFileDownloadUrl instead
 */
export function getLegacyJournalEntryFileDownloadUrl(journalEntryId: number | string, fileId: number | string): string {
  console.warn('DEPRECATED: Using legacy URL pattern. Please update to use the full hierarchy route pattern.');
  return `${getLegacyJournalEntryFileUrl(journalEntryId, fileId)}/download`;
}