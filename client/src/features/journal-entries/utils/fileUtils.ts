/**
 * Utilities for file-related operations in journal entries
 */

/**
 * Builds a standardized URL for fetching journal entry files
 * 
 * This utility centralizes the URL construction used across multiple components:
 * - JournalEntryForm (file upload/download)
 * - JournalEntryDetail (file viewing/preview)
 * - AuditTrail (file history)
 * 
 * @param entityId - The entity ID
 * @param entryId - The journal entry ID 
 * @param fileId - Optional specific file ID to target
 * @returns The constructed URL
 */
export function getEntryFilesUrl(
  entityId: number,
  entryId: number,
  fileId?: number
): string {
  // Base URL pattern for journal entry files
  const baseUrl = `/api/journal-entries/${entryId}/files`;
  
  // If a specific file ID is provided, append it to the URL
  if (fileId) {
    return `${baseUrl}/${fileId}`;
  }
  
  return baseUrl;
}

/**
 * Builds a URL for downloading a specific file attachment
 * 
 * @param entityId - The entity ID
 * @param entryId - The journal entry ID
 * @param fileId - The specific file ID to download
 * @returns The download URL
 */
export function getFileDownloadUrl(
  entityId: number,
  entryId: number,
  fileId: number
): string {
  return `${getEntryFilesUrl(entityId, entryId, fileId)}/download`;
}

/**
 * Builds a URL for viewing/previewing a specific file attachment
 * 
 * @param entityId - The entity ID
 * @param entryId - The journal entry ID
 * @param fileId - The specific file ID to preview
 * @returns The preview URL
 */
export function getFilePreviewUrl(
  entityId: number,
  entryId: number,
  fileId: number
): string {
  return `${getEntryFilesUrl(entityId, entryId, fileId)}/preview`;
}

/**
 * Gets an appropriate icon component for a file based on its MIME type
 * 
 * @param mimeType - The MIME type of the file
 * @returns React component name from lucide-react to use as icon
 */
export function getFileIconByMimeType(mimeType: string): string {
  if (!mimeType) return 'FileText';
  
  if (mimeType.startsWith('image/')) {
    return 'FileImage';
  } else if (mimeType === 'application/pdf') {
    return 'FileText';
  } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return 'FileSpreadsheet';
  } else if (mimeType.includes('zip') || mimeType.includes('compressed')) {
    return 'FileArchive';
  } else if (mimeType.includes('word') || mimeType.includes('doc')) {
    return 'FileText'; // With blue styling in component
  } else if (mimeType === 'message/rfc822' || mimeType === 'application/vnd.ms-outlook') {
    // Email file formats (.eml, .msg)
    return 'SendHorizontal';
  } else {
    return 'FileText';
  }
}

/**
 * Formats bytes into human-readable file size
 * 
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places to include
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}