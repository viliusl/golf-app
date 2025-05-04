import { calculateScore, calculateTotalScore } from '../scoring';

describe('calculateScore', () => {
  // Test case 1: Basic score calculation
  test('should calculate basic score', () => {
    // effectiveHandicap, strokes, isPutt
    expect(calculateScore(0, 4, false)).toBe(4); // 4 strokes, no handicap, no putt
    expect(calculateScore(1, 4, false)).toBe(3); // 4 strokes, 1 handicap, no putt
    expect(calculateScore(0, 4, true)).toBe(3);  // 4 strokes, no handicap, with putt
    expect(calculateScore(1, 4, true)).toBe(2);  // 4 strokes, 1 handicap, with putt
  });

  // Test case 2: Different stroke values
  test('should calculate scores with different stroke values', () => {
    // effectiveHandicap, strokes, isPutt, strokesValue
    expect(calculateScore(0, 4, false, 2)).toBe(8); // 4 strokes at 2 points each
    expect(calculateScore(1, 4, false, 2)).toBe(7); // With 1 handicap
    expect(calculateScore(0, 4, true, 2)).toBe(7);  // With one-putt
    expect(calculateScore(1, 4, true, 2)).toBe(6);  // With handicap and putt
  });

  // Test case 3: Different one-putt values
  test('should calculate scores with different putt values', () => {
    // effectiveHandicap, strokes, isPutt, strokesValue, onePuttValue
    expect(calculateScore(0, 4, true, 1, 2)).toBe(2); // One-putt worth 2 points
    expect(calculateScore(1, 4, true, 1, 2)).toBe(1); // With handicap
    expect(calculateScore(0, 4, true, 2, 3)).toBe(5); // 2 points per stroke, 3 for putt
  });
});

describe('calculateTotalScore', () => {
  // Test case 1: Sum of multiple holes
  test('should calculate total score across multiple holes', () => {
    const effectiveHandicaps = [1, 0, 2, 0];
    const strokes = [4, 3, 5, 4]; 
    const isPutts = [true, false, true, true];
    
    // Expected: 
    // Hole 1: 4 strokes - 1 handicap - 1 putt = 2
    // Hole 2: 3 strokes - 0 handicap - 0 putt = 3
    // Hole 3: 5 strokes - 2 handicap - 1 putt = 2
    // Hole 4: 4 strokes - 0 handicap - 1 putt = 3
    // Total: 10
    expect(calculateTotalScore(effectiveHandicaps, strokes, isPutts)).toBe(10);
  });

  // Test case 2: With custom values
  test('should calculate total score with custom values', () => {
    const effectiveHandicaps = [1, 0, 1];
    const strokes = [4, 3, 5]; 
    const isPutts = [true, false, true];
    const strokesValue = 2;
    const onePuttValue = 3;
    
    // Expected: 
    // Hole 1: (4*2) - 1 - 3 = 4
    // Hole 2: (3*2) - 0 - 0 = 6
    // Hole 3: (5*2) - 1 - 3 = 6
    // Total: 16
    expect(calculateTotalScore(
      effectiveHandicaps, 
      strokes, 
      isPutts, 
      strokesValue, 
      onePuttValue
    )).toBe(16);
  });

  // Test case 3: Error handling
  test('should throw error when arrays have different lengths', () => {
    expect(() => calculateTotalScore(
      [1, 2], 
      [3, 4, 5], 
      [true, false, true]
    )).toThrow('Input arrays must have the same length');
    
    expect(() => calculateTotalScore(
      [1, 2, 3], 
      [3, 4], 
      [true, false]
    )).toThrow('Input arrays must have the same length');
    
    expect(() => calculateTotalScore(
      [1, 2, 3], 
      [3, 4, 5], 
      [true, false]
    )).toThrow('Input arrays must have the same length');
  });
}); 