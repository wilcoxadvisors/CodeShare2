// Represents a suggestion or warning from our AI model
interface AISuggestion {
  type: 'SUGGESTION' | 'ANOMALY';
  originalRow: number;
  field: string;
  message: string;
  confidence: number;
  action?: {
    type: 'CHANGE_ACCOUNT_CODE' | 'SET_DIMENSION_TAG';
    payload: any;
  };
}

// Define interfaces for the data structures we'll be working with
interface ValidatedLine {
  originalRow: number;
  accountCode: string;
  description: string | null;
  amount: any; // The decimal.js object
  dimensions: { [key: string]: string };
}

interface ValidatedGroup {
  lines: ValidatedLine[];
}

export class AIAssistanceService {
  public async getSuggestions(validatedGroups: ValidatedGroup[]): Promise<Map<number, AISuggestion[]>> {
    console.log('STUB: AIAssistanceService executing with multi-factor analysis (description, amount, dimensions).');
    const suggestionsByRow = new Map<number, AISuggestion[]>();

    for (const group of validatedGroups) {
      for (const line of group.lines) {
        const description = (line.description || '').toLowerCase();
        const amount = parseFloat(line.amount.toString());
        const lineSuggestions: AISuggestion[] = [];

        // --- STUB LOGIC 1: Contextual Account Suggestion ---
        if ((description.includes('staples') || description.includes('office depot')) && line.accountCode !== '65100') {
          lineSuggestions.push({
            type: 'SUGGESTION',
            originalRow: line.originalRow,
            field: 'AccountCode',
            message: `This looks like an office supply expense. Consider account '65100'.`,
            confidence: 0.95,
            action: { type: 'CHANGE_ACCOUNT_CODE', payload: { newAccountCode: '65100' } }
          });
        }

        // --- STUB LOGIC 2: Contextual Dimension Suggestion ---
        if (!line.dimensions['Location'] && (description.includes('nyc') || description.includes('new york'))) {
          lineSuggestions.push({
            type: 'SUGGESTION',
            originalRow: line.originalRow,
            field: 'Location',
            message: `Text suggests 'Location' should be 'NYC'.`,
            confidence: 0.92,
            action: { type: 'SET_DIMENSION_TAG', payload: { dimensionCode: 'Location', newValueCode: 'NYC' } }
          });
        }

        // --- STUB LOGIC 3: Anomaly Detection (Amount-Based) ---
        if (line.accountCode === '65100' && Math.abs(amount) > 1000) {
            lineSuggestions.push({
                type: 'ANOMALY',
                originalRow: line.originalRow,
                field: 'Amount',
                message: `Amount is unusually high for 'Office Supplies'. Please verify this transaction.`,
                confidence: 0.88
            });
        }

        if (lineSuggestions.length > 0) {
          suggestionsByRow.set(line.originalRow, lineSuggestions);
        }
      }
    }
    return suggestionsByRow;
  }
}