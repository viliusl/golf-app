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
  let handicapPerHole = Array(18).fill(0);

  if (handicapDiff == 0) {
    return [0, 0];
  }

  let handicapDiffAbs = Math.abs(handicapDiff);
  let lastVisitedHole = 0;
  while (handicapDiffAbs > 0) {
    handicapPerHole[lastVisitedHole] =  handicapPerHole[lastVisitedHole] + 1;
    lastVisitedHole = lastVisitedHole == 17 ? 0 : lastVisitedHole + 1;
    handicapDiffAbs = handicapDiffAbs - 1;
  }

  // Determine which player gets the strokes
  if (player1Handicap > player2Handicap) {
    return [handicapPerHole[holeHandicapIndex - 1], 0]; // Adjust for 0-based array indexing
  } else {
    return [0, handicapPerHole[holeHandicapIndex - 1]]; // Adjust for 0-based array indexing
  }
}; 