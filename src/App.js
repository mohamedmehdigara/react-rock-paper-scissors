import React, { useReducer, useEffect, useCallback, useMemo } from 'react';
import styled, { keyframes, ThemeProvider, css } from 'styled-components';

// --- 1. CONFIGURATION ---
const STORAGE_KEY = 'nexus_rps_v13_stable';

const THEME = {
  colors: {
    bg: '#050508',
    surface: '#121217',
    primary: '#00f2ff',
    success: '#00ff88',
    danger: '#ff0055',
    warning: '#ffcc00',
    text: '#ffffff',
  }
};

const CHOICES = {
  ROCK: { name: 'Rock', emoji: '✊', beats: 'SCISSORS', color: '#ff4d4d' },
  PAPER: { name: 'Paper', emoji: '✋', beats: 'ROCK', color: '#4dff88' },
  SCISSORS: { name: 'Scissors', emoji: '✌️', beats: 'PAPER', color: '#4da6ff' },
};

// --- 2. ANIMATIONS (Strictly Tagged) ---
const shakeKeyframes = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
`;

const entranceKeyframes = keyframes`
  from { opacity: 0; transform: translateY(10px) scale(0.9); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const hyperGlowKeyframes = keyframes`
  0%, 100% { box-shadow: 0 0 5px #00f2ff; border-color: rgba(0, 242, 255, 0.3); }
  50% { box-shadow: 0 0 20px #00f2ff; border-color: rgba(0, 242, 255, 1); }
`;

// --- 3. STATE ENGINE ---
const getInitialState = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : {
    history: [],
    score: 0,
    streak: 0,
    status: 'IDLE', 
    player: null,
    cpu: null,
    lastResult: null,
    isProcessing: false
  };
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'START': 
      return { ...state, status: 'BATTLE', player: action.payload, isProcessing: true };
    case 'RESOLVE':
      const { cpu, result } = action.payload;
      const newStreak = result === 'WIN' ? state.streak + 1 : result === 'LOSE' ? 0 : state.streak;
      return {
        ...state,
        status: 'RESULT',
        cpu,
        lastResult: result,
        streak: newStreak,
        score: result === 'WIN' ? state.score + (newStreak >= 3 ? 2 : 1) : result === 'LOSE' ? state.score - 1 : state.score,
        history: [{ result, id: Date.now() }, ...state.history].slice(0, 10),
        isProcessing: false
      };
    case 'RESET': return { ...state, status: 'IDLE', player: null, cpu: null, lastResult: null };
    case 'PURGE': return { ...getInitialState(), score: 0, history: [] };
    default: return state;
  }
}

// --- 4. STYLED COMPONENTS (Strict v4+ Compliance) ---
const Layout = styled.div`
  min-height: 100vh;
  background: ${p => p.theme.colors.bg};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  padding: 20px;
  font-family: 'Inter', -apple-system, sans-serif;
`;

const MainCard = styled.div`
  width: 100%;
  max-width: 400px;
  background: ${p => p.theme.colors.surface};
  border-radius: 32px;
  padding: 2.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;

  /* THE CRITICAL FIX: Every animation trigger is wrapped in a css tag block */
  ${p => p.$isLosing && css`
    animation: ${shakeKeyframes} 0.4s cubic-bezier(.36,.07,.19,.97) both;
  `}

  ${p => p.$isHyper && css`
    animation: ${hyperGlowKeyframes} 2s infinite ease-in-out;
  `}
`;

const StatGrid = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  span { font-size: 0.6rem; letter-spacing: 2px; opacity: 0.4; display: block; }
  strong { font-size: 2rem; font-weight: 800; color: ${p => p.theme.colors.primary}; }
`;

const PlayArea = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 2rem 0;
  
  ${p => p.$animate && css`
    animation: ${entranceKeyframes} 0.5s ease-out;
  `}
`;

const IconBtn = styled.button`
  flex: 1;
  aspect-ratio: 1/1;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  font-size: 2.4rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: ${p => p.$color};
    background: ${p => p.$color}15;
    transform: translateY(-5px);
  }

  &:disabled {
    opacity: ${p => p.$active ? 1 : 0.1};
    border-color: ${p => p.$active ? p.$color : 'transparent'};
  }
`;

