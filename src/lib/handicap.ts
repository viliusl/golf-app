/**
 * Calculates the playing handicap based on handicap index, course data, and allowance.
 * 
 * Formula:
 * - Course Handicap = HI × (Slope / 113) + (Course Rating - Par)
 * - Playing Handicap = Course Handicap × Handicap Allowance
 * 
 * @param handicapIndex - The player's handicap index (HI)
 * @param slope - The slope rating of the tee being played
 * @param courseRating - The course rating (CR) of the tee being played
 * @param par - The par of the course
 * @param handicapAllowance - The handicap allowance percentage (e.g., 95 for 95%)
 * @returns The playing handicap rounded to nearest whole number
 */
export function calculatePlayingHandicap(
  handicapIndex: number,
  slope: number,
  courseRating: number,
  par: number,
  handicapAllowance: number
): number {
  const courseHandicap = handicapIndex * (slope / 113) + (courseRating - par);
  const playingHandicap = courseHandicap * (handicapAllowance / 100);
  return Math.round(playingHandicap);
}

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