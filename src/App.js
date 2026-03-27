import React, { useReducer, useEffect, useState, useCallback } from 'react';
import styled, { keyframes, ThemeProvider, createGlobalStyle, css } from 'styled-components';

// --- 1. THE REBIRTH CONFIG ---
const THEME = {
  colors: {
    bg: '#0a0a0b',
    surface: '#141417',
    primary: '#00f2ff',
    danger: '#ff0055',
    text: '#e0e0e0'
  }
};

const CHOICES = {
  ROCK: { emoji: '✊', beats: 'SCISSORS', color: '#ff4d4d' },
  PAPER: { emoji: '✋', beats: 'ROCK', color: '#4dff88' },
  SCISSORS: { emoji: '✌️', beats: 'PAPER', color: '#4da6ff' }
};

// --- 2. MARKOV PREDICTION ENGINE ---
// This is the "Ghost" that remembers your patterns
const predictNextMove = (history) => {
  if (history.length < 3) return Object.keys(CHOICES)[Math.floor(Math.random() * 3)];
  
  const lastMove = history[0];
  const patterns = {};
  
  for (let i = 0; i < history.length - 1; i++) {
    if (history[i+1] === lastMove) {
      const next = history[i];
      patterns[next] = (patterns[next] || 0) + 1;
    }
  }
  
  const predictedPlayerMove = Object.keys(patterns).reduce((a, b) => patterns[a] > patterns[b] ? a : b, 'ROCK');
  // AI picks the counter to what it thinks you will pick
  return CHOICES[predictedPlayerMove].beats === 'ROCK' ? 'PAPER' : 
         CHOICES[predictedPlayerMove].beats === 'PAPER' ? 'SCISSORS' : 'ROCK';
};

// --- 3. REDUCER ---
function reducer(state, action) {
  switch (action.type) {
    case 'PLAY':
      const { playerMove, cpuMove } = action;
      const result = playerMove === cpuMove ? 'TIE' : CHOICES[playerMove].beats === cpuMove ? 'WIN' : 'LOSE';
      return {
        ...state,
        player: CHOICES[playerMove],
        cpu: CHOICES[cpuMove],
        history: [playerMove, ...state.history].slice(0, 50),
        status: 'RESULT',
        score: result === 'WIN' ? state.score + 1 : state.score,
        integrity: result === 'LOSE' ? state.integrity - 10 : state.integrity,
        lastResult: result
      };
    case 'RESET': return { ...state, status: 'IDLE' };
    default: return state;
  }
}

// --- 4. STYLED COMPONENTS ---
const GlobalStyle = createGlobalStyle`
  body { background: #0a0a0b; color: #e0e0e0; font-family: 'Inter', sans-serif; margin: 0; }
`;

const DuelFrame = styled.div`
  max-width: 400px; margin: 100px auto; padding: 40px;
  background: ${p => p.theme.colors.surface}; border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.05); text-align: center;
`;

const ChoiceNode = styled.button`
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
  padding: 20px; border-radius: 16px; cursor: pointer; transition: 0.2s;
  font-size: 2rem; margin: 0 10px;

  &:hover { background: rgba(255,255,255,0.08); border-color: ${p => p.$color}; transform: translateY(-5px); }
  &:disabled { opacity: 0.2; transform: none; }
`;

const PredictionTag = styled.div`
  font-size: 0.6rem; letter-spacing: 2px; color: ${p => p.theme.colors.primary};
  margin-bottom: 2rem; opacity: 0.6;
`;

// --- 5. MAIN LOGIC ---
export default function App() {
  const [state, dispatch] = useReducer(reducer, {
    score: 0, integrity: 100, status: 'IDLE', history: [], player: null, cpu: null
  });

  const [aiThought, setAiThought] = useState('');

  // The Ghost "Tease"
  useEffect(() => {
    if (state.status === 'IDLE') {
      const prediction = predictNextMove(state.history);
      setAiThought(`AI_ANTICIPATING: ${prediction}`);
    }
  }, [state.status, state.history]);

  const handlePlay = (key) => {
    const cpuMove = predictNextMove(state.history);
    dispatch({ type: 'PLAY', playerMove: key, cpuMove });
  };

  return (
    <ThemeProvider theme={THEME}>
      <GlobalStyle />
      <DuelFrame>
        <PredictionTag>{aiThought}</PredictionTag>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
          {state.status === 'IDLE' ? (
            Object.keys(CHOICES).map(key => (
              <ChoiceNode 
                key={key} 
                $color={CHOICES[key].color} 
                onClick={() => handlePlay(key)}
              >
                {CHOICES[key].emoji}
              </ChoiceNode>
            ))
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <ChoiceNode disabled $color={state.player.color}>{state.player.emoji}</ChoiceNode>
              <span style={{ fontWeight: 900 }}>{state.lastResult}</span>
              <ChoiceNode disabled $color={state.cpu.color}>{state.cpu.emoji}</ChoiceNode>
            </div>
          )}
        </div>

        <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>
          WIN_COUNT: {state.score} | SYSTEM_STABILITY: {state.integrity}%
        </div>

        {state.status === 'RESULT' && (
          <button 
            onClick={() => dispatch({ type: 'RESET' })}
            style={{ marginTop: '2rem', background: 'none', border: '1px solid #fff', color: '#fff', padding: '10px 20px', cursor: 'pointer', borderRadius: '8px' }}
          >
            NEXT ROUND
          </button>
        )}
      </DuelFrame>
    </ThemeProvider>
  );
}