const ResultBanner = styled.div`
  text-align: center;
  ${css`animation: ${entranceKeyframes} 0.3s ease;`}
  h2 { font-size: 2.2rem; margin: 0; color: ${p => p.theme.colors[p.$res === 'WIN' ? 'success' : p.$res === 'LOSE' ? 'danger' : 'warning']}; }
`;

const ActionBtn = styled.button`
  width: 100%;
  padding: 1.2rem;
  border-radius: 12px;
  border: none;
  background: white;
  color: black;
  font-weight: 900;
  text-transform: uppercase;
  margin-top: 1.5rem;
  cursor: pointer;
  &:hover { background: #eee; }
`;

const LogDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$res === 'WIN' ? '#00ff88' : p.$res === 'LOSE' ? '#ff0055' : '#444'};
`;

// --- 5. MAIN COMPONENT ---
export default function App() {
  const [state, dispatch] = useReducer(gameReducer, null, getInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const winRate = useMemo(() => {
    const total = state.history.filter(h => h.result !== 'TIE').length;
    return total === 0 ? 0 : Math.round((state.history.filter(h => h.result === 'WIN').length / total) * 100);
  }, [state.history]);

  const onChoice = useCallback((key) => {
    if (state.isProcessing || state.status !== 'IDLE') return;
    dispatch({ type: 'START', payload: CHOICES[key] });

    setTimeout(() => {
      const keys = Object.keys(CHOICES);
      const cpuKey = keys[Math.floor(Math.random() * 3)];
      let res = 'TIE';
      if (CHOICES[key].beats === cpuKey) res = 'WIN';
      else if (CHOICES[cpuKey].beats === key) res = 'LOSE';

      dispatch({ type: 'RESOLVE', payload: { cpu: CHOICES[cpuKey], result: res } });
    }, 800);
  }, [state.isProcessing, state.status]);

  return (
    <ThemeProvider theme={THEME}>
      <Layout>
        <MainCard $isLosing={state.lastResult === 'LOSE'} $isHyper={state.streak >= 3}>
          <StatGrid>
            <div><span>CREDITS</span><strong>{state.score}</strong></div>
            <div style={{ textAlign: 'right' }}><span>SUCCESS</span><strong>{winRate}%</strong></div>
          </StatGrid>

          {state.status === 'IDLE' ? (
            <PlayArea $animate>
              {Object.keys(CHOICES).map(key => (
                <IconBtn key={key} $color={CHOICES[key].color} onClick={() => onChoice(key)}>
                  {CHOICES[key].emoji}
                </IconBtn>
              ))}
            </PlayArea>
          ) : (
            <div>
              <PlayArea>
                <IconBtn disabled $active $color={state.player.color}>{state.player.emoji}</IconBtn>
                <div style={{ alignSelf: 'center', opacity: 0.1 }}>VS</div>
                <IconBtn disabled $active $color={state.cpu?.color}>
                  {state.status === 'BATTLE' ? '⋯' : state.cpu.emoji}
                </IconBtn>
              </PlayArea>

              {state.status === 'RESULT' && (
                <ResultBanner $res={state.lastResult}>
                  <h2>{state.lastResult === 'TIE' ? 'PHASE LOCK' : `YOU ${state.lastResult}`}</h2>
                  <ActionBtn onClick={() => dispatch({ type: 'RESET' })}>CONTINUE</ActionBtn>
                </ResultBanner>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '40px' }}>
            {state.history.map(h => <LogDot key={h.id} $res={h.result} />)}
          </div>
        </MainCard>

        <button 
          onClick={() => { if(window.confirm('Wipe system data?')) dispatch({ type: 'PURGE' }); }}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.1)', marginTop: '2.5rem', cursor: 'pointer', fontSize: '0.7rem' }}
        >
          RESET SYSTEM CACHE
        </button>
      </Layout>
    </ThemeProvider>
  );
}