import React from 'react';

/**
 * PUBLIC_INTERFACE
 * Controls renders game configuration: Human vs Human or Human vs AI, AI side, and difficulty.
 *
 * @param {{
 *  mode: 'HUMAN_VS_HUMAN'|'HUMAN_VS_AI',
 *  setMode: (v:string)=>void,
 *  aiPlaysAs: 'X'|'O',
 *  setAiPlaysAs: (v:string)=>void,
 *  difficulty: { strategy:'quick'|'minimax', depth?:number },
 *  setDifficulty: (v:any)=>void,
 *  onRestart?: ()=>void,
 *  isAiThinking?: boolean
 * }} props
 */
export default function Controls({
  mode,
  setMode,
  aiPlaysAs,
  setAiPlaysAs,
  difficulty,
  setDifficulty,
  onRestart,
  isAiThinking = false,
}) {
  return (
    <div className="controls" role="group" aria-label="Game controls">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
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
              aria-label="AI strategy"
              className="ocean-btn"
              value={difficulty?.strategy || 'quick'}
              onChange={(e) => setDifficulty({ ...difficulty, strategy: e.target.value })}
            >
              <option value="quick">Quick</option>
              <option value="minimax">Minimax</option>
            </select>

            {difficulty?.strategy === 'minimax' && (
              <input
                type="number"
                aria-label="Minimax depth"
                min={1}
                max={9}
                value={difficulty?.depth ?? 9}
                onChange={(e) => setDifficulty({ ...difficulty, depth: Number(e.target.value) })}
                className="ocean-btn"
                style={{ width: 96 }}
              />
            )}
          </>
        )}

        {onRestart && (
          <button
            className="ocean-btn restart-btn"
            onClick={onRestart}
            aria-label="Restart game"
            disabled={isAiThinking}
            title={isAiThinking ? 'Disabled while AI is thinking' : 'Restart game'}
          >
            Restart
          </button>
        )}
      </div>
      {isAiThinking && (
        <div style={{ marginTop: 8, textAlign: 'center', color: 'var(--secondary)', fontWeight: 600 }}>
          AI is thinking…
        </div>
      )}
    </div>
  );
}
