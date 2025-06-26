import * as XLSX from 'xlsx';
import { Decimal } from 'decimal.js';

// Define the structure for a parsed line, including its original row number for error tracking
interface ParsedLine {
  originalRow: number;
  accountCode: string;
  amount: Decimal;
  description: string | null;
  date: Date | null;
  dimensions: { [key: string]: string };
}

// Define the structure for a group of lines that represents a single journal entry
interface EntryGroup {
  groupKey: string; // A unique key for this import run, e.g., 'entry-1'
  lines: ParsedLine[];
  errors: string[]; // To hold errors specific to this group, like being unbalanced
}

export class BatchParsingService {
  public async parse(fileBuffer: Buffer): Promise<{ entryGroups: EntryGroup[] }> {
    // Use a try-catch block to handle potential errors from the parsing library
    try {
      // 1. Read the workbook from the buffer
      const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
      const sheetName = 'JournalEntryLines'; // As defined in our architecture
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new Error(`The required sheet "${sheetName}" was not found in the uploaded file.`);
      }

      // 2. Convert the sheet to an array of JSON objects
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

      // 3. Implement the Zero-Balance Grouping Algorithm
      const entryGroups: EntryGroup[] = [];
      let currentGroup: ParsedLine[] = [];
      let currentBalance = new Decimal(0);
      let entryCounter = 1;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const originalRow = i + 2; // +2 to account for 0-index and header row

        // Extract core data and perform initial type validation
        const amount = new Decimal(row['Amount'] || 0);
        const accountCode = String(row['AccountCode'] || '').trim();

        if (amount.isZero() || !accountCode) {
          // Skip empty or invalid rows to make the import more resilient
          continue;
        }

        // Extract dimension data dynamically from all other columns
        const dimensions: { [key: string]: string } = {};
        Object.keys(row).forEach(key => {
          if (!['AccountCode', 'Amount', 'Description', 'Date'].includes(key)) {
            dimensions[key] = String(row[key] || '').trim();
          }
        });

        const parsedLine: ParsedLine = {
          originalRow,
          accountCode,
          amount,
          description: row['Description'] || null,
          date: row['Date'] instanceof Date ? row['Date'] : null,
          dimensions,
        };

        currentGroup.push(parsedLine);
        currentBalance = currentBalance.plus(amount);

        // Check if the group is balanced
        if (currentBalance.isZero()) {
          entryGroups.push({
            groupKey: `entry-${entryCounter++}`,
            lines: currentGroup,
            errors: [],
          });
          // Reset for the next group
          currentGroup = [];
        }
      }

      // Edge Case: Handle the last group if it's not balanced
      if (currentGroup.length > 0) {
        entryGroups.push({
          groupKey: `entry-${entryCounter}`,
          lines: currentGroup,
          errors: ['This entry group is not balanced. The sum of debits and credits does not equal zero.'],
        });
      }

      console.log(`ARCHITECT_DEBUG: Parsing complete. Found ${entryGroups.length} entry groups.`);
      return { entryGroups };

    } catch (error) {
      console.error("Error in BatchParsingService:", error);
      // Preserve specific error messages, otherwise use generic fallback
      if (error instanceof Error && error.message.includes('JournalEntryLines')) {
        throw error;
      }
      // Re-throw a user-friendly error to be caught by the route handler
      throw new Error("Failed to parse the uploaded file. Please ensure it is a valid .xlsx or .csv file and matches the template format.");
    }
  }
}