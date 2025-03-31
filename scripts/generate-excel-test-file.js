/**
 * Generate Excel/CSV Test Files for CoA Import/Export Testing
 * 
 * This script generates test files for validating the CoA import/export functionality.
 * It creates both valid and invalid test files to verify validation and error handling.
 */

import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

// In ES Modules, __dirname is not available
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TEST_DIR = path.join(__dirname, '..', 'test', 'coa-import-export');

// Sample valid accounts data
const validAccounts = [
  {
    Code: '1000',
    Name: 'Cash',
    Type: 'ASSET',
    Subtype: 'Current Asset',
    IsSubledger: false,
    SubledgerType: null,
    Active: true,
    Description: 'Cash on hand and in checking accounts',
    ParentCode: null
  },
  {
    Code: '1100',
    Name: 'Accounts Receivable',
    Type: 'ASSET',
    Subtype: 'Current Asset',
    IsSubledger: true,
    SubledgerType: 'Customer',
    Active: true,
    Description: 'Amounts owed by customers',
    ParentCode: null
  },
  {
    Code: '2000',
    Name: 'Accounts Payable',
    Type: 'LIABILITY',
    Subtype: 'Current Liability',
    IsSubledger: true,
    SubledgerType: 'Vendor',
    Active: true,
    Description: 'Amounts owed to vendors',
    ParentCode: null
  },
  {
    Code: '3000',
    Name: 'Retained Earnings',
    Type: 'EQUITY',
    Subtype: 'Equity',
    IsSubledger: false,
    SubledgerType: null,
    Active: true,
    Description: 'Accumulated earnings',
    ParentCode: null
  },
  {
    Code: '4000',
    Name: 'Revenue',
    Type: 'REVENUE',
    Subtype: 'Operating Revenue',
    IsSubledger: false,
    SubledgerType: null,
    Active: true,
    Description: 'Revenue from operations',
    ParentCode: null
  },
  {
    Code: '4100',
    Name: 'Product Sales',
    Type: 'REVENUE',
    Subtype: 'Operating Revenue',
    IsSubledger: false,
    SubledgerType: null,
    Active: true,
    Description: 'Revenue from product sales',
    ParentCode: '4000'
  },
  {
    Code: '4200',
    Name: 'Service Revenue',
    Type: 'REVENUE',
    Subtype: 'Operating Revenue',
    IsSubledger: false,
    SubledgerType: null,
    Active: true,
    Description: 'Revenue from services',
    ParentCode: '4000'
  },
  {
    Code: '5000',
    Name: 'Cost of Goods Sold',
    Type: 'EXPENSE',
    Subtype: 'Cost of Sales',
    IsSubledger: false,
    SubledgerType: null,
    Active: true,
    Description: 'Direct costs of products sold',
    ParentCode: null
  },
  {
    Code: '6000',
    Name: 'Operating Expenses',
    Type: 'EXPENSE',
    Subtype: 'Operating Expense',
    IsSubledger: false,
    SubledgerType: null,
    Active: true,
    Description: 'General operating expenses',
    ParentCode: null
  },
  {
    Code: '6100',
    Name: 'Rent Expense',
    Type: 'EXPENSE',
    Subtype: 'Operating Expense',
    IsSubledger: false,
    SubledgerType: null,
    Active: true,
    Description: 'Office and facility rent',
    ParentCode: '6000'
  }
];

// Sample invalid accounts data (with validation errors)
const invalidAccounts = [
  {
    Code: '1000',
    Name: 'Cash',
    Type: 'ASSET',
    Subtype: 'Current Asset',
    IsSubledger: false,
    SubledgerType: null,
    Active: true,
    Description: 'Cash on hand',
    ParentCode: null
  },
  {
    Code: '1000', // Duplicate code - should trigger validation error
    Name: 'Cash Duplicate',
    Type: 'ASSET',
    Subtype: 'Current Asset',
    IsSubledger: false,
    SubledgerType: null,
    Active: true,
    Description: 'Duplicate cash account',
    ParentCode: null
  },
  {
    Code: '2000',
    Name: null, // Missing name - should trigger validation error
    Type: 'LIABILITY',
    Subtype: 'Current Liability',
    IsSubledger: true,
    SubledgerType: 'Vendor',
    Active: true,
    Description: 'Accounts payable',
    ParentCode: null
  },
  {
    Code: '3000',
    Name: 'Equity', 
    Type: 'INVALID_TYPE', // Invalid account type - should trigger validation error
    Subtype: 'Equity',
    IsSubledger: false,
    SubledgerType: null,
    Active: true,
    Description: 'Equity account',
    ParentCode: null
  },
  {
    Code: '4100',
    Name: 'Product Sales',
    Type: 'REVENUE',
    Subtype: 'Operating Revenue',
    IsSubledger: false,
    SubledgerType: null,
    Active: true,
    Description: 'Revenue from product sales',
    ParentCode: '9999' // Invalid parent code - should trigger validation error
  },
  {
    Code: '5100',
    Name: 'Child COGS',
    Type: 'ASSET', // Different type than parent - should trigger validation error
    Subtype: 'Cost of Sales',
    IsSubledger: false,
    SubledgerType: null,
    Active: true,
    Description: 'Child COGS account',
    ParentCode: '5000'
  }
];

/**
 * Generate test files in the test directory
 */
function generateTestFiles() {
  // Create test directory if it doesn't exist
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  // Generate valid CSV
  const validCsvPath = path.join(TEST_DIR, 'valid_import.csv');
  const validCsvContent = Papa.unparse(validAccounts);
  fs.writeFileSync(validCsvPath, validCsvContent);
  console.log(`Generated valid CSV file: ${validCsvPath}`);

  // Generate invalid CSV
  const invalidCsvPath = path.join(TEST_DIR, 'invalid_import.csv');
  const invalidCsvContent = Papa.unparse(invalidAccounts);
  fs.writeFileSync(invalidCsvPath, invalidCsvContent);
  console.log(`Generated invalid CSV file: ${invalidCsvPath}`);

  // Generate valid Excel file
  const validExcelPath = path.join(TEST_DIR, 'valid_import.xlsx');
  const validWorkbook = XLSX.utils.book_new();
  const validWorksheet = XLSX.utils.json_to_sheet(validAccounts);
  XLSX.utils.book_append_sheet(validWorkbook, validWorksheet, 'Chart of Accounts');
  XLSX.writeFile(validWorkbook, validExcelPath);
  console.log(`Generated valid Excel file: ${validExcelPath}`);

  // Generate invalid Excel file
  const invalidExcelPath = path.join(TEST_DIR, 'invalid_import.xlsx');
  const invalidWorkbook = XLSX.utils.book_new();
  const invalidWorksheet = XLSX.utils.json_to_sheet(invalidAccounts);
  XLSX.utils.book_append_sheet(invalidWorkbook, invalidWorksheet, 'Chart of Accounts');
  XLSX.writeFile(invalidWorkbook, invalidExcelPath);
  console.log(`Generated invalid Excel file: ${invalidExcelPath}`);

  console.log('All test files generated successfully');
}

// Run the file generation
generateTestFiles();