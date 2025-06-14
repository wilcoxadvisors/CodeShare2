/**
 * Property-Based Testing for Journal Entry Module
 * Using fast-check to automatically generate test cases and find edge cases
 */

import fc from 'fast-check';
import { describe, test, expect } from '@jest/globals';

// Types for property testing
interface JournalEntryLine {
  id?: number;
  accountId: number;
  type: 'debit' | 'credit';
  amount: string;
  description: string;
  entityCode?: string;
}

// Generators for property-based testing
const accountIdArbitrary = fc.integer({ min: 1, max: 10000 });
const amountArbitrary = fc.float({ min: 0.01, max: 1000000, noNaN: true }).map(n => n.toFixed(2));
const descriptionArbitrary = fc.string({ minLength: 1, maxLength: 255 });
const entityCodeArbitrary = fc.oneof(
  fc.constant(null),
  fc.string({ minLength: 1, maxLength: 10 })
);

// Generator for a single journal entry line
const journalEntryLineArbitrary = fc.record({
  accountId: accountIdArbitrary,
  type: fc.constantFrom('debit', 'credit'),
  amount: amountArbitrary,
  description: descriptionArbitrary,
  entityCode: entityCodeArbitrary
});

// Generator for balanced journal entry lines
const balancedJournalEntryLinesArbitrary = fc.tuple(
  fc.array(journalEntryLineArbitrary, { minLength: 1, maxLength: 20 }),
  fc.float({ min: 0.01, max: 10000, noNaN: true })
).map(([lines, totalAmount]) => {
  const numDebits = Math.max(1, Math.floor(lines.length / 2));
  const numCredits = lines.length - numDebits;
  
  // Create balanced lines
  const balancedLines: JournalEntryLine[] = [];
  
  // Add debit lines
  for (let i = 0; i < numDebits; i++) {
    balancedLines.push({
      ...lines[i],
      type: 'debit',
      amount: (totalAmount / numDebits).toFixed(2)
    });
  }
  
  // Add credit lines with same total
  for (let i = numDebits; i < lines.length; i++) {
    balancedLines.push({
      ...lines[i],
      type: 'credit',
      amount: (totalAmount / numCredits).toFixed(2)
    });
  }
  
  return balancedLines;
});

// Generator for intentionally unbalanced journal entry lines
const unbalancedJournalEntryLinesArbitrary = fc.tuple(
  fc.array(journalEntryLineArbitrary, { minLength: 2, maxLength: 10 }),
  fc.float({ min: 0.01, max: 1000, noNaN: true }),
  fc.float({ min: 0.01, max: 1000, noNaN: true })
).map(([lines, debitTotal, creditTotal]) => {
  // Ensure totals are different
  if (Math.abs(debitTotal - creditTotal) < 0.01) {
    creditTotal = debitTotal + 1.00;
  }
  
  const halfLength = Math.floor(lines.length / 2);
  const unbalancedLines: JournalEntryLine[] = [];
  
  // Add debit lines
  for (let i = 0; i < halfLength; i++) {
    unbalancedLines.push({
      ...lines[i],
      type: 'debit',
      amount: (debitTotal / halfLength).toFixed(2)
    });
  }
  
  // Add credit lines with different total
  for (let i = halfLength; i < lines.length; i++) {
    unbalancedLines.push({
      ...lines[i],
      type: 'credit',
      amount: (creditTotal / (lines.length - halfLength)).toFixed(2)
    });
  }
  
  return unbalancedLines;
});

