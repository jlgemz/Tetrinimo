import React, { useCallback, useEffect, useState, useRef } from 'react';
import { eventBus, EVENTS } from '../game/eventBus';
import { Game, GameState } from '../game/game';
import { gameUIChanged, pickGameUI, type GameUIState } from '../game/gameUi';
import { Renderer } from '../game/renderer';
import { ensureCsrf, pingApi } from '../api/client';
import { auth, User } from '../game/auth';
import { leaderboard, LeaderboardEntry } from '../game/leaderboard';

type ApiStatus = 'checking' | 'online' | 'offline';
import type { Theme } from '../game/procedural';
// === Cartoony palette ===
const NEONS = ['#ff6ec7', '#22d3ee', '#a3e635', '#fde047', '#ff9f1c', '#c084fc'];

const BACKGROUND_SPARKLES = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 7) % 100}%`,
  top: `${(i * 23 + 11) % 100}%`,
  fontSize: 8 + (i % 5) * 2,
  delay: `${(i % 6) * 0.5}s`
}));

const FLOATING_DECOR = [
  { top: '8%', left: '3%', color: '#ff6ec7', shape: 'L', size: 50, delay: '0s', rot: -15 },
  { top: '22%', left: '88%', color: '#22d3ee', shape: 'T', size: 58, delay: '0.5s', rot: 20 },
  { top: '52%', left: '2%', color: '#a3e635', shape: 'S', size: 52, delay: '1s', rot: 10 },
  { top: '68%', left: '93%', color: '#fde047', shape: 'L', size: 46, delay: '1.5s', rot: -20 },
  { top: '85%', left: '6%', color: '#ff9f1c', shape: 'I', size: 50, delay: '2s', rot: 35 },
  { top: '38%', left: '95%', color: '#c084fc', shape: 'O', size: 42, delay: '0.8s', rot: 0 },
  { top: '90%', left: '85%', color: '#ff6ec7', shape: 'T', size: 48, delay: '1.2s', rot: -10 },
  { top: '5%', left: '55%', color: '#a3e635', shape: 'I', size: 44, delay: '1.8s', rot: 25 },
  { top: '95%', left: '45%', color: '#22d3ee', shape: 'S', size: 46, delay: '2.5s', rot: 45 }
] as const;
// Simple Web Audio beep — playful cartoon "boop"
function playBeep(freq = 600, duration = 120, type: OscillatorType = 'square') {
  try {
    const AC = (window.AudioContext ||
    (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + duration / 1000
    );
    osc.stop(ctx.currentTime + duration / 1000);
    setTimeout(() => ctx.close(), duration + 50);
  } catch {}
}
// === TETRINIMO animated title ===
function TetrinimoTitle({ small = false }: {small?: boolean;}) {
  const letters = 'TETRINIMO'.split('');
  return (
    <div
      className={`relative inline-block ${small ? 'text-lg' : 'text-lg sm:text-2xl md:text-3xl'}`}>
      
      {letters.map((l, i) =>
      <span
        key={i}
        className="balloon-text inline-block"
        style={{
          color: NEONS[i % NEONS.length],
          transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 3}deg)`,
          display: 'inline-block'
        }}>
        
          {l}
        </span>
      )}
      {!small &&
      <>
          <span
          className="absolute -top-2 -left-2 text-yellow-300 animate-sparkle text-xl"
          style={{
            animationDelay: '0s'
          }}>
          
            ✨
          </span>
          <span
          className="absolute -top-4 right-4 text-pink-300 animate-sparkle text-2xl"
          style={{
            animationDelay: '0.5s'
          }}>
          
            ⭐
          </span>
          <span
          className="absolute -bottom-2 left-1/3 text-cyan-300 animate-sparkle text-lg"
          style={{
            animationDelay: '1s'
          }}>
          
            ✨
          </span>
          <span
          className="absolute -bottom-4 right-0 text-lime-300 animate-sparkle text-xl"
          style={{
            animationDelay: '1.5s'
          }}>
          
            ⭐
          </span>
        </>
      }
    </div>);

}
// === Gatekeeper Gloop character ===
function Gatekeeper({
  loggedIn,
  username



}: {loggedIn: boolean;username?: string;}) {
  if (loggedIn) {
    return (
      <div className="flex flex-col items-center animate-float">
        <div className="text-7xl">👑</div>
        <div className="speech-bubble px-4 py-2 mt-4 text-indigo-950 font-bold">
          Welcome back, {username}!
        </div>
      </div>);

  }
  return (
    <div className="flex flex-col items-center animate-float">
      <div className="gatekeeper">
        <div className="gatekeeper-eye left" />
        <div className="gatekeeper-eye right" />
        <div className="gatekeeper-mouth" />
      </div>
      <div className="speech-bubble px-4 py-3 mt-6 text-indigo-950 font-bold text-center max-w-[280px]">
        Who goes there?
        <br />
        Login or Signup to save your glory!
      </div>
    </div>);

}
// === Floating decorative tetromino blocks (background ornament) ===
const TETRO_SHAPES: Record<string, [number, number][]> = {
  I: [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0]],

  O: [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1]],

  T: [
  [0, 0],
  [1, 0],
  [2, 0],
  [1, 1]],

  L: [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 2]],

  S: [
  [1, 0],
  [2, 0],
  [0, 1],
  [1, 1]]

};
function FloatingTetromino({
  top,
  left,
  color,
  shape,
  size,
  delay,
  rotation








}: {top: string;left: string;color: string;shape: 'I' | 'O' | 'T' | 'L' | 'S';size: number;delay: string;rotation: number;}) {
  const cells = TETRO_SHAPES[shape];
  const cellSize = size / 4;
  return (
    <div
      className="absolute animate-float opacity-60"
      style={{
        top,
        left,
        width: size,
        height: size,
        transform: `rotate(${rotation}deg)`,
        animationDelay: delay,
        filter: `drop-shadow(0 4px 12px ${color}80)`
      }}
      aria-hidden>
      
      {cells.map(([cx, cy], i) =>
      <div
        key={i}
        className="absolute rounded-md"
        style={{
          width: cellSize - 2,
          height: cellSize - 2,
          left: cx * cellSize,
          top: cy * cellSize,
          backgroundColor: color,
          boxShadow: `inset 0 ${cellSize / 6}px 0 rgba(255,255,255,0.4), inset 0 -${cellSize / 8}px 0 rgba(0,0,0,0.2)`
        }} />

      )}
    </div>);

}
// === Confetti ===
function Confetti() {
  const pieces = Array.from({
    length: 60
  });
  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      {pieces.map((_, i) =>
      <div
        key={i}
        className="absolute w-3 h-3"
        style={{
          left: `${Math.random() * 100}%`,
          top: '-10px',
          backgroundColor: NEONS[i % NEONS.length],
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          animation: `confetti-fall ${2 + Math.random() * 2}s linear forwards`,
          animationDelay: `${Math.random() * 0.8}s`
        }} />

      )}
    </div>);

}
interface Toast {
  id: number;
  text: string;
  emoji: string;
  color: string;
}
interface FloatingScore {
  id: number;
  value: number;
  x: number;
}
interface Particle {
  id: number;
  left: string;
  top: string;
  size: number;
  color: string;
  dx: number;
  dy: number;
  rot: number;
  duration: number;
}
export function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const prevScoreRef = useRef(0);
  const toastIdRef = useRef(0);
  const scoreIdRef = useRef(0);
  const [gameUI, setGameUI] = useState<GameUIState | null>(null);
  const lastUIRef = useRef<GameUIState | null>(null);
  const renderRafRef = useRef<number | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({
    username: '',
    password: ''
  });
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');
  const [showPassword, setShowPassword] = useState(false);
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [shaking, setShaking] = useState(false);
  const [rainbowFlash, setRainbowFlash] = useState(false);
  const [canvasEffect, setCanvasEffect] = useState<{
    text: string;
    emoji: string;
    color: string;
    sub: string;
  } | null>(null);
  const [now, setNow] = useState(performance.now());
  const [showConfetti, setShowConfetti] = useState(false);
  const [isHighScore, setIsHighScore] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [disintegrateParticles, setDisintegrateParticles] = useState<
    Particle[]>(
    []);
  const particleIdRef = useRef(0);
  const pushToast = useCallback(
    (text: string, emoji: string, color: string) => {
      const id = ++toastIdRef.current;
      setToasts((prev) => [
      ...prev,
      {
        id,
        text,
        emoji,
        color
      }]
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2500);
    },
    []
  );
  const updateLeaderboard = useCallback(async (username?: string) => {
    const scores = await leaderboard.getTopScores();
    setTopScores(scores);
    if (username) {
      setUserRank(await leaderboard.getUserRank(username));
    } else {
      setUserRank(null);
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const online = await pingApi();
      if (cancelled) return;
      setApiStatus(online ? 'online' : 'offline');
      if (!online) return;

      try {
        await ensureCsrf();
      } catch {
        // API is up; login may still fail until CSRF is fixed — keep online
      }

      const userResult = await auth.fetchCurrentUser();
      if (cancelled) return;
      const user = userResult;
      if (user) {
        setCurrentUser(user);
        setShowAuthModal(false);
      }
      const scores = await leaderboard.getTopScores();
      if (cancelled) return;
      setTopScores(scores);
      if (user) {
        setUserRank(await leaderboard.getUserRank(user.username));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  // Shield cooldown countdown — only while recharging
  useEffect(() => {
    const end = gameUI?.shieldCooldownEnd;
    if (!end || gameUI?.shieldAvailable || end <= Date.now()) return;
    const id = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(id);
  }, [gameUI?.shieldCooldownEnd, gameUI?.shieldAvailable]);
  useEffect(() => {
    if (!canvasRef.current || !nextCanvasRef.current || !holdCanvasRef.current)
    return;
    gameRef.current = new Game();
    rendererRef.current = new Renderer(
      canvasRef.current,
      nextCanvasRef.current,
      holdCanvasRef.current
    );
    const syncGameUI = (state: GameState) => {
      const ui = pickGameUI(state);
      if (gameUIChanged(lastUIRef.current, ui)) {
        lastUIRef.current = ui;
        setGameUI(ui);
      }
    };

    const handleStateUpdate = (state: GameState) => {
      if (state.score > prevScoreRef.current) {
        const delta = state.score - prevScoreRef.current;
        if (delta >= 40) {
          const id = ++scoreIdRef.current;
          setFloatingScores((prev) => [
          ...prev,
          {
            id,
            value: delta,
            x: 30 + Math.random() * 40
          }]
          );
          setTimeout(() => {
            setFloatingScores((prev) => prev.filter((s) => s.id !== id));
          }, 1200);
        }
      }
      prevScoreRef.current = state.score;
      syncGameUI(state);
    };

    const renderLoop = () => {
      const game = gameRef.current;
      const renderer = rendererRef.current;
      if (game && renderer && !showAuthModal) {
        const state = game.getState();
        if (!state.isPaused) {
          renderer.render(state);
        }
      }
      renderRafRef.current = requestAnimationFrame(renderLoop);
    };
    renderRafRef.current = requestAnimationFrame(renderLoop);
    const handleThemeChange = (t: Theme) => {
      setTheme(t);
      rendererRef.current?.setTheme(t);
      // No popup — theme is shown in the left panel card
      playBeep(800, 100, 'sine');
    };
    const handleGameOver = async (payload: {score: number;lines: number;}) => {
      playBeep(180, 400, 'sawtooth');
      const user = auth.getCurrentUser();
      if (user) {
        const prevTop = (await leaderboard.getTopScores(1))[0];
        await leaderboard.saveScore(user.username, payload.score, payload.lines);
        const refreshed = await auth.refreshUser();
        if (refreshed) setCurrentUser(refreshed);
        await updateLeaderboard(user.username);
        const wasHighScore = !prevTop || payload.score > prevTop.score;
        if (wasHighScore && payload.score > 0) {
          setIsHighScore(true);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
        }
      }
    };
    const handleLineCleared = (n: number) => {
      playBeep(500 + n * 100, 150, 'triangle');
      // Spawn disintegration particles across the playfield
      const colors = theme ?
      Object.values(theme.pieceColors) :
      ['#ff6ec7', '#22d3ee', '#a3e635', '#fde047', '#ff9f1c', '#c084fc'];
      const count = 30 + n * 25;
      const newParticles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const id = ++particleIdRef.current;
        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.random() * 160;
        newParticles.push({
          id,
          left: `${10 + Math.random() * 80}%`,
          top: `${30 + Math.random() * 60}%`,
          size: 4 + Math.random() * 8,
          color: colors[Math.floor(Math.random() * colors.length)],
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance - 40,
          rot: (Math.random() - 0.5) * 720,
          duration: 700 + Math.random() * 500
        });
      }
      setDisintegrateParticles((prev) => [...prev, ...newParticles]);
      setTimeout(() => {
        const ids = new Set(newParticles.map((p) => p.id));
        setDisintegrateParticles((prev) => prev.filter((p) => !ids.has(p.id)));
      }, 1300);
    };
    const showCanvasEffect = (
    text: string,
    emoji: string,
    color: string,
    sub: string,
    duration = 1400) =>
    {
      setCanvasEffect({
        text,
        emoji,
        color,
        sub
      });
      setTimeout(() => setCanvasEffect(null), duration);
    };
    const handleComboBurst = () => {
      showCanvasEffect('COMBO BURST!', '🌈', '#ff6ec7', '+2 rows cleared!');
      setRainbowFlash(true);
      setTimeout(() => setRainbowFlash(false), 800);
      playBeep(900, 250, 'square');
    };
    const handleGravityShift = () => {
      showCanvasEffect('GRAVITY WOBBLE!', '🌀', '#22d3ee', 'Hold on tight!');
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
      playBeep(300, 200, 'sine');
    };
    const handleCorruption = () => {
      showCanvasEffect('CORRUPTION!', '👾', '#c084fc', 'MWAHAHA!');
      playBeep(150, 300, 'square');
    };
    const handleLevelUp = (level: number) => {
      showCanvasEffect(`LEVEL ${level}`, '⭐', '#fde047', 'Faster falls ahead!');
      playBeep(1100, 200, 'triangle');
      setTimeout(() => playBeep(1400, 200, 'triangle'), 150);
    };
    const handleShieldUsed = () => {
      pushToast('Shield activated!', '🛡️', '#fde047');
      playBeep(1000, 200, 'sine');
    };
    const handleShieldAbsorbed = () => {
      pushToast('Shield absorbed corruption!', '✨', '#fde047');
      playBeep(1200, 250, 'triangle');
    };
    eventBus.on(EVENTS.STATE_UPDATED, handleStateUpdate);
    eventBus.on(EVENTS.THEME_CHANGED, handleThemeChange);
    eventBus.on(EVENTS.GAME_OVER, handleGameOver);
    eventBus.on(EVENTS.LINE_CLEARED, handleLineCleared);
    eventBus.on(EVENTS.COMBO_BURST, handleComboBurst);
    eventBus.on(EVENTS.GRAVITY_SHIFT, handleGravityShift);
    eventBus.on(EVENTS.CORRUPTION_SPAWN, handleCorruption);
    eventBus.on(EVENTS.SHIELD_USED, handleShieldUsed);
    eventBus.on(EVENTS.SHIELD_ABSORBED, handleShieldAbsorbed);
    eventBus.on(EVENTS.LEVEL_UP, handleLevelUp);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameRef.current || showAuthModal) return;
      if (
      [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      ' ',
      'Shift',
      's',
      'S'].
      includes(e.key))
      {
        e.preventDefault();
      }
      switch (e.key) {
        case 'ArrowLeft':
          eventBus.emit(EVENTS.MOVE_LEFT);
          break;
        case 'ArrowRight':
          eventBus.emit(EVENTS.MOVE_RIGHT);
          break;
        case 'ArrowDown':
          eventBus.emit(EVENTS.MOVE_DOWN);
          break;
        case 'ArrowUp':
          eventBus.emit(EVENTS.ROTATE);
          break;
        case ' ':
          eventBus.emit(EVENTS.HARD_DROP);
          break;
        case 'Shift':
          if (!e.repeat) eventBus.emit(EVENTS.SWAP_PIECE);
          break;
        case 's':
        case 'S':
          eventBus.emit(EVENTS.ACTIVATE_SHIELD);
          break;
        case 'r':
        case 'R':
          prevScoreRef.current = 0;
          setIsHighScore(false);
          gameRef.current.start();
          showCanvasEffect('LEVEL 1', '🎮', '#fde047', "Let's go!", 1800);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    if (!showAuthModal) {
      prevScoreRef.current = 0;
      gameRef.current.start();
      // Show pre-game "LEVEL 1" intro overlay
      showCanvasEffect('LEVEL 1', '🎮', '#fde047', "Let's go!", 1800);
    }
    return () => {
      if (renderRafRef.current !== null) {
        cancelAnimationFrame(renderRafRef.current);
        renderRafRef.current = null;
      }
      window.removeEventListener('keydown', handleKeyDown);
      eventBus.clear();
      gameRef.current?.stop();
    };
  }, [showAuthModal, pushToast, updateLeaderboard]);
  const handleRestart = () => {
    if (gameRef.current) {
      prevScoreRef.current = 0;
      setIsHighScore(false);
      gameRef.current.start();
      setCanvasEffect({
        text: 'LEVEL 1',
        emoji: '🎮',
        color: '#fde047',
        sub: "Let's go!"
      });
      setTimeout(() => setCanvasEffect(null), 1800);
    }
  };
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authForm.username || !authForm.password) {
      setAuthError('Please fill all fields!');
      return;
    }
    setAuthSubmitting(true);
    try {
      const res =
      authMode === 'login' ?
      await auth.login(authForm.username, authForm.password) :
      await auth.signup(authForm.username, authForm.password);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setShowAuthModal(false);
        setApiStatus('online');
        await updateLeaderboard(res.user.username);
        eventBus.emit(EVENTS.USER_LOGIN, res.user);
        playBeep(800, 150, 'sine');
      } else {
        setAuthError(res.error || 'Authentication failed!');
        playBeep(200, 200, 'sawtooth');
      }
    } finally {
      setAuthSubmitting(false);
    }
  };
  const handleGuest = () => {
    setShowAuthModal(false);
    pushToast('Wobble on, Guest!', '🎮', '#fde047');
  };
  const handleLogout = async () => {
    await auth.logout();
    eventBus.emit(EVENTS.USER_LOGOUT);
    setCurrentUser(null);
    setShowAuthModal(true);
    gameRef.current?.stop();
    await updateLeaderboard();
  };
  const rankEmoji = (rank: number) => {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return `#${rank + 1}`;
  };
  // Assign a stable avatar per username from leaderboard entry, fall back to pool
  const AVATAR_POOL = ['🐼', '🐧', '🦊', '🐸', '🐙', '🐵', '🦄', '🐯'];
  const getAvatar = (username: string) => {
    if (
    currentUser &&
    currentUser.username === username &&
    currentUser.avatar)
    {
      return currentUser.avatar;
    }
    // Stable hash from username
    let h = 0;
    for (let i = 0; i < username.length; i++)
    h = h * 31 + username.charCodeAt(i) >>> 0;
    return AVATAR_POOL[h % AVATAR_POOL.length];
  };
  const bgStyle = theme?.background ?
  {
    background: theme.background
  } :
  {
    background:
    'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #7c3aed 100%)'
  };
  return (
    <div
      className="h-screen w-full font-hand text-white relative overflow-hidden transition-all duration-1000 flex flex-col"
      style={bgStyle}>
      
      {/* Subtle background sparkles */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        {BACKGROUND_SPARKLES.map((s) =>
        <span
          key={s.id}
          className="absolute text-white animate-sparkle"
          style={{
            left: s.left,
            top: s.top,
            fontSize: `${s.fontSize}px`,
            animationDelay: s.delay
          }}>
          
            ✦
          </span>
        )}
      </div>

      {/* Floating decorative tetrominoes — matches logo vibe, fills empty space */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden hidden md:block">
        {FLOATING_DECOR.map((b, i) =>
        <FloatingTetromino
          key={i}
          top={b.top}
          left={b.left}
          color={b.color}
          shape={b.shape as any}
          size={b.size}
          delay={b.delay}
          rotation={b.rot} />
        )}
      </div>

      {showConfetti && <Confetti />}

      {/* Header */}
      <div className="relative z-10 px-2 md:px-4 py-2 flex justify-between items-center gap-2 md:gap-4 flex-shrink-0">
        <TetrinimoTitle small={false} />
        {currentUser ?
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border-2 border-white/30">
            <span className="text-lg">{currentUser.avatar || '🎮'}</span>
            <span className="font-display text-white text-sm">
              {currentUser.username}
            </span>
            {userRank !== null &&
          <span className="px-1.5 py-0.5 bg-yellow-400 text-indigo-950 rounded-full text-xs font-display">
                #{userRank}
              </span>
          }
            <button
            onClick={handleLogout}
            className="text-lg hover:scale-125 transition-transform"
            title="Logout"
            aria-label="Logout">
            
              🚪
            </button>
          </div> :

        <button
          onClick={() => setShowAuthModal(true)}
          className="btn-bubbly px-4 py-1.5 bg-pink-500 text-white text-xs">
          
            🔑 LOGIN
          </button>
        }
      </div>

      {/* Main game area */}
      <div
        className={`relative z-10 flex-1 min-h-0 flex flex-col md:flex-row gap-2 md:gap-3 items-stretch justify-center px-2 md:px-3 pb-2 md:pb-3 overflow-hidden ${shaking ? 'animate-shake' : ''}`}>
        
        {/* Left Panel — sidebar on md+, compact top strip on mobile */}
        <div className="flex flex-row md:flex-col gap-2 w-full md:w-40 flex-shrink-0 md:overflow-y-auto custom-scrollbar overflow-x-auto md:overflow-x-visible flex-wrap md:flex-nowrap">
          {/* Hold piece */}
          <div className="bg-white/15 backdrop-blur-sm p-2 rounded-2xl border-2 border-white/40 shadow-md">
            <div className="font-display text-center text-white text-xs mb-1">
              💼 HOLD
            </div>
            <div className="bg-indigo-950/50 rounded-xl p-1 flex items-center justify-center">
              <canvas
                ref={holdCanvasRef}
                width={100}
                height={100}
                className="rounded-lg"
                style={{
                  width: 80,
                  height: 80
                }} />
              
            </div>
          </div>

          {/* Next piece */}
          <div className="bg-white/15 backdrop-blur-sm p-2 rounded-2xl border-2 border-white/40 shadow-md">
            <div className="font-display text-center text-white text-xs mb-1">
              🎁 NEXT
            </div>
            <div className="bg-indigo-950/50 rounded-xl p-1 flex items-center justify-center">
              <canvas
                ref={nextCanvasRef}
                width={100}
                height={100}
                className="rounded-lg"
                style={{
                  width: 80,
                  height: 80
                }} />
              
            </div>
          </div>

          {/* Shield */}
          {(() => {
            const cooldown = gameUI?.shieldCooldownEnd ?
            Math.max(
              0,
              Math.ceil((gameUI.shieldCooldownEnd - now) / 1000)
            ) :
            0;
            const ready = gameUI?.shieldAvailable;
            const total = 120;
            const pct = cooldown > 0 ? (total - cooldown) / total * 100 : 100;
            return (
              <div
                className={`p-2 rounded-2xl border-2 transition-all duration-300 ${ready ? 'bg-yellow-400/30 border-yellow-300 text-yellow-100 animate-pulse-border' : 'bg-white/10 border-white/30 text-white/70'}`}>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 font-display text-sm">
                    <span className="text-lg">🛡️</span>
                    <span>Shield (S)</span>
                  </div>
                  <span className="font-display text-sm">
                    {ready ? '✅ READY' : `${cooldown}s`}
                  </span>
                </div>
                {!ready &&
                <div className="mt-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                    <div
                    className="h-full bg-yellow-400 transition-all duration-500"
                    style={{
                      width: `${pct}%`
                    }} />
                  
                  </div>
                }
              </div>);

          })()}

          {/* Theme */}
          <div className="bg-white/15 backdrop-blur-sm p-2 rounded-2xl border-2 border-white/30 text-center">
            <div className="text-xl">{theme?.emoji || '🌌'}</div>
            <div
              className="font-display text-xs"
              style={{
                color: theme?.accent
              }}>
              
              {theme?.name || 'Cosmic'}
            </div>
          </div>

          {/* Controls (compact) — desktop only */}
          <div className="bg-white/10 backdrop-blur p-2 rounded-2xl border-2 border-white/20 space-y-1 text-xs font-hand hidden md:block">
            <div className="font-display text-white text-xs text-center mb-1">
              ⌨️ Controls
            </div>
            <div className="flex justify-between text-white/80">
              <span>⬅️➡️</span>
              <span>Move</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>⬆️</span>
              <span>Rotate</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>⬇️ / ␣</span>
              <span>Drop</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>⇧</span>
              <span>Hold</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>S / R</span>
              <span>Shield / Restart</span>
            </div>
          </div>
        </div>

        {/* Center - Game Canvas */}
        <div className="relative mx-auto flex-1 flex flex-col items-center h-full min-h-0 min-w-0 w-full">
          {/* Mobile-only compact stat bar */}
          <div className="md:hidden flex gap-2 mb-2 w-full max-w-xs">
            <div className="flex-1 bg-pink-500/30 backdrop-blur px-2 py-1 rounded-lg border-2 border-pink-300/60 text-center">
              <div className="text-[10px] font-hand text-pink-100">Score</div>
              <div className="font-display text-sm text-white tabular-nums">
                {gameUI?.score.toLocaleString() || 0}
              </div>
            </div>
            <div className="flex-1 bg-cyan-500/30 backdrop-blur px-2 py-1 rounded-lg border-2 border-cyan-300/60 text-center">
              <div className="text-[10px] font-hand text-cyan-100">Lines</div>
              <div className="font-display text-sm text-white">
                {gameUI?.linesCleared || 0}
              </div>
            </div>
            <div className="flex-1 bg-yellow-400/30 backdrop-blur px-2 py-1 rounded-lg border-2 border-yellow-300/60 text-center">
              <div className="text-[10px] font-hand text-yellow-100">Lvl</div>
              <div className="font-display text-sm text-white">
                {gameUI?.level || 1}
              </div>
            </div>
            <button
              onClick={() => setShowLeaderboardModal(true)}
              className="bg-white/15 backdrop-blur px-2 rounded-lg border-2 border-white/30 text-lg"
              aria-label="Show leaderboard">
              
              🏆
            </button>
          </div>
          {/* Game-area branding image (only displayed on the game) — tiny but visible */}
          <img
            src="/405fe514-7613-441a-9762-de1614e28bb3.png"
            alt="TETRINIMO — Block Adventure"
            className="h-6 md:h-8 w-auto mb-1 drop-shadow-[0_4px_10px_rgba(192,132,252,0.5)] animate-float select-none flex-shrink-0"
            draggable={false} />
          
          {rainbowFlash &&
          <div className="absolute inset-0 z-30 rounded-3xl animate-rainbow-flash pointer-events-none bg-gradient-to-br from-pink-500/40 via-yellow-300/40 to-cyan-400/40" />
          }
          <div
            className="relative rounded-2xl p-2 border-4 border-white/50 shadow-2xl flex-1 min-h-0 flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(15, 10, 40, 0.6)',
              boxShadow: `0 20px 60px ${theme?.accent || '#c084fc'}40, inset 0 0 30px rgba(0,0,0,0.5)`,
              aspectRatio: '1 / 2'
            }}>
            
            <canvas
              ref={canvasRef}
              width={300}
              height={600}
              className="rounded-xl block max-h-full max-w-full"
              style={{
                aspectRatio: '1 / 2',
                height: '100%',
                width: 'auto'
              }}
              aria-label="Tetrinimo game board" />
            

            {/* In-canvas event overlay — gravity, corruption, combo burst, level up, pre-game intro */}
            {canvasEffect &&
            <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center overflow-hidden rounded-xl animate-bounce-in">
                <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at center, ${canvasEffect.color}55 0%, ${canvasEffect.color}22 40%, transparent 80%)`
                }} />
              
                <div className="relative flex flex-col items-center text-center px-2">
                  <div className="text-6xl mb-2 animate-wobble drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
                    {canvasEffect.emoji}
                  </div>
                  <div
                  className="font-display text-3xl leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
                  style={{
                    color: canvasEffect.color
                  }}>
                  
                    {canvasEffect.text}
                  </div>
                  <div className="font-hand text-white text-base mt-2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                    {canvasEffect.sub}
                  </div>
                </div>
              </div>
            }

            {/* Disintegration particles on line clear */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {disintegrateParticles.map((p) =>
              <div
                key={p.id}
                className="absolute rounded-sm"
                style={{
                  left: p.left,
                  top: p.top,
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  boxShadow: `0 0 ${p.size}px ${p.color}`,
                  animation: `disintegrate ${p.duration}ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
                  ['--dx' as any]: `${p.dx}px`,
                  ['--dy' as any]: `${p.dy}px`,
                  ['--rot' as any]: `${p.rot}deg`
                }} />

              )}
            </div>

            {/* Floating score numbers */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {floatingScores.map((s) =>
              <div
                key={s.id}
                className="absolute font-display text-3xl text-yellow-300 animate-float-up"
                style={{
                  left: `${s.x}%`,
                  bottom: '20%',
                  textShadow:
                  '0 2px 0 rgba(0,0,0,0.5), 0 0 10px rgba(253,224,71,0.8)'
                }}>
                
                  +{s.value}
                </div>
              )}
            </div>

            {/* Game Over modal */}
            {gameUI?.gameOver &&
            <div className="absolute inset-0 bg-indigo-950/95 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-30 animate-bounce-in p-6">
                {isHighScore &&
              <div className="font-display text-2xl text-yellow-300 mb-2 animate-wobble">
                    🏆 NEW HIGH SCORE! 🏆
                  </div>
              }
                <h2 className="font-display text-4xl text-pink-400 mb-4 animate-wobble text-center">
                  GAME WOBBLE!
                </h2>
                <div className="bg-white/10 backdrop-blur px-6 py-4 rounded-3xl border-4 border-white/40 mb-6 text-center">
                  <p className="font-hand text-white/60 text-sm">Final Score</p>
                  <p
                  className="font-display text-5xl"
                  style={{
                    color: theme?.accent || '#c084fc'
                  }}>
                  
                    {gameUI.score.toLocaleString()}
                  </p>
                  <p className="font-hand text-cyan-200 text-sm mt-2">
                    {gameUI.linesCleared} lines cleared
                  </p>
                  {currentUser ?
                <p className="text-xs text-green-300 mt-2 font-hand">
                      ✅ Score saved!
                    </p> :

                <p className="text-xs text-yellow-300 mt-2 font-hand">
                      💡 Sign up to save your glory!
                    </p>
                }
                </div>
                <button
                onClick={handleRestart}
                className="btn-bubbly px-8 py-3 bg-lime-400 text-indigo-950 text-lg">
                
                  🔄 PLAY AGAIN
                </button>
              </div>
            }
          </div>

          {/* Mobile touch controls — only shown on mobile */}
          <div className="md:hidden mt-2 w-full max-w-xs grid grid-cols-5 gap-1 flex-shrink-0">
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                eventBus.emit(EVENTS.MOVE_LEFT);
              }}
              onClick={() => eventBus.emit(EVENTS.MOVE_LEFT)}
              className="bg-white/20 backdrop-blur p-2 rounded-xl border-2 border-white/30 text-2xl active:scale-90 active:bg-white/40 transition select-none"
              aria-label="Move left">
              
              ⬅️
            </button>
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                eventBus.emit(EVENTS.ROTATE);
              }}
              onClick={() => eventBus.emit(EVENTS.ROTATE)}
              className="bg-white/20 backdrop-blur p-2 rounded-xl border-2 border-white/30 text-2xl active:scale-90 active:bg-white/40 transition select-none"
              aria-label="Rotate">
              
              🔄
            </button>
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                eventBus.emit(EVENTS.MOVE_DOWN);
              }}
              onClick={() => eventBus.emit(EVENTS.MOVE_DOWN)}
              className="bg-white/20 backdrop-blur p-2 rounded-xl border-2 border-white/30 text-2xl active:scale-90 active:bg-white/40 transition select-none"
              aria-label="Move down">
              
              ⬇️
            </button>
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                eventBus.emit(EVENTS.HARD_DROP);
              }}
              onClick={() => eventBus.emit(EVENTS.HARD_DROP)}
              className="bg-white/20 backdrop-blur p-2 rounded-xl border-2 border-white/30 text-2xl active:scale-90 active:bg-white/40 transition select-none"
              aria-label="Hard drop">
              
              ⏬
            </button>
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                eventBus.emit(EVENTS.MOVE_RIGHT);
              }}
              onClick={() => eventBus.emit(EVENTS.MOVE_RIGHT)}
              className="bg-white/20 backdrop-blur p-2 rounded-xl border-2 border-white/30 text-2xl active:scale-90 active:bg-white/40 transition select-none"
              aria-label="Move right">
              
              ➡️
            </button>
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                eventBus.emit(EVENTS.SWAP_PIECE);
              }}
              onClick={() => eventBus.emit(EVENTS.SWAP_PIECE)}
              className="col-span-2 bg-cyan-500/30 backdrop-blur p-1.5 rounded-xl border-2 border-cyan-300/60 text-xs font-display text-white active:scale-90 transition select-none"
              aria-label="Hold piece">
              
              💼 Hold
            </button>
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                eventBus.emit(EVENTS.ACTIVATE_SHIELD);
              }}
              onClick={() => eventBus.emit(EVENTS.ACTIVATE_SHIELD)}
              className="bg-yellow-400/30 backdrop-blur p-1.5 rounded-xl border-2 border-yellow-300/60 text-xs font-display text-white active:scale-90 transition select-none"
              aria-label="Shield">
              
              🛡️
            </button>
            <button
              onClick={handleRestart}
              className="col-span-2 bg-pink-500/30 backdrop-blur p-1.5 rounded-xl border-2 border-pink-300/60 text-xs font-display text-white active:scale-90 transition select-none"
              aria-label="Restart">
              
              🔄 Restart
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-2 w-full md:w-52 flex-shrink-0 min-h-0 hidden md:flex">
          {/* Score / Lines / Level */}
          <div className="grid grid-cols-3 gap-2 flex-shrink-0">
            <div className="bg-pink-500/30 backdrop-blur p-2 rounded-xl border-2 border-pink-300/60 text-center">
              <div className="text-xs font-hand text-pink-100">🏆 Score</div>
              <div className="font-display text-lg text-white tabular-nums">
                {gameUI?.score.toLocaleString() || 0}
              </div>
            </div>
            <div className="bg-cyan-500/30 backdrop-blur p-2 rounded-xl border-2 border-cyan-300/60 text-center">
              <div className="text-xs font-hand text-cyan-100">📊 Lines</div>
              <div className="font-display text-lg text-white">
                {gameUI?.linesCleared || 0}
              </div>
            </div>
            <div className="bg-yellow-400/30 backdrop-blur p-2 rounded-xl border-2 border-yellow-300/60 text-center">
              <div className="text-xs font-hand text-yellow-100">⚡ Lvl</div>
              <div className="font-display text-lg text-white">
                {gameUI?.level || 1}
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl border-2 border-white/40 overflow-hidden shadow-md flex-1 min-h-0 flex flex-col">
            <div className="p-2 border-b-2 border-white/30 bg-yellow-400/20 flex items-center gap-2 flex-shrink-0">
              <span className="text-lg">🏆</span>
              <span className="font-display text-white text-sm">
                LEADERBOARD
              </span>
            </div>
            <div className="p-1 overflow-y-auto custom-scrollbar space-y-1 flex-1 min-h-0">
              {topScores.length > 0 ?
              topScores.map((score, idx) => {
                const isMe =
                currentUser && score.username === currentUser.username;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 p-1.5 rounded-xl text-xs transition-all ${isMe ? 'bg-yellow-300/30 border-2 border-yellow-300 animate-pulse-border' : 'bg-white/5'}`}>
                    
                      <span className="font-display text-base w-6 text-center">
                        {rankEmoji(idx)}
                      </span>
                      <span className="text-lg">
                        {getAvatar(score.username)}
                      </span>
                      <span className="font-display text-white text-xs truncate flex-1">
                        {score.username}
                      </span>
                      <div className="text-right">
                        <div
                        className="font-display text-xs"
                        style={{
                          color: idx === 0 ? '#fde047' : '#fff'
                        }}>
                        
                          {score.score.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-white/60 font-hand">
                          {score.lines}L
                        </div>
                      </div>
                    </div>);

              }) :

              <div className="text-center text-white/50 p-6 font-hand">
                  No glory yet — be the first! 🎮
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      {/* Toasts */}
      {/* Right-side popup notifications — positioned just left of the right panel so they don't block the playfield */}
      <div className="fixed top-16 right-2 md:top-20 md:right-[15rem] z-50 space-y-2 pointer-events-none flex flex-col items-end max-w-[180px]">
        {toasts.map((t) =>
        <div
          key={t.id}
          className="animate-bounce-in bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border-2 shadow-lg flex items-center gap-2 whitespace-nowrap"
          style={{
            borderColor: t.color
          }}>
          
            <span className="text-base">{t.emoji}</span>
            <span className="font-display text-indigo-950 text-xs">
              {t.text}
            </span>
          </div>
        )}
      </div>

      {/* Mobile Leaderboard Modal */}
      {showLeaderboardModal &&
      <div
        className="fixed inset-0 bg-indigo-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 md:hidden animate-bounce-in"
        onClick={() => setShowLeaderboardModal(false)}>
        
          <div
          className="bg-white/15 backdrop-blur-sm rounded-3xl border-4 border-white/40 max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}>
          
            <div className="p-3 border-b-2 border-white/30 bg-yellow-400/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <span className="font-display text-white text-lg">
                  LEADERBOARD
                </span>
              </div>
              <button
              onClick={() => setShowLeaderboardModal(false)}
              className="text-2xl hover:scale-125 transition-transform"
              aria-label="Close leaderboard">
              
                ✖️
              </button>
            </div>
            <div className="p-2 overflow-y-auto custom-scrollbar space-y-1 flex-1">
              {topScores.length > 0 ?
            topScores.map((score, idx) => {
              const isMe =
              currentUser && score.username === currentUser.username;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded-xl text-sm ${isMe ? 'bg-yellow-300/30 border-2 border-yellow-300' : 'bg-white/5'}`}>
                  
                      <span className="font-display text-lg w-8 text-center">
                        {rankEmoji(idx)}
                      </span>
                      <span className="text-xl">
                        {getAvatar(score.username)}
                      </span>
                      <span className="font-display text-white flex-1 truncate">
                        {score.username}
                      </span>
                      <div className="text-right">
                        <div
                      className="font-display text-sm"
                      style={{
                        color: idx === 0 ? '#fde047' : '#fff'
                      }}>
                      
                          {score.score.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-white/60 font-hand">
                          {score.lines}L
                        </div>
                      </div>
                    </div>);

            }) :

            <div className="text-center text-white/50 p-6 font-hand">
                  No glory yet — be the first! 🎮
                </div>
            }
            </div>
          </div>
        </div>
      }

      {/* Auth Modal — Gatekeeper Gloop */}
      {showAuthModal &&
      <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-bounce-in overflow-y-auto">
          <div className="max-w-md w-full">
            <div className="flex justify-center mb-6">
              <Gatekeeper
              loggedIn={!!currentUser}
              username={currentUser?.username} />
            
            </div>

            <div className="bg-white rounded-3xl border-4 border-indigo-900 shadow-2xl p-6">
              <div className="text-center mb-4">
                <TetrinimoTitle small />
              </div>

              {apiStatus === 'offline' &&
            <p className="text-amber-800 text-sm text-center font-hand bg-amber-100 rounded-xl py-2 px-3 mb-4 border-2 border-amber-300">
                  Backend offline — start Django on port 8000, or play as
                  guest.
                </p>
            }
              {apiStatus === 'checking' &&
            <p className="text-indigo-600/70 text-xs text-center font-hand mb-3">
                  Connecting to server…
                </p>
            }

              <div className="flex bg-indigo-100 rounded-full p-1 mb-5">
                <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 rounded-full font-display transition-all ${authMode === 'login' ? 'bg-pink-500 text-white shadow-md' : 'text-indigo-900'}`}>
                
                  🔑 LOGIN
                </button>
                <button
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2 rounded-full font-display transition-all ${authMode === 'signup' ? 'bg-lime-400 text-indigo-950 shadow-md' : 'text-indigo-900'}`}>
                
                  ✨ SIGN UP
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl pointer-events-none">
                    📧
                  </span>
                  <input
                  type="text"
                  value={authForm.username}
                  onChange={(e) =>
                  setAuthForm({
                    ...authForm,
                    username: e.target.value
                  })
                  }
                  className="w-full bg-pink-50 border-3 border-pink-300 rounded-full pl-11 pr-4 py-3 text-indigo-950 font-hand focus:outline-none focus:border-pink-500 transition-colors"
                  placeholder="Username"
                  aria-label="Username" />
                
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl pointer-events-none">
                    🔒
                  </span>
                  <input
                  type={showPassword ? 'text' : 'password'}
                  value={authForm.password}
                  onChange={(e) =>
                  setAuthForm({
                    ...authForm,
                    password: e.target.value
                  })
                  }
                  className="w-full bg-cyan-50 border-3 border-cyan-300 rounded-full pl-11 pr-12 py-3 text-indigo-950 font-hand focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="Password"
                  aria-label="Password" />
                
                  <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xl hover:scale-125 transition-transform"
                  aria-label={
                  showPassword ? 'Hide password' : 'Show password'
                  }>
                  
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>

                {authError &&
              <p className="text-red-500 text-sm text-center font-display bg-red-50 rounded-full py-2 border-2 border-red-200">
                    ⚠️ {authError}
                  </p>
              }

                <button
                type="submit"
                disabled={authSubmitting}
                className={`btn-bubbly w-full py-3 text-white text-lg disabled:opacity-60 disabled:cursor-wait ${authMode === 'login' ? 'bg-pink-500' : 'bg-lime-500'}`}>
                
                  {authSubmitting ?
              'Please wait…' :
              authMode === 'login' ?
                '🎮 ENTER THE GRID' :
                '🚀 JOIN THE FUN'}
                </button>
              </form>

              <div className="relative flex items-center justify-center my-4">
                <div className="absolute w-full h-0.5 bg-indigo-200" />
                <span className="relative bg-white px-3 text-xs text-indigo-400 font-display">
                  OR
                </span>
              </div>

              <button
              onClick={handleGuest}
              className="btn-bubbly w-full py-3 bg-yellow-400 text-indigo-950 text-sm">
              
                🎮 Just here to wobble? Play as Guest
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}