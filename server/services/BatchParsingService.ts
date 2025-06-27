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
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
      const sheetName = 'JournalEntryLines (EDIT THIS)';
      const worksheet = workbook.Sheets[sheetName] || workbook.Sheets[workbook.SheetNames[0]];

      if (!worksheet) {
        throw new Error(`The required sheet "JournalEntryLines (EDIT THIS)" was not found.`);
      }

      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

      // --- ARCHITECT'S DEFINITIVE HYBRID LOGIC ---
      // Determine which grouping strategy to use.
      const useKeyBasedGrouping = rows.some(row => row.EntryGroupKey && String(row.EntryGroupKey).trim() !== '');

      if (useKeyBasedGrouping) {
        console.log('ARCHITECT_DEBUG: Using "Explicit Grouping" strategy based on EntryGroupKey.');
        return this.groupByEntryGroupKey(rows);
      } else {
        console.log('ARCHITECT_DEBUG: Using "Auto-Grouping by Date" strategy.');
        return this.groupByDateAndBalance(rows);
      }
      // --- END OF HYBRID LOGIC ---

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

  private groupByEntryGroupKey(rows: any[]): { entryGroups: EntryGroup[] } {
    const groupsMap = new Map<string, ParsedLine[]>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const originalRow = i + 2; // +2 to account for 0-index and header row

      // Extract core data and perform initial type validation
      const rawAmount = String(row['Amount'] || '').trim();
      const accountCode = String(row['AccountCode'] || '').trim();
      const entryGroupKey = String(row['EntryGroupKey'] || '').trim();

      // Skip template example rows or rows with non-numeric amounts
      if (!rawAmount || rawAmount.toLowerCase().includes('example') || 
          !accountCode || accountCode.toLowerCase().includes('example') ||
          !entryGroupKey || entryGroupKey.toLowerCase().includes('example')) {
        console.log(`PARSER_DEBUG: Skipping template/example row ${originalRow}: amount="${rawAmount}", account="${accountCode}", key="${entryGroupKey}"`);
        continue;
      }

      // Try to parse amount as decimal, skip if invalid
      let amount: Decimal;
      try {
        amount = new Decimal(rawAmount);
        if (amount.isZero()) {
          console.log(`PARSER_DEBUG: Skipping zero amount row ${originalRow}`);
          continue;
        }
      } catch (error) {
        console.log(`PARSER_DEBUG: Skipping invalid amount row ${originalRow}: "${rawAmount}"`);
        continue;
      }

      // Extract dimension data dynamically from all other columns
      const dimensions: { [key: string]: string } = {};
      Object.keys(row).forEach(key => {
        if (!['AccountCode', 'Amount', 'Description', 'Date', 'EntryGroupKey'].includes(key)) {
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

      // Group lines by their EntryGroupKey
      if (!groupsMap.has(entryGroupKey)) {
        groupsMap.set(entryGroupKey, []);
      }
      groupsMap.get(entryGroupKey)!.push(parsedLine);
    }

    // Convert the map to EntryGroup[] array structure
    const entryGroups: EntryGroup[] = [];
    groupsMap.forEach((lines, groupKey) => {
      // Calculate balance for this group
      const balance = lines.reduce((sum, line) => sum.plus(line.amount), new Decimal(0));
      const errors: string[] = [];

      if (!balance.isZero()) {
        errors.push('This entry group is not balanced. The sum of debits and credits does not equal zero.');
      }

      entryGroups.push({
        groupKey,
        lines,
        errors,
      });
    });

    console.log(`ARCHITECT_DEBUG: Key-based grouping complete. Found ${entryGroups.length} entry groups.`);
    return { entryGroups };
  }

  private groupByDateAndBalance(rows: any[]): { entryGroups: EntryGroup[] } {
    const entryGroups: EntryGroup[] = [];
    let currentGroup: ParsedLine[] = [];
    let currentBalance = new Decimal(0);
    let currentDate = rows[0]?.Date || null;
    let entryCounter = 1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const originalRow = i + 2; // +2 to account for 0-index and header row
      const rowDate = row.Date || null;

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
        if (!['AccountCode', 'Amount', 'Description', 'Date', 'EntryGroupKey'].includes(key)) {
          dimensions[key] = String(row[key] || '').trim();
        }
      });

      const parsedLine: ParsedLine = {
        originalRow,
        accountCode,
        amount,
        description: row['Description'] || null,
        date: rowDate instanceof Date ? rowDate : null,
        dimensions,
      };

      // If the date changes, it forces the current group to close.
      if (rowDate && currentDate && new Date(rowDate).getTime() !== new Date(currentDate).getTime()) {
        if (currentGroup.length > 0) {
          // Close the previous group, even if unbalanced
          const balance = currentGroup.reduce((sum, line) => sum.plus(line.amount), new Decimal(0));
          const errors: string[] = [];
          if (!balance.isZero()) {
            errors.push('This entry group is not balanced. The sum of debits and credits does not equal zero.');
          }

          entryGroups.push({
            groupKey: `entry-${entryCounter++}`,
            lines: currentGroup,
            errors,
          });
        }
        // Start a new group
        currentGroup = [parsedLine];
        currentBalance = parsedLine.amount;
        currentDate = rowDate;
        continue;
      }

      currentGroup.push(parsedLine);
      currentBalance = currentBalance.plus(parsedLine.amount);

      // If the group balances, close it and start a new one.
      if (currentBalance.isZero()) {
        entryGroups.push({
          groupKey: `entry-${entryCounter++}`,
          lines: currentGroup,
          errors: [],
        });
        currentGroup = [];
        currentBalance = new Decimal(0);
      }
    }

    // Handle any remaining lines at the end of the file
    if (currentGroup.length > 0) {
      const balance = currentGroup.reduce((sum, line) => sum.plus(line.amount), new Decimal(0));
      const errors: string[] = [];
      if (!balance.isZero()) {
        errors.push('This entry group is not balanced. The sum of debits and credits does not equal zero.');
      }

      entryGroups.push({
        groupKey: `entry-${entryCounter}`,
        lines: currentGroup,
        errors,
      });
    }

    console.log(`ARCHITECT_DEBUG: Date-based grouping complete. Found ${entryGroups.length} entry groups.`);
    return { entryGroups };
  }
}