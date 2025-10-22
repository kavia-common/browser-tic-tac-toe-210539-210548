# Design: Adding an AI Player to the React Tic Tac Toe (Frontend-Only)

## Overview

This short change design describes how to add an optional AI opponent to the existing React Tic Tac Toe application. The implementation remains frontend-only, aligns with the current hook- and component-based architecture, and preserves the Ocean Professional theme. The AI supports two strategies:
1) Minimax with an optional depth limit, and
2) A simple heuristic fallback (center → corners → edges) for a “Quick” difficulty.

The solution maintains the existing audit logging pattern (START, MOVE, RESET, ERROR) and extends it with AI-move metadata such as `strategy`, `depth`, and a timestamped move log. No backend is introduced.

## High-Level Approach

- Introduce a pure AI service module with a small, testable interface that can compute the next move for player O (or X, depending on a mode selector).
- Extend the `useTicTacToe` hook with:
  - A new “mode” state (Human vs Human, Human vs AI) and a “difficulty” option.
  - A controlled “isAiThinking” flag to manage UI interlocks, announce status, and prevent player input while the AI is selecting a move.
  - A function to trigger an AI move after a valid human move, with a short non-blocking delay for accessibility and UX feedback.
- Update `App` to surface controls for:
  - Mode selection (Human vs Human / Human vs AI).
  - AI plays as (X or O).
  - Difficulty (Quick heuristic or Minimax with optional depth).
- Keep Board and Square components mostly unchanged, except to disable input when `isAiThinking` is true.
- Extend audit logging for AI moves in the same structure used for player moves (MOVE action, with metadata about the strategy), ensuring contemporaneous timestamps and before/after snapshots.

## Component and State Changes

### App (src/App.js)
- New UI controls in the header or a settings panel:
  - Mode toggle: “Human vs Human” or “Human vs AI”.
  - AI side: “AI plays as O” (default) or “AI plays as X”.
  - Difficulty: “Quick” or “Minimax”, with optional depth (1–9).
- Status banner messaging updates:
  - When the AI is thinking: “AI is thinking…”.
  - When AI turn starts: “Player O’s turn (AI)”.
- Ocean Professional theme adherence:
  - Reuse existing button and control styles (`ocean-btn`) for new toggles and inputs, preserving gradient and focus ring behavior.

### Board (src/components/Board.js)
- Accept an additional `disabled` prop or derive it from `isAiThinking` plus game-over status. If `isAiThinking` is true, prevent clicks and keyboard-initiated moves.
- ARIA remains as-is; consider appending “AI is thinking” to the grid label when relevant for polite announcements.

### Hook: useTicTacToe (src/hooks/useTicTacToe.js)
- New state:
  - `mode: 'HUMAN_VS_HUMAN' | 'HUMAN_VS_AI'`
  - `aiPlaysAs: 'X' | 'O'` (default 'O')
  - `difficulty: { strategy: 'quick' | 'minimax', depth?: number }`
  - `isAiThinking: boolean`
- New behavior:
  - After a human move is applied and if the game is not over and it’s AI’s turn, schedule an AI move by calling the AI service with current board and settings.
  - Apply the AI move via existing `makeMove` while suppressing re-entry and double-logging.
- Logging:
  - AI moves log as `MOVE` with `reason: "AI (O) moved at index 4"` and `metadata: { index, strategy, depth }`.

## New Module: AI Service

Add `src/utils/ai.js` exporting a single pure function:

- `chooseBestMove(board, aiPlayer, opts)` returns an integer index 0–8 or `-1` if no move available.
- `opts` can include:
  - `strategy: 'quick' | 'minimax'`
  - `depth?: number` (optional for minimax depth limit)
  - `computeWinner` function injected from existing hook for deterministic evaluation and easy testing.

The service implements:
- Quick heuristic: select center if available, then corners, then edges.
- Minimax:
  - Score terminal states (+10 win for AI, −10 win for human, 0 draw).
  - Depth limit optional; if provided, stop recursion early and estimate with a simple heuristic (e.g., immediate win/block potential).
  - Standard maximize/minimize recursion; return best index.

### AI Service Example

