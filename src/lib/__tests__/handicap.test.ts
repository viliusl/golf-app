import { calculateEffectiveHandicap } from '../handicap';

describe('calculateEffectiveHandicap', () => {
  // Test case 1: Equal handicaps - no strokes given
  test('should return [0, 0] when players have equal handicaps', () => {
    expect(calculateEffectiveHandicap(10, 10, 5)).toEqual([0, 0]);
    expect(calculateEffectiveHandicap(5, 5, 1)).toEqual([0, 0]);
    expect(calculateEffectiveHandicap(18, 18, 18)).toEqual([0, 0]);
  });

  // Test case 2: Player 1 has higher handicap
  test('should give strokes to player 1 when their handicap is higher', () => {
    // Player 1 has 5 higher handicap than player 2
    // For hole 1, which is typically harder, player 1 should get a stroke
    expect(calculateEffectiveHandicap(15, 10, 1)).toEqual([1, 0]);
    
    // For holes within the handicap difference, player 1 should get a stroke
    expect(calculateEffectiveHandicap(15, 10, 3)).toEqual([1, 0]);
    
    // For holes beyond the handicap difference, player 1 should not get a stroke
    expect(calculateEffectiveHandicap(15, 10, 6)).toEqual([0, 0]);
  });

  // Test case 3: Player 2 has higher handicap
  test('should give strokes to player 2 when their handicap is higher', () => {
    // Player 2 has 5 higher handicap than player 1
    // For hole 1, which is typically harder, player 2 should get a stroke
    expect(calculateEffectiveHandicap(10, 15, 1)).toEqual([0, 1]);
    
    // For holes within the handicap difference, player 2 should get a stroke
    expect(calculateEffectiveHandicap(10, 15, 4)).toEqual([0, 1]);
    
    // For holes beyond the handicap difference, player 2 should not get a stroke
    expect(calculateEffectiveHandicap(10, 15, 8)).toEqual([0, 0]);
  });

  // Test case 4: Large handicap difference
  test('should correctly distribute strokes when there is a large handicap difference', () => {
    expect(calculateEffectiveHandicap(24, 2, 1)).toEqual([2, 0]);
    expect(calculateEffectiveHandicap(24, 2, 4)).toEqual([2, 0]);
    expect(calculateEffectiveHandicap(24, 2, 5)).toEqual([1, 0]);
    expect(calculateEffectiveHandicap(24, 2, 18)).toEqual([1, 0]);

    expect(calculateEffectiveHandicap(180, 0, 18)).toEqual([10, 0]);
});

  // Test case 6: Zero handicap
  test('should handle zero handicap correctly', () => {
    // Player 2 has zero handicap, while player 1 has some handicap
    expect(calculateEffectiveHandicap(5, 0, 1)).toEqual([1, 0]);
    expect(calculateEffectiveHandicap(5, 0, 5)).toEqual([1, 0]);
    expect(calculateEffectiveHandicap(5, 0, 6)).toEqual([0, 0]);
    
    // Player 1 has zero handicap, while player 2 has some handicap
    expect(calculateEffectiveHandicap(0, 5, 1)).toEqual([0, 1]);
    expect(calculateEffectiveHandicap(0, 5, 5)).toEqual([0, 1]);
    expect(calculateEffectiveHandicap(0, 5, 6)).toEqual([0, 0]);
  });
}); 