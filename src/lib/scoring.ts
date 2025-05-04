/**
 * Calculates the score based on effective handicap, strokes, and one-putt values
 * 
 * @param effectiveHandicap - The effective handicap strokes for the hole
 * @param strokes - The number of strokes taken
 * @param isPutt - Whether a one-putt was made (true/false)
 * @param par - The par value for the hole (default 0, not affecting calculation if not provided)
 * @param strokesValue - Value of each stroke (default 1)
 * @param onePuttValue - Value of a one-putt (default 1)
 * @returns The calculated score
 */
export const calculateScore = (
  effectiveHandicap: number,
  strokes: number,
  isPutt: boolean,
  par: number = 0,
  strokesValue: number = 1,
  onePuttValue: number = 1
): number => {
  // Base score is strokes times the stroke value (usually 1)
  const strokesScore = strokes * strokesValue;
  
  // Subtract effective handicap
  const handicapAdjustedScore = strokesScore - effectiveHandicap;
  
  // Subtract one-putt value if applicable
  const finalScore = isPutt ? handicapAdjustedScore - onePuttValue : handicapAdjustedScore;
  
  // Apply par adjustment if par is provided (optional)
  const parAdjustedScore = par > 0 ? finalScore - par : finalScore;
  
  return parAdjustedScore;
};

/**
 * Calculates the score for all holes
 * 
 * @param effectiveHandicaps - Array of effective handicap strokes for each hole
 * @param strokes - Array of strokes taken for each hole
 * @param isPutts - Array of boolean values indicating if one-putts were made
 * @param pars - Array of par values for each hole (optional)
 * @param strokesValue - Value of each stroke (default 1)
 * @param onePuttValue - Value of a one-putt (default 1)
 * @returns The total calculated score
 */
export const calculateTotalScore = (
  effectiveHandicaps: number[],
  strokes: number[],
  isPutts: boolean[],
  pars: number[] = [],
  strokesValue: number = 1,
  onePuttValue: number = 1
): number => {
  if (
    effectiveHandicaps.length !== strokes.length || 
    strokes.length !== isPutts.length ||
    (pars.length > 0 && pars.length !== strokes.length)
  ) {
    throw new Error('Input arrays must have the same length');
  }

  let totalScore = 0;
  
  for (let i = 0; i < strokes.length; i++) {
    totalScore += calculateScore(
      effectiveHandicaps[i],
      strokes[i],
      isPutts[i],
      pars.length > 0 ? pars[i] : 0,
      strokesValue,
      onePuttValue
    );
  }
  
  return totalScore;
}; 