```javascript
// src/utils/ai.js
/**
 * Choose the next move for the AI.
 * @param {Array<string|null>} board
 * @param {'X'|'O'} aiPlayer
 * @param {{ strategy: 'quick'|'minimax', depth?: number, computeWinner: (b:string[]) => 'X'|'O'|null }} opts
 * @returns {number} index 0..8 or -1 if none
 */
export function chooseBestMove(board, aiPlayer, opts) {
  const { strategy, depth = 9, computeWinner } = opts;
  if (strategy === 'quick') {
    return quickHeuristic(board);
  }
  return minimaxDriver(board, aiPlayer, depth, computeWinner);
}

function quickHeuristic(board) {
  const empty = board.map((v, i) => (v ? -1 : i)).filter(i => i >= 0);
  if (empty.length === 0) return -1;
  const center = 4;
  const corners = [0, 2, 6, 8];
  const edges = [1, 3, 5, 7];
  if (!board[center]) return center;
  const pick = (arr) => arr.find(i => !board[i]);
  return pick(corners) ?? pick(edges) ?? -1;
}

function minimaxDriver(board, aiPlayer, maxDepth, computeWinner) {
  const human = aiPlayer === 'X' ? 'O' : 'X';

  function scoreTerminal(b, depthLeft) {
    const w = computeWinner(b);
    if (w === aiPlayer) return 10 + depthLeft;    // prefer faster wins
    if (w === human) return -10 - depthLeft;      // penalize faster losses
    if (b.every(Boolean)) return 0;               // draw
    return null;                                  // non-terminal
  }

  function availableMoves(b) {
    const out = [];
    for (let i = 0; i < 9; i++) if (!b[i]) out.push(i);
    return out;
  }

  function minimax(b, player, depthLeft) {
    const terminal = scoreTerminal(b, depthLeft);
    if (terminal !== null || depthLeft === 0) {
      return { score: terminal ?? 0, move: -1 };
    }

    const moves = availableMoves(b);
    let best = { score: player === aiPlayer ? -Infinity : Infinity, move: -1 };

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

  return minimax([...board], aiPlayer, maxDepth).move;
}
```

## Reducer/State Updates and Turn Flow

The current hook uses `useState` and imperative updates. We continue with that pattern:

1) Human clicks a cell → `makeMove(index)` validates and applies move.
2) If game ended (win/draw) → stop.
3) Otherwise toggle `currentPlayer`.
4) If mode is Human vs AI and it is now AI’s turn:
   - Set `isAiThinking = true`.
   - Non-blocking delay (e.g., `setTimeout`) for user feedback.
   - Call `chooseBestMove(board, aiSymbol, { strategy, depth, computeWinner })`.
   - If the index is valid → call `makeMove(index)` to apply the AI move.
   - Set `isAiThinking = false`.

The existing `makeMove` already logs MOVE events; AI moves reuse it, but the caller (AI flow) attaches a `reason` and `metadata` that reflect the AI strategy. If we want to centralize this, we can wrap `makeMove` when AI-initiated to supply a custom `reason`.

### Updated Hook Snippet (showing new fields and AI trigger)

```javascript
// Pseudocode fragment to show integration points within useTicTacToe

const [mode, setMode] = useState('HUMAN_VS_HUMAN'); // or 'HUMAN_VS_AI'
const [aiPlaysAs, setAiPlaysAs] = useState('O');
const [difficulty, setDifficulty] = useState({ strategy: 'quick', depth: 9 });
const [isAiThinking, setIsAiThinking] = useState(false);

// After human move is successfully applied:
if (mode === 'HUMAN_VS_AI') {
  const nextToMove = outcome.winner || outcome.isDraw
    ? null
    : (currentPlayer === 'X' ? 'O' : 'X');
  if (nextToMove && nextToMove === aiPlaysAs) {
    setIsAiThinking(true);
    setTimeout(() => {
      const index = chooseBestMove(
        nextBoard,
        aiPlaysAs,
        { strategy: difficulty.strategy, depth: difficulty.depth ?? 9, computeWinner }
      );
      if (index >= 0) {
        // Mark that this move is AI-initiated (optional: pass through a dedicated API)
        makeMove(index, { reasonOverride: `AI (${aiPlaysAs}) moved at index ${index}`, metadata: { strategy: difficulty.strategy, depth: difficulty.depth } });
      }
      setIsAiThinking(false);
    }, 300); // small delay for UX
  }
}
```

Note: The existing `makeMove` signature would be extended to optionally accept `{ reasonOverride, metadata }`, defaulting to human-style messages when not provided. This keeps audit trails consistent and avoids duplicating logic.

### Extended makeMove Signature (non-breaking)

```javascript
// Addition only; maintain current behavior for existing calls
function makeMove(index, opts) {
  // opts?: { reasonOverride?: string, metadata?: object, initiatedBy?: 'HUMAN'|'AI' }
  // ...validate and apply as today...
  logEvent({
    action: 'MOVE',
    before,
    after,
    reason: opts?.reasonOverride ?? `Player ${currentPlayer} moved at index ${index}`,
    userId: 'anonymous',
    metadata: { index, outcome, ...(opts?.metadata ?? {}) },
  });
}
```

