import { accountStorage } from '../storage/accountStorage';
import { dimensionStorage } from '../storage/dimensionStorage';

// Re-using the interfaces defined in the parsing service
interface ParsedLine {
  originalRow: number;
  accountCode: string;
  amount: any; // Decimal from parsing service
  description: string | null;
  date: Date | null;
  dimensions: { [key: string]: string };
}

interface EntryGroup {
  groupKey: string;
  lines: ParsedLine[];
  errors: string[];
}

// Define the structure for the final validation output
interface ValidationError {
  type?: 'ACCOUNT_NOT_FOUND' | 'DIMENSION_NOT_FOUND' | 'DIMENSION_VALUE_NOT_FOUND';
  message: string;
  originalRow: number;
  field: string; // e.g., 'AccountCode' or 'Department'
  dimensionId?: number; // Required for DIMENSION_VALUE_NOT_FOUND type
  value?: string; // Required for DIMENSION_VALUE_NOT_FOUND type
}

interface NewDimensionValueSuggestion {
    dimensionName: string;
    dimensionCode: string;
    newValueCode: string;
}

export class BatchValidationService {
  public async validate(parsedData: { entryGroups: EntryGroup[] }, clientId: number) {
    console.log('ARCHITECT_DEBUG: BatchValidationService.validate called for client:', clientId);
    console.log('ARCHITECT_DEBUG: Validating', parsedData.entryGroups?.length || 0, 'entry groups');
    
    // 1. Fetch all necessary data from the database ONCE for efficiency.
    const allAccounts = await accountStorage.getAccounts(clientId);
    const allDimensions = await dimensionStorage.getDimensionsByClient(clientId);

    // 2. Create efficient in-memory lookup maps.
    const accountsMap = new Map(allAccounts.map(acc => [acc.accountCode, acc]));
    const dimensionsMap = new Map(
      allDimensions.map((dim: any) => [
        dim.code,
        { ...dim, valuesMap: new Map(dim.values?.map((val: any) => [val.code, val]) || []) },
      ])
    );

    console.log('ARCHITECT_DEBUG: Created lookup maps - Accounts:', accountsMap.size, 'Dimensions:', dimensionsMap.size);

    const newDimensionValueSuggestions: NewDimensionValueSuggestion[] = [];
    let validationErrors: ValidationError[] = [];

    // 3. Iterate through each entry group and validate its lines.
    const validatedEntryGroups = parsedData.entryGroups.map(group => {
      const groupErrors: ValidationError[] = [];

      group.lines.forEach(line => {
        // Validate Account Code
        if (!accountsMap.has(line.accountCode)) {
          groupErrors.push({
            type: 'ACCOUNT_NOT_FOUND',
            message: `Account code "${line.accountCode}" does not exist or is inactive.`,
            originalRow: line.originalRow,
            field: 'AccountCode',
          });
        }

        // Validate Dimension Codes and Values
        for (const dimCode in line.dimensions) {
          const dimValueCode = line.dimensions[dimCode];
          if (!dimValueCode) continue; // Skip if no value is provided

          const dimension = dimensionsMap.get(dimCode);
          if (!dimension) {
            groupErrors.push({
              type: 'DIMENSION_NOT_FOUND',
              message: `Dimension "${dimCode}" does not exist for this client.`,
              originalRow: line.originalRow,
              field: dimCode,
            });
          } else if (!(dimension as any).valuesMap.has(dimValueCode)) {
              // This is a dimension value that doesn't exist - create an error with creation capability
              groupErrors.push({
                type: 'DIMENSION_VALUE_NOT_FOUND',
                message: `Dimension value "${dimValueCode}" not found for ${(dimension as any).name}. Click "Approve & Create" to add it.`,
                originalRow: line.originalRow,
                field: dimCode,
                dimensionId: (dimension as any).id,
                value: dimValueCode,
              });
              
              // Also add to suggestions for summary display
              const suggestion = {
                  dimensionName: (dimension as any).name,
                  dimensionCode: dimCode,
                  newValueCode: dimValueCode
              };
              if (!newDimensionValueSuggestions.some(s => s.dimensionCode === dimCode && s.newValueCode === dimValueCode)) {
                  newDimensionValueSuggestions.push(suggestion);
              }
          }
        }
      });

      validationErrors.push(...groupErrors);
      return { ...group, errors: groupErrors, isValid: groupErrors.length === 0 };
    });

    // 4. Assemble the final, comprehensive response object.
    const batchSummary = {
        totalEntries: validatedEntryGroups.length,
        validEntries: validatedEntryGroups.filter(g => g.isValid).length,
        entriesWithErrors: validatedEntryGroups.filter(g => !g.isValid).length,
        newDimensionValues: newDimensionValueSuggestions.length
    };

    console.log('ARCHITECT_DEBUG: Validation complete - Total:', batchSummary.totalEntries, 'Valid:', batchSummary.validEntries, 'Errors:', batchSummary.entriesWithErrors);

    return {
      batchSummary,
      entryGroups: validatedEntryGroups,
      newDimensionValueSuggestions,
    };
  }
}