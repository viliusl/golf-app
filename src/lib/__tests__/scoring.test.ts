import { calculatePlayerScore, calculateScore, calculateTotalScore } from '../scoring';

describe('calculatePlayerScore', () => {
  // Test case 1: Basic score calculation
  test('should calculate basic score', () => {
    // effectiveHandicap, strokes, isPutt
    expect(calculatePlayerScore(0, 4, false)).toBe(4); // 4 strokes, no handicap, no putt
    expect(calculatePlayerScore(1, 4, false)).toBe(3); // 4 strokes, 1 handicap, no putt
    expect(calculatePlayerScore(0, 4, true)).toBe(3);  // 4 strokes, no handicap, with putt
    expect(calculatePlayerScore(1, 4, true)).toBe(2);  // 4 strokes, 1 handicap, with putt
  });

  // Test case 2: Different stroke values
  test('should calculate scores with different stroke values', () => {
    // effectiveHandicap, strokes, isPutt, par, strokesValue
    expect(calculatePlayerScore(0, 4, false, 0, 2)).toBe(8); // 4 strokes at 2 points each
    expect(calculatePlayerScore(1, 4, false, 0, 2)).toBe(7); // With 1 handicap
    expect(calculatePlayerScore(0, 4, true, 0, 2)).toBe(7);  // With one-putt
    expect(calculatePlayerScore(1, 4, true, 0, 2)).toBe(6);  // With handicap and putt
  });

  // Test case 3: Different one-putt values
  test('should calculate scores with different putt values', () => {
    // effectiveHandicap, strokes, isPutt, par, strokesValue, onePuttValue
    expect(calculatePlayerScore(0, 4, true, 0, 1, 2)).toBe(2); // One-putt worth 2 points
    expect(calculatePlayerScore(1, 4, true, 0, 1, 2)).toBe(1); // With handicap
    expect(calculatePlayerScore(0, 4, true, 0, 2, 3)).toBe(5); // 2 points per stroke, 3 for putt
  });

  // Test case 4: Par values
  test('should calculate scores with par values', () => {
    // effectiveHandicap, strokes, isPutt, par
    expect(calculatePlayerScore(0, 4, false, 4)).toBe(0);   // 4 strokes on par 4 = 0
    expect(calculatePlayerScore(0, 5, false, 4)).toBe(1);   // 5 strokes on par 4 = +1
    expect(calculatePlayerScore(0, 3, false, 4)).toBe(-1);  // 3 strokes on par 4 = -1
    expect(calculatePlayerScore(1, 4, false, 4)).toBe(-1);  // 4 strokes with 1 handicap on par 4 = -1
    expect(calculatePlayerScore(0, 4, true, 4)).toBe(-1);   // 4 strokes with putt on par 4 = -1
  });
});

describe('calculateScore', () => {
  // Test case 1: Basic two-player score calculation
  test('should calculate scores for both players and determine winner', () => {
    // Test player1 winning
    expect(calculateScore(
      1, 4, true,  // player1: 4 strokes - 1 handicap - 1 putt = 2
      0, 5, false, // player2: 5 strokes - 0 handicap - 0 putt = 5
      4             // par 4
    )).toEqual({
      player1Score: -2,  // 4 - 1 - 1 - 4 = -2
      player2Score: 1,   // 5 - 0 - 0 - 4 = 1
      winner: 'player1'
    });

    // Test player2 winning
    expect(calculateScore(
      0, 5, false, // player1: 5 strokes - 0 handicap - 0 putt = 5
      2, 4, true,  // player2: 4 strokes - 2 handicap - 1 putt = 1
      4             // par 4
    )).toEqual({
      player1Score: 1,   // 5 - 0 - 0 - 4 = 1
      player2Score: -3,  // 4 - 2 - 1 - 4 = -3
      winner: 'player2'
    });

    // Test tie
    expect(calculateScore(
      1, 4, false, // player1: 4 strokes - 1 handicap - 0 putt = 3
      0, 4, true,  // player2: 4 strokes - 0 handicap - 1 putt = 3
      4             // par 4
    )).toEqual({
      player1Score: -1,  // 4 - 1 - 0 - 4 = -1
      player2Score: -1,  // 4 - 0 - 1 - 4 = -1
      winner: 'tie'
    });
  });

  // Test case 2: Handle incomplete scores
  test('should handle incomplete scores', () => {
    // Player 1 has no score yet
    expect(calculateScore(
      0, 0, false, // player1: no score yet
      1, 4, true,  // player2: 4 strokes - 1 handicap - 1 putt = 2
      4             // par 4
    )).toEqual({
      player1Score: -4,   // 0 - 0 - 0 - 4 = -4 (but not counting for winner)
      player2Score: -2,   // 4 - 1 - 1 - 4 = -2
      winner: 'tie'
    });

    // Player 2 has no score yet
    expect(calculateScore(
      1, 3, true,  // player1: 3 strokes - 1 handicap - 1 putt = 1
      0, 0, false, // player2: no score yet
      4             // par 4
    )).toEqual({
      player1Score: -3,   // 3 - 1 - 1 - 4 = -3
      player2Score: -4,   // 0 - 0 - 0 - 4 = -4 (but not counting for winner)
      winner: 'tie'
    });
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
      [],
      strokesValue, 
      onePuttValue
    )).toBe(16);
  });

  // Test case 3: With par values
  test('should calculate total score with par values', () => {
    const effectiveHandicaps = [1, 0, 2];
    const strokes = [4, 3, 5];
    const isPutts = [true, false, true];
    const pars = [4, 3, 5];
    
    // Expected:
    // Hole 1: 4 strokes - 1 handicap - 1 putt - 4 par = -2
    // Hole 2: 3 strokes - 0 handicap - 0 putt - 3 par = 0
    // Hole 3: 5 strokes - 2 handicap - 1 putt - 5 par = -3
    // Total: -5
    expect(calculateTotalScore(
      effectiveHandicaps,
      strokes,
      isPutts,
      pars
    )).toBe(-5);
  });

  // Test case 4: Error handling
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

    expect(() => calculateTotalScore(
      [1, 2, 3],
      [3, 4, 5],
      [true, true, true],
      [4, 4] // Different length pars array
    )).toThrow('Input arrays must have the same length');
  });
}); 