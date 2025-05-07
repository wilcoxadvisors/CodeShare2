import { isReferenceDuplicate } from '../components/JournalEntryForm';

describe('isReferenceDuplicate', () => {
  const sampleEntries = [
    { id: 1, referenceNumber: 'Ref-001' },
    { id: 2, referenceNumber: 'Ref-ABC' },
    { id: 3, referenceNumber: 'INV-2023-01' }
  ] as any[];

  it('flags duplicates (case-insensitive)', () => {
    expect(isReferenceDuplicate('ref-001', sampleEntries)).toBe(true);
    expect(isReferenceDuplicate('REF-abc', sampleEntries)).toBe(true);
  });

  it('ignores the current entry when editing', () => {
    expect(isReferenceDuplicate('Ref-001', sampleEntries, 1)).toBe(false);
    expect(isReferenceDuplicate('Ref-ABC', sampleEntries, 2)).toBe(false);
  });

  it('returns false for brand-new reference', () => {
    expect(isReferenceDuplicate('NEW-999', sampleEntries)).toBe(false);
    expect(isReferenceDuplicate('INV-2023-02', sampleEntries)).toBe(false);
  });

  it('handles edge cases', () => {
    // Reference too short (less than 3 chars)
    expect(isReferenceDuplicate('AB', sampleEntries)).toBe(false);
    
    // Empty or null inputs
    expect(isReferenceDuplicate('', sampleEntries)).toBe(false);
    expect(isReferenceDuplicate(' ', sampleEntries)).toBe(false);
    
    // Handle empty array
    expect(isReferenceDuplicate('Ref-001', [])).toBe(false);
    
    // Handle null or undefined arrays
    expect(isReferenceDuplicate('Ref-001', null as any)).toBe(false);
    expect(isReferenceDuplicate('Ref-001', undefined as any)).toBe(false);
  });

  it('handles whitespace in reference numbers', () => {
    // Add a sample with whitespace
    const entriesWithSpaces = [
      ...sampleEntries,
      { id: 4, referenceNumber: ' Ref-Space ' }
    ];
    
    // Should match despite whitespace differences
    expect(isReferenceDuplicate('Ref-Space', entriesWithSpaces)).toBe(true);
    expect(isReferenceDuplicate(' Ref-Space', entriesWithSpaces)).toBe(true);
    expect(isReferenceDuplicate('Ref-Space ', entriesWithSpaces)).toBe(true);
  });
});