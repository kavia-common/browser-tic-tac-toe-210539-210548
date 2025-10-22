import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import './index.css';
import Board from './components/Board';
import Scoreboard from './components/Scoreboard';
import Controls from './components/Controls';
import { useTicTacToe } from './hooks/useTicTacToe';
import { logEvent } from './utils/audit';
import { AppError, safeGuard } from './utils/errors';

/**
 * Root application component wiring game state, controls, and theming.
 * Includes accessible status banner and Ocean Professional styling.
 */
// PUBLIC_INTERFACE
function App() {
  const {
    board,
    currentPlayer,
    winner,
    isDraw,
    scores,
    makeMove,
    resetGame,
    // AI extensions
    mode,
    setMode,
    aiPlaysAs,
    setAiPlaysAs,
    difficulty,
    setDifficulty,
    isAiThinking,
  } = useTicTacToe();

  const [theme, setTheme] = useState('light');
  const statusRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Announce status updates for screen readers via aria-live
  const statusMessage = useMemo(() => {
    if (winner) return `Player ${winner} wins!`;
    if (isDraw) return 'Draw! No more moves.';
    if (mode === 'HUMAN_VS_AI') {
      const who = currentPlayer === aiPlaysAs ? 'AI' : 'Human';
      if (isAiThinking && who === 'AI') return `AI is thinking…`;
      return `Player ${currentPlayer}'s turn (${who})`;
    }
    return `Player ${currentPlayer}'s turn`;
  }, [winner, isDraw, currentPlayer, mode, aiPlaysAs, isAiThinking]);

  useEffect(() => {
    if (statusRef.current) {
      statusRef.current.textContent = statusMessage;
    }
  }, [statusMessage]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleRestart = () =>
    safeGuard(() => {
      resetGame('User requested restart');
    }, 'Unexpected error when restarting the game');

  // Initial audit START on first render
  useEffect(() => {
    logEvent({
      action: 'START',
      before: null,
      after: { board, currentPlayer, scores },
      reason: 'App initialized',
      userId: 'anonymous',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="branding">
          <h1 className="app-title" aria-label="Tic Tac Toe Game">
            Tic Tac Toe
          </h1>
          <p className="app-subtitle">Ocean Professional Edition</p>
        </div>

        <button
          className="theme-toggle ocean-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </header>

      <main className="app-main">
        <section
          className="status-banner"
          aria-live="polite"
          aria-atomic="true"
          ref={statusRef}
          data-testid="status-banner"
        >
          {statusMessage}
        </section>

        <Scoreboard scores={scores} />

        <Board
          board={board}
          currentPlayer={currentPlayer}
          winner={winner}
          isDraw={isDraw}
          disabled={Boolean(winner) || isDraw || isAiThinking}
          onPlay={(index) =>
            safeGuard(() => {
              const moved = makeMove(index);
              if (!moved) {
                // Invalid move is gracefully ignored, no error thrown.
                return;
              }
            }, 'Unexpected error when making a move')
          }
        />

        <Controls
          mode={mode}
          setMode={setMode}
          aiPlaysAs={aiPlaysAs}
          setAiPlaysAs={setAiPlaysAs}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          onRestart={handleRestart}
          isAiThinking={isAiThinking}
        />
      </main>

      <footer className="app-footer">
        <p className="footnote">
          Keyboard: Arrow keys to move, Enter/Space to place. Accessible grid and cells.
        </p>
      </footer>
    </div>
  );
}

export default App;
