# Chart of Accounts Validation Test Suite

This directory contains test scripts for validating the Chart of Accounts import/export functionality.

## Test Scripts

### 1. Direct Test Script
`direct-test.js` - A standalone test script that validates the field name normalization and parent-child relationship validation logic without requiring database access.

```bash
node test-coa/direct-test.js
```

### 2. Parent Validation Test
`test-parent-validation.js` - Tests the parent-child relationship validation integration with the application code. Note that this script requires ES modules support.

```bash
node test-coa/test-parent-validation.js
```

### 3. CSV Import Test 
`test-csv-import.js` - Tests importing accounts from CSV files, focusing on field name normalization and data integrity.

### 4. Excel Import Test
`test-excel-import.js` - Tests importing accounts from Excel files, focusing on field name normalization and data integrity.

## Test Directory Structure

- `test-coa/` - Root directory for COA test scripts
  - `imports/` - Generated test import files (CSV, Excel)
  - `results/` - Test results and logs

## Running Tests

To run all tests:

```bash
cd test-coa
node direct-test.js
```

## Validation Logic Tested

1. **Field Name Normalization**
   - Consistent handling of different field naming conventions (camelCase, snake_case, etc.)
   - Mapping of similar field names to standardized names (e.g., "account_code", "code" -> "AccountCode")

2. **Parent-Child Relationship Validation**
   - Detection of self-referencing accounts (account referencing itself as parent)
   - Validation of parent accounts that exist either in the database or in the same import batch
   - Proper error reporting for invalid parent relationships

3. **Import Data Validation**
   - Required field checking (AccountCode, Name, Type)
   - Type validation for account types
   - Duplicate checking for account codes
