import { calculatePlayerScore, calculateScore, calculateTotalScore } from '../scoring';

describe('calculatePlayerScore', () => {
  // Test case 1: Basic score calculation with new scoring system
  test('should calculate basic score', () => {
    // No special bonuses
    expect(calculatePlayerScore(0, 4, false, 4)).toBe(4); // Par, no putt
    expect(calculatePlayerScore(1, 4, false, 4)).toBe(4); // Effective par (with handicap), no putt
    
    // One-putt bonus
    expect(calculatePlayerScore(0, 4, true, 4)).toBe(8);  // Par with a one-putt
    
    // Birdie bonus
    expect(calculatePlayerScore(0, 3, false, 4)).toBe(8); // Birdie, no putt
    expect(calculatePlayerScore(0, 3, true, 4)).toBe(12); // Birdie with one-putt
    
    // Eagle bonus
    expect(calculatePlayerScore(0, 2, false, 4)).toBe(16); // Eagle, no putt
    expect(calculatePlayerScore(0, 2, true, 4)).toBe(20);  // Eagle with one-putt
    
    // Albatross (double eagle) bonus
    expect(calculatePlayerScore(0, 1, false, 4)).toBe(64); // Albatross, no putt
    
    // Hole-in-one bonus
    expect(calculatePlayerScore(0, 1, false, 3)).toBe(64); // Hole in one
    expect(calculatePlayerScore(0, 1, true, 3)).toBe(68);  // Hole in one with one-putt (impossible but testing logic)
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
    // Test player1 winning with better strokes
    expect(calculateScore(
      0, 3, true,  // player1: birdie with one-putt = 12 points + 16 winner bonus = 28
      0, 4, false, // player2: par = 4 points
      4             // par 4
    )).toEqual({
      player1Score: 28,
      player2Score: 4,
      winner: 'player1'
    });

    // Test player2 winning with handicap advantage
    expect(calculateScore(
      0, 5, false, // player1: bogey = 0 points
      1, 5, true,  // player2: effective par with one-putt = 8 points + 16 winner bonus = 24
      4             // par 4
    )).toEqual({
      player1Score: 0,
      player2Score: 24,
      winner: 'player2'
    });

    // Test tie
    expect(calculateScore(
      0, 4, false, // player1: par = 4 points
      0, 4, false, // player2: par = 4 points
      4             // par 4
    )).toEqual({
      player1Score: 4,
      player2Score: 4,
      winner: 'tie'
    });
  });

  // Test case 2: Handle incomplete scores
  test('should handle incomplete scores', () => {
    // Player 1 has no score yet
    expect(calculateScore(
      0, 0, false, // player1: no score yet
      0, 4, true,  // player2: par with one-putt = 8 points
      4             // par 4
    )).toEqual({
      player1Score: 0,
      player2Score: 8,
      winner: 'tie'
    });

    // Player 2 has no score yet
    expect(calculateScore(
      0, 3, true,  // player1: birdie with one-putt = 12 points
      0, 0, false, // player2: no score yet
      4             // par 4
    )).toEqual({
      player1Score: 12,
      player2Score: 0,
      winner: 'tie'
    });
  });
});

describe('calculateTotalScore', () => {
  // Test case 1: Sum of scores with the new scoring system
  test('should calculate total score across multiple holes', () => {
    const effectiveHandicaps = [1, 0, 0];
    const strokes = [4, 3, 2]; 
    const isPutts = [true, false, true];
    const pars = [4, 4, 3];
    
    // Expected: 
    // Hole 1: 4 strokes - 1 handicap = par with one-putt = 8 points
    // Hole 2: 3 strokes = birdie = 8 points
    // Hole 3: 2 strokes = eagle with one-putt = 20 points
    // Total: 36 points
    expect(calculateTotalScore(effectiveHandicaps, strokes, isPutts, pars)).toBe(36);
  });

  // Test case 2: Error handling
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