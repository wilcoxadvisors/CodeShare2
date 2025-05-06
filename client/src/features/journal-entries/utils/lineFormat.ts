/**
 * Helper functions for handling different journal entry line formats
 * Used by both JournalEntryDetail and JournalEntryForm components
 */

// Type guard to check if the line is in client format (debit/credit)
export type ClientFormatLine = {
  debit: string | number;
  credit: string | number;
  accountId: string | number;
  entityCode?: string;
  description?: string;
};

// Type guard to check if the line is in server format (type/amount)
export type ServerFormatLine = {
  type: 'debit' | 'credit';
  amount: string | number;
  accountId: string | number;
  entityCode?: string;
  description?: string;
};

export type JournalEntryLine = ClientFormatLine | ServerFormatLine;

/** Returns true if the line is in the legacy client format */
export function isClientFormatLine(line: any): line is ClientFormatLine {
  if (!line) return false;
  
  // More flexible check for debit/credit properties
  const hasDebitOrCredit = (
    'debit' in line || 
    'credit' in line ||
    (typeof line.debit !== 'undefined') || 
    (typeof line.credit !== 'undefined')
  );
  
  // Check for accountId in any form
  const hasAccountId = (
    'accountId' in line || 
    (typeof line.accountId !== 'undefined')
  );
  
  return hasDebitOrCredit && hasAccountId;
}

/** Returns true if the line is in the new compact format */
export function isServerFormatLine(line: any): line is ServerFormatLine {
  if (!line) return false;
  
  // More flexible check for type/amount properties
  const hasTypeAndAmount = (
    'type' in line && 
    'amount' in line &&
    (typeof line.type !== 'undefined') &&
    (typeof line.amount !== 'undefined') 
  );
  
  // Check for accountId in any form
  const hasAccountId = (
    'accountId' in line || 
    (typeof line.accountId !== 'undefined')
  );
  
  return hasTypeAndAmount && hasAccountId;
}

/** robust parser that swallows "1,000.00", "$1,000" or number */
export function safeParse(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return parseFloat(
    value.replace(/[^\d.-]/g, "")  // strip $, €, commas, spaces
  ) || 0;
}

/** Helper function to safely parse a string amount, handling commas and currency symbols */
export function safeParseAmount(amount: string | number): number {
  if (typeof amount === 'number') return amount;
  
  // Handle null, undefined, or empty string
  if (!amount) return 0;
  
  // Remove common currency symbols, commas, and spaces
  const cleanedAmount = amount.toString()
    .replace(/[$€£¥,\s]/g, '');
  
  // Parse the cleaned string to a float
  return parseFloat(cleanedAmount) || 0;
}

/** Gets the debit amount from a line regardless of format */
export function getDebit(line: any): number {
  if (!line) return 0;
  
  if (isClientFormatLine(line)) {
    return safeParse(line.debit);
  }
  
  if (isServerFormatLine(line)) {
    return line.type === 'debit' ? safeParse(line.amount) : 0;
  }
  
  // Fallback for legacy or unrecognized formats
  return typeof line.debit !== 'undefined' ? safeParse(line.debit) : 0;
}

/** Gets the credit amount from a line regardless of format */
export function getCredit(line: any): number {
  if (!line) return 0;
  
  if (isClientFormatLine(line)) {
    return safeParse(line.credit);
  }
  
  if (isServerFormatLine(line)) {
    return line.type === 'credit' ? safeParse(line.amount) : 0;
  }
  
  // Fallback for legacy or unrecognized formats
  return typeof line.credit !== 'undefined' ? safeParse(line.credit) : 0;
}