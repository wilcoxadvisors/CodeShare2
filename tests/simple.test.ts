/**
 * Simple test to diagnose Jest configuration issues
 */

describe('Simple Test Suite', () => {
  it('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
  });

  it('should validate string operations', () => {
    expect('hello'.toUpperCase()).toBe('HELLO');
  });

  it('should handle array operations', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr.includes(2)).toBe(true);
  });
});