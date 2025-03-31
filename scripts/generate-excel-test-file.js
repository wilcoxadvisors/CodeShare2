/**
 * Generate Excel Test Files for CoA Import/Export Testing
 * 
 * This script creates both valid and invalid test files in CSV and Excel format
 * for testing the Chart of Accounts import functionality.
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import XLSX from 'xlsx';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

// When using ES modules, __dirname is not available
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TEST_DIR = path.join(__dirname, '..', 'test', 'coa-import-export');

// Standard header fields for CoA files
const HEADERS = [
  'Code', 
  'Name', 
  'Type', 
  'Subtype', 
  'IsSubledger',
  'SubledgerType',
  'Active',
  'Description',
  'ParentCode'
];

// Valid account types
const VALID_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

/**
 * Generate valid test data for CoA import
 */
function generateValidData() {
  const accounts = [
    // ASSET accounts
    {
      Code: '1000',
      Name: 'Test Cash',
      Type: 'ASSET',
      Subtype: 'Current Asset',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'Cash on hand',
      ParentCode: ''
    },
    {
      Code: '1100',
      Name: 'Test Bank Account',
      Type: 'ASSET',
      Subtype: 'Current Asset',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'Primary bank account',
      ParentCode: '1000'
    },
    {
      Code: '1200',
      Name: 'Test Accounts Receivable',
      Type: 'ASSET',
      Subtype: 'Current Asset',
      IsSubledger: 'true',
      SubledgerType: 'Customer',
      Active: 'true',
      Description: 'Amounts owed by customers',
      ParentCode: ''
    },
    
    // LIABILITY accounts
    {
      Code: '2000',
      Name: 'Test Accounts Payable',
      Type: 'LIABILITY',
      Subtype: 'Current Liability',
      IsSubledger: 'true',
      SubledgerType: 'Vendor',
      Active: 'true',
      Description: 'Amounts owed to vendors',
      ParentCode: ''
    },
    {
      Code: '2100',
      Name: 'Test Credit Card',
      Type: 'LIABILITY',
      Subtype: 'Current Liability',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'Business credit card',
      ParentCode: '2000'
    },
    
    // EQUITY accounts
    {
      Code: '3000',
      Name: 'Test Owner Equity',
      Type: 'EQUITY',
      Subtype: 'Equity',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'Owner investment',
      ParentCode: ''
    },
    
    // REVENUE accounts
    {
      Code: '4000',
      Name: 'Test Sales Revenue',
      Type: 'REVENUE',
      Subtype: 'Operating Revenue',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'Revenue from sales',
      ParentCode: ''
    },
    {
      Code: '4100',
      Name: 'Test Service Revenue',
      Type: 'REVENUE',
      Subtype: 'Operating Revenue',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'Revenue from services',
      ParentCode: '4000'
    },
    
    // EXPENSE accounts
    {
      Code: '5000',
      Name: 'Test Rent Expense',
      Type: 'EXPENSE',
      Subtype: 'Operating Expense',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'Office rent',
      ParentCode: ''
    },
    {
      Code: '5100',
      Name: 'Test Utilities Expense',
      Type: 'EXPENSE',
      Subtype: 'Operating Expense',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'Electricity, water, etc.',
      ParentCode: '5000'
    }
  ];
  
  return accounts;
}

/**
 * Generate invalid test data for CoA import
 */
function generateInvalidData() {
  const accounts = [
    // Invalid type
    {
      Code: '1000',
      Name: 'Invalid Type',
      Type: 'INVALID_TYPE', // Invalid account type
      Subtype: 'Current Asset',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'Invalid account type',
      ParentCode: ''
    },
    
    // Missing required field (Name)
    {
      Code: '2000',
      Name: '', // Missing name
      Type: 'LIABILITY',
      Subtype: 'Current Liability',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'Missing name field',
      ParentCode: ''
    },
    
    // Duplicate code
    {
      Code: '3000',
      Name: 'First Equity Account',
      Type: 'EQUITY',
      Subtype: 'Equity',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'First equity account with code 3000',
      ParentCode: ''
    },
    {
      Code: '3000', // Duplicate code
      Name: 'Duplicate Code',
      Type: 'EQUITY',
      Subtype: 'Equity',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'Duplicate code 3000',
      ParentCode: ''
    },
    
    // Invalid parent code
    {
      Code: '4000',
      Name: 'Invalid Parent',
      Type: 'REVENUE',
      Subtype: 'Operating Revenue',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'Invalid parent code',
      ParentCode: '9999' // Parent doesn't exist
    },
    
    // Type mismatch with parent
    {
      Code: '5000',
      Name: 'Parent Account',
      Type: 'EXPENSE',
      Subtype: 'Operating Expense',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'Parent account',
      ParentCode: ''
    },
    {
      Code: '5100',
      Name: 'Type Mismatch',
      Type: 'REVENUE', // Different type than parent (5000 is EXPENSE)
      Subtype: 'Operating Revenue',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'Type mismatch with parent',
      ParentCode: '5000'
    }
  ];
  
  return accounts;
}

/**
 * Save data as CSV file
 */
function saveAsCsv(data, filename) {
  const csv = Papa.unparse(data);
  fs.writeFileSync(filename, csv);
  console.log(chalk.green(`Created CSV file: ${filename}`));
}

/**
 * Save data as Excel file
 */
function saveAsExcel(data, filename) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Chart of Accounts');
  XLSX.writeFile(workbook, filename);
  console.log(chalk.green(`Created Excel file: ${filename}`));
}

/**
 * Main function
 */
function main() {
  console.log(chalk.blue('Generating test files for CoA import/export testing...'));
  
  // Create test directory if it doesn't exist
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    console.log(chalk.blue(`Created test directory: ${TEST_DIR}`));
  }
  
  // Generate valid test files
  const validData = generateValidData();
  saveAsCsv(validData, path.join(TEST_DIR, 'valid_import.csv'));
  saveAsExcel(validData, path.join(TEST_DIR, 'valid_import.xlsx'));
  
  // Generate invalid test files
  const invalidData = generateInvalidData();
  saveAsCsv(invalidData, path.join(TEST_DIR, 'invalid_import.csv'));
  saveAsExcel(invalidData, path.join(TEST_DIR, 'invalid_import.xlsx'));
  
  console.log(chalk.blue('Done generating test files!'));
}

// Run the main function
main();