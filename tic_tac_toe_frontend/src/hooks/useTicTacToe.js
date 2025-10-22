import { useCallback, useMemo, useRef, useState } from 'react';
import { logEvent, getAuditLog } from '../utils/audit';
import { AppError } from '../utils/errors';

/**
 * Determine winner of a 3x3 Tic Tac Toe board.
 *
 * PUBLIC_INTERFACE
 * @param {Array<string|null>} board - Array length 9 with 'X','O', or null
 * @returns {'X'|'O'|null}
 */
export function computeWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6]          // diagonals
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

/**
 * PUBLIC_INTERFACE
 * useTicTacToe manages board state, current player, win/draw detection, and scores.
 * Validates inputs and ignores invalid moves gracefully.
 *
 * Exposes:
 * - board: string[] size 9
 * - currentPlayer: 'X'|'O'
 * - winner: 'X'|'O'|null
 * - isDraw: boolean
 * - scores: {X:number,O:number,ties:number}
 * - makeMove(index:number): boolean (true if move applied)
 * - resetGame(reason?:string): void
 * - computeWinner(board): function re-exported above
 */
export function useTicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [winner, setWinner] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const [scores, setScores] = useState(() => {
    // Restore from localStorage if present
    try {
      const persisted = localStorage.getItem('ttt_scores');
      return persisted ? JSON.parse(persisted) : { X: 0, O: 0, ties: 0 };
    } catch {
      return { X: 0, O: 0, ties: 0 };
    }
  });

  const lastSnapshot = useRef({ board, currentPlayer, scores });

  const persistScores = (s) => {
    try {
      localStorage.setItem('ttt_scores', JSON.stringify(s));
    } catch {
      // ignore persistence issues
    }
  };

  const updateOutcome = useCallback((nextBoard) => {
    const w = computeWinner(nextBoard);
    if (w) {
      setWinner(w);
      setIsDraw(false);
      setScores((prev) => {
        const updated = { ...prev, [w]: prev[w] + 1 };
        persistScores(updated);
        return updated;
      });
      return { winner: w, isDraw: false };
    }
    if (nextBoard.every(Boolean)) {
      setIsDraw(true);
      setWinner(null);
      setScores((prev) => {
        const updated = { ...prev, ties: prev.ties + 1 };
        persistScores(updated);
        return updated;
      });
      return { winner: null, isDraw: true };
    }
    setWinner(null);
    setIsDraw(false);
    return { winner: null, isDraw: false };
  }, []);

  /**
   * Attempt a move. Validate index and cell emptiness. No-op if invalid or game over.
   * Returns true if the move was applied.
   */
  const makeMove = useCallback((index) => {
    const before = { board: [...board], currentPlayer, scores: { ...scores } };
    if (winner || isDraw) return false;
    if (typeof index !== 'number' || index < 0 || index > 8) return false;
    if (board[index]) return false;

    const nextBoard = [...board];
    nextBoard[index] = currentPlayer;

    setBoard(nextBoard);

    const outcome = updateOutcome(nextBoard);

    if (!outcome.winner && !outcome.isDraw) {
      const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
      setCurrentPlayer(nextPlayer);
    }

    const after = {
      board: nextBoard,
      currentPlayer: outcome.winner || outcome.isDraw
        ? currentPlayer // game ended; no turn switch for after snapshot
        : (currentPlayer === 'X' ? 'O' : 'X'),
      scores: { ...scores },
    };

    logEvent({
      action: 'MOVE',
      before,
      after,
      reason: `Player ${currentPlayer} moved at index ${index}`,
      userId: 'anonymous',
      metadata: { index, outcome },
    });

    lastSnapshot.current = after;
    return true;
  }, [board, currentPlayer, scores, winner, isDraw, updateOutcome]);

  /**
   * Reset the game to an empty board while keeping scores. Optionally provide reason.
   */
  const resetGame = useCallback((reason = 'Reset requested') => {
    const before = { board: [...board], currentPlayer, scores: { ...scores } };
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setIsDraw(false);
    const after = { board: Array(9).fill(null), currentPlayer: 'X', scores: { ...scores } };

    logEvent({
      action: 'RESET',
      before,
      after,
      reason,
      userId: 'anonymous',
    });

    lastSnapshot.current = after;
  }, [board, currentPlayer, scores]);

  const api = useMemo(
    () => ({
      board,
      currentPlayer,
      winner,
      isDraw,
      scores,
      makeMove,
      resetGame,
      computeWinner,
      getAuditLog,
    }),
    [board, currentPlayer, winner, isDraw, scores, makeMove, resetGame]
  );

  return api;
}
