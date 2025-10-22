import React from 'react';

/**
 * Square button on the board. Accessible and keyboard-friendly.
 * Disabled if occupied or game over.
 *
 * PUBLIC_INTERFACE
 * @param {object} props
 * @param {string|null} props.value - 'X' | 'O' | null
 * @param {number} props.index - index 0..8
 * @param {boolean} props.disabled - whether the square is disabled
 * @param {() => void} props.onClick - handler to play at this square
 * @param {string} props.ariaLabel - accessible label describing the action
 */
export default function Square({ value, index, disabled, onClick, ariaLabel }) {
  const isDisabled = disabled || Boolean(value);

  return (
    <button
      type="button"
      className={`square ${isDisabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      role="gridcell"
      aria-selected={Boolean(value)}
      data-index={index}
      tabIndex={0}
    >
      {value || ''}
    </button>
  );
}
