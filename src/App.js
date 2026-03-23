import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes, ThemeProvider } from 'styled-components';

// --- Configuration ---
const LOCAL_STORAGE_KEY = 'rps_high_score_v3';

const THEME = {
  colors: {
    primary: '#61dafb',
    secondary: '#21a1f1',
    success: '#4caf50',
    danger: '#f44336',
    warning: '#ffeb3b',
    background: '#0f1115',
    surface: '#1e2128',
    text: '#ffffff',
  },
};

const CHOICES = {
  ROCK: { name: 'Rock', emoji: '✊', beats: 'SCISSORS' },
  PAPER: { name: 'Paper', emoji: '✋', beats: 'ROCK' },
  SCISSORS: { name: 'Scissors', emoji: '✌️', beats: 'PAPER' },
};

// --- Audio Engine (Senior Tech: Web Audio API) ---
const playSound = (type) => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  if (type === 'SELECT') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'WIN') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);
  } else if (type === 'LOSE') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  }
};

// --- Logic & State ---
const getInitialState = () => {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  return {
    userSelection: null,
    computerSelection: null,
    gameState: 'idle', 
    result: null, 
    score: saved ? parseInt(saved, 10) : 0,
  };
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'START_ROUND':
      return { ...state, gameState: 'calculating', userSelection: action.payload };
    case 'RESOLVE_ROUND':
      return {
        ...state,
        ...action.payload,
        gameState: 'result',
        score: action.payload.result === 'WIN' ? state.score + 1 : 
               action.payload.result === 'LOSE' ? state.score - 1 : state.score,
      };
    case 'RESET':
      return { ...state, gameState: 'idle', userSelection: null, computerSelection: null, result: null };
    default:
      return state;
  }
}

// --- Components ---
const Layout = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.background};
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'Segoe UI', Roboto, sans-serif;
`;

const Card = styled.div`
  background: ${props => props.theme.colors.surface};
  padding: 2rem;
  border-radius: 24px;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.05);
`;

const ChoiceBtn = styled.button`
  background: rgba(255,255,255,0.05);
  border: 2px solid transparent;
  font-size: 3rem;
  padding: 1.5rem;
  margin: 0.5rem;
  border-radius: 16px;
  cursor: pointer;
  transition: 0.2s;
  &:hover { border-color: ${props => props.theme.colors.primary}; transform: translateY(-3px); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Score = styled.h2`
  font-size: 3rem;
  margin: 0;
  color: ${props => props.theme.colors.primary};
`;

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, null, getInitialState);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, state.score.toString());
  }, [state.score]);

  const runGame = (userChoiceKey) => {
    playSound('SELECT');
    const userPick = CHOICES[userChoiceKey];
    dispatch({ type: 'START_ROUND', payload: userPick });

    setTimeout(() => {
      const keys = Object.keys(CHOICES);
      const compPick = CHOICES[keys[Math.floor(Math.random() * keys.length)]];
      
      let res = 'TIE';
      if (userPick.beats === Object.keys(CHOICES).find(k => CHOICES[k] === compPick)) res = 'WIN';
      else if (compPick.beats === userChoiceKey) res = 'LOSE';

      playSound(res);
      dispatch({ 
        type: 'RESOLVE_ROUND', 
        payload: { computerSelection: compPick, result: res } 
      });
    }, 700);
  };

  return (
    <ThemeProvider theme={THEME}>
      <Layout>
        <Card>
          <p style={{ opacity: 0.6, margin: 0 }}>CURRENT SCORE</p>
          <Score>{state.score}</Score>
          
          <div style={{ margin: '2rem 0' }}>
            {state.gameState === 'idle' ? (
              Object.keys(CHOICES).map(key => (
                <ChoiceBtn key={key} onClick={() => runGame(key)}>
                  {CHOICES[key].emoji}
                </ChoiceBtn>
              ))
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div>
                  <small>YOU</small>
                  <ChoiceBtn disabled>{state.userSelection.emoji}</ChoiceBtn>
                </div>
                <h3>VS</h3>
                <div>
                  <small>CPU</small>
                  <ChoiceBtn disabled>
                    {state.gameState === 'calculating' ? '💭' : state.computerSelection.emoji}
                  </ChoiceBtn>
                </div>
              </div>
            )}
          </div>

          {state.gameState === 'result' && (
            <div>
              <h2 style={{ color: THEME.colors[state.result === 'WIN' ? 'success' : state.result === 'LOSE' ? 'danger' : 'warning'] }}>
                {state.result === 'TIE' ? "IT'S A DRAW" : `YOU ${state.result}!`}
              </h2>
              <button 
                style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
                onClick={() => dispatch({ type: 'RESET' })}
              >
                PLAY AGAIN
              </button>
            </div>
          )}
        </Card>
      </Layout>
    </ThemeProvider>
  );
}