# Tic Tac Toe Frontend (Ocean Professional)

## Overview

This repository contains a modern, accessible Tic Tac Toe game built with React. It is a frontend-only application that runs entirely in the browser with no backend or user accounts. The application uses a clean “Ocean Professional” theme, includes keyboard and screen reader support, and implements a lightweight audit-style logging mechanism persisted in localStorage. The game tracks scores for Player X, Player O, and ties across sessions.

The implementation emphasizes simplicity and clarity:
- React function components with a `useTicTacToe` hook handling game state, win/draw detection, and scoring.
- Accessible grid with keyboard navigation and status announcements via `aria-live`.
- Minimal audit log capturing key actions (START, MOVE, RESET, ERROR) with timestamps and before/after snapshots.
- Friendly error handling via a `safeGuard` wrapper and a typed `AppError` class.

## How to Run, Test, and Build

### Prerequisites
- Node.js 16+ and npm installed.

### Install dependencies
- No manual install step is required by default for this template environment, but on a fresh clone use:
- Run: `npm install`

### Run in development
- `npm start`
- Open http://localhost:3000 in your browser.

### Run tests
- `npm test`
- The suite includes unit and integration-level tests for accessibility, interactions, keyboard navigation, and audit logging.

### Build for production
- `npm run build`
- The optimized production build is output to the `build` folder.

## Project Structure

- `src/App.js` — App shell and high-level wiring (theme toggle, status banner, layout).
- `src/components/Board.js` — Accessible 3x3 grid with keyboard navigation and focus management.
- `src/components/Square.js` — Individual grid cell button with accessibility attributes.
- `src/components/Scoreboard.js` — Score display for X, O, and ties.
- `src/hooks/useTicTacToe.js` — Core game logic, state management, score persistence, and audit event emission for moves/resets.
- `src/utils/audit.js` — Lightweight frontend audit logging ring buffer (localStorage backed).
- `src/utils/errors.js` — `AppError` class and `safeGuard` error handling helper.
- `src/App.css` and `src/index.css` — Ocean Professional theme and base styles.
- `src/App.test.js`, `src/__tests__/App.integration.test.js` — Test suites.

## Ocean Professional Theme Mapping

The Ocean Professional theme is defined via CSS variables and applied across the app for a cohesive, modern UI:
- Primary: `--primary: #3b82f6;` applied to buttons, headings gradient, and focus ring tint.
- Secondary: `--secondary: #64748b;` used for supportive text and subdued UI accents.
- Success Accent: `--success: #06b6d4;` used as gradient companion for brand visuals.
- Error Accent: `--error: #EF4444;` reserved for error states and could be leveraged for future validation/UI errors.
- Backgrounds and Surfaces: `--bg`, `--surface` produce clean, subtle layers with shadow depth.
- Text: `--text` establishes the primary foreground color aligned to a legible contrast.
- Effects: `--ring`, `--shadow`, and `--radius` provide accessible focus states and modern depth.

Light and dark modes are supported. The App component toggles `data-theme` on the `<html>` element based on a local state switch, allowing `:root` and `[data-theme="dark"]` variable sets in `src/App.css` to govern the palette.

References:
- `src/App.css`: theme variables, shadows, gradients, sizing, and component styling.
- `src/App.js`: theme toggle button and data-theme attribute management.

## Accessibility and Keyboard Navigation

The app includes several accessibility features designed to provide an inclusive experience:

- Live Region Status: The status banner in `App.js` uses `aria-live="polite"` and `aria-atomic="true"` to announce the current state, including player turns, wins, and draws, without being intrusive.
- Accessible Grid: The board is a proper ARIA grid (`role="grid"`) with an `aria-label` that reflects the current state (e.g., “Board, Player X’s turn” or “Board, Game Over. Draw.”).
- Cells as Gridcells: Each square is a focusable button with `role="gridcell"`, `aria-selected` indicating occupancy, and a descriptive `aria-label`:
  - Empty: “Place X on row 1 column 2”
  - Occupied: “Cell row 1 column 2 contains X”
- Keyboard Navigation: Arrow keys move focus across the grid; Enter or Space places the mark. Navigation and action handling live in `src/components/Board.js`.
- Focus Management: On mount and after updates, focus is moved to the first empty cell for efficient keyboard play.

References:
- `src/components/Board.js`: ARIA grid semantics, key handling for Arrow/Enter/Space, dynamic labels.
- `src/components/Square.js`: Button semantics, `aria-label`, `role="gridcell"`, `aria-selected`.
- `src/App.js`: Live status updates via `aria-live` and friendly status messages.

## Minimal Frontend Audit Logging

This app implements a lightweight audit-style logging mechanism designed for a frontend-only environment. It is not a substitute for server-side, GxP-grade audit trails, but it demonstrates core principles adapted to the browser.

