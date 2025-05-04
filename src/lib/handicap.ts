/**
 * Calculates the effective handicap strokes for two players on a specific hole.
 * 
 * @param player1Handicap - The handicap of player 1
 * @param player2Handicap - The handicap of player 2
 * @param holeHandicapIndex - The handicap index of the hole (typically 1-18)
 * @returns A tuple containing [player1EffectiveHandicap, player2EffectiveHandicap]
 */
export const calculateEffectiveHandicap = (
  player1Handicap: number, 
  player2Handicap: number, 
  holeHandicapIndex: number
): [number, number] => {
  const handicapDiff = player1Handicap - player2Handicap;

  if (handicapDiff == 0) {
    return [0, 0];
  }

  let handicapDiffAbs = Math.abs(handicapDiff);
  let handicapPerHole = Array(18).fill(0);
  let lasVisitedHole = 0;

  while (handicapDiffAbs > 0) {
    handicapPerHole[lasVisitedHole] = 1;
    lasVisitedHole = (lasVisitedHole + 1) % 18; // Wrap around to ensure we don't exceed array bounds
    handicapDiffAbs = handicapDiffAbs - 1;
  }

  if (player1Handicap > player2Handicap) {
    return [handicapPerHole[holeHandicapIndex - 1], 0]; // Adjust for 0-based array indexing
  } else {
    return [0, handicapPerHole[holeHandicapIndex - 1]]; // Adjust for 0-based array indexing
  }
}; 