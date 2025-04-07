# Account Update Validation

## Overview

This document explains the validation rules for updating Chart of Accounts entries in the financial system. To maintain data integrity, certain restrictions are in place when updating accounts, especially those with transaction history.

## Update Rules

### Accounts Without Transactions

Accounts that have no associated journal entry transactions can be freely updated. All fields are modifiable:

- Account Code
- Account Name
- Account Type
- Account Subtype
- Description
- Parent Account
- Other attributes

### Accounts With Transactions

When an account has existing transactions, certain critical fields cannot be updated to maintain the integrity of the accounting system:

| Field | Can Be Updated? | Reason |
|-------|----------------|--------|
| **Account Code** | ❌ No | Account codes are used as unique identifiers and referenced in transaction records and reports |
| **Account Type** | ❌ No | Changing the account type (asset, liability, equity, etc.) would violate accounting principles for existing transactions |
| **Account Name** | ✅ Yes | Names can be updated for clarity without affecting transaction integrity |
| **Description** | ✅ Yes | Descriptions provide context but don't affect transaction logic |
| **IsActive** | ✅ Yes | Accounts can be deactivated even with transactions |
| **Parent Account** | ✅ Yes | Hierarchy can be adjusted without affecting individual transactions |

## Error Handling

When attempting to update a restricted field on an account with transactions, the system will:

1. Return a 400 Bad Request status
2. Provide a clear error message specifying which fields cannot be updated
3. Include a `hasTransactions` flag in the response
4. List the specific `restrictedFields` that triggered the validation error

## API Response Example

When attempting to update restricted fields on an account with transactions, the API will respond with:

```json
{
  "message": "Cannot update accountCode, type for account with existing transactions",
  "restrictedFields": ["accountCode", "type"],
  "hasTransactions": true
}
```

## Alternative Options

For accounts with transactions that need significant changes:

1. **Deactivate and Create New**: The recommended approach is to deactivate the existing account and create a new one with the desired attributes
2. **Data Migration**: For exceptional cases, a data migration can be performed to move transactions to a new account, but this requires administrative intervention

## Technical Implementation

The validation checks are implemented in two places:

1. The API endpoint (`PUT /api/clients/:clientId/accounts/:id`) checks for transactions before processing updates
2. The update query in the database layer confirms the restrictions are enforced

This ensures data integrity is maintained across the application.