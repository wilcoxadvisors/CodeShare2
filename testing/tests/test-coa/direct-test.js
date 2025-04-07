/**
 * Direct test script for Chart of Accounts import/export validation functionality
 * 
 * This script tests the parent-child relationship validation and field normalization
 * without requiring the full application to be running.
 */

// Test the field name normalization
function testNormalizeFieldName() {
  console.log('\n===== Testing field name normalization =====');
  
  const testCases = [
    { input: 'accountCode', expected: 'AccountCode' },
    { input: 'account_code', expected: 'AccountCode' },
    { input: 'code', expected: 'AccountCode' },
    { input: 'account code', expected: 'AccountCode' },
    { input: 'AccountCode', expected: 'AccountCode' },
    { input: 'name', expected: 'Name' },
    { input: 'Name', expected: 'Name' },
    { input: 'account_name', expected: 'Name' },
    { input: 'accountName', expected: 'Name' },
    { input: 'type', expected: 'Type' },
    { input: 'account_type', expected: 'Type' },
    { input: 'accountType', expected: 'Type' },
    { input: 'Type', expected: 'Type' },
    { input: 'parent', expected: 'ParentCode' },
    { input: 'parentCode', expected: 'ParentCode' },
    { input: 'parent_code', expected: 'ParentCode' },
    { input: 'ParentAccount', expected: 'ParentCode' },
    { input: 'ParentCode', expected: 'ParentCode' }
  ];
  
  function normalizeFieldName(fieldName) {
    // Implementation of the normalizeFieldName function
    const lowerField = fieldName.toLowerCase();
    
    // Account code variations
    if (lowerField === 'accountcode' || lowerField === 'account_code' || lowerField === 'code' || lowerField === 'account code') {
      return 'AccountCode';
    }
    
    // Name variations
    if (lowerField === 'name' || lowerField === 'account_name' || lowerField === 'accountname') {
      return 'Name';
    }
    
    // Type variations
    if (lowerField === 'type' || lowerField === 'account_type' || lowerField === 'accounttype') {
      return 'Type';
    }
    
    // Parent variations
    if (lowerField === 'parent' || lowerField === 'parentcode' || lowerField === 'parent_code' || lowerField === 'parentaccount') {
      return 'ParentCode';
    }
    
    // If the field is already correctly capitalized, return it
    if (fieldName === 'AccountCode' || fieldName === 'Name' || fieldName === 'Type' || fieldName === 'ParentCode') {
      return fieldName;
    }
    
    // For all other fields, return as is (first letter capitalized)
    return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  }
  
  let passCount = 0;
  let failCount = 0;
  
  testCases.forEach((testCase, index) => {
    const result = normalizeFieldName(testCase.input);
    const passed = result === testCase.expected;
    
    console.log(`Test ${index + 1}: '${testCase.input}' -> '${result}' (expected: '${testCase.expected}') ${passed ? '✅' : '❌'}`);
    
    if (passed) {
      passCount++;
    } else {
      failCount++;
    }
  });
  
  console.log(`\nResults: ${passCount} passed, ${failCount} failed`);
}

// Test the parent-child relationship validation
function testParentChildValidation() {
  console.log('\n===== Testing parent-child relationship validation =====');
  
  // Mock implementation of validateParentRelationship
  function validateParentRelationship(account, existingAccounts, newAccounts) {
    const result = { valid: true, errors: [] };
    
    // If no parent code, it's valid
    if (!account.ParentCode) {
      return result;
    }
    
    // Check for self-reference
    if (account.AccountCode === account.ParentCode) {
      result.valid = false;
      result.errors.push('Account cannot be its own parent');
      return result;
    }
    
    // Check if parent exists in existing accounts
    const existingParent = existingAccounts.find(a => a.accountCode === account.ParentCode);
    if (existingParent) {
      return result;
    }
    
    // Check if parent exists in new accounts being imported
    const newParent = newAccounts.find(a => a.AccountCode === account.ParentCode);
    if (newParent) {
      return result;
    }
    
    // If we get here, the parent doesn't exist
    result.valid = false;
    result.errors.push(`Parent account with code '${account.ParentCode}' does not exist`);
    return result;
  }
  
  const existingAccounts = [
    { accountCode: '1000', name: 'Assets' },
    { accountCode: '2000', name: 'Liabilities' }
  ];
  
  const testAccounts = [
    { AccountCode: '1100', Name: 'Current Assets', ParentCode: '1000' },    // Valid - existing parent
    { AccountCode: '1200', Name: 'Fixed Assets', ParentCode: '1000' },      // Valid - existing parent
    { AccountCode: '3000', Name: 'Equity', ParentCode: null },              // Valid - no parent
    { AccountCode: '3100', Name: 'Retained Earnings', ParentCode: '3000' }, // Valid - parent in same import
    { AccountCode: '4000', Name: 'Revenue', ParentCode: '9999' },           // Invalid - non-existent parent
    { AccountCode: '5000', Name: 'Expenses', ParentCode: '5000' }           // Invalid - self-reference
  ];
  
  let validCount = 0;
  let invalidCount = 0;
  
  // Process each account
  testAccounts.forEach((account, index) => {
    console.log(`\nTesting account: ${account.AccountCode} - ${account.Name}`);
    console.log(`Parent code: ${account.ParentCode || 'None'}`);
    
    // Get previously processed accounts to simulate import processing
    const previousAccounts = testAccounts.slice(0, index);
    
    const result = validateParentRelationship(account, existingAccounts, previousAccounts);
    
    console.log(`Validation passed: ${result.valid}`);
    if (!result.valid) {
      console.log(`Errors: ${result.errors.join(', ')}`);
      invalidCount++;
    } else {
      validCount++;
    }
  });
  
  console.log(`\nResults: ${validCount} valid accounts, ${invalidCount} invalid accounts`);
}

// Run all tests
function runTests() {
  console.log('Starting direct tests for Chart of Accounts validation...');
  testNormalizeFieldName();
  testParentChildValidation();
  console.log('\nAll direct tests completed!');
}

runTests();