import { BatchValidationService } from '../server/services/BatchValidationService';
import * as XLSX from 'xlsx';

// Create a mock storage that returns test data
jest.mock('../server/storage/accountStorage', () => ({
  accountStorage: {
    getAccounts: jest.fn()
  }
}));

jest.mock('../server/storage/dimensionStorage', () => ({
  dimensionStorage: {
    getDimensionsByClient: jest.fn()
  }
}));

const mockAccountStorage = require('../server/storage/accountStorage').accountStorage;
const mockDimensionStorage = require('../server/storage/dimensionStorage').dimensionStorage;

describe('BatchValidationService (Standalone)', () => {
  let validationService: BatchValidationService;

  beforeEach(() => {
    validationService = new BatchValidationService();
    jest.clearAllMocks();
  });

  it('should validate entries and detect account errors', async () => {
    // Setup mock data
    const mockAccounts = [
      { accountCode: '1000', name: 'Cash' },
      { accountCode: '4000', name: 'Revenue' }
    ];

    const mockDimensions = [
      {
        code: 'Department',
        name: 'Department',
        values: [
          { code: 'Sales', name: 'Sales Department' }
        ]
      }
    ];

    mockAccountStorage.getAccounts.mockResolvedValue(mockAccounts);
    mockDimensionStorage.getDimensionsByClient.mockResolvedValue(mockDimensions);

    // Create test entry groups
    const testData = {
      entryGroups: [
        {
          groupKey: 'group1',
          lines: [
            {
              originalRow: 1,
              accountCode: '1000',
              amount: 1000,
              description: 'Cash receipt',
              date: new Date(),
              dimensions: { Department: 'Sales' }
            },
            {
              originalRow: 2,
              accountCode: '9999', // Invalid account
              amount: -1000,
              description: 'Invalid account',
              date: new Date(),
              dimensions: {}
            }
          ],
          errors: []
        }
      ]
    };

    const result = await validationService.validate(testData, 250);

    expect(result.batchSummary.totalEntries).toBe(1);
    expect(result.batchSummary.validEntries).toBe(0);
    expect(result.batchSummary.entriesWithErrors).toBe(1);
    expect(result.entryGroups[0].isValid).toBe(false);
    expect(result.entryGroups[0].errors).toHaveLength(1);
    expect(result.entryGroups[0].errors[0].type).toBe('ACCOUNT_NOT_FOUND');
    expect(result.entryGroups[0].errors[0].message).toContain('9999');
  });

  it('should suggest new dimension values', async () => {
    const mockAccounts = [
      { accountCode: '1000', name: 'Cash' },
      { accountCode: '4000', name: 'Revenue' }
    ];

    const mockDimensions = [
      {
        code: 'Department',
        name: 'Department',
        values: [
          { code: 'Sales', name: 'Sales Department' }
        ]
      }
    ];

    mockAccountStorage.getAccounts.mockResolvedValue(mockAccounts);
    mockDimensionStorage.getDimensionsByClient.mockResolvedValue(mockDimensions);

    const testData = {
      entryGroups: [
        {
          groupKey: 'group1',
          lines: [
            {
              originalRow: 1,
              accountCode: '1000',
              amount: 1000,
              description: 'Cash receipt',
              date: new Date(),
              dimensions: { Department: 'Marketing' } // New dimension value
            },
            {
              originalRow: 2,
              accountCode: '4000',
              amount: -1000,
              description: 'Revenue',
              date: new Date(),
              dimensions: { Department: 'Marketing' }
            }
          ],
          errors: []
        }
      ]
    };

    const result = await validationService.validate(testData, 250);

    expect(result.batchSummary.totalEntries).toBe(1);
    expect(result.batchSummary.validEntries).toBe(1); // Still valid since new values aren't hard errors
    expect(result.batchSummary.newDimensionValues).toBe(1);
    expect(result.newDimensionValueSuggestions).toHaveLength(1);
    expect(result.newDimensionValueSuggestions[0].dimensionCode).toBe('Department');
    expect(result.newDimensionValueSuggestions[0].newValueCode).toBe('Marketing');
  });

  it('should handle dimension validation errors', async () => {
    const mockAccounts = [
      { accountCode: '1000', name: 'Cash' }
    ];

    const mockDimensions = [
      {
        code: 'Department',
        name: 'Department',
        values: [
          { code: 'Sales', name: 'Sales Department' }
        ]
      }
    ];

    mockAccountStorage.getAccounts.mockResolvedValue(mockAccounts);
    mockDimensionStorage.getDimensionsByClient.mockResolvedValue(mockDimensions);

    const testData = {
      entryGroups: [
        {
          groupKey: 'group1',
          lines: [
            {
              originalRow: 1,
              accountCode: '1000',
              amount: 1000,
              description: 'Cash receipt',
              date: new Date(),
              dimensions: { InvalidDimension: 'SomeValue' }
            }
          ],
          errors: []
        }
      ]
    };

    const result = await validationService.validate(testData, 250);

    expect(result.batchSummary.validEntries).toBe(0);
    expect(result.entryGroups[0].isValid).toBe(false);
    expect(result.entryGroups[0].errors.some(err => err.type === 'DIMENSION_NOT_FOUND')).toBe(true);
  });

  it('should efficiently call storage methods only once', async () => {
    const mockAccounts = [{ accountCode: '1000', name: 'Cash' }];
    const mockDimensions = [];

    mockAccountStorage.getAccounts.mockResolvedValue(mockAccounts);
    mockDimensionStorage.getDimensionsByClient.mockResolvedValue(mockDimensions);

    const testData = {
      entryGroups: [
        {
          groupKey: 'group1',
          lines: [
            {
              originalRow: 1,
              accountCode: '1000',
              amount: 1000,
              description: 'Test',
              date: new Date(),
              dimensions: {}
            }
          ],
          errors: []
        }
      ]
    };

    await validationService.validate(testData, 250);

    expect(mockAccountStorage.getAccounts).toHaveBeenCalledTimes(1);
    expect(mockDimensionStorage.getDimensionsByClient).toHaveBeenCalledTimes(1);
    expect(mockAccountStorage.getAccounts).toHaveBeenCalledWith(250);
    expect(mockDimensionStorage.getDimensionsByClient).toHaveBeenCalledWith(250);
  });
});