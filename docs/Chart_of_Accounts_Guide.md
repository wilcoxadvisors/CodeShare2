# Chart of Accounts Import/Export Guide

## Overview

The Chart of Accounts (CoA) is a critical component of your accounting system. It provides an organized list of accounts used to track financial transactions. This guide explains how to import and export your Chart of Accounts in the Wilcox Advisors Accounting System.

## File Format

The system supports importing and exporting Chart of Accounts data in both CSV and Excel (XLSX) formats. The following fields are included:

| Field Name | Required | Description |
|------------|----------|-------------|
| AccountCode | Yes | Unique identifier for the account. Must be unique across all accounts in the Chart of Accounts. |
| Name | Yes | Descriptive name of the account. |
| Type | Yes | Account type. Must be one of: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE. |
| Subtype | No | Further classification of the account type. Examples: current_asset, accounts_receivable, etc. |
| IsSubledger | No | Boolean (TRUE/FALSE) indicating if this account has a subledger. Default is FALSE. |
| SubledgerType | No | Type of subledger if IsSubledger is TRUE. Examples: customer, vendor, employee, etc. |
| Active | No | Boolean (TRUE/FALSE) indicating if the account is active. Default is TRUE. |
| Description | No | Detailed description of the account's purpose. |
| ParentCode | No | AccountCode of the parent account. Used to create the account hierarchy. |

## Import Process

### Step 1: Prepare Your Import File

Create a CSV or Excel file with the fields mentioned above. Ensure that:
- All required fields are present
- AccountCode values are unique
- Type values are valid account types
- ParentCode values refer to existing AccountCode values in the same file or already in the system

### Step 2: Import the File

1. Navigate to the Chart of Accounts page
2. Click the "Import" button
3. Select your prepared file from your device
4. The system will analyze the file and display a preview of changes
5. Review the changes (additions, modifications, and removals)
6. Click "Confirm" to apply the changes

### Import Validation

The system performs the following validations:
- Required fields are present
- AccountCode values are unique
- Type values are valid
- Parent accounts exist (either in the file or already in the system)
- Account hierarchy is valid (no circular references)

## Export Process

### Step 1: Export the Chart of Accounts

1. Navigate to the Chart of Accounts page
2. Click the "Export CSV" or "Export Excel" button
3. The file will be downloaded to your device

### Export Format

The exported file includes all accounts in your Chart of Accounts with the fields mentioned in the File Format section.

## Error Handling

The system provides detailed error messages for common issues:

| Error | Description | Resolution |
|-------|-------------|------------|
| Duplicate AccountCode | An account with the same AccountCode already exists | Use a unique AccountCode |
| Missing Required Field | Required field is missing | Add the missing field to your import file |
| Invalid Type | The specified Type is not valid | Use one of the valid account types |
| Parent Account Not Found | The specified ParentCode doesn't exist | Ensure the parent account exists in the system or import file |
| Circular Reference | The account hierarchy contains a circular reference | Fix the ParentCode values to create a valid hierarchy |

## Parent-Child Hierarchy

The Chart of Accounts supports a hierarchical structure through the ParentCode field. When importing:

1. The system ensures all parent accounts exist
2. The hierarchy is validated to avoid circular references
3. If a parent account is referenced but doesn't exist, an error is shown
4. The hierarchy is preserved when exporting accounts

## Best Practices

1. **Start with a Template**: Use the "Template" button to download a template file with the correct format
2. **Validate Before Import**: Check your import file for errors before uploading
3. **Backup Before Import**: Export your existing Chart of Accounts before making significant changes
4. **Use Consistent Naming**: Follow a consistent naming convention for your accounts
5. **Maintain Hierarchy**: Use the parent-child relationship to organize your accounts logically

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| Import fails | Check the error messages and fix the issues in your import file |
| Export is incomplete | Ensure you have selected the correct client and have appropriate permissions |
| Hierarchy doesn't display correctly | Check the ParentCode values in your import file |
| Account not showing | Verify the account is set as Active |

## Technical Notes

- The system uses the AccountCode field as the unique identifier for accounts
- The parent-child relationship is established through the ParentCode field
- All fields are case-sensitive
- Boolean fields accept TRUE/FALSE values (case-insensitive)
- When exporting, the AccountCode field is used (not the legacy 'code' field)