Where logs are stored:
- Logs are kept in a ring buffer persisted in `localStorage` under the key `ttt_audit_log`. The buffer caps at 100 entries to prevent unbounded growth.

What is captured:
- Action type: one of `START`, `MOVE`, `RESET`, `ERROR`.
- Timestamp: ISO 8601 string generated at the time of logging.
- User ID: stored as `'anonymous'` because no authentication layer exists in this frontend-only app.
- Reason: short string explaining the action (e.g., “Player X moved at index 4”).
- Before/After snapshots: shallow snapshots of relevant state around the event.
- Metadata: optional object for contextual details, e.g., `{ index: 4, outcome: { winner: null, isDraw: false } }`.

Lifecycle:
- `START` event is emitted from `App.js` on initial mount with initial state snapshot.
- `MOVE` events are emitted from `useTicTacToe.makeMove` after a move is applied.
- `RESET` events are emitted from `useTicTacToe.resetGame`.
- `ERROR` events are emitted via `safeGuard` in `errors.js` when unexpected exceptions occur.

Reading the audit log:
- Use `getAuditLog()` from `src/utils/audit.js` to retrieve a shallow copy of the buffer for diagnostics or testing.

References:
- `src/utils/audit.js`: `logEvent`, `getAuditLog`, ring buffer persistence.
- `src/hooks/useTicTacToe.js`: emits MOVE and RESET events with before/after and metadata.
- `src/App.js`: emits START on init.
- `src/utils/errors.js`: emits ERROR on unhandled exceptions through `safeGuard`.

Notes for GxP alignment in a frontend-only context:
- Attributable: The app uses a placeholder `userId: 'anonymous'` since there is no authentication. Integrating auth would allow attribution.
- Contemporaneous: Events are logged immediately at the time of action.
- Enduring: Logs persist in localStorage. This is best-effort and not tamper-proof; a backend would be required for non-repudiation and secure retention.
- Complete and Accurate: Before/after snapshots and metadata are included to provide context and verification in tests.

## Error Handling Approach

Error handling follows a friendly-to-user, detailed-to-log approach:
- `safeGuard(fn, friendlyMessage)` wraps potentially error-prone operations. On error:
  - Logs an `ERROR` event including `message`, `stack`, and `name` in `metadata`.
  - Throws an `AppError('unexpected', friendlyMessage)` so upper layers can decide how to present errors without leaking technical details.
- Gameplay interactions (making a move on an occupied cell or after game end) are treated as graceful no-ops rather than errors.
- Reset operations are wrapped with `safeGuard` from the UI. If any unexpected exception arises, it will be logged, and a friendly message can be displayed by calling code.

References:
- `src/utils/errors.js`: `AppError` and `safeGuard` definition.
- `src/App.js`: `safeGuard` usage around reset and move operations.

## Release Checklist (Frontend-Only)

Use this checklist before cutting a release:

- Functionality
  - The app loads without errors in supported browsers.
  - Game flow works: placing moves, detecting wins/draws, restarting.
  - Scoreboard persists correctly across reloads (localStorage key `ttt_scores`).
- Accessibility
  - Grid has correct roles/labels and announces state changes via `aria-live`.
  - Keyboard navigation works with Arrow keys; Enter/Space places marks.
  - Focus management moves to the first empty cell where appropriate.
- Visual/Theme
  - Ocean Professional theme variables render correctly in both light and dark modes.
  - Focus ring is clearly visible; contrast is appropriate.
- Audit Logging
  - START, MOVE, RESET events are recorded with timestamp and contextual metadata.
  - ERROR events are recorded on exceptions from guarded operations.
  - Log size is bounded and persisted in `localStorage`.
- Error Handling
  - Invalid moves are no-ops; no unhandled exceptions during typical play.
  - `safeGuard` catches unexpected errors and emits audit entries.
- Testing and Quality
  - `npm test` passes locally with no failing tests.
  - Linting has no critical issues (`eslint` config present).
- Packaging
  - Production build succeeds: `npm run build`.
  - Version and changelog noted (if applicable in your release process).
- Documentation
  - README updated with instructions, theme mapping, accessibility notes, audit logging, and error handling.
  - Any demo or screenshots (optional) updated.

## Notes and Constraints

- This is a browser-only demo application. The audit logging pattern here is illustrative and not a replacement for server-side, tamper-evident audit trails required in regulated environments.
- Scores and audit logs may be cleared by the user clearing site data in the browser.

## References

- App shell and theming: `src/App.js`, `src/App.css`, `src/index.css`
- Game logic and state: `src/hooks/useTicTacToe.js`
- Components: `src/components/Board.js`, `src/components/Square.js`, `src/components/Scoreboard.js`
- Logging and errors: `src/utils/audit.js`, `src/utils/errors.js`
- Tests: `src/App.test.js`, `src/__tests__/App.integration.test.js`
