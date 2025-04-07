/**
 * Test script for validating parent-child relationships in Chart of Accounts
 * 
 * This script tests the enhanced validation for parent-child relationships
 * during CoA imports.
 */

import { accountStorage } from '../server/storage/accountStorage.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test data with different parent-child relationship scenarios
const testData = [
  {
    AccountCode: '1000',
    Name: 'Assets',
    Type: 'ASSET',
    ParentCode: null
  },
  {
    AccountCode: '1100',
    Name: 'Current Assets',
    Type: 'ASSET',
    ParentCode: '1000' // Valid parent (referring to existing account)
  },
  {
    AccountCode: '1200',
    Name: 'Fixed Assets',
    Type: 'ASSET',
    ParentCode: '1000' // Valid parent (referring to existing account)
  },
  {
    AccountCode: '1210',
    Name: 'Equipment',
    Type: 'ASSET',
    ParentCode: '1200' // Valid parent (referring to account in same import)
  },
  {
    AccountCode: '1300',
    Name: 'Problematic Asset',
    Type: 'ASSET',
    ParentCode: '9999' // Invalid parent (non-existent)
  },
  {
    AccountCode: '1400',
    Name: 'Self-Referencing Asset',
    Type: 'ASSET',
    ParentCode: '1400' // Invalid (self-reference)
  }
];

// Test the validateParentRelationship method
function testParentValidation() {
  console.log('===== Testing parent-child relationship validation =====');
  
  // Mock existing accounts
  const existingAccounts = [
    { accountCode: '2000', name: 'Liabilities', type: 'LIABILITY' },
    { accountCode: '3000', name: 'Equity', type: 'EQUITY' }
  ];
  
  // Test cases
  testData.forEach((account, index) => {
    console.log(`\nTesting account: ${account.AccountCode} - ${account.Name}`);
    
    // For each account, we validate it against existing accounts and previous accounts in the import
    const previousAccountsInImport = testData.slice(0, index);
    
    const result = accountStorage.validateParentRelationship(
      account,
      existingAccounts,
      previousAccountsInImport
    );
    
    console.log(`Parent code: ${account.ParentCode || 'None'}`);
    console.log(`Validation passed: ${result.valid}`);
    if (!result.valid) {
      console.log(`Errors: ${result.errors.join(', ')}`);
    }
  });
}

// Convert the test data to CSV format
function generateTestCSV() {
  const header = 'AccountCode,Name,Type,ParentCode\n';
  const rows = testData.map(account => {
    return `${account.AccountCode},${account.Name},${account.Type},${account.ParentCode || ''}`;
  }).join('\n');
  
  const csvContent = header + rows;
  const filename = path.join(__dirname, 'imports', 'parent-validation-test.csv');
  
  fs.writeFileSync(filename, csvContent);
  console.log(`\nGenerated test CSV file: ${filename}`);
  return filename;
}

// Test CSV parsing and validation
function testCSVImport() {
  console.log('\n===== Testing CSV import parsing and validation =====');
  
  // Generate test CSV file
  const csvFile = generateTestCSV();
  
  // Read the CSV content
  const csvContent = fs.readFileSync(csvFile, 'utf8');
  
  // Parse the CSV content
  const parsedData = accountStorage.parseCsvImport(csvContent);
  
  console.log(`Parsed ${parsedData.length} records from CSV`);
  
  // Validate each record
  const validatedAccounts = [];
  const validationResults = {
    valid: 0,
    invalid: 0,
    errors: []
  };
  
  parsedData.forEach(record => {
    const basicValidation = accountStorage.validateImportRow(record, [], validatedAccounts);
    if (basicValidation.valid) {
      const parentValidation = accountStorage.validateParentRelationship(record, [], validatedAccounts);
      if (parentValidation.valid) {
        validationResults.valid++;
        validatedAccounts.push(record);
      } else {
        validationResults.invalid++;
        parentValidation.errors.forEach(err => {
          validationResults.errors.push(`Account ${record.AccountCode}: ${err}`);
        });
      }
    } else {
      validationResults.invalid++;
      basicValidation.errors.forEach(err => {
        validationResults.errors.push(`Account ${record.AccountCode}: ${err}`);
      });
    }
  });
  
  console.log(`Validation results: ${validationResults.valid} valid, ${validationResults.invalid} invalid`);
  if (validationResults.errors.length > 0) {
    console.log('Validation errors:');
    validationResults.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  }
}

// Run the tests
async function runTests() {
  console.log('Starting Chart of Accounts parent validation tests...\n');
  
  // Create imports directory if it doesn't exist
  const importsDir = path.join(__dirname, 'imports');
  if (!fs.existsSync(importsDir)) {
    fs.mkdirSync(importsDir, { recursive: true });
  }
  
  // Run tests
  testParentValidation();
  testCSVImport();
  
  console.log('\nAll tests completed!');
}

// Use top-level await for ES modules
try {
  await runTests();
} catch (err) {
  console.error('Test failed with error:', err);
  process.exit(1);
}