## Interfaces

- AI service:
  - chooseBestMove(board, aiPlayer, opts) → number
- Hook additions:
  - `mode`, `setMode`
  - `aiPlaysAs`, `setAiPlaysAs`
  - `difficulty`, `setDifficulty`
  - `isAiThinking`
  - Non-breaking `makeMove(index, opts?)`
- App UI binds to the new setters; Board receives `disabled={winner || isDraw || isAiThinking}`.

## Testing Considerations

- Unit tests for `chooseBestMove`:
  - Quick strategy chooses center, corner, edge appropriately.
  - Minimax returns a winning move if available; blocks opponent’s fork/win.
  - Depth-limited minimax still returns valid indices.
- Hook tests:
  - When `mode='HUMAN_VS_AI'` and `aiPlaysAs='O'`, after an X move, AI automatically plays next.
  - `isAiThinking` is true during selection and blocks user input.
  - Audit MOVE entry is created for AI with strategy metadata.
- Integration tests:
  - Simulate a quick sequence where the AI responds and verify board updates, status banner, and audit log.
  - Accessibility remains intact: grid roles/labels, and controls are keyboard operable.
- Error handling tests:
  - If AI returns -1 due to no moves, ensure graceful no-op and no crash.
  - Any thrown error in AI selection path is caught with `safeGuard` and audit ERROR is recorded.

## Ocean Professional UI Notes

- Place mode/difficulty controls in the header alongside the theme toggle, using `ocean-btn` or a styled select for visual parity.
- When `isAiThinking` is true, status banner reads “AI is thinking…” and buttons maintain proper focus rings for accessibility.
- Maintain current spacing, radii, and shadows to match the theme across new controls.

## Example UI Integration Snippet (fragment in App.js)

```javascript
// In the header controls area
<select
  aria-label="Game mode"
  className="ocean-btn"
  value={mode}
  onChange={(e) => setMode(e.target.value)}
>
  <option value="HUMAN_VS_HUMAN">Human vs Human</option>
  <option value="HUMAN_VS_AI">Human vs AI</option>
</select>

{mode === 'HUMAN_VS_AI' && (
  <>
    <select
      aria-label="AI plays as"
      className="ocean-btn"
      value={aiPlaysAs}
      onChange={(e) => setAiPlaysAs(e.target.value)}
    >
      <option value="O">AI as O</option>
      <option value="X">AI as X</option>
    </select>
    <select
      aria-label="AI difficulty"
      className="ocean-btn"
      value={difficulty.strategy}
      onChange={(e) => setDifficulty({ ...difficulty, strategy: e.target.value })}
    >
      <option value="quick">Quick</option>
      <option value="minimax">Minimax</option>
    </select>
    {difficulty.strategy === 'minimax' && (
      <input
        type="number"
        min={1}
        max={9}
        value={difficulty.depth ?? 9}
        onChange={(e) => setDifficulty({ ...difficulty, depth: Number(e.target.value) })}
        aria-label="Minimax depth"
        className="ocean-btn"
      />
    )}
  </>
)}
```

## GxP-Style Move Log and Audit Alignment

- Continue to use `logEvent` for:
  - START on initialization,
  - MOVE for both human and AI moves,
  - RESET on restarts,
  - ERROR via `safeGuard`.
- Ensure AI moves include:
  - `userId: 'anonymous'` (no auth layer),
  - `metadata.strategy` and `metadata.depth`,
  - ISO timestamp auto-filled,
  - Before/after snapshots for traceability.

## Summary of Changes

- New: `src/utils/ai.js` with `chooseBestMove` (quick + minimax).
- Hook: `useTicTacToe` adds mode, aiPlaysAs, difficulty, isAiThinking, and optional `reasonOverride`/`metadata` in `makeMove`.
- App: Add controls for mode/side/difficulty and wire to hook setters; adjust status to reflect AI turns and thinking.
- Board: Disable input when `isAiThinking` is true.
- Tests: Add unit tests for AI service and integration tests to validate automatic AI responses and audit log entries.

## References

- App shell and theming: src/App.js, src/App.css
- Game logic and state: src/hooks/useTicTacToe.js
- Components: src/components/Board.js, src/components/Square.js, src/components/Scoreboard.js
- Logging and errors: src/utils/audit.js, src/utils/errors.js
