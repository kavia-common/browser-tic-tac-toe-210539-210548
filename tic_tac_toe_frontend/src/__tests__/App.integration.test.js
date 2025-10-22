import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { getAuditLog } from '../utils/audit';

function cell(index) {
  return screen.getAllByRole('gridcell')[index];
}

function setup() {
  localStorage.clear();
  return render(<App />);
}

describe('Tic Tac Toe App - Integration', () => {
  test('X wins scenario updates status and scoreboard, grid becomes readonly', async () => {
    const user = userEvent.setup();
    setup();

    // Moves to win for X: 0,1,3,4,6 (X gets left column 0-3-6)
    await user.click(cell(0)); // X
    await user.click(cell(1)); // O
    await user.click(cell(3)); // X
    await user.click(cell(4)); // O
    await user.click(cell(6)); // X wins

    // Status banner announces winner
    expect(screen.getByTestId('status-banner')).toHaveTextContent(/player x wins!/i);

    // Board aria should reflect game over
    const board = screen.getByRole('grid', { name: /game over/i });
    expect(board).toHaveAttribute('aria-readonly', 'true');

    // Scoreboard increments X
    const scoreboard = screen.getByRole('group', { name: /scoreboard/i });
    expect(within(scoreboard).getByTestId('score-x')).toHaveTextContent('1');
    expect(within(scoreboard).getByTestId('score-o')).toHaveTextContent('0');
    expect(within(scoreboard).getByTestId('score-ties')).toHaveTextContent('0');
  });

  test('Draw scenario increments ties and announces draw', async () => {
    const user = userEvent.setup();
    setup();

    // Fill board to a draw:
    // X O X
    // X X O
    // O X O
    const order = [0,1,2,5,3,6,4,8,7]; // results in no three-in-a-row
    for (let i = 0; i < order.length; i++) {
      await user.click(cell(order[i]));
    }

    expect(screen.getByTestId('status-banner')).toHaveTextContent(/draw! no more moves/i);

    const scoreboard = screen.getByRole('group', { name: /scoreboard/i });
    expect(within(scoreboard).getByTestId('score-ties')).toHaveTextContent('1');
  });

  test('Restart resets board and logs RESET audit event', async () => {
    const user = userEvent.setup();
    setup();

    // Make a couple of moves
    await user.click(cell(0)); // X
    await user.click(cell(4)); // O

    // Restart
    await user.click(screen.getByRole('button', { name: /restart/i }));

    // Board cleared
    screen.getAllByRole('gridcell').forEach((c) => {
      expect(c).toHaveTextContent('');
    });

    // Status back to Player X's turn
    expect(screen.getByTestId('status-banner')).toHaveTextContent(/player x's turn/i);

    // Verify RESET audit entry exists
    const log = getAuditLog();
    const resetEntries = log.filter(e => e.action === 'RESET');
    expect(resetEntries.length).toBeGreaterThan(0);
    expect(resetEntries[resetEntries.length - 1].reason).toBeTruthy();
  });

  test('Accessibility: cells have descriptive aria-labels and grid has correct label', async () => {
    const user = userEvent.setup();
    setup();

    const grid = screen.getByRole('grid', { name: /board, player x's turn/i });
    expect(grid).toBeInTheDocument();

    // Check label for an empty cell
    const c0 = cell(0);
    expect(c0).toHaveAttribute('aria-label', expect.stringMatching(/place x on row 1 column 1/i));

    // Place X then check label updates for another cell reflects current player O
    await user.click(c0);
    const c1 = cell(1);
    expect(c1).toHaveAttribute('aria-label', expect.stringMatching(/place o on row 1 column 2/i));
  });

  test('Keyboard: move focus and Space places mark, then invalid move is blocked', async () => {
    const user = userEvent.setup();
    setup();

    const cells = screen.getAllByRole('gridcell');
    // ensure a cell has focus
    if (document.activeElement?.getAttribute('role') !== 'gridcell') {
      cells[0].focus();
    }

    await user.keyboard('{ArrowRight}'); // index 1
    expect(document.activeElement).toBe(cells[1]);

    await user.keyboard(' '); // Space to place X
    expect(cells[1]).toHaveTextContent('X');

    // Attempt to place again on same occupied cell via Enter - should be disabled, remain X
    await user.keyboard('{Enter}');
    expect(cells[1]).toHaveTextContent('X');
  });

  test('Audit trail records MOVE events with metadata', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(cell(0)); // X
    await user.click(cell(4)); // O

    const log = getAuditLog();
    const moves = log.filter(e => e.action === 'MOVE');
    expect(moves.length).toBeGreaterThanOrEqual(2);
    // Check structure of latest move
    const last = moves[moves.length - 1];
    expect(last.metadata).toBeTruthy();
    expect(last.metadata.index).toBe(4);
    expect(last.reason).toMatch(/player [xo] moved at index/i);
    expect(last.timestamp).toBeTruthy();
  });
});
