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

/** Gets the debit amount from a line regardless of format */
export function getDebit(line: any): number {
  if (isClientFormatLine(line)) return parseFloat(line.debit) || 0;
  if (isServerFormatLine(line)) return line.type === 'debit' ? parseFloat(line.amount.toString()) : 0;
  return 0;
}

/** Gets the credit amount from a line regardless of format */
export function getCredit(line: any): number {
  if (isClientFormatLine(line)) return parseFloat(line.credit) || 0;
  if (isServerFormatLine(line)) return line.type === 'credit' ? parseFloat(line.amount.toString()) : 0;
  return 0;
}