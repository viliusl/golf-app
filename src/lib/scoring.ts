/**
 * Calculates a single player's score based on strokes and one-putt values
 * 
 * @param strokes - The number of strokes taken
 * @param isPutt - Whether a one-putt was made (true/false)
 * @param par - The par value for the hole (default 0, not affecting calculation if not provided)
 * @returns The calculated score
 */
export const calculatePlayerScore = (
  strokes: number,
  isPutt: boolean,
  par: number = 0,
): number => {
  let score = 0;

  if ((strokes >= 10) || (strokes == 0)) {
    return 0;
  }

  if (isPutt) {
    score += 4;
  }

  if (strokes == 1) {
    score += 64;
  } else if (par - strokes == 0) {
    score += 4;
  } else if (par - strokes == 1) {
    score += 8;
  } else if (par - strokes == 2) {
    score += 16;
  } else if (par - strokes == 3) {
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
    player1Strokes, 
    player1Putt, 
    par, 
  );
  
  let player2Score = calculatePlayerScore(
    player2Strokes, 
    player2Putt, 
    par, 
  );

  // Determine winner based on calculated scores
  let winner: 'player1' | 'player2' | 'tie';
  const player1EffStrokes = player1Strokes - player1EffHcp;
  const player2EffStrokes = player2Strokes - player2EffHcp;

  if (player1Strokes >= 10 && player2Strokes >= 10) {
    winner = 'tie';
  } else if (player1EffStrokes < player2EffStrokes) {
    player1Score += 16;
    winner = 'player1';
  } else if (player1EffStrokes > player2EffStrokes) {
    player2Score += 16;
    winner = 'player2';
  } else {
    winner = 'tie';
    player1Score += 8;
    player2Score += 8;
  }
  
  return { player1Score, player2Score, winner };
};