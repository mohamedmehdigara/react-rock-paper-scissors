import React, { useReducer, useEffect, useCallback, useMemo } from 'react';
import styled, { keyframes, ThemeProvider, css, createGlobalStyle } from 'styled-components';

// --- 1. SETTINGS ---
const STORAGE_KEY = 'overload_nexus_v21';

const THEME = {
  colors: {
    bg: '#010103',
    surface: '#0d0d12',
    primary: '#00f2ff',
    overload: '#ffaa00',
    success: '#00ff88',
    danger: '#ff0055',
    text: '#ffffff',
  }
};

const CHOICES = {
  ROCK: { name: 'Rock', emoji: '✊', beats: 'SCISSORS', color: '#ff4d4d' },
  PAPER: { name: 'Paper', emoji: '✋', beats: 'ROCK', color: '#4dff88' },
  SCISSORS: { name: 'Scissors', emoji: '✌️', beats: 'PAPER', color: '#4da6ff' },
};

// --- 2. DYNAMIC REGISTRY (Strict v4+ Compliance) ---
const FX = {
  warp: keyframes`
    0% { transform: scale(1); filter: brightness(1); }
    50% { transform: scale(1.02); filter: brightness(1.5); }
    100% { transform: scale(1); filter: brightness(1); }
  `,
  bgMove: keyframes`
    from { background-position: 0 0; }
    to { background-position: 0 50px; }
  `,
  alert: keyframes`
    0%, 100% { border-color: rgba(255, 170, 0, 0.2); }
    50% { border-color: rgba(255, 170, 0, 1); box-shadow: 0 0 20px #ffaa0044; }
  `
};

// --- 3. CORE LOGIC ---
const getInitialState = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : {
    score: 0,
    integrity: 100,
    streak: 0,
    status: 'IDLE',
    player: null,
    cpu: null,
    history: [],
    processing: false
  };
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'START': return { ...state, status: 'BATTLE', player: action.payload, processing: true };
    case 'RESOLVE':
      const { cpu, result, key } = action.payload;
      const isOverload = state.streak >= 3;
      const newStreak = result === 'WIN' ? state.streak + 1 : result === 'LOSE' ? 0 : state.streak;
      
      // Penalty: Overload losses hurt more
      const dmg = result === 'LOSE' ? (isOverload ? 30 : 15) : (result === 'WIN' ? -5 : 0);
      const points = result === 'WIN' ? (isOverload ? 3 : 1) : 0;

      return {
        ...state,
        status: 'RESULT',
        cpu,
        score: state.score + points,
        streak: newStreak,
        integrity: Math.max(0, Math.min(100, state.integrity - dmg)),
        history: [key, ...state.history].slice(0, 10),
        processing: false
      };
    case 'RESET': return { ...state, status: 'IDLE', player: null, cpu: null };
    case 'WIPE': return { ...getInitialState(), score: 0 };
    default: return state;
  }
}

// --- 4. STYLED COMPONENTS ---
const GlobalStyle = createGlobalStyle`
  body { background: #010103; margin: 0; font-family: 'Inter', sans-serif; overflow: hidden; }
  body::before {
    content: ""; position: fixed; inset: -50%;
    background-image: linear-gradient(rgba(0, 242, 255, 0.03) 1px, transparent 1px), 
                      linear-gradient(90deg, rgba(0, 242, 255, 0.03) 1px, transparent 1px);
    background-size: 50px 50px; transform: perspective(500px) rotateX(60deg);
    /* Speed up background during Overload */
    animation: ${FX.bgMove} ${p => p.$isOverload ? '0.5s' : '2s'} linear infinite;
  }
`;

const Core = styled.div`
  width: 100%; max-width: 440px; background: ${p => p.theme.colors.surface};
  border-radius: 40px; padding: 3rem; position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(20px);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  ${p => p.$isOverload && css`animation: ${FX.alert} 1s infinite;`}
  ${p => p.$isProcessing && css`animation: ${FX.warp} 0.4s ease;`}
`;

const HUD = styled.div`
  display: flex; justify-content: space-between; font-size: 0.65rem;
  letter-spacing: 2px; color: ${p => p.$isOverload ? p.theme.colors.overload : p.theme.colors.primary};
  margin-bottom: 2rem; font-weight: 900;
`;

