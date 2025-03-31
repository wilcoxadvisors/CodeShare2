# Chart of Accounts Import/Export Test Procedure

This document outlines the testing procedure for the Chart of Accounts (CoA) import and export functionality, focusing on data integrity controls.

## Prerequisites

- A running instance of the application
- Test account with admin permissions
- Test client with existing CoA entries
- Test files in the `/test/coa-import-export/` directory:
  - `valid_import.csv` - A valid CSV file with account data
  - `valid_import.xlsx` - A valid Excel file with account data
  - `invalid_import.csv` - An invalid CSV file with problematic data

## Running the Test Script

The automated test script (`scripts/test-coa-import-export.js`) performs a comprehensive test of the import/export functionality:

```bash
# Set environment variables for testing
export TEST_CLIENT_ID=1  # Replace with an actual client ID
export TEST_USERNAME=admin
export TEST_PASSWORD=password

# Run the test script
node scripts/test-coa-import-export.js
```

## Manual Testing Procedure

If you prefer to test manually, follow these steps:

1. **Export the Current Chart of Accounts**
   - Navigate to the Chart of Accounts page for a client
   - Click the "Export" button
   - Choose CSV format
   - Verify the downloaded file contains all accounts with correct data

2. **Modify the Exported File**
   - Open the exported CSV file
   - Make changes to some existing accounts (name, description)
   - Mark some accounts as inactive (set active = "No")
   - Add new accounts with appropriate parent account codes
   - Add accounts with invalid data (for testing validation)

3. **Import the Modified File**
   - Navigate back to the Chart of Accounts page
   - Click "Import"
   - Select your modified file
   - Submit the import
   - Review the import results

4. **Verify Data Integrity**
   - Check that new accounts were added correctly
   - Verify that existing accounts were updated appropriately
   - Confirm that accounts marked inactive are now inactive
   - Verify hierarchical relationships were maintained or established properly

5. **Test Edge Cases**
   - Import a file with missing required fields
   - Import a file with duplicate account codes
   - Import a file with invalid account types
   - Test importing accounts that have existing transactions:
     - Attempt to change account type (should be prevented)
     - Update non-financial fields like name/description (should succeed)
     - Verify parent relationship changes are handled appropriately

## Data Integrity Features

The import process includes these key integrity controls:

1. **Account Transaction Protection**
   - Accounts with existing transactions cannot be deleted
   - Critical fields (type, subtype) cannot be changed for accounts with transactions
   - Only non-financial fields (name, description) can be updated

2. **Hierarchical Integrity**
   - Parent-child relationships are verified and established in a second pass
   - Parent account changes are blocked for accounts with transactions

3. **Duplicate Prevention**
   - System checks for duplicate account codes
   - Existing accounts are updated rather than duplicated

4. **Inactive Handling**
   - Accounts can be marked inactive rather than deleted
   - Reactivation of inactive accounts is supported

## Import Result Structure

The import process returns a detailed result object:

```typescript
interface ImportResult {
  count: number;     // Total accounts processed
  added: number;     // New accounts added
  updated: number;   // Existing accounts updated
  unchanged: number; // Existing accounts unchanged
  skipped: number;   // Accounts skipped (validation failure)
  inactive: number;  // Accounts marked inactive
  errors: string[];  // Error messages
  warnings: string[]; // Warning messages
}
```

## Known Limitations

1. **Excel Date Formatting**: Excel may convert numeric account codes to dates. Always format account code columns as text before exporting from Excel.

2. **Special Characters**: Some special characters may not transfer correctly between CSV exports and imports. Use standard alphanumeric characters when possible.

3. **Large Imports**: Very large imports (1000+ accounts) may timeout on some systems. Consider splitting large imports into multiple files.

## Troubleshooting

- **Import Errors**: Check the returned errors array for specific validation failures
- **Incorrect Updates**: Verify the CSV format, particularly that column headers match exactly
- **Parent Relationships Not Setting**: Ensure parent codes exist in the system or in the same import file
- **Transaction Protection**: If account updates aren't applying, check if the account has transactions