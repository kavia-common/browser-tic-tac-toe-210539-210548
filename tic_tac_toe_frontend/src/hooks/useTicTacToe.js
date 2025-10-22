import { useCallback, useMemo, useRef, useState } from 'react';
import { logEvent, getAuditLog } from '../utils/audit';
import { AppError } from '../utils/errors';
import { chooseBestMove } from '../utils/ai';

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
 * useTicTacToe manages board state, current player, win/draw detection, scores,
 * and optional AI opponent orchestration.
 *
 * Exposes:
 * - board: string[] size 9
 * - currentPlayer: 'X'|'O'
 * - winner: 'X'|'O'|null
 * - isDraw: boolean
 * - scores: {X:number,O:number,ties:number}
 * - makeMove(index:number, opts?: { reasonOverride?:string, metadata?:object, initiatedBy?:'HUMAN'|'AI' }): boolean
 * - resetGame(reason?:string): void
 * - computeWinner(board): function re-exported above
 * - mode: 'HUMAN_VS_HUMAN'|'HUMAN_VS_AI'
 * - setMode: (v) => void
 * - aiPlaysAs: 'X'|'O'
 * - setAiPlaysAs: (v) => void
 * - difficulty: { strategy:'quick'|'minimax', depth?:number }
 * - setDifficulty: (v) => void
 * - isAiThinking: boolean
 * - getAuditLog: () => any[]
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

  // AI related state
  const [mode, setMode] = useState('HUMAN_VS_HUMAN'); // or 'HUMAN_VS_AI'
  const [aiPlaysAs, setAiPlaysAs] = useState('O'); // default AI is O
  const [difficulty, setDifficulty] = useState({ strategy: 'quick', depth: 9 });
  const [isAiThinking, setIsAiThinking] = useState(false);

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
   *
   * @param {number} index
   * @param {{reasonOverride?:string, metadata?:object, initiatedBy?:'HUMAN'|'AI'}} [opts]
   */
  const makeMove = useCallback((index, opts = undefined) => {
    const before = { board: [...board], currentPlayer, scores: { ...scores } };
    if (winner || isDraw) return false;
    if (typeof index !== 'number' || index < 0 || index > 8) return false;
    if (board[index]) return false;

    const nextBoard = [...board];
    nextBoard[index] = currentPlayer;

    setBoard(nextBoard);

    const outcome = updateOutcome(nextBoard);

    // Toggle to next player if game continues
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
      reason: opts?.reasonOverride ?? `Player ${currentPlayer} moved at index ${index}`,
      userId: 'anonymous',
      metadata: { index, outcome, ...(opts?.metadata ?? {}) },
    });

    lastSnapshot.current = after;

    // If AI should move next, schedule it
    if (!outcome.winner && !outcome.isDraw && mode === 'HUMAN_VS_AI') {
      const nextToMove = after.currentPlayer;
      if (nextToMove === aiPlaysAs) {
        setIsAiThinking(true);
        const thinkDelay = 300;
        setTimeout(() => {
          try {
            const idx = chooseBestMove(
              nextBoard,
              aiPlaysAs,
              {
                strategy: difficulty?.strategy || 'quick',
                depth: difficulty?.depth ?? 9,
                computeWinner,
              }
            );
            if (idx >= 0) {
              // AI's move. makeMove uses currentPlayer; after previous call it should already be AI's turn.
              makeMove(idx, {
                reasonOverride: `AI (${aiPlaysAs}) moved at index ${idx}`,
                metadata: {
                  strategy: difficulty?.strategy || 'quick',
                  depth: difficulty?.depth ?? 9,
                  initiatedBy: 'AI'
                },
                initiatedBy: 'AI'
              });
            }
          } finally {
            setIsAiThinking(false);
          }
        }, thinkDelay);
      }
    }

    return true;
  }, [board, currentPlayer, scores, winner, isDraw, updateOutcome, mode, aiPlaysAs, difficulty]);

  /**
   * Reset the game to an empty board while keeping scores. Optionally provide reason.
   */
  const resetGame = useCallback((reason = 'Reset requested') => {
    const before = { board: [...board], currentPlayer, scores: { ...scores } };
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setIsDraw(false);
    setIsAiThinking(false);
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
      // AI additions
      mode,
      setMode,
      aiPlaysAs,
      setAiPlaysAs,
      difficulty,
      setDifficulty,
      isAiThinking,
    }),
    [board, currentPlayer, winner, isDraw, scores, makeMove, resetGame, mode, aiPlaysAs, difficulty, isAiThinking]
  );

  return api;
}