const Slot = styled.button`
  flex: 1; aspect-ratio: 1/1; background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 24px;
  font-size: 2.5rem; cursor: pointer; transition: 0.2s;
  
  &:hover:not(:disabled) {
    transform: translateY(-5px); border-color: ${p => p.$color};
    box-shadow: 0 5px 15px ${p => p.$color}33;
  }

  &:disabled { 
    opacity: ${p => p.$active ? 1 : 0.05}; 
    border-color: ${p => p.$active ? p.$color : 'transparent'};
  }
`;

// --- 5. MAIN LOGIC ---
export default function App() {
  const [state, dispatch] = useReducer(gameReducer, null, getInitialState);
  const isOverload = state.streak >= 3;

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const execute = useCallback((key) => {
    if (state.processing || state.status !== 'IDLE') return;
    dispatch({ type: 'START', payload: CHOICES[key] });

    // Speed up logic during Overload
    const delay = isOverload ? 400 : 800;

    setTimeout(() => {
      const keys = Object.keys(CHOICES);
      // AI Logic: Counter the user's most frequent move if in Overload
      let cpuKey;
      if (isOverload) {
        const counts = state.history.reduce((a,v) => { a[v] = (a[v]||0)+1; return a; }, {});
        const fav = Object.keys(counts).reduce((a,b) => counts[a] > counts[b] ? a : b, keys[0]);
        cpuKey = keys.find(k => CHOICES[k].beats === fav);
      } else {
        cpuKey = keys[Math.floor(Math.random() * 3)];
      }

      const res = CHOICES[key].beats === cpuKey ? 'WIN' : cpuKey === key ? 'TIE' : 'LOSE';
      dispatch({ type: 'RESOLVE', payload: { cpu: CHOICES[cpuKey], result: res, key } });
    }, delay);
  }, [state.processing, state.status, state.history, isOverload]);

  return (
    <ThemeProvider theme={THEME}>
      <GlobalStyle $isOverload={isOverload} />
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <Core $isProcessing={state.processing} $isOverload={isOverload}>
          <HUD $isOverload={isOverload}>
            <span>{isOverload ? 'NEURAL_OVERLOAD: ACTIVE' : 'SYSTEM_STABLE'}</span>
            <span>{state.score} UNITS</span>
          </HUD>

          <div style={{ display: 'flex', gap: '15px', margin: '2rem 0' }}>
            {state.status === 'IDLE' ? (
              Object.keys(CHOICES).map(k => (
                <Slot key={k} $color={CHOICES[k].color} onClick={() => execute(k)}>{CHOICES[k].emoji}</Slot>
              ))
            ) : (
              <>
                <Slot disabled $active $color={state.player.color}>{state.player.emoji}</Slot>
                <div style={{ alignSelf: 'center', opacity: 0.1 }}>VS</div>
                <Slot disabled $active $color={state.cpu?.color}>{state.status === 'BATTLE' ? '?' : state.cpu.emoji}</Slot>
              </>
            )}
          </div>

          <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', width: `${state.integrity}%`, 
              background: state.integrity < 40 ? THEME.colors.danger : isOverload ? THEME.colors.overload : THEME.colors.success,
              transition: '0.4s width cubic-bezier(0,1,0,1)' 
            }} />
          </div>

          {state.status === 'RESULT' && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <h2 style={{ 
                margin: 0, 
                color: THEME.colors[state.streak === 0 ? 'danger' : 'success'],
                fontSize: isOverload ? '2rem' : '1.5rem'
              }}>
                {state.streak === 0 ? 'BREACH_DETECTED' : isOverload ? 'CRITICAL_SYNC' : 'NODE_SECURED'}
              </h2>
              <button 
                onClick={() => dispatch({ type: 'RESET' })}
                style={{ 
                  width: '100%', padding: '1rem', background: 'white', border: 'none', 
                  fontWeight: 900, marginTop: '1.5rem', cursor: 'pointer', borderRadius: '12px' 
                }}
              >
                CONTINUE
              </button>
            </div>
          )}
        </Core>
      </div>
    </ThemeProvider>
  );
}