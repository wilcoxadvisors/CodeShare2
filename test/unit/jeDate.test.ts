import { createJournalEntrySchema, updateJournalEntrySchema } from '../../shared/validation';
import { format } from 'date-fns';

describe('Journal Entry Date Validation', () => {
  // Tests for createJournalEntrySchema
  describe('createJournalEntrySchema', () => {
    it('should accept valid YYYY-MM-DD date string', () => {
      const testData = {
        date: '2025-05-01',
        clientId: 1,
        entityId: 1,
        createdBy: 1,
        description: 'Test journal entry',
        lines: [
          {
            type: 'debit',
            accountId: 1,
            amount: '100.00',
            description: 'Test debit line'
          },
          {
            type: 'credit',
            accountId: 2,
            amount: '100.00',
            description: 'Test credit line'
          }
        ]
      };
      
      const result = createJournalEntrySchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe('2025-05-01');
      }
    });
    
    it('should convert Date object to YYYY-MM-DD string', () => {
      const testDate = new Date('2025-05-01T12:00:00Z');
      const testData = {
        date: testDate,
        clientId: 1,
        entityId: 1,
        createdBy: 1,
        description: 'Test journal entry with Date object',
        lines: [
          {
            type: 'debit',
            accountId: 1,
            amount: '100.00',
            description: 'Test debit line'
          },
          {
            type: 'credit',
            accountId: 2,
            amount: '100.00',
            description: 'Test credit line'
          }
        ]
      };
      
      const result = createJournalEntrySchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe('2025-05-01');
      }
    });
    
    it('should reject invalid date formats', () => {
      const testData = {
        date: '05/01/2025', // MM/DD/YYYY format should be rejected
        clientId: 1,
        entityId: 1,
        createdBy: 1,
        description: 'Test journal entry with invalid date',
        lines: [
          {
            type: 'debit',
            accountId: 1,
            amount: '100.00',
            description: 'Test debit line'
          },
          {
            type: 'credit',
            accountId: 2,
            amount: '100.00',
            description: 'Test credit line'
          }
        ]
      };
      
      const result = createJournalEntrySchema.safeParse(testData);
      expect(result.success).toBe(false);
    });
  });
  
  // Tests for updateJournalEntrySchema
  describe('updateJournalEntrySchema', () => {
    it('should accept valid YYYY-MM-DD date string for updates', () => {
      const testData = {
        date: '2025-05-02',
        description: 'Updated test journal entry'
      };
      
      const result = updateJournalEntrySchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe('2025-05-02');
      }
    });
    
    it('should convert Date object to YYYY-MM-DD string for updates', () => {
      const testDate = new Date('2025-05-02T12:00:00Z');
      const testData = {
        date: testDate,
        description: 'Updated test journal entry with Date object'
      };
      
      const result = updateJournalEntrySchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe('2025-05-02');
      }
    });
  });
  
  // Test that date-fns formats dates consistently
  describe('date-fns formatting consistency', () => {
    it('should maintain date without TZ shifts', () => {
      // Test dates across multiple hours
      const dates = [
        new Date('2025-05-01T00:00:00Z'), // midnight UTC
        new Date('2025-05-01T12:00:00Z'), // noon UTC
        new Date('2025-05-01T23:59:59Z'), // just before midnight UTC
      ];
      
      for (const date of dates) {
        const formatted = format(date, 'yyyy-MM-dd');
        expect(formatted).toBe('2025-05-01'); // should always be the same regardless of time
      }
    });
  });
});