/**
 * Unit tests for App and key interactions using React Testing Library.
 * Covers initial render, accessibility roles/labels/live region, keyboard navigation basics,
 * invalid move handling, and audit trail presence on init.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { getAuditLog } from './utils/audit';

function setup() {
  // Provide a clean localStorage between tests
  localStorage.clear();
  return render(<App />);
}

test('initial render shows status banner, grid, scoreboard and restart', () => {
  setup();
  const status = screen.getByTestId('status-banner');
  expect(status).toBeInTheDocument();
  expect(status).toHaveAttribute('aria-live', 'polite');
  expect(status).toHaveTextContent(/player x's turn/i);

  const grid = screen.getByRole('grid', { name: /board, player x's turn/i });
  expect(grid).toBeInTheDocument();

  const scoreboard = screen.getByRole('group', { name: /scoreboard/i });
  expect(scoreboard).toBeInTheDocument();
  expect(within(scoreboard).getByTestId('score-x')).toHaveTextContent('0');
  expect(within(scoreboard).getByTestId('score-o')).toHaveTextContent('0');
  expect(within(scoreboard).getByTestId('score-ties')).toHaveTextContent('0');

  const restartBtn = screen.getByRole('button', { name: /restart/i });
  expect(restartBtn).toBeInTheDocument();
});

test('audit trail has START event on load', () => {
  setup();
  const log = getAuditLog();
  expect(log.length).toBeGreaterThan(0);
  const last = log[log.length - 1];
  expect(last.action).toBe('START');
  expect(last.timestamp).toBeTruthy();
});

test('keyboard navigation: arrow keys move focus across cells; Enter places mark', async () => {
  const user = userEvent.setup();
  setup();

  const cells = screen.getAllByRole('gridcell');
  // Focus should be set to first empty square automatically; if not, focus manually
  if (document.activeElement?.getAttribute('role') !== 'gridcell') {
    cells[0].focus();
  }
  expect(document.activeElement).toBe(cells[0]);

  // Move right twice
  await user.keyboard('{ArrowRight}{ArrowRight}');
  expect(document.activeElement).toBe(cells[2]);

  // Move down once (to index 5)
  await user.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(cells[5]);

  // Press Enter to place X
  await user.keyboard('{Enter}');
  expect(cells[5]).toHaveTextContent('X');

  // Now status should indicate O's turn
  expect(screen.getByTestId('status-banner')).toHaveTextContent(/player o's turn/i);
});

test('invalid move on occupied cell is ignored (no crash, remains same)', async () => {
  const user = userEvent.setup();
  setup();

  const cells = screen.getAllByRole('gridcell');
  // Place X at idx 0
  await user.click(cells[0]);
  expect(cells[0]).toHaveTextContent('X');

  // Attempt to play again on same cell; should be disabled and not change state
  await user.click(cells[0]);
  expect(cells[0]).toHaveTextContent('X');

  // Status should have moved to O's turn after first click, not change due to invalid second click
  expect(screen.getByTestId('status-banner')).toHaveTextContent(/player o's turn/i);
});
