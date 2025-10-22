import React, { useEffect, useMemo, useRef } from 'react';
import Square from './Square';

/**
 * Compute row and column (1-based) from index (0..8).
 * @param {number} index
 * @returns {{row:number,col:number}}
 */
function rc(index) {
  return { row: Math.floor(index / 3) + 1, col: (index % 3) + 1 };
}

/**
 * PUBLIC_INTERFACE
 * Board renders a 3x3 grid with keyboard navigation and focus management.
 *
 * @param {object} props
 * @param {Array<string|null>} props.board - current board state
 * @param {'X'|'O'} props.currentPlayer - player to move
 * @param {'X'|'O'|null} props.winner - winner if any
 * @param {boolean} props.isDraw - whether the game is a draw
 * @param {(index:number)=>void} props.onPlay - callback to attempt a move
 */
export default function Board({ board, currentPlayer, winner, isDraw, onPlay, disabled: disabledProp = undefined }) {
  const containerRef = useRef(null);
  const disabled = typeof disabledProp === 'boolean' ? disabledProp : (Boolean(winner) || isDraw);

  const squaresRefs = useRef(Array.from({ length: 9 }, () => React.createRef()));

  // Place focus on first empty cell on mount/update for accessibility
  useEffect(() => {
    const firstEmpty = board.findIndex((v) => !v);
    if (firstEmpty >= 0 && squaresRefs.current[firstEmpty]?.current) {
      squaresRefs.current[firstEmpty].current.focus();
    }
  }, [board]);

  const handleKeyDown = (e) => {
    const target = e.target;
    const idxAttr = target?.getAttribute?.('data-index');
    const currentIndex = idxAttr != null ? parseInt(idxAttr, 10) : -1;
    if (currentIndex < 0) return;

    const row = Math.floor(currentIndex / 3);
    const col = currentIndex % 3;

    let nextIndex = currentIndex;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = (row - 1 >= 0) ? (currentIndex - 3) : currentIndex;
        break;
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = (row + 1 <= 2) ? (currentIndex + 3) : currentIndex;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = (col - 1 >= 0) ? (currentIndex - 1) : currentIndex;
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextIndex = (col + 1 <= 2) ? (currentIndex + 1) : currentIndex;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!disabled) onPlay(currentIndex);
        return;
      default:
        return;
    }

    const ref = squaresRefs.current[nextIndex];
    if (ref && ref.current) ref.current.focus();
  };

  const gridAriaLabel = useMemo(() => {
    if (winner) return `Board, Game Over. Player ${winner} wins.`;
    if (isDraw) return 'Board, Game Over. Draw.';
    if (disabled && !winner && !isDraw) return `Board, Player ${currentPlayer}'s turn. Input temporarily disabled.`;
    return `Board, Player ${currentPlayer}'s turn`;
  }, [winner, isDraw, currentPlayer, disabled]);

  return (
    <div className="board-surface">
      <div
        className="board"
        role="grid"
        aria-label={gridAriaLabel}
        aria-readonly={disabled}
        ref={containerRef}
        onKeyDown={handleKeyDown}
      >
        {board.map((val, i) => {
          const { row, col } = rc(i);
          const ariaLabel = val
            ? `Cell row ${row} column ${col} contains ${val}`
            : `Place ${currentPlayer} on row ${row} column ${col}`;
          return (
            <Square
              key={i}
              index={i}
              value={val}
              disabled={disabled}
              onClick={() => !disabled && onPlay(i)}
              ariaLabel={ariaLabel}
              ref={squaresRefs.current[i]}
            />
          );
        })}
      </div>
    </div>
  );
}
