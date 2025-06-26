import { Decimal } from 'decimal.js';

// Interface for validation error
export interface ValidationError {
  originalRow: number;
  field: string;
  message: string;
}

// Interface for account lookup
export interface AccountLookup {
  id: number;
  code: string;
  name: string;
}

// Interface for dimension lookup
export interface DimensionLookup {
  id: number;
  code: string;
  name: string;
  valuesMap: Map<string, { id: number; code: string; name: string }>;
}

/**
 * Validates a single entry group for errors
 * @param group - The entry group to validate
 * @param accountsMap - Map of account codes to account data
 * @param dimensionsMap - Map of dimension codes to dimension data
 * @returns Array of validation errors
 */
export const validateEntryGroup = (
  group: any,
  accountsMap: Map<string, AccountLookup>,
  dimensionsMap: Map<string, DimensionLookup>
): ValidationError[] => {
  const errors: ValidationError[] = [];
  let balance = new Decimal(0);

  // Rule 1: Validate each line
  group.lines.forEach((line: any) => {
    // Check Account Code
    if (!line.accountCode || !accountsMap.has(line.accountCode)) {
      errors.push({
        originalRow: line.originalRow,
        field: 'AccountCode',
        message: 'Account code not found.'
      });
    }

    // Check Dimensions
    if (line.dimensions && typeof line.dimensions === 'object') {
      Object.keys(line.dimensions).forEach(dimCode => {
        const dimValueCode = line.dimensions[dimCode];
        const dimension = dimensionsMap.get(dimCode);
        if (dimValueCode && (!dimension || !dimension.valuesMap.has(dimValueCode))) {
          errors.push({
            originalRow: line.originalRow,
            field: dimCode,
            message: `Value '${dimValueCode}' not found for ${dimCode}.`
          });
        }
      });
    }

    // Calculate balance - handle both debit/credit fields and amount with sign
    let lineAmount = new Decimal(0);
    
    if (line.debit && parseFloat(line.debit) !== 0) {
      lineAmount = new Decimal(line.debit);
    } else if (line.credit && parseFloat(line.credit) !== 0) {
      lineAmount = new Decimal(line.credit).neg();
    } else if (line.amount) {
      // Handle existing amount field (positive = debit, negative = credit)
      lineAmount = new Decimal(line.amount.toString());
    }

    balance = balance.plus(lineAmount);
  });

  // Rule 2: Check if the entry balances
  // Use a small epsilon for floating-point comparisons
  if (balance.abs().greaterThan(0.01)) {
    errors.push({
      originalRow: group.lines[0]?.originalRow || 1,
      field: 'Group',
      message: 'This entry group does not balance.'
    });
  }

  return errors;
};

/**
 * Creates a lookup map from accounts array
 * @param accounts - Array of account objects
 * @returns Map of account codes to account data
 */
export const createAccountsMap = (accounts: any[]): Map<string, AccountLookup> => {
  const map = new Map<string, AccountLookup>();
  accounts.forEach(account => {
    map.set(account.code, {
      id: account.id,
      code: account.code,
      name: account.name
    });
  });
  return map;
};

/**
 * Creates a lookup map from dimensions array
 * @param dimensions - Array of dimension objects with values
 * @returns Map of dimension codes to dimension data with value maps
 */
export const createDimensionsMap = (dimensions: any[]): Map<string, DimensionLookup> => {
  const map = new Map<string, DimensionLookup>();
  dimensions.forEach(dimension => {
    const valuesMap = new Map<string, { id: number; code: string; name: string }>();
    if (dimension.values) {
      dimension.values.forEach((value: any) => {
        valuesMap.set(value.code, {
          id: value.id,
          code: value.code,
          name: value.name
        });
      });
    }
    
    map.set(dimension.code, {
      id: dimension.id,
      code: dimension.code,
      name: dimension.name,
      valuesMap
    });
  });
  return map;
};