import { AIAssistanceService } from '../server/services/AIAssistanceService';
import Decimal from 'decimal.js';

describe('AIAssistanceService', () => {
  let aiService: AIAssistanceService;

  beforeEach(() => {
    aiService = new AIAssistanceService();
  });

  it('should suggest correct account code for office supply transactions', async () => {
    const testGroups = [
      {
        lines: [
          {
            originalRow: 2,
            accountCode: '1000', // Wrong account
            description: 'Office supplies from Staples',
            amount: new Decimal('150.50'),
            dimensions: {}
          }
        ]
      }
    ];

    const suggestions = await aiService.getSuggestions(testGroups);
    const lineSuggestions = suggestions.get(2);

    expect(lineSuggestions).toBeDefined();
    expect(lineSuggestions).toHaveLength(1);
    expect(lineSuggestions![0].type).toBe('SUGGESTION');
    expect(lineSuggestions![0].field).toBe('AccountCode');
    expect(lineSuggestions![0].message).toContain('office supply expense');
    expect(lineSuggestions![0].confidence).toBe(0.95);
    expect(lineSuggestions![0].action?.payload.newAccountCode).toBe('65100');
  });

  it('should suggest location dimension based on description context', async () => {
    const testGroups = [
      {
        lines: [
          {
            originalRow: 3,
            accountCode: '5000',
            description: 'Flight to NYC for conference',
            amount: new Decimal('450.00'),
            dimensions: {} // Missing Location dimension
          }
        ]
      }
    ];

    const suggestions = await aiService.getSuggestions(testGroups);
    const lineSuggestions = suggestions.get(3);

    expect(lineSuggestions).toBeDefined();
    expect(lineSuggestions).toHaveLength(1);
    expect(lineSuggestions![0].type).toBe('SUGGESTION');
    expect(lineSuggestions![0].field).toBe('Location');
    expect(lineSuggestions![0].message).toContain("'Location' should be 'NYC'");
    expect(lineSuggestions![0].confidence).toBe(0.92);
    expect(lineSuggestions![0].action?.payload.dimensionCode).toBe('Location');
    expect(lineSuggestions![0].action?.payload.newValueCode).toBe('NYC');
  });

  it('should flag anomalously high amounts for office supplies', async () => {
    const testGroups = [
      {
        lines: [
          {
            originalRow: 4,
            accountCode: '65100', // Correct office supplies account
            description: 'Office supplies',
            amount: new Decimal('5000.00'), // Unusually high amount
            dimensions: {}
          }
        ]
      }
    ];

    const suggestions = await aiService.getSuggestions(testGroups);
    const lineSuggestions = suggestions.get(4);

    expect(lineSuggestions).toBeDefined();
    expect(lineSuggestions).toHaveLength(1);
    expect(lineSuggestions![0].type).toBe('ANOMALY');
    expect(lineSuggestions![0].field).toBe('Amount');
    expect(lineSuggestions![0].message).toContain('unusually high for');
    expect(lineSuggestions![0].confidence).toBe(0.88);
    expect(lineSuggestions![0].action).toBeUndefined(); // No action for anomalies
  });

  it('should provide multiple suggestions for complex transactions', async () => {
    const testGroups = [
      {
        lines: [
          {
            originalRow: 5,
            accountCode: '1000', // Wrong account
            description: 'Office Depot supplies for NYC office',
            amount: new Decimal('1500.00'), // High amount that triggers anomaly
            dimensions: {} // Missing Location dimension
          }
        ]
      }
    ];

    const suggestions = await aiService.getSuggestions(testGroups);
    const lineSuggestions = suggestions.get(5);

    expect(lineSuggestions).toBeDefined();
    expect(lineSuggestions!.length).toBeGreaterThanOrEqual(2);

    // Should have account code suggestion
    const accountSuggestion = lineSuggestions!.find(s => s.field === 'AccountCode');
    expect(accountSuggestion).toBeDefined();
    expect(accountSuggestion!.type).toBe('SUGGESTION');

    // Should have location dimension suggestion
    const locationSuggestion = lineSuggestions!.find(s => s.field === 'Location');
    expect(locationSuggestion).toBeDefined();
    expect(locationSuggestion!.type).toBe('SUGGESTION');

    // Should have anomaly detection for high amount
    const anomalySuggestion = lineSuggestions!.find(s => s.field === 'Amount');
    expect(anomalySuggestion).toBeDefined();
    expect(anomalySuggestion!.type).toBe('ANOMALY');
  });

  it('should handle transactions that do not trigger any suggestions', async () => {
    const testGroups = [
      {
        lines: [
          {
            originalRow: 6,
            accountCode: '4000',
            description: 'Regular sales revenue',
            amount: new Decimal('2500.00'),
            dimensions: { Location: 'HQ' }
          }
        ]
      }
    ];

    const suggestions = await aiService.getSuggestions(testGroups);
    const lineSuggestions = suggestions.get(6);

    expect(lineSuggestions).toBeUndefined();
  });

  it('should handle multiple entry groups correctly', async () => {
    const testGroups = [
      {
        lines: [
          {
            originalRow: 7,
            accountCode: '1000',
            description: 'Staples office supplies',
            amount: new Decimal('200.00'),
            dimensions: {}
          }
        ]
      },
      {
        lines: [
          {
            originalRow: 8,
            accountCode: '5000',
            description: 'Travel to New York',
            amount: new Decimal('800.00'),
            dimensions: {}
          }
        ]
      }
    ];

    const suggestions = await aiService.getSuggestions(testGroups);

    // First group should have account suggestion
    const firstGroupSuggestions = suggestions.get(7);
    expect(firstGroupSuggestions).toBeDefined();
    expect(firstGroupSuggestions![0].field).toBe('AccountCode');

    // Second group should have location suggestion
    const secondGroupSuggestions = suggestions.get(8);
    expect(secondGroupSuggestions).toBeDefined();
    expect(secondGroupSuggestions![0].field).toBe('Location');
  });

  it('should handle lines with existing dimension values correctly', async () => {
    const testGroups = [
      {
        lines: [
          {
            originalRow: 9,
            accountCode: '5000',
            description: 'Flight to NYC',
            amount: new Decimal('450.00'),
            dimensions: { Location: 'HQ' } // Already has Location set
          }
        ]
      }
    ];

    const suggestions = await aiService.getSuggestions(testGroups);
    const lineSuggestions = suggestions.get(9);

    // Should not suggest Location since it's already set
    if (lineSuggestions) {
      const locationSuggestion = lineSuggestions.find(s => s.field === 'Location');
      expect(locationSuggestion).toBeUndefined();
    }
  });
});