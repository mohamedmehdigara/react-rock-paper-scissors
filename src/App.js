import React, { useReducer, useEffect, useCallback, useMemo } from 'react';
import styled, { keyframes, ThemeProvider, css } from 'styled-components';

// --- 1. CONFIGURATION ---
const STORAGE_KEY = 'rps_nexus_ultimate_v6';

const THEME = {
  colors: {
    primary: '#00f2ff',
    success: '#00ff88',
    danger: '#ff0055',
    warning: '#ffcc00',
    bg: '#050507',
    surface: '#121217',
    text: '#ffffff',
  }
};

const CHOICES = {
  ROCK: { name: 'Rock', emoji: '✊', beats: 'SCISSORS', color: '#ff4d4d' },
  PAPER: { name: 'Paper', emoji: '✋', beats: 'ROCK', color: '#4dff88' },
  SCISSORS: { name: 'Scissors', emoji: '✌️', beats: 'PAPER', color: '#4da6ff' },
};

// --- 2. ANIMATIONS ---
const shakeAnim = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
`;

const zoomInAnim = keyframes`
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
`;

const winGlowAnim = keyframes`
  0%, 100% { box-shadow: 0 0 10px #00ff88; }
  50% { box-shadow: 0 0 30px #00ff88; }
`;

// --- 3. AUDIO ENGINE ---
const playAudio = (freq, type = 'sine', duration = 0.15) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* Browser blocked audio */ }
};

// --- 4. STATE MANAGEMENT ---
const getInitialState = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : {
    history: [],
    score: 0,
    userPick: null,
    compPick: null,
    status: 'IDLE',
    lastResult: null
  };
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'START': return { ...state, status: 'BATTLE', userPick: action.payload, lastResult: null };
    case 'RESOLVE':
      const { compPick, result } = action.payload;
      return {
        ...state,
        status: 'RESULT',
        compPick,
        lastResult: result,
        history: [{ result, id: Date.now() }, ...state.history].slice(0, 10),
        score: result === 'WIN' ? state.score + 1 : result === 'LOSE' ? state.score - 1 : state.score,
      };
    case 'RESET': return { ...state, status: 'IDLE', userPick: null, compPick: null, lastResult: null };
    case 'PURGE': return { ...getInitialState(), score: 0, history: [] };
    default: return state;
  }
}

// --- 5. STYLED COMPONENTS ---
const AppContainer = styled.div`
  min-height: 100vh;
  background: radial-gradient(circle at center, #11111d 0%, #050507 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
`;

const GameBoard = styled.div`
  width: 100%;
  max-width: 440px;
  background: ${t => t.theme.colors.surface};
  border-radius: 32px;
  padding: 2.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 50px 100px rgba(0,0,0,0.6);
  ${props => props.$isLosing && css`animation: ${shakeAnim} 0.4s ease;`}
`;

const ScoreCard = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const Stat = styled.div`
  background: rgba(255, 255, 255, 0.02);
  padding: 12px 24px;
  border-radius: 16px;
  text-align: center;
  span { font-size: 0.65rem; opacity: 0.4; display: block; letter-spacing: 1px; }
  strong { font-size: 1.6rem; color: ${p => p.$color || 'white'}; }
`;

const ChoiceArea = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 30px 0;
  /* Fixed animation wrapper */
  ${props => props.$animate && css`animation: ${zoomInAnim} 0.5s ease-out;`}
`;

const IconBtn = styled.button`
  width: 90px;
  height: 90px;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  font-size: 2.5rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: ${p => p.$color};
    background: ${p => p.$color}15;
    transform: translateY(-5px);
  }

  &:disabled {
    opacity: ${p => p.$isPicked ? 1 : 0.2};
    cursor: default;
    border-color: ${p => p.$isPicked ? p.$color : 'transparent'};
    ${p => p.$isWinner && css`animation: ${winGlowAnim} 1.5s infinite;`}
  }
`;

const LogDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$res === 'WIN' ? '#00ff88' : p.$res === 'LOSE' ? '#ff0055' : '#444'};
`;

const ResetBtn = styled.button`
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: white;
  color: black;
  font-weight: 800;
  cursor: pointer;
  margin-top: 20px;
  text-transform: uppercase;
  &:hover { opacity: 0.9; }
`;

// --- 6. MAIN APP ---
export default function App() {
  const [state, dispatch] = useReducer(gameReducer, null, getInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const winRate = useMemo(() => {
    const total = state.history.filter(h => h.result !== 'TIE').length;
    return total === 0 ? 0 : Math.round((state.history.filter(h => h.result === 'WIN').length / total) * 100);
  }, [state.history]);

  const handlePick = useCallback((key) => {
    if (state.status !== 'IDLE') return;
    playAudio(440, 'sine', 0.05);
    dispatch({ type: 'START', payload: CHOICES[key] });

    setTimeout(() => {
      const keys = Object.keys(CHOICES);
      const cKey = keys[Math.floor(Math.random() * keys.length)];
      const compPick = CHOICES[cKey];
      let res = 'TIE';
      if (CHOICES[key].beats === cKey) res = 'WIN';
      else if (compPick.beats === key) res = 'LOSE';

      playAudio(res === 'WIN' ? 880 : res === 'LOSE' ? 150 : 300);
      dispatch({ type: 'RESOLVE', payload: { compPick, result: res } });
    }, 800);
  }, [state.status]);

  return (
    <ThemeProvider theme={THEME}>
      <AppContainer>
        <h2 style={{ letterSpacing: '6px', fontSize: '1rem', opacity: 0.7 }}>NEXUS // RPS</h2>
        
        <GameBoard $isLosing={state.lastResult === 'LOSE'}>
          <ScoreCard>
            <Stat $color={THEME.colors.primary}><span>SCORE</span><strong>{state.score}</strong></Stat>
            <Stat $color={THEME.colors.success}><span>WIN RATE</span><strong>{winRate}%</strong></Stat>
          </ScoreCard>

          {state.status === 'IDLE' ? (
            <ChoiceArea>
              {Object.keys(CHOICES).map(key => (
                <IconBtn key={key} $color={CHOICES[key].color} onClick={() => handlePick(key)}>
                  {CHOICES[key].emoji}
                </IconBtn>
              ))}
            </ChoiceArea>
          ) : (
            <ChoiceArea $animate={true}>
              <div style={{ textAlign: 'center' }}>
                <IconBtn disabled $isPicked $color={state.userPick.color} $isWinner={state.lastResult === 'WIN'}>
                  {state.userPick.emoji}
                </IconBtn>
                <small style={{ display: 'block', marginTop: '5px', opacity: 0.4 }}>PLAYER</small>
              </div>
              
              <div style={{ alignSelf: 'center', fontWeight: 900, opacity: 0.1 }}>VS</div>

              <div style={{ textAlign: 'center' }}>
                <IconBtn disabled $isPicked $color={state.compPick?.color} $isWinner={state.lastResult === 'LOSE'}>
                  {state.status === 'BATTLE' ? '⋯' : state.compPick.emoji}
                </IconBtn>
                <small style={{ display: 'block', marginTop: '5px', opacity: 0.4 }}>SYSTEM</small>
              </div>
            </ChoiceArea>
          )}

          {state.status === 'RESULT' && (
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ 
                fontSize: '2.5rem', margin: '0', 
                color: THEME.colors[state.lastResult === 'WIN' ? 'success' : state.lastResult === 'LOSE' ? 'danger' : 'warning']
              }}>
                {state.lastResult === 'TIE' ? 'DRAW' : `YOU ${state.lastResult}`}
              </h1>
              <ResetBtn onClick={() => dispatch({ type: 'RESET' })}>Re-Initialize</ResetBtn>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '40px' }}>
            {state.history.map(h => <LogDot key={h.id} $res={h.result} />)}
          </div>
        </GameBoard>

        <button 
          onClick={() => dispatch({ type: 'PURGE' })}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.1)', marginTop: '40px', cursor: 'pointer' }}
        >
          WIPE SYSTEM CACHE
        </button>
      </AppContainer>
    </ThemeProvider>
  );
}