describe('Journal Entry Property-Based Tests', () => {
  
  test('Property: Balanced journal entries should always validate as balanced', () => {
    fc.assert(
      fc.property(balancedJournalEntryLinesArbitrary, (lines) => {
        const result = validateJournalEntryBalance(lines);
        expect(result.isBalanced).toBe(true);
        expect(Math.abs(result.totalDebits - result.totalCredits)).toBeLessThan(0.01);
      }),
      { numRuns: 1000, verbose: true }
    );
  });

  test('Property: Unbalanced journal entries should always validate as unbalanced', () => {
    fc.assert(
      fc.property(unbalancedJournalEntryLinesArbitrary, (lines) => {
        const result = validateJournalEntryBalance(lines);
        expect(result.isBalanced).toBe(false);
        expect(Math.abs(result.totalDebits - result.totalCredits)).toBeGreaterThan(0.01);
      }),
      { numRuns: 500, verbose: true }
    );
  });

  test('Property: Empty journal entry lines should be invalid', () => {
    const result = validateJournalEntryBalance([]);
    expect(result.isBalanced).toBe(false);
    expect(result.totalDebits).toBe(0);
    expect(result.totalCredits).toBe(0);
  });

  test('Property: Single line entries should always be unbalanced', () => {
    fc.assert(
      fc.property(journalEntryLineArbitrary, (line) => {
        const result = validateJournalEntryBalance([line]);
        expect(result.isBalanced).toBe(false);
      }),
      { numRuns: 200, verbose: true }
    );
  });

  test('Property: Journal entry with only debits should be unbalanced', () => {
    fc.assert(
      fc.property(
        fc.array(journalEntryLineArbitrary, { minLength: 1, maxLength: 10 }),
        (lines) => {
          const debitOnlyLines = lines.map(line => ({ ...line, type: 'debit' as const }));
          const result = validateJournalEntryBalance(debitOnlyLines);
          expect(result.isBalanced).toBe(false);
          expect(result.totalCredits).toBe(0);
          expect(result.totalDebits).toBeGreaterThan(0);
        }
      ),
      { numRuns: 200, verbose: true }
    );
  });

  test('Property: Journal entry with only credits should be unbalanced', () => {
    fc.assert(
      fc.property(
        fc.array(journalEntryLineArbitrary, { minLength: 1, maxLength: 10 }),
        (lines) => {
          const creditOnlyLines = lines.map(line => ({ ...line, type: 'credit' as const }));
          const result = validateJournalEntryBalance(creditOnlyLines);
          expect(result.isBalanced).toBe(false);
          expect(result.totalDebits).toBe(0);
          expect(result.totalCredits).toBeGreaterThan(0);
        }
      ),
      { numRuns: 200, verbose: true }
    );
  });

  test('Property: Balance calculation should be consistent regardless of line order', () => {
    fc.assert(
      fc.property(
        fc.array(journalEntryLineArbitrary, { minLength: 2, maxLength: 10 }),
        (lines) => {
          const shuffledLines = [...lines].sort(() => Math.random() - 0.5);
          
          const result1 = validateJournalEntryBalance(lines);
          const result2 = validateJournalEntryBalance(shuffledLines);
          
          expect(result1.isBalanced).toBe(result2.isBalanced);
          expect(result1.totalDebits).toBeCloseTo(result2.totalDebits, 2);
          expect(result1.totalCredits).toBeCloseTo(result2.totalCredits, 2);
        }
      ),
      { numRuns: 300, verbose: true }
    );
  });

  test('Property: Very large amounts should still balance correctly', () => {
    const largeAmountArbitrary = fc.float({ min: 1000000, max: Number.MAX_SAFE_INTEGER / 1000 })
      .map(n => n.toFixed(2));
    
    const largeBalancedLinesArbitrary = fc.tuple(
      largeAmountArbitrary,
      fc.integer({ min: 1, max: 5 })
    ).map(([amount, numLines]) => {
      const lines: JournalEntryLine[] = [];
      const amountPerLine = (parseFloat(amount) / numLines).toFixed(2);
      
      // Add debit lines
      for (let i = 0; i < numLines; i++) {
        lines.push({
          accountId: 1000 + i,
          type: 'debit',
          amount: amountPerLine,
          description: `Large debit ${i}`,
          entityCode: 'TEST'
        });
      }
      
      // Add credit lines
      for (let i = 0; i < numLines; i++) {
        lines.push({
          accountId: 2000 + i,
          type: 'credit',
          amount: amountPerLine,
          description: `Large credit ${i}`,
          entityCode: 'TEST'
        });
      }
      
      return lines;
    });

    fc.assert(
      fc.property(largeBalancedLinesArbitrary, (lines) => {
        const result = validateJournalEntryBalance(lines);
        expect(result.isBalanced).toBe(true);
      }),
      { numRuns: 100, verbose: true }
    );
  });

  test('Property: Very small amounts should still balance correctly', () => {
    const smallAmountArbitrary = fc.float({ min: 0.01, max: 0.99 })
      .map(n => n.toFixed(2));
    
    const smallBalancedLinesArbitrary = smallAmountArbitrary.map(amount => [
      {
        accountId: 1001,
        type: 'debit' as const,
        amount,
        description: 'Small debit',
        entityCode: 'TEST'
      },
      {
        accountId: 2001,
        type: 'credit' as const,
        amount,
        description: 'Small credit',
        entityCode: 'TEST'
      }
    ]);

    fc.assert(
      fc.property(smallBalancedLinesArbitrary, (lines) => {
        const result = validateJournalEntryBalance(lines);
        expect(result.isBalanced).toBe(true);
      }),
      { numRuns: 100, verbose: true }
    );
  });
});

// Helper function to validate journal entry balance
function validateJournalEntryBalance(lines: JournalEntryLine[]) {
  let totalDebits = 0;
  let totalCredits = 0;
  
  for (const line of lines) {
    const amount = parseFloat(line.amount);
    if (line.type === 'debit') {
      totalDebits += amount;
    } else if (line.type === 'credit') {
      totalCredits += amount;
    }
  }
  
  const tolerance = 0.01;
  const isBalanced = Math.abs(totalDebits - totalCredits) < tolerance;
  
  return {
    isBalanced,
    totalDebits,
    totalCredits,
    difference: Math.abs(totalDebits - totalCredits)
  };
}