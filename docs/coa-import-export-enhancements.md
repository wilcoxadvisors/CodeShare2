# Chart of Accounts Import/Export Enhancements

## Overview
This document outlines the improvements made to the Chart of Accounts (CoA) import and export functionality to ensure consistent field naming, improved validation, and better parent-child relationship handling.

## Key Enhancements

### 1. Consistent Field Naming

The system now uses consistent field names throughout the import and export process:
- `AccountCode` (previously inconsistently used as "accountCode", "account_code", "code", etc.)
- `Name` (previously "name", "Name", etc.)
- `Type` (previously "type", "Type", etc.)
- `ParentCode` (previously "parentCode", "parent_code", "Parent", etc.)

The new `normalizeFieldName` method maps various input field names to a standardized set, improving compatibility with different CSV and Excel formats.

### 2. Enhanced Validation Logic

Added comprehensive validation that occurs in two stages:
- `validateImportRow`: Validates basic account properties (required fields, duplicate checking, etc.)
- `validateParentRelationship`: Specifically validates parent-child relationships

By separating these validations, we can provide more detailed error messages and allow accounts to be imported even if parent relationships need correction.

### 3. Improved Parent-Child Relationship Handling

During import, we now:
1. Validate all accounts before any database operations
2. Process accounts in two phases:
   - First phase: Create/update accounts without parent relationships
   - Second phase: Update parent relationships only after all accounts exist

This prevents issues with non-existent parent accounts and ensures consistent validation across CSV and Excel imports.

### 4. Standardized Export Format

Export fields now include:
- `AccountCode`
- `Name`
- `Type`
- `Subtype`
- `IsSubledger`
- `SubledgerType`
- `Active`
- `Description`
- `ParentId`
- `ParentCode`
- `ParentName`

This provides more comprehensive data that can be reimported seamlessly.

### 5. Format-Agnostic Processing

The new implementation uses the same validation and normalization logic for both CSV and Excel imports, ensuring consistent behavior regardless of the file format.

## Implementation Details

New methods added to `AccountStorage` class:
- `parseCsvImport`: Processes CSV content with consistent field naming
- `parseExcelImport`: Processes Excel content with consistent field naming
- `normalizeImportRecord`: Maps input fields to standardized format
- `normalizeFieldName`: Handles variations in field naming
- `validateImportRow`: Validates basic account properties
- `validateParentRelationship`: Specifically validates parent relationships
- `mapDbFieldsToExportFields`: Ensures consistent field naming in exports

## Usage

The import/export functionality works as before but with improved reliability:

### Export
```
GET /api/accounts/export/:clientId
```
Returns a consistently formatted JSON array that can be downloaded as CSV or Excel.

### Import Preview
```
POST /api/accounts/import/preview/:clientId
```
Provides a preview of import data with validated fields and any warnings/errors.

### Import
```
POST /api/accounts/import/:clientId
```
Performs the full import with validation, preserving parent relationships.

## Testing

Import/export functionality should be tested with:
1. CSV files with various column naming conventions
2. Excel files with different sheet structures
3. Files with parent-child relationships that depend on accounts in the same import
4. Files with invalid parent relationships
