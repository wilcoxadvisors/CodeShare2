# Chart of Accounts Import/Export Testing Procedure

This document outlines the procedure for testing the Chart of Accounts (CoA) import and export functionality, including CSV and Excel file handling.

## Prerequisites

1. **Test Client:** Ensure a client exists with a small set of accounts to test with (e.g., Client ID 1)
2. **Test Files:** Prepare the following test files:
   - `valid_import.csv`: Valid CSV file with proper headers and account data
   - `valid_import.xlsx`: Valid Excel file with the same data as the CSV
   - `invalid_import.csv`: Invalid CSV file with intentional errors

## Test Procedure

### A. Authentication

1. Log in as admin user (username: `admin`, password: `password123`)
2. Verify successful authentication

### B. Navigation

1. Navigate to the Chart of Accounts page (`/chart-of-accounts`)
2. Use the global header context selector to choose the test client
3. Verify accounts are displayed in the table

### C. Test Export CSV

1. Click the "Export CSV" button
2. Verify a CSV file download is triggered
3. Open the downloaded file and confirm it contains:
   - Correct headers: `Code,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentId`
   - Complete set of accounts from the selected client
   - Properly formatted CSV with correct delimiters and encoding

### D. Test Import Valid CSV

1. Prepare `valid_import.csv` with the following structure:
   ```
   Code,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentId
   1000,Cash,asset,current_asset,NO,,YES,Cash on hand and in banks,
   1100,Checking Account,asset,bank,NO,,YES,Primary business checking account,1000
   1200,Savings Account,asset,bank,NO,,YES,Business savings account,1000
   2000,Accounts Payable,liability,accounts_payable,NO,,YES,Amounts owed to vendors,
   ```

2. Click the "Import" button
3. Select the `valid_import.csv` file
4. Confirm the import in the dialog
5. Verify:
   - Success notification appears
   - Table updates to show imported accounts
   - Parent-child hierarchy is correctly displayed (Checking and Savings accounts indent under Cash)
   - API check: GET `/api/clients/{clientId}/accounts/tree` returns the correct accounts

### E. Test Import Valid Excel

1. Prepare `valid_import.xlsx` with the same data structure as the CSV file
2. Click the "Import" button
3. Select the `valid_import.xlsx` file
4. Confirm the import in the dialog
5. Verify:
   - Success notification appears
   - Table updates to show imported accounts
   - Parent-child hierarchy is correctly displayed

### F. Test Import Invalid CSV

1. Prepare `invalid_import.csv` with an intentional error:
   ```
   Code,Name,InvalidType,Subtype,IsSubledger,SubledgerType,Active,Description,ParentId
   1000,Cash,something_invalid,current_asset,NO,,YES,Cash on hand and in banks,
   1100,Checking Account,asset,bank,NO,,YES,Primary business checking account,1000
   ```

2. Note the current state of accounts displayed in the table
3. Click the "Import" button
4. Select the `invalid_import.csv` file
5. Confirm the import in the dialog
6. Verify:
   - Error notification appears with a descriptive message
   - Table remains unchanged (no partial import occurred)
   - Database check: The accounts haven't changed in the database

## Test Results

Document the results of each test step:

| Test Case | Expected Result | Actual Result | Pass/Fail |
|-----------|-----------------|---------------|-----------|
| Export CSV | CSV download triggered | | |
| Import Valid CSV | Accounts imported successfully | | |
| Import Valid Excel | Accounts imported successfully | | |
| Import Invalid CSV | Error displayed, data unchanged | | |

## Notes

- CSV and Excel files should follow the same data structure
- The system should validate account types against allowed values
- Import process should maintain parent-child relationships
- Error handling should prevent partial or corrupted imports