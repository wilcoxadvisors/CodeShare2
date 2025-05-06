/**
 * Helper functions for handling different journal entry line formats
 * Used by both JournalEntryDetail and JournalEntryForm components
 */

// Type guard to check if the line is in client format (debit/credit)
export type ClientFormatLine = {
  debit: string;
  credit: string;
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
  return line && 
         (typeof line.debit !== 'undefined' || typeof line.credit !== 'undefined') &&
         typeof line.accountId !== 'undefined';
}

/** Returns true if the line is in the new compact format */
export function isServerFormatLine(line: any): line is ServerFormatLine {
  return line && 
         typeof line.type !== 'undefined' &&
         typeof line.amount !== 'undefined' &&
         typeof line.accountId !== 'undefined';
}

/** Helper function to safely parse a string amount, handling commas and currency symbols */
function safeParseAmount(amount: string | number): number {
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
    return safeParseAmount(line.debit);
  }
  
  if (isServerFormatLine(line)) {
    return line.type === 'debit' ? safeParseAmount(line.amount) : 0;
  }
  
  // Fallback for legacy or unrecognized formats
  return typeof line.debit !== 'undefined' ? safeParseAmount(line.debit) : 0;
}

/** Gets the credit amount from a line regardless of format */
export function getCredit(line: any): number {
  if (!line) return 0;
  
  if (isClientFormatLine(line)) {
    return safeParseAmount(line.credit);
  }
  
  if (isServerFormatLine(line)) {
    return line.type === 'credit' ? safeParseAmount(line.amount) : 0;
  }
  
  // Fallback for legacy or unrecognized formats
  return typeof line.credit !== 'undefined' ? safeParseAmount(line.credit) : 0;
}