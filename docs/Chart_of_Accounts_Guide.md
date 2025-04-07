# Chart of Accounts Management Guide

## Overview

The Chart of Accounts (CoA) is the foundation of your accounting system. It organizes all financial transactions into a structured hierarchy of accounts that allows for accurate financial reporting. This guide explains how to use the CoA management features in the Wilcox Advisors Accounting System.

## Table of Contents

1. [Account Structure](#account-structure)
2. [Accessing the Chart of Accounts](#accessing-the-chart-of-accounts)
3. [Managing Accounts](#managing-accounts)
   - [Creating Accounts](#creating-accounts)
   - [Editing Accounts](#editing-accounts)
   - [Activating/Deactivating Accounts](#activatingdeactivating-accounts)
4. [Import/Export Functionality](#importexport-functionality)
   - [Exporting Accounts](#exporting-accounts)
   - [Importing Accounts](#importing-accounts)
   - [Import Format Requirements](#import-format-requirements)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## Account Structure

Each account in the Chart of Accounts has the following attributes:

- **Account Code**: A unique identifier for the account (e.g., "1000")
- **Name**: The descriptive name of the account (e.g., "Cash")
- **Type**: The primary classification (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
- **Subtype**: Further classification within the primary type
- **Parent Account**: Optional relationship to a parent account, creating a hierarchy
- **Description**: Optional detailed explanation of the account's purpose
- **Is Subledger**: Whether the account can have subledger entries
- **Subledger Type**: If applicable, the type of subledger (e.g., "customer", "vendor")
- **Active**: Whether the account is currently active and available for use

## Accessing the Chart of Accounts

To access the Chart of Accounts:

1. Log in to the accounting system
2. Select the appropriate client from the client selection dropdown
3. Navigate to "Chart of Accounts" in the main navigation menu
4. The system will display the complete Chart of Accounts for the selected client

## Managing Accounts

### Creating Accounts

To create a new account:

1. From the Chart of Accounts screen, click the "Add Account" button
2. Fill in the required fields:
   - Account Code
   - Name
   - Type
   - Subtype (if applicable)
3. Optionally set a parent account to create a hierarchical structure
4. Add a description if needed
5. Set subledger options if applicable
6. Click "Save" to create the account

### Editing Accounts

To edit an existing account:

1. Locate the account in the Chart of Accounts list
2. Click the "Edit" icon next to the account
3. Modify the desired fields
4. Click "Save" to update the account

Note: Some fields may be restricted from editing if the account has been used in transactions.

### Activating/Deactivating Accounts

Rather than deleting accounts (which could affect historical data), you can deactivate them:

1. Locate the account in the Chart of Accounts list
2. Click the "Edit" icon next to the account
3. Toggle the "Active" switch to Off
4. Click "Save" to update the account

Inactive accounts will not appear in transaction entry forms but will still be available for reporting on historical data.

## Import/Export Functionality

The system provides powerful import and export features for managing accounts in bulk.

### Exporting Accounts

To export the Chart of Accounts:

1. From the Chart of Accounts screen, click the "Export" button
2. Select your preferred format (CSV or Excel)
3. The system will generate and download the file

### Importing Accounts

To import accounts:

1. From the Chart of Accounts screen, click the "Import" button
2. Select your file format (CSV or Excel)
3. Upload your file
4. Review any validation messages
5. Confirm the import to proceed

The import process supports both adding new accounts and updating existing ones.

### Import Format Requirements

For successful imports, your file must include the following columns:

| Field Name | Required | Description |
|------------|----------|-------------|
| AccountCode | Yes | Unique identifier for the account |
| Name | Yes | Descriptive name |
| Type | Yes | Must be one of: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE |
| Subtype | No | Further classification |
| IsSubledger | No | TRUE or FALSE (defaults to FALSE) |
| SubledgerType | No | Only required if IsSubledger is TRUE |
| Active | No | TRUE or FALSE (defaults to TRUE) |
| Description | No | Detailed explanation |
| ParentCode | No | Account code of the parent account (if any) |

Notes:
- Boolean values should be entered as TRUE or FALSE (case-insensitive)
- Parent accounts must exist before child accounts that reference them
- Field names are case-sensitive; please use exactly as shown

Sample import format:
```
AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
1000,Cash,ASSET,current_asset,FALSE,,TRUE,Cash accounts,
1100,Checking Account,ASSET,current_asset,FALSE,,TRUE,Main checking account,1000
```

## Best Practices

1. **Use a consistent account numbering system**:
   - 1000-1999: Assets
   - 2000-2999: Liabilities
   - 3000-3999: Equity
   - 4000-4999: Revenue
   - 5000-9999: Expenses

2. **Create account hierarchies** to organize related accounts together

3. **Keep descriptions clear and consistent** to help users understand the purpose of each account

4. **Review the chart periodically** to ensure it still meets reporting needs

5. **Deactivate unused accounts** rather than deleting them to preserve historical data

6. **Test imports with a small dataset** before attempting large imports

## Troubleshooting

### Common Import Issues

1. **Duplicate Account Codes**:
   - Each account code must be unique within a client
   - The system will reject imports with duplicate codes

2. **Missing Required Fields**:
   - Ensure AccountCode, Name, and Type are provided for all accounts
   - Check for empty cells in your import file

3. **Invalid Parent References**:
   - Parent accounts must exist before they can be referenced
   - Import parent accounts first, then child accounts
   - Or arrange your import file so parents appear before their children

4. **Invalid Account Types**:
   - Account Type must be one of the allowed values
   - Check for typos and case sensitivity

### Export Issues

1. **No File Downloaded**:
   - Ensure your browser allows downloads from the application
   - Check for browser pop-up blockers

2. **Incomplete Data**:
   - Verify you have the correct permissions
   - Check if any filters are applied that might be limiting the export

If you continue to experience issues with the Chart of Accounts functionality, please contact your system administrator for assistance.
