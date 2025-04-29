import { 
  getEntryFilesUrl, 
  getFileDownloadUrl, 
  getFilePreviewUrl,
  getFileIconByMimeType,
  formatFileSize
} from '../client/src/features/journal-entries/utils/fileUtils';

describe('fileUtils', () => {
  describe('getEntryFilesUrl', () => {
    test('returns correct URL for entry files', () => {
      expect(getEntryFilesUrl(123, 456)).toBe('/api/journal-entries/456/files');
    });

    test('returns correct URL for a specific file', () => {
      expect(getEntryFilesUrl(123, 456, 789)).toBe('/api/journal-entries/456/files/789');
    });
  });

  describe('getFileDownloadUrl', () => {
    test('returns correct download URL', () => {
      expect(getFileDownloadUrl(123, 456, 789)).toBe('/api/journal-entries/456/files/789/download');
    });
  });

  describe('getFilePreviewUrl', () => {
    test('returns correct preview URL', () => {
      expect(getFilePreviewUrl(123, 456, 789)).toBe('/api/journal-entries/456/files/789/preview');
    });
  });

  describe('getFileIconByMimeType', () => {
    test('returns FileImage for image types', () => {
      expect(getFileIconByMimeType('image/jpeg')).toBe('FileImage');
      expect(getFileIconByMimeType('image/png')).toBe('FileImage');
    });

    test('returns FileText for PDF', () => {
      expect(getFileIconByMimeType('application/pdf')).toBe('FileText');
    });

    test('returns FileSpreadsheet for Excel files', () => {
      expect(getFileIconByMimeType('application/vnd.ms-excel')).toBe('FileSpreadsheet');
      expect(getFileIconByMimeType('application/spreadsheet')).toBe('FileSpreadsheet');
    });

    test('returns FileArchive for compressed files', () => {
      expect(getFileIconByMimeType('application/zip')).toBe('FileArchive');
      expect(getFileIconByMimeType('application/x-compressed')).toBe('FileArchive');
    });

    test('returns SendHorizontal for email files', () => {
      expect(getFileIconByMimeType('message/rfc822')).toBe('SendHorizontal');
      expect(getFileIconByMimeType('application/vnd.ms-outlook')).toBe('SendHorizontal');
    });

    test('returns FileText for unknown types', () => {
      expect(getFileIconByMimeType('application/octet-stream')).toBe('FileText');
      expect(getFileIconByMimeType('')).toBe('FileText');
    });
  });

  describe('formatFileSize', () => {
    test('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    test('respects decimal places parameter', () => {
      expect(formatFileSize(1500, 0)).toBe('1 KB');
      expect(formatFileSize(1500, 1)).toBe('1.5 KB');
      expect(formatFileSize(1500, 3)).toBe('1.465 KB');
    });
  });
});