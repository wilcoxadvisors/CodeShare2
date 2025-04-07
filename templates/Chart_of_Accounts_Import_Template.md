# Chart of Accounts Import Template Structure

This document outlines the structure and contents of the `Chart_of_Accounts_Import_Template.xlsx` file.

## Worksheet 1: Instructions

### Introduction
```
CHART OF ACCOUNTS IMPORT TEMPLATE
Wilcox Advisors Accounting System

This template is designed to help you prepare your Chart of Accounts data for import
into the Wilcox Advisors Accounting System. Please follow the instructions below carefully.
```

### Required vs. Optional Fields
```
REQUIRED FIELDS (must be populated):
- AccountCode: Unique identifier for each account (e.g., "1000")
- Name: Descriptive name of the account (e.g., "Cash")
- Type: Account type - must be one of: ASSET, LIABILITY, EQUITY, INCOME, EXPENSE

OPTIONAL FIELDS (may be left blank):
- Subtype: Further categorization of account
- ParentCode: Code of the parent account (for hierarchical structure)
- Description: Detailed description of the account
- IsSubledger: Set to TRUE if this is a subledger account, otherwise FALSE
- SubledgerType: Type of subledger (if applicable)
```

### Numbering Conventions
```
RECOMMENDED ACCOUNT NUMBERING STRUCTURE:

Assets:       1000-1999
Liabilities:  2000-2999
Equity:       3000-3999
Revenue:      4000-4999
Expenses:     5000-9999

Examples:
1000 - Assets (parent)
  1100 - Current Assets (child of 1000)
    1110 - Cash (child of 1100)
    1120 - Accounts Receivable (child of 1100)
  1200 - Fixed Assets (child of 1000)
    1210 - Equipment (child of 1200)
    1220 - Buildings (child of 1200)
```

### Import Rules and Validations
```
IMPORTANT VALIDATION RULES:

1. Each AccountCode must be unique.
2. ParentCode must reference an existing account (either in the system or in this import).
3. An account cannot reference itself as its parent.
4. Account Type must be one of the specified values in the dropdown list.
5. If IsSubledger is TRUE, a SubledgerType should be provided.
```

### Common Issues and Solutions
```
TROUBLESHOOTING:

- If your import fails due to "Invalid parent relationship," ensure that:
  a) The parent account exists in the system or is included in this import
  b) The account doesn't reference itself as its parent
  c) There are no circular references (A->B->C->A)

- If your import fails due to duplicate accounts, check that:
  a) All AccountCodes in your import file are unique
  b) None of your AccountCodes already exist in the system (unless you're updating)
```

## Worksheet 2: Import Data

This worksheet contains the actual data to be imported, with data validation and examples.

### Column Headers and Data Types
```
A: AccountCode (Text) - REQUIRED
B: Name (Text) - REQUIRED
C: Type (Dropdown: ASSET, LIABILITY, EQUITY, INCOME, EXPENSE) - REQUIRED
D: Subtype (Text) - OPTIONAL
E: ParentCode (Text) - OPTIONAL
F: Description (Text) - OPTIONAL
G: IsSubledger (Dropdown: TRUE, FALSE) - OPTIONAL (defaults to FALSE)
H: SubledgerType (Text) - OPTIONAL
I: Active (Dropdown: TRUE, FALSE) - OPTIONAL (defaults to TRUE)
```

### Data Validation Rules (Excel)
- Column A (AccountCode): No duplicates allowed
- Column C (Type): Dropdown list with 5 values
- Column G (IsSubledger): Dropdown list with TRUE/FALSE
- Column I (Active): Dropdown list with TRUE/FALSE

### Example Rows
```
AccountCode | Name             | Type   | Subtype        | ParentCode | Description                | IsSubledger | SubledgerType | Active
------------|------------------|--------|----------------|------------|----------------------------|-------------|--------------|-------
1000        | Assets           | ASSET  | Main Category  |            | All company assets        | FALSE       |              | TRUE
1100        | Current Assets   | ASSET  | Subcategory    | 1000       | Short-term assets         | FALSE       |              | TRUE
1110        | Cash             | ASSET  | Cash Account   | 1100       | Cash on hand and in bank  | FALSE       |              | TRUE
1120        | Accounts Rec.    | ASSET  | Receivables    | 1100       | Outstanding invoices      | TRUE        | Customer     | TRUE
2000        | Liabilities      | LIABILITY | Main Category |          | All company liabilities   | FALSE       |              | TRUE
2100        | Current Liab.    | LIABILITY | Subcategory | 2000       | Short-term obligations    | FALSE       |              | TRUE
2110        | Accounts Pay.    | LIABILITY | Payables    | 2100       | Outstanding bills         | TRUE        | Vendor       | TRUE
3000        | Equity           | EQUITY | Main Category  |            | Ownership accounts        | FALSE       |              | TRUE
4000        | Revenue          | INCOME | Main Category  |            | All income sources        | FALSE       |              | TRUE
5000        | Expenses         | EXPENSE | Main Category |            | All company expenses      | FALSE       |              | TRUE
```

## Worksheet 3: Account Types Reference

This worksheet provides detailed information about each account type and common subtypes.

### Asset Accounts
```
ASSET ACCOUNTS:
- Current Assets: Cash, Accounts Receivable, Inventory, Prepaid Expenses
- Fixed Assets: Property, Plant, Equipment, Vehicles
- Other Assets: Intangible Assets, Investments, Goodwill

Common Numbering:
1000-1099: Main asset categories
1100-1199: Current assets
1200-1299: Fixed assets
1300-1399: Other assets
```

### Liability Accounts
```
LIABILITY ACCOUNTS:
- Current Liabilities: Accounts Payable, Accrued Expenses, Short-term Debt
- Long-term Liabilities: Loans, Mortgages, Bonds Payable

Common Numbering:
2000-2099: Main liability categories
2100-2199: Current liabilities
2200-2299: Long-term liabilities
```

### Equity Accounts
```
EQUITY ACCOUNTS:
- Capital, Retained Earnings, Drawing Accounts

Common Numbering:
3000-3099: Owner's equity
3100-3199: Retained earnings
3200-3299: Other equity accounts
```

### Income Accounts
```
INCOME ACCOUNTS:
- Revenue, Sales, Service Income, Interest Income

Common Numbering:
4000-4099: Main revenue categories
4100-4199: Product sales
4200-4299: Service revenue
4300-4399: Other income
```

### Expense Accounts
```
EXPENSE ACCOUNTS:
- Cost of Goods Sold, Operating Expenses, Payroll, Rent, Utilities

Common Numbering:
5000-5099: Cost of goods sold
6000-6999: Operating expenses
7000-7999: Payroll expenses
8000-8999: Facility expenses
9000-9999: Other expenses
```

## Worksheet 4: Support Information

This worksheet provides additional support information and contacts.

```
SUPPORT INFORMATION:

If you have questions or need assistance with your Chart of Accounts import,
please contact:

Technical Support: support@wilcoxadvisors.com
Phone: (555) 123-4567

Business Hours: Monday-Friday, 9am-5pm EST

Training Resources: https://wilcoxadvisors.com/training/chart-of-accounts
```
