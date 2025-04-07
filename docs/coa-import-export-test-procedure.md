# Chart of Accounts Import/Export Test Procedure

This document outlines the procedure for testing the Chart of Accounts import and export functionality.

## Prerequisites

- Admin user login (username: admin, password: password123)
- Test client and entity created (Client ID: 236, Entity ID: 375)
- Test files prepared (valid-accounts.csv, duplicate-codes.csv, invalid-parents.csv)

## Test Cases

### 1. Valid Accounts Import

**Objective**: Verify that valid account data can be imported successfully.

**Steps**:
1. Navigate to the Chart of Accounts page for the test client
2. Click "Import" button
3. Select the valid-accounts.csv file
4. Verify that the preview shows the accounts to be imported
5. Confirm the import
6. Verify that all accounts are imported correctly with the proper hierarchical structure

**Expected Result**: All accounts from the valid-accounts.csv file are imported successfully.

### 2. Duplicate Account Codes Validation

**Objective**: Verify that the system rejects imports with duplicate account codes.

**Steps**:
1. Navigate to the Chart of Accounts page for the test client
2. Click "Import" button
3. Select the duplicate-codes.csv file
4. Verify that the system shows an error about duplicate account codes

**Expected Result**: The system rejects the import and shows an error message indicating duplicate account codes.

### 3. Invalid Parent Codes Validation

**Objective**: Verify that the system validates parent-child relationships.

**Steps**:
1. Navigate to the Chart of Accounts page for the test client
2. Click "Import" button
3. Select the invalid-parents.csv file
4. Verify that the system shows an error about invalid parent codes

**Expected Result**: The system rejects the import and shows an error message indicating invalid parent codes.

### 4. CSV Export

**Objective**: Verify that accounts can be exported to CSV with the correct field names.

**Steps**:
1. Navigate to the Chart of Accounts page for the test client
2. Click "Export CSV" button
3. Open the downloaded CSV file
4. Verify that the file contains the "AccountCode" field (not "code")
5. Check that all account data is correctly exported

**Expected Result**: All accounts are exported to CSV with the "AccountCode" field.

### 5. Excel Export

**Objective**: Verify that accounts can be exported to Excel with the correct field names.

**Steps**:
1. Navigate to the Chart of Accounts page for the test client
2. Click "Export Excel" button
3. Open the downloaded Excel file
4. Verify that the file contains the "AccountCode" field (not "code")
5. Check that all account data is correctly exported

**Expected Result**: All accounts are exported to Excel with the "AccountCode" field.

## Field Mapping Verification

Verify that the following field mappings are correct in both import and export:

| Database Field | Import/Export Field |
|----------------|---------------------|
| accountCode    | AccountCode         |
| name           | Name                |
| type           | Type                |
| subtype        | Subtype             |
| isSubledger    | IsSubledger         |
| subledgerType  | SubledgerType       |
| active         | Active              |
| description    | Description         |
| parentCode     | ParentCode          |

## Automated Testing

### 1. Main Test Script 

The test-import-export.js script automates these test cases:

```bash
cd test-coa
node test-import-export.js
```

### 2. Direct Test Script (Session-Based)

For authentication-sensitive tests, use the direct-test.js script which handles login and maintains session:

```bash
cd test-coa
node direct-test.js
```

This script:
- Logs in with the admin user
- Exports accounts to CSV and Excel formats in a single session
- Verifies that the AccountCode field is present in the exports

### 3. Test Results

Review the test results summary in test-results.md to see the latest test outcomes and fixes.

## Troubleshooting

If tests fail, check:

1. Authentication middleware in accountRoutes.ts - ensure it uses both req.isAuthenticated() and req.user
2. API endpoints for correct field naming
3. Import/export logic in accountStorage.ts
4. Frontend code in ChartOfAccounts.tsx for field mapping
5. Database schema in shared/schema.ts for field definitions
6. Session handling in the Express app configuration

## Next Steps After Testing

1. Update documentation with any issues found
2. Fix any bugs in field naming or validation
3. Ensure consistent naming across frontend and backend
4. Clean up any legacy code supporting old field names
