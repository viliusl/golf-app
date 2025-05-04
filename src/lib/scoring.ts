/**
 * Calculates a single player's score based on effective handicap, strokes, and one-putt values
 * 
 * @param effectiveHandicap - The effective handicap strokes for the hole
 * @param strokes - The number of strokes taken
 * @param isPutt - Whether a one-putt was made (true/false)
 * @param par - The par value for the hole (default 0, not affecting calculation if not provided)
 * @param strokesValue - Value of each stroke (default 1)
 * @param onePuttValue - Value of a one-putt (default 1)
 * @returns The calculated score
 */
export const calculatePlayerScore = (
  effectiveHandicap: number,
  strokes: number,
  isPutt: boolean,
  par: number = 0,
): number => {
  let score = 0;
  let effStroke = strokes - effectiveHandicap;

  if (isPutt) {
    score += 4;
  }

  if (strokes == 1) {
    score += 64;
  }
  
  if (par - effStroke == 0) {
    score += 4;
  } else if (par - effStroke == 1) {
    score += 8;
  } else if (par - effStroke == 2) {
    score += 16;
  } else if (par - effStroke == 3) {
    score += 64;
  }

  return score;
};

/**
 * Calculates scores for both players and determines the hole winner
 * 
 * @param player1EffHcp - Player 1's effective handicap for the hole
 * @param player1Strokes - Player 1's strokes for the hole
 * @param player1Putt - Whether player 1 made a one-putt (true/false)
 * @param player2EffHcp - Player 2's effective handicap for the hole
 * @param player2Strokes - Player 2's strokes for the hole
 * @param player2Putt - Whether player 2 made a one-putt (true/false)
 * @param par - The par value for the hole
 * @param strokesValue - Value of each stroke (default 1)
 * @param onePuttValue - Value of a one-putt (default 1)
 * @returns An object containing player scores and the winner
 */
export const calculateScore = (
  player1EffHcp: number,
  player1Strokes: number,
  player1Putt: boolean,
  player2EffHcp: number,
  player2Strokes: number,
  player2Putt: boolean,
  par: number,
): { player1Score: number; player2Score: number; winner: 'player1' | 'player2' | 'tie' } => {
  
  // Calculate individual scores
  let player1Score = calculatePlayerScore(
    player1EffHcp, 
    player1Strokes, 
    player1Putt, 
    par, 
  );
  
  let player2Score = calculatePlayerScore(
    player2EffHcp, 
    player2Strokes, 
    player2Putt, 
    par, 
  );

  // Determine winner based on calculated scores
  let winner: 'player1' | 'player2' | 'tie';

  // Skip determination if either player hasn't recorded strokes
  if (player1Strokes === 0 || player2Strokes === 0) {
    winner = 'tie';
  } else if (player1Score > player2Score) {
    winner = 'player1';
  } else if (player2Score > player1Score) {
    winner = 'player2';
  } else {
    winner = 'tie';
  }
  
  if (winner === 'player1') {
    player1Score += 16;
  } else if (winner === 'player2') {
    player2Score += 16;
  }

  return { player1Score, player2Score, winner };
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
    totalScore += calculatePlayerScore(
      effectiveHandicaps[i],
      strokes[i],
      isPutts[i],
      pars.length > 0 ? pars[i] : 0,
    );
  }
  
  return totalScore;
}; 