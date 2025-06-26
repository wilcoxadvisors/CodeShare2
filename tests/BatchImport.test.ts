import { BatchParsingService } from '../server/services/BatchParsingService';
import { BatchValidationService } from '../server/services/BatchValidationService';
import { accountStorage } from '../server/storage/accountStorage';
import { dimensionStorage } from '../server/storage/dimensionStorage';
import * as XLSX from 'xlsx';

// Mock the storage modules
jest.mock('../server/storage/accountStorage');
jest.mock('../server/storage/dimensionStorage');

const mockAccountStorage = accountStorage as jest.Mocked<typeof accountStorage>;
const mockDimensionStorage = dimensionStorage as jest.Mocked<typeof dimensionStorage>;

describe('BatchImport Integration', () => {
  let parsingService: BatchParsingService;
  let validationService: BatchValidationService;

  beforeEach(() => {
    parsingService = new BatchParsingService();
    validationService = new BatchValidationService();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Full parsing and validation flow', () => {
    const mockAccounts = [
      { 
        id: 1, 
        accountCode: '1000', 
        name: 'Cash', 
        type: 'ASSET' as any, 
        active: true,
        createdAt: new Date(),
        clientId: 250,
        subtype: null,
        isSubledger: false,
        subledgerType: null,
        parentId: null,
        description: null
      },
      { 
        id: 2, 
        accountCode: '4000', 
        name: 'Revenue', 
        type: 'REVENUE' as any, 
        active: true,
        createdAt: new Date(),
        clientId: 250,
        subtype: null,
        isSubledger: false,
        subledgerType: null,
        parentId: null,
        description: null
      },
      { 
        id: 3, 
        accountCode: '5000', 
        name: 'Expenses', 
        type: 'EXPENSE' as any, 
        active: true,
        createdAt: new Date(),
        clientId: 250,
        subtype: null,
        isSubledger: false,
        subledgerType: null,
        parentId: null,
        description: null
      }
    ];

    const mockDimensions = [
      {
        id: 1,
        code: 'Department',
        name: 'Department',
        values: [
          { id: 1, code: 'Sales', name: 'Sales Department' },
          { id: 2, code: 'Operations', name: 'Operations Department' }
        ]
      },
      {
        id: 2,
        code: 'Location',
        name: 'Location',
        values: [
          { id: 3, code: 'NewYork', name: 'New York Office' },
          { id: 4, code: 'Boston', name: 'Boston Office' }
        ]
      }
    ];

    beforeEach(() => {
      mockAccountStorage.getAccounts.mockResolvedValue(mockAccounts);
      mockDimensionStorage.getDimensionsByClient.mockResolvedValue(mockDimensions);
    });

    it('should handle all valid entries correctly', async () => {
      // Create test data with all valid accounts and dimensions
      const testData = [
        { AccountCode: '1000', Amount: 1000, Description: 'Cash receipt', Department: 'Sales', Location: 'NewYork' },
        { AccountCode: '4000', Amount: -1000, Description: 'Revenue recognition', Department: 'Sales', Location: 'NewYork' }
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'JournalEntryLines');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Parse the data
      const parsedData = await parsingService.parse(buffer);
      expect(parsedData.entryGroups).toHaveLength(1);

      // Validate the parsed data
      const validationResult = await validationService.validate(parsedData, 250);

      expect(validationResult.batchSummary.totalEntries).toBe(1);
      expect(validationResult.batchSummary.validEntries).toBe(1);
      expect(validationResult.batchSummary.entriesWithErrors).toBe(0);
      expect(validationResult.entryGroups[0].isValid).toBe(true);
      expect(validationResult.entryGroups[0].errors).toHaveLength(0);
    });

    it('should detect invalid account codes', async () => {
      // Create test data with an invalid account code
      const testData = [
        { AccountCode: '1000', Amount: 1000, Description: 'Cash receipt' },
        { AccountCode: '9999', Amount: -1000, Description: 'Invalid account' } // Invalid account
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'JournalEntryLines');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const parsedData = await parsingService.parse(buffer);
      const validationResult = await validationService.validate(parsedData, 250);

      expect(validationResult.batchSummary.totalEntries).toBe(1);
      expect(validationResult.batchSummary.validEntries).toBe(0);
      expect(validationResult.batchSummary.entriesWithErrors).toBe(1);
      
      const entryGroup = validationResult.entryGroups[0];
      expect(entryGroup.isValid).toBe(false);
      expect(entryGroup.errors).toHaveLength(1);
      expect(entryGroup.errors[0].type).toBe('ACCOUNT_NOT_FOUND');
      expect(entryGroup.errors[0].message).toContain('9999');
      expect(entryGroup.errors[0].field).toBe('AccountCode');
    });

    it('should suggest new dimension values', async () => {
      // Create test data with a new dimension value
      const testData = [
        { AccountCode: '1000', Amount: 1000, Description: 'Cash receipt', Department: 'Marketing', Location: 'NewYork' }, // Marketing is new
        { AccountCode: '4000', Amount: -1000, Description: 'Revenue', Department: 'Marketing', Location: 'NewYork' }
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'JournalEntryLines');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const parsedData = await parsingService.parse(buffer);
      const validationResult = await validationService.validate(parsedData, 250);

      expect(validationResult.batchSummary.totalEntries).toBe(1);
      expect(validationResult.batchSummary.validEntries).toBe(1); // Still valid because new dimension values aren't hard errors
      expect(validationResult.batchSummary.newDimensionValues).toBe(1);
      
      expect(validationResult.newDimensionValueSuggestions).toHaveLength(1);
      expect(validationResult.newDimensionValueSuggestions[0].dimensionCode).toBe('Department');
      expect(validationResult.newDimensionValueSuggestions[0].newValueCode).toBe('Marketing');
      expect(validationResult.newDimensionValueSuggestions[0].dimensionName).toBe('Department');
    });

    it('should detect invalid dimension codes', async () => {
      // Create test data with an invalid dimension
      const testData = [
        { AccountCode: '1000', Amount: 1000, Description: 'Cash receipt', InvalidDimension: 'SomeValue' },
        { AccountCode: '4000', Amount: -1000, Description: 'Revenue', InvalidDimension: 'SomeValue' }
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'JournalEntryLines');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const parsedData = await parsingService.parse(buffer);
      const validationResult = await validationService.validate(parsedData, 250);

      expect(validationResult.batchSummary.validEntries).toBe(0);
      expect(validationResult.batchSummary.entriesWithErrors).toBe(1);
      
      const entryGroup = validationResult.entryGroups[0];
      expect(entryGroup.isValid).toBe(false);
      expect(entryGroup.errors.some(err => err.type === 'DIMENSION_NOT_FOUND')).toBe(true);
    });

    it('should handle multiple entry groups with mixed validation results', async () => {
      // Create test data with two entry groups - one valid, one invalid
      const testData = [
        // First entry group (valid)
        { AccountCode: '1000', Amount: 1000, Description: 'Cash receipt', Department: 'Sales' },
        { AccountCode: '4000', Amount: -1000, Description: 'Revenue', Department: 'Sales' },
        // Second entry group (invalid account)
        { AccountCode: '9999', Amount: 500, Description: 'Invalid account' },
        { AccountCode: '1000', Amount: -500, Description: 'Cash payment' }
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'JournalEntryLines');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const parsedData = await parsingService.parse(buffer);
      const validationResult = await validationService.validate(parsedData, 250);

      expect(validationResult.batchSummary.totalEntries).toBe(2);
      expect(validationResult.batchSummary.validEntries).toBe(1);
      expect(validationResult.batchSummary.entriesWithErrors).toBe(1);
      
      // First entry group should be valid
      expect(validationResult.entryGroups[0].isValid).toBe(true);
      expect(validationResult.entryGroups[0].errors).toHaveLength(0);
      
      // Second entry group should be invalid
      expect(validationResult.entryGroups[1].isValid).toBe(false);
      expect(validationResult.entryGroups[1].errors).toHaveLength(1);
    });

    it('should efficiently use database lookups', async () => {
      // Create test data
      const testData = [
        { AccountCode: '1000', Amount: 1000, Description: 'Cash receipt' },
        { AccountCode: '4000', Amount: -1000, Description: 'Revenue' }
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'JournalEntryLines');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const parsedData = await parsingService.parse(buffer);
      await validationService.validate(parsedData, 250);

      // Verify that database calls were made only once each
      expect(mockAccountStorage.getAccounts).toHaveBeenCalledTimes(1);
      expect(mockDimensionStorage.getDimensionsByClient).toHaveBeenCalledTimes(1);
      expect(mockAccountStorage.getAccounts).toHaveBeenCalledWith(250);
      expect(mockDimensionStorage.getDimensionsByClient).toHaveBeenCalledWith(250);
    });
  });
});