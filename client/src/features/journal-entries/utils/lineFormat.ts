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
  if (!line || typeof line !== 'object') return false;
  
  // More flexible check for debit/credit properties
  // At least one of debit or credit must be present and have a value
  const hasDebit = 'debit' in line && (line.debit !== undefined && line.debit !== null);
  const hasCredit = 'credit' in line && (line.credit !== undefined && line.credit !== null);
  const hasDebitOrCredit = hasDebit || hasCredit;
  
  // Check for accountId in any form - it must be present and have a value
  const hasAccountId = 'accountId' in line && (line.accountId !== undefined && line.accountId !== null);
  
  // Ensure it's not a server format line (no 'type' field)
  const isNotServerFormat = !('type' in line && (line.type === 'debit' || line.type === 'credit'));
  
  return hasDebitOrCredit && hasAccountId && isNotServerFormat;
}

/** Returns true if the line is in the new compact format */
export function isServerFormatLine(line: any): line is ServerFormatLine {
  if (!line || typeof line !== 'object') return false;
  
  // Check for valid type property (must be either 'debit' or 'credit')
  const hasValidType = 'type' in line && 
                       line.type !== undefined && 
                       (line.type === 'debit' || line.type === 'credit');
  
  // Check for amount property (must be present and have a value)
  const hasAmount = 'amount' in line && (line.amount !== undefined && line.amount !== null);
  
  // Check for accountId in any form - it must be present and have a value
  const hasAccountId = 'accountId' in line && (line.accountId !== undefined && line.accountId !== null);
  
  return hasValidType && hasAmount && hasAccountId;
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
    const result = safeParseAmount(line.debit);
    console.log('DEBUG getDebit ClientFormat:', { debit: line.debit, result });
    return result;
  }
  
  if (isServerFormatLine(line)) {
    const result = line.type === 'debit' ? safeParseAmount(line.amount) : 0;
    console.log('DEBUG getDebit ServerFormat:', { type: line.type, amount: line.amount, result });
    return result;
  }
  
  // Fallback for legacy or unrecognized formats
  const result = typeof line.debit !== 'undefined' ? safeParseAmount(line.debit) : 0;
  console.log('DEBUG getDebit Fallback:', { debit: line.debit, result });
  return result;
}

/** Gets the credit amount from a line regardless of format */
export function getCredit(line: any): number {
  if (!line) return 0;
  
  if (isClientFormatLine(line)) {
    const result = safeParseAmount(line.credit);
    console.log('DEBUG getCredit ClientFormat:', { credit: line.credit, result });
    return result;
  }
  
  if (isServerFormatLine(line)) {
    const result = line.type === 'credit' ? safeParseAmount(line.amount) : 0;
    console.log('DEBUG getCredit ServerFormat:', { type: line.type, amount: line.amount, result });
    return result;
  }
  
  // Fallback for legacy or unrecognized formats
  const result = typeof line.credit !== 'undefined' ? safeParseAmount(line.credit) : 0;
  console.log('DEBUG getCredit Fallback:', { credit: line.credit, result });
  return result;
}