//
// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-AI-001
// User Story: As a player, I want to play against an AI so I can practice solo.
// Acceptance Criteria:
//  - AI selectable via Human vs AI mode
//  - AI plays as O by default and responds automatically
//  - AI strategies: quick heuristic and minimax with optional depth
//  - Audit logs include AI moves with metadata (strategy, depth)
//  - No backend required; frontend-only
// GxP Impact: NO - Demo app; Audit is illustrative (frontend-only).
// Risk Level: LOW
// Validation Protocol: VP-AI-SEL (frontend unit/integration tests to verify behavior)
// ============================================================================
//
// ============================================================================
// IMPORTS AND DEPENDENCIES
// ============================================================================
// None: pure module, expects computeWinner to be injected from the hook
// ============================================================================

/**
 * PUBLIC_INTERFACE
 * Choose the next move for the AI using either a quick heuristic or minimax.
 *
 * @param {Array<('X'|'O'|null)>} board - Current 3x3 board as a flat array length 9
 * @param {'X'|'O'} aiPlayer - Which mark the AI controls
 * @param {{
 *   strategy: 'quick'|'minimax',
 *   depth?: number,
 *   computeWinner: (b:Array<('X'|'O'|null)>) => ('X'|'O'|null)
 * }} opts
 * @returns {number} index 0..8 or -1 if none available
 */
export function chooseBestMove(board, aiPlayer, opts) {
  const { strategy, depth = 9, computeWinner } = opts || {};
  if (!Array.isArray(board) || board.length !== 9) return -1;
  if (strategy === 'quick') {
    return quickHeuristic(board);
  }
  return minimaxDriver(board, aiPlayer, depth, computeWinner);
}

/**
 * Quick heuristic: center -> corners -> edges.
 * @param {Array<('X'|'O'|null)>} board
 */
function quickHeuristic(board) {
  const center = 4;
  const corners = [0, 2, 6, 8];
  const edges = [1, 3, 5, 7];

  if (!board[center]) return center;
  for (const i of corners) if (!board[i]) return i;
  for (const i of edges) if (!board[i]) return i;
  return -1;
}

/**
 * Minimax driver with optional depth limit and slight bias for faster wins/slower losses.
 * @param {Array<('X'|'O'|null)>} board
 * @param {'X'|'O'} aiPlayer
 * @param {number} maxDepth
 * @param {(b:Array<('X'|'O'|null)>) => ('X'|'O'|null)} computeWinner
 */
function minimaxDriver(board, aiPlayer, maxDepth, computeWinner) {
  const human = aiPlayer === 'X' ? 'O' : 'X';

  function availableMoves(b) {
    const out = [];
    for (let i = 0; i < 9; i++) if (!b[i]) out.push(i);
    return out;
  }

  function terminalScore(b, depthLeft) {
    const w = computeWinner(b);
    if (w === aiPlayer) return 10 + depthLeft;   // prefer faster wins
    if (w === human) return -10 - depthLeft;     // penalize faster losses
    if (b.every(Boolean)) return 0;              // draw
    return null;                                 // non-terminal
  }

  /**
   * Minimax recursion.
   * @param {Array<('X'|'O'|null)>} b
   * @param {'X'|'O'} player
   * @param {number} depthLeft
   * @returns {{score:number, move:number}}
   */
  function minimax(b, player, depthLeft) {
    const t = terminalScore(b, depthLeft);
    if (t !== null || depthLeft === 0) {
      return { score: t ?? 0, move: -1 };
    }

    const moves = availableMoves(b);
    let best = {
      score: player === aiPlayer ? -Infinity : Infinity,
      move: -1,
    };

    for (const m of moves) {
      b[m] = player;
      const res = minimax(b, player === 'X' ? 'O' : 'X', depthLeft - 1);
      b[m] = null;

      if (player === aiPlayer) {
        if (res.score > best.score) best = { score: res.score, move: m };
      } else {
        if (res.score < best.score) best = { score: res.score, move: m };
      }
    }

    return best;
  }

  const result = minimax([...board], aiPlayer, Math.max(1, Math.min(9, maxDepth || 9)));
  return result.move;
}
