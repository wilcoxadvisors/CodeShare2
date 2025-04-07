/**
 * Chart of Accounts Import Validation Enhancement Script
 * 
 * This script improves the account import process by adding robust validation
 * for parent-child relationships and providing clearer error messages.
 * 
 * Key enhancements:
 * 1. Validates existence of parent accounts before accepting imports
 * 2. Provides detailed error messages for validation failures
 * 3. Implements a preview mode to check for errors before committing changes
 */

import { db } from '../server/db.js';
import { accounts } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import xlsx from 'xlsx';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main function
 */
async function main() {
  console.log('Chart of Accounts Import Validation Enhancement Script');
  console.log('====================================================');

  // Create validation helper
  const validator = new AccountImportValidator();

  // Test validation with a sample CSV file
  const testFile = process.argv[2] || path.join(__dirname, '../test-coa/imports/test1-add-accounts.csv');
  const clientId = process.argv[3] || 236; // Default to test client ID

  if (!fs.existsSync(testFile)) {
    console.error(`Error: Test file ${testFile} does not exist.`);
    process.exit(1);
  }

  // Determine file type
  const fileExtension = path.extname(testFile).toLowerCase();
  let accounts;
  
  if (fileExtension === '.csv') {
    console.log(`Validating CSV file: ${testFile}`);
    const csvContent = fs.readFileSync(testFile, 'utf8');
    accounts = validator.parseCsvImport(csvContent);
  } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
    console.log(`Validating Excel file: ${testFile}`);
    const workbook = xlsx.readFile(testFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);
    accounts = validator.parseExcelImport(jsonData);
  } else {
    console.error(`Error: Unsupported file type ${fileExtension}`);
    process.exit(1);
  }

  console.log(`Found ${accounts.length} accounts to validate`);
  
  // Validate the accounts
  try {
    const validationResults = await validator.validateAccounts(accounts, clientId);
    
    console.log('\nValidation Results:');
    console.log('-------------------');
    
    if (validationResults.valid) {
      console.log('✅ All accounts passed validation');
      console.log(`Total accounts: ${validationResults.totalAccounts}`);
      console.log(`New accounts: ${validationResults.newAccounts}`);
      console.log(`Updated accounts: ${validationResults.updatedAccounts}`);
    } else {
      console.log('❌ Validation failed');
      console.log(`Total errors: ${validationResults.errors.length}`);
      
      validationResults.errors.forEach((error, index) => {
        console.log(`\nError ${index + 1}:`);
        console.log(`Account: ${error.accountCode} - ${error.name || 'Unknown'}`);
        console.log(`Issue: ${error.message}`);
        
        if (error.details) {
          console.log(`Details: ${error.details}`);
        }
      });
      
      console.log('\nPlease fix these issues before importing.');
    }
  } catch (error) {
    console.error('Error during validation:', error);
  }
}

/**
 * Account Import Validator class
 */
class AccountImportValidator {
  /**
   * Parse CSV import content
   */
  parseCsvImport(csvContent) {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    return records.map(record => this.normalizeRecord(record));
  }

  /**
   * Parse Excel import content
   */
  parseExcelImport(jsonData) {
    return jsonData.map(record => this.normalizeRecord(record));
  }

  /**
   * Normalize record to ensure consistent field names and types
   */
  normalizeRecord(record) {
    // Normalize field names (handle case differences)
    const normalizedRecord = {};
    
    for (const [key, value] of Object.entries(record)) {
      const normalizedKey = this.normalizeFieldName(key);
      
      // Handle booleans
      if (normalizedKey === 'isSubledger' || normalizedKey === 'active') {
        normalizedRecord[normalizedKey] = this.parseBoolean(value);
      } else {
        normalizedRecord[normalizedKey] = value;
      }
    }
    
    // Map from external field names to internal
    return {
      accountCode: normalizedRecord.accountCode || null,
      name: normalizedRecord.name || null,
      type: normalizedRecord.type || null,
      subtype: normalizedRecord.subtype || null,
      isSubledger: normalizedRecord.isSubledger || false,
      subledgerType: normalizedRecord.subledgerType || null,
      active: normalizedRecord.active !== false, // Default to true if not specified
      description: normalizedRecord.description || null,
      parentCode: normalizedRecord.parentCode || null,
    };
  }

