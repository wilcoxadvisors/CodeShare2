import { BatchParsingService } from '../server/services/BatchParsingService';
import * as XLSX from 'xlsx';
import { Decimal } from 'decimal.js';

describe('BatchParsingService', () => {
  let service: BatchParsingService;

  beforeEach(() => {
    service = new BatchParsingService();
  });

  describe('parse', () => {
    it('should parse a simple balanced entry correctly', async () => {
      // Create test data: one balanced entry with debit and credit
      const testData = [
        { AccountCode: '1000', Amount: 1000, Description: 'Cash receipt', Date: new Date('2023-01-15') },
        { AccountCode: '4000', Amount: -1000, Description: 'Revenue recognition', Date: new Date('2023-01-15') }
      ];

      // Create Excel buffer with test data
      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'JournalEntryLines');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const result = await service.parse(buffer);

      expect(result.entryGroups).toHaveLength(1);
      expect(result.entryGroups[0].groupKey).toBe('entry-1');
      expect(result.entryGroups[0].lines).toHaveLength(2);
      expect(result.entryGroups[0].errors).toHaveLength(0);
      
      // Verify the first line
      const firstLine = result.entryGroups[0].lines[0];
      expect(firstLine.accountCode).toBe('1000');
      expect(firstLine.amount.equals(new Decimal(1000))).toBe(true);
      expect(firstLine.description).toBe('Cash receipt');
      expect(firstLine.originalRow).toBe(2);
      
      // Verify the second line
      const secondLine = result.entryGroups[0].lines[1];
      expect(secondLine.accountCode).toBe('4000');
      expect(secondLine.amount.equals(new Decimal(-1000))).toBe(true);
      expect(secondLine.description).toBe('Revenue recognition');
      expect(secondLine.originalRow).toBe(3);
    });

    it('should parse multiple balanced entries correctly', async () => {
      // Create test data: two separate balanced entries
      const testData = [
        // First entry (balanced)
        { AccountCode: '1000', Amount: 1500, Description: 'Cash receipt', Date: new Date('2023-01-15') },
        { AccountCode: '4000', Amount: -1500, Description: 'Revenue', Date: new Date('2023-01-15') },
        // Second entry (balanced)
        { AccountCode: '6000', Amount: 500, Description: 'Office supplies', Date: new Date('2023-01-16') },
        { AccountCode: '1000', Amount: -500, Description: 'Cash payment', Date: new Date('2023-01-16') }
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'JournalEntryLines');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const result = await service.parse(buffer);

      expect(result.entryGroups).toHaveLength(2);
      
      // Verify first entry
      expect(result.entryGroups[0].groupKey).toBe('entry-1');
      expect(result.entryGroups[0].lines).toHaveLength(2);
      expect(result.entryGroups[0].errors).toHaveLength(0);
      
      // Verify second entry
      expect(result.entryGroups[1].groupKey).toBe('entry-2');
      expect(result.entryGroups[1].lines).toHaveLength(2);
      expect(result.entryGroups[1].errors).toHaveLength(0);
    });

    it('should handle unbalanced final group with error', async () => {
      // Create test data: one balanced entry + one unbalanced entry
      const testData = [
        // First entry (balanced)
        { AccountCode: '1000', Amount: 1000, Description: 'Cash receipt', Date: new Date('2023-01-15') },
        { AccountCode: '4000', Amount: -1000, Description: 'Revenue', Date: new Date('2023-01-15') },
        // Second entry (unbalanced - missing credit)
        { AccountCode: '6000', Amount: 500, Description: 'Office supplies', Date: new Date('2023-01-16') }
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'JournalEntryLines');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const result = await service.parse(buffer);

      expect(result.entryGroups).toHaveLength(2);
      
      // First entry should be balanced
      expect(result.entryGroups[0].errors).toHaveLength(0);
      
      // Second entry should be unbalanced with error
      expect(result.entryGroups[1].groupKey).toBe('entry-2');
      expect(result.entryGroups[1].lines).toHaveLength(1);
      expect(result.entryGroups[1].errors).toHaveLength(1);
      expect(result.entryGroups[1].errors[0]).toBe('This entry group is not balanced. The sum of debits and credits does not equal zero.');
    });

    it('should correctly extract dynamic dimensions', async () => {
      // Create test data with dimension columns
      const testData = [
        { 
          AccountCode: '1000', 
          Amount: 1000, 
          Description: 'Cash receipt', 
          Date: new Date('2023-01-15'),
          Department: 'Sales',
          Location: 'New York',
          Project: 'Website Redesign'
        },
        { 
          AccountCode: '4000', 
          Amount: -1000, 
          Description: 'Revenue', 
          Date: new Date('2023-01-15'),
          Department: 'Sales',
          Location: 'New York',
          Project: 'Website Redesign'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'JournalEntryLines');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const result = await service.parse(buffer);

      expect(result.entryGroups).toHaveLength(1);
      
      const firstLine = result.entryGroups[0].lines[0];
      expect(firstLine.dimensions).toEqual({
        Department: 'Sales',
        Location: 'New York',
        Project: 'Website Redesign'
      });
      
      const secondLine = result.entryGroups[0].lines[1];
      expect(secondLine.dimensions).toEqual({
        Department: 'Sales',
        Location: 'New York',
        Project: 'Website Redesign'
      });
    });

    it('should skip empty rows and continue processing', async () => {
      // Create test data with empty rows mixed in
      const testData = [
        { AccountCode: '1000', Amount: 1000, Description: 'Cash receipt' },
        { AccountCode: '', Amount: 0, Description: '' }, // Empty row
        { AccountCode: '4000', Amount: -1000, Description: 'Revenue' },
        { AccountCode: '6000', Amount: 0, Description: 'Zero amount' }, // Zero amount row
        { AccountCode: '5000', Amount: 250, Description: 'Expense' },
        { AccountCode: '1000', Amount: -250, Description: 'Payment' }
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'JournalEntryLines');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const result = await service.parse(buffer);

      expect(result.entryGroups).toHaveLength(2);
      
      // Should have skipped empty rows and grouped correctly
      expect(result.entryGroups[0].lines).toHaveLength(2);
      expect(result.entryGroups[1].lines).toHaveLength(2);
    });

    it('should throw error when JournalEntryLines sheet is missing', async () => {
      // Create workbook with wrong sheet name
      const testData = [
        { AccountCode: '1000', Amount: 1000, Description: 'Cash receipt' }
      ];
      
      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'WrongSheetName');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      await expect(service.parse(buffer)).rejects.toThrow(
        'The required sheet "JournalEntryLines" was not found in the uploaded file.'
      );
    });

    it('should handle decimal precision correctly', async () => {
      // Test with decimal amounts that could cause floating-point issues
      const testData = [
        { AccountCode: '1000', Amount: 0.1, Description: 'Test' },
        { AccountCode: '4000', Amount: 0.2, Description: 'Test' },
        { AccountCode: '6000', Amount: -0.3, Description: 'Test' }
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'JournalEntryLines');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const result = await service.parse(buffer);

      expect(result.entryGroups).toHaveLength(1);
      expect(result.entryGroups[0].errors).toHaveLength(0);
      
      // Verify decimal precision is maintained
      const lines = result.entryGroups[0].lines;
      expect(lines[0].amount.equals(new Decimal('0.1'))).toBe(true);
      expect(lines[1].amount.equals(new Decimal('0.2'))).toBe(true);
      expect(lines[2].amount.equals(new Decimal('-0.3'))).toBe(true);
    });
  });
});