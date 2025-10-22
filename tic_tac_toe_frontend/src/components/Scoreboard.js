import React from 'react';

/**
 * PUBLIC_INTERFACE
 * Scoreboard shows running totals for X, O, and Ties.
 *
 * @param {{X:number, O:number, ties:number}} scores
 */
export default function Scoreboard({ scores }) {
  return (
    <div className="scoreboard" role="group" aria-label="Scoreboard">
      <div className="score-card" aria-label={`Score for X is ${scores.X}`}>
        <div className="label">Player X</div>
        <div className="value" data-testid="score-x">{scores.X}</div>
      </div>
      <div className="score-card" aria-label={`Score for O is ${scores.O}`}>
        <div className="label">Player O</div>
        <div className="value" data-testid="score-o">{scores.O}</div>
      </div>
      <div className="score-card" aria-label={`Ties are ${scores.ties}`}>
        <div className="label">Ties</div>
        <div className="value" data-testid="score-ties">{scores.ties}</div>
      </div>
    </div>
  );
}