  /**
   * Normalize field name (handle case sensitivity)
   */
  normalizeFieldName(fieldName) {
    const fieldNameMap = {
      'accountcode': 'accountCode',
      'account code': 'accountCode',
      'account_code': 'accountCode',
      'accountCode': 'accountCode',
      'AccountCode': 'accountCode',
      'name': 'name',
      'Name': 'name',
      'type': 'type',
      'Type': 'type',
      'subtype': 'subtype',
      'Subtype': 'subtype',
      'issubledger': 'isSubledger',
      'isSubledger': 'isSubledger',
      'IsSubledger': 'isSubledger',
      'is_subledger': 'isSubledger',
      'subledgertype': 'subledgerType',
      'subledgerType': 'subledgerType',
      'SubledgerType': 'subledgerType',
      'subledger_type': 'subledgerType',
      'active': 'active',
      'Active': 'active',
      'description': 'description',
      'Description': 'description',
      'parentcode': 'parentCode',
      'parentCode': 'parentCode',
      'ParentCode': 'parentCode',
      'parent_code': 'parentCode',
      'parentid': 'parentId',
      'parentId': 'parentId',
      'ParentId': 'parentId',
      'parent_id': 'parentId',
    };
    
    return fieldNameMap[fieldName] || fieldName.toLowerCase();
  }

  /**
   * Parse boolean values from various formats
   */
  parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalizedValue = value.trim().toLowerCase();
      return normalizedValue === 'true' || 
             normalizedValue === 'yes' || 
             normalizedValue === 'y' || 
             normalizedValue === '1';
    }
    if (typeof value === 'number') return value !== 0;
    return false;
  }

  /**
   * Validate a list of accounts for a client
   */
  async validateAccounts(accounts, clientId) {
    const result = {
      valid: true,
      totalAccounts: accounts.length,
      newAccounts: 0,
      updatedAccounts: 0,
      errors: []
    };
    
    // Step 1: Fetch existing accounts for this client
    const existingAccounts = await db.select().from(accounts).where(eq(accounts.clientId, clientId));
    
    // Create lookup maps for existing accounts
    const existingAccountsByCode = new Map();
    const existingAccountsById = new Map();
    
    existingAccounts.forEach(account => {
      existingAccountsByCode.set(account.accountCode, account);
      existingAccountsById.set(account.id, account);
    });
    
    // Create a map of new accounts by code (for parent validation)
    const newAccountsByCode = new Map();
    accounts.forEach(account => {
      if (!existingAccountsByCode.has(account.accountCode)) {
        newAccountsByCode.set(account.accountCode, account);
      }
    });
    
    // Step 2: Check for duplicate account codes in the import
    const importAccountCodes = new Set();
    for (const account of accounts) {
      if (!account.accountCode) {
        result.valid = false;
        result.errors.push({
          accountCode: 'Missing',
          name: account.name,
          message: 'Account code is required'
        });
        continue;
      }
      
      if (importAccountCodes.has(account.accountCode)) {
        result.valid = false;
        result.errors.push({
          accountCode: account.accountCode,
          name: account.name,
          message: 'Duplicate account code in import file',
          details: `Account code ${account.accountCode} appears multiple times in the import`
        });
      }
      
      importAccountCodes.add(account.accountCode);
    }
    
    // Step 3: Validate each account
    for (const account of accounts) {
      if (!account.accountCode) continue; // Skip already reported errors
      
      const isNew = !existingAccountsByCode.has(account.accountCode);
      
      // Required fields validation
      if (!account.name) {
        result.valid = false;
        result.errors.push({
          accountCode: account.accountCode,
          name: 'Missing',
          message: 'Name is required'
        });
      }
      
      if (!account.type) {
        result.valid = false;
        result.errors.push({
          accountCode: account.accountCode,
          name: account.name,
          message: 'Type is required'
        });
      } else {
        // Validate account type
        const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
        if (!validTypes.includes(account.type.toUpperCase())) {
          result.valid = false;
          result.errors.push({
            accountCode: account.accountCode,
            name: account.name,
            message: 'Invalid account type',
            details: `Type must be one of: ${validTypes.join(', ')}`
          });
        }
      }
      
      // Parent validation
      if (account.parentCode) {
        // Check if parent exists
        const parentExists = 
          existingAccountsByCode.has(account.parentCode) || 
          newAccountsByCode.has(account.parentCode);
        
        if (!parentExists) {
          result.valid = false;
          result.errors.push({
            accountCode: account.accountCode,
            name: account.name,
            message: 'Invalid parent account',
            details: `Parent account with code ${account.parentCode} does not exist`
          });
        }
      }
      
      // Subledger validation
      if (account.isSubledger && !account.subledgerType) {
        result.valid = false;
        result.errors.push({
          accountCode: account.accountCode,
          name: account.name,
          message: 'SubledgerType is required when IsSubledger is true'
        });
      }
      
      // Count new vs updated accounts
      if (isNew) {
        result.newAccounts++;
      } else {
        result.updatedAccounts++;
      }
    }
    
    return result;
  }
}

// Run the script if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export the validator for use in other scripts
export { AccountImportValidator };