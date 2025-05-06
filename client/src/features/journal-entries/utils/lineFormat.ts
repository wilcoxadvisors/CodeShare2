/**
 * Utility functions for handling journal entry line format conversions
 * between the client and server formats
 */

import { safeParseAmount } from './numberFormat';

/**
 * Interface representing a line in client-side format
 * with separate debit and credit fields
 */
interface ClientFormatLine {
  id?: number;
  accountId: string | number;
  entityCode?: string;
  description?: string;
  debit?: string | number;
  credit?: string | number;
  [key: string]: any;
}

/**
 * Interface representing a line in server-side format
 * with type and amount fields
 */
interface ServerFormatLine {
  id?: number;
  accountId: string | number;
  entityCode?: string;
  description?: string;
  type?: 'debit' | 'credit';
  amount?: number;
  [key: string]: any;
}

/**
 * Check if a journal entry line is in client format (has debit/credit fields)
 * 
 * @param line The journal entry line to check
 * @returns True if the line is in client format
 */
export function isClientFormatLine(line: any): line is ClientFormatLine {
  return line && 
    ('debit' in line || 'credit' in line) && 
    !('type' in line && 'amount' in line);
}

/**
 * Check if a journal entry line is in server format (has type/amount fields)
 * 
 * @param line The journal entry line to check
 * @returns True if the line is in server format
 */
export function isServerFormatLine(line: any): line is ServerFormatLine {
  return line && 
    ('type' in line || 'amount' in line) && 
    !('debit' in line && 'credit' in line);
}

/**
 * Extract the debit amount from a journal entry line, regardless of format
 * 
 * @param line The journal entry line (client or server format)
 * @returns The debit amount as a number
 */
export function getDebit(line: ClientFormatLine | ServerFormatLine): number {
  // If line uses client format with explicit debit field
  if ('debit' in line && line.debit !== undefined) {
    return safeParseAmount(line.debit);
  }
  
  // If line uses server format with type/amount
  if ('type' in line && 'amount' in line) {
    if (line.type === 'debit' && line.amount !== undefined) {
      return typeof line.amount === 'number' ? line.amount : safeParseAmount(line.amount as string);
    }
  }
  
  return 0;
}

/**
 * Extract the credit amount from a journal entry line, regardless of format
 * 
 * @param line The journal entry line (client or server format)
 * @returns The credit amount as a number
 */
export function getCredit(line: ClientFormatLine | ServerFormatLine): number {
  // If line uses client format with explicit credit field
  if ('credit' in line && line.credit !== undefined) {
    return safeParseAmount(line.credit);
  }
  
  // If line uses server format with type/amount
  if ('type' in line && 'amount' in line) {
    if (line.type === 'credit' && line.amount !== undefined) {
      return typeof line.amount === 'number' ? line.amount : safeParseAmount(line.amount as string);
    }
  }
  
  return 0;
}

/**
 * Convert a journal entry line from client format (debit/credit) to server format (type/amount)
 * 
 * @param line The journal entry line in client format
 * @returns The journal entry line in server format
 */
export function convertToServerFormat(line: ClientFormatLine): ServerFormatLine {
  const debit = getDebit(line);
  const credit = getCredit(line);
  
  const serverLine: ServerFormatLine = {
    accountId: line.accountId,
    description: line.description || '',
    entityCode: line.entityCode,
  };
  
  // Preserve the ID if it exists
  if (line.id) {
    serverLine.id = line.id;
  }
  
  // Copy any other properties
  Object.keys(line).forEach(key => {
    if (
      !['id', 'accountId', 'description', 'entityCode', 'debit', 'credit'].includes(key)
    ) {
      serverLine[key] = line[key];
    }
  });
  
  // Determine type and amount
  if (debit > 0) {
    serverLine.type = 'debit';
    serverLine.amount = debit;
  } else if (credit > 0) {
    serverLine.type = 'credit';
    serverLine.amount = credit;
  } else {
    // Default to debit with zero amount if both are empty
    serverLine.type = 'debit';
    serverLine.amount = 0;
  }
  
  return serverLine;
}

/**
 * Convert a journal entry line from server format (type/amount) to client format (debit/credit)
 * 
 * @param line The journal entry line in server format
 * @returns The journal entry line in client format
 */
export function convertToClientFormat(line: ServerFormatLine): ClientFormatLine {
  const clientLine: ClientFormatLine = {
    accountId: line.accountId,
    description: line.description || '',
    entityCode: line.entityCode || '',
    debit: '',
    credit: '',
  };
  
  // Preserve the ID if it exists
  if (line.id) {
    clientLine.id = line.id;
  }
  
  // Copy any other properties
  Object.keys(line).forEach(key => {
    if (
      !['id', 'accountId', 'description', 'entityCode', 'type', 'amount'].includes(key)
    ) {
      clientLine[key] = line[key];
    }
  });
  
  // Set debit or credit field
  if (line.type === 'debit' && line.amount !== undefined) {
    clientLine.debit = String(line.amount);
  } else if (line.type === 'credit' && line.amount !== undefined) {
    clientLine.credit = String(line.amount);
  }
  
  return clientLine;
}

/**
 * Process an array of journal entry lines for API submission
 * Converts from client format to server format
 * 
 * @param lines Array of journal entry lines in client format
 * @returns Array of journal entry lines in server format
 */
export function processLinesForSubmission(lines: ClientFormatLine[]): ServerFormatLine[] {
  return lines
    .filter(line => {
      const debit = getDebit(line);
      const credit = getCredit(line);
      return line.accountId && (debit > 0 || credit > 0);
    })
    .map(convertToServerFormat);
}