/**
 * Chart of Accounts Unit Tests
 * 
 * Tests for account validation, import/export logic, and field mapping
 */

import { describe, expect, test, beforeAll, afterAll, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Mock the database functions
jest.mock('../../server/db', () => ({
  db: {
    query: jest.fn().mockResolvedValue([]),
    transaction: jest.fn().mockImplementation(callback => callback({
      query: jest.fn().mockResolvedValue([]),
    })),
  },
  eq: jest.fn(),
  inArray: jest.fn(),
  sql: jest.fn(x => x),
  and: jest.fn(),
}));

// Import after mocking
import { AccountStorage } from '../../server/storage/accountStorage';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample test data
const sampleAccounts = [
  {
    id: 1,
    clientId: 1,
    accountCode: '1000',
    name: 'Cash',
    type: 'ASSET',
    subtype: 'current_asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Cash accounts',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    clientId: 1,
    accountCode: '1100',
    name: 'Checking Account',
    type: 'ASSET',
    subtype: 'current_asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Main checking account',
    parentId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

// Test CSV content
const testCsvContent = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
1000,Cash,ASSET,current_asset,FALSE,,TRUE,Cash accounts,
1100,Checking Account,ASSET,current_asset,FALSE,,TRUE,Main checking account,1000
1200,Savings Account,ASSET,current_asset,FALSE,,TRUE,Savings account for reserves,1000`;

// Test CSV with duplicate codes
const duplicateAccountsCsv = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
1000,Cash,ASSET,current_asset,FALSE,,TRUE,Cash accounts,
1000,Duplicate Cash,ASSET,current_asset,FALSE,,TRUE,This has a duplicate code,`;

// Test CSV with invalid parent
const invalidParentCsv = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
1000,Cash,ASSET,current_asset,FALSE,,TRUE,Cash accounts,
1100,Checking Account,ASSET,current_asset,FALSE,,TRUE,Main checking account,9999`;

describe('Chart of Accounts Functionality', () => {
  let accountStorage;

  beforeAll(() => {
    // Create temporary test files
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(tempDir, 'test-accounts.csv'), testCsvContent);
    fs.writeFileSync(path.join(tempDir, 'duplicate-accounts.csv'), duplicateAccountsCsv);
    fs.writeFileSync(path.join(tempDir, 'invalid-parent.csv'), invalidParentCsv);
    
    // Initialize account storage with mock DB
    accountStorage = new AccountStorage();
  });

  afterAll(() => {
    // Clean up temporary files
    const tempDir = path.join(__dirname, 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Field Mapping Tests
  describe('Field Mapping', () => {
    test('mapDbFieldsToExportFields properly maps accountCode to AccountCode', () => {
      const mapped = accountStorage.mapDbFieldsToExportFields(sampleAccounts[0]);
      expect(mapped.AccountCode).toBe('1000');
      expect(mapped.code).toBeUndefined();
    });

    test('All required fields are properly mapped', () => {
      const mapped = accountStorage.mapDbFieldsToExportFields(sampleAccounts[0]);
      expect(mapped.AccountCode).toBe('1000');
      expect(mapped.Name).toBe('Cash');
      expect(mapped.Type).toBe('ASSET');
      expect(mapped.Subtype).toBe('current_asset');
    });
  });

  // Import Validation Tests
  describe('Import Validation', () => {
    test('validateImportRow detects duplicate account codes', () => {
      const accounts = [
        { accountCode: '1000', name: 'Cash', type: 'ASSET' },
      ];
      
      const newRow = { AccountCode: '1000', Name: 'Duplicate Cash', Type: 'ASSET' };
      const result = accountStorage.validateImportRow(newRow, accounts, []);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate account code');
    });

    test('validateImportRow requires Name field', () => {
      const newRow = { AccountCode: '1000', Type: 'ASSET' };
      const result = accountStorage.validateImportRow(newRow, [], []);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    test('validateImportRow requires Type field', () => {
      const newRow = { AccountCode: '1000', Name: 'Cash' };
      const result = accountStorage.validateImportRow(newRow, [], []);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Type is required');
    });
  });

  // Parent-Child Relationship Tests
  describe('Parent-Child Relationships', () => {
    test('validateParentRelationship detects invalid parent codes', () => {
      const accounts = [
        { accountCode: '1000', name: 'Cash', type: 'ASSET' },
      ];
      
      const newRow = { AccountCode: '1100', Name: 'Checking', Type: 'ASSET', ParentCode: '9999' };
      const result = accountStorage.validateParentRelationship(newRow, accounts, []);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Parent account with code 9999 not found');
    });

    test('validateParentRelationship allows valid parent codes', () => {
      const accounts = [
        { accountCode: '1000', name: 'Cash', type: 'ASSET' },
      ];
      
      const newRow = { AccountCode: '1100', Name: 'Checking', Type: 'ASSET', ParentCode: '1000' };
      const result = accountStorage.validateParentRelationship(newRow, accounts, []);
      
      expect(result.valid).toBe(true);
    });
  });

  // CSV Parsing Tests
  describe('CSV Parsing', () => {
    test('parseCsvImport correctly handles AccountCode field', () => {
      const csvPath = path.join(__dirname, 'temp', 'test-accounts.csv');
      const parsed = accountStorage.parseCsvImport(fs.readFileSync(csvPath, 'utf8'));
      
      expect(parsed.length).toBe(3);
      expect(parsed[0].AccountCode).toBe('1000');
      expect(parsed[1].ParentCode).toBe('1000');
    });

    test('parseCsvImport handles boolean values correctly', () => {
      const csvPath = path.join(__dirname, 'temp', 'test-accounts.csv');
      const parsed = accountStorage.parseCsvImport(fs.readFileSync(csvPath, 'utf8'));
      
      expect(parsed[0].IsSubledger).toBe(false);
      expect(parsed[0].Active).toBe(true);
    });
  });

  // Excel Parsing Tests
  describe('Excel Parsing', () => {
    test('parseExcelImport correctly handles AccountCode field', () => {
      // This would require actual Excel parsing, which we're mocking
      const mockExcelData = [
        { AccountCode: '1000', Name: 'Cash', Type: 'ASSET', IsSubledger: 'FALSE', Active: 'TRUE' }
      ];
      
      const parsed = accountStorage.parseExcelImport(mockExcelData);
      
      expect(parsed.length).toBe(1);
      expect(parsed[0].AccountCode).toBe('1000');
      expect(parsed[0].IsSubledger).toBe(false);
      expect(parsed[0].Active).toBe(true);
    });
  });
});