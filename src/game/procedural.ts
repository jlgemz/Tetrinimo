import { TetrominoType } from './tetromino';

export interface Theme {
  name: string;
  emoji: string;
  background: string;
  gridLines: string;
  accent: string;
  pieceColors: Record<TetrominoType, string>;
}

const THEMES: Theme[] = [
{
  name: 'Candy Land',
  emoji: '🍭',
  background:
  'linear-gradient(135deg, #4a1d4f 0%, #7d2168 50%, #c2185b 100%)',
  gridLines: 'rgba(255, 182, 193, 0.15)',
  accent: '#ff6ec7',
  pieceColors: {
    I: '#ff6ec7', // hot pink
    O: '#ffd166', // sunny yellow
    T: '#ff9f1c', // tangerine
    L: '#f72585', // raspberry
    J: '#ff85a1', // light pink
    S: '#ffb86b', // peach
    Z: '#ff5d8f' // bubblegum
  }
},
{
  name: 'Underwater',
  emoji: '🐠',
  background:
  'linear-gradient(135deg, #0d1b2a 0%, #1b4965 50%, #2a9d8f 100%)',
  gridLines: 'rgba(94, 234, 212, 0.15)',
  accent: '#22d3ee',
  pieceColors: {
    I: '#22d3ee', // cyan
    O: '#5eead4', // teal
    T: '#67e8f9', // sky cyan
    L: '#06b6d4', // deep cyan
    J: '#0ea5e9', // ocean blue
    S: '#2dd4bf', // mint teal
    Z: '#14b8a6' // seagreen
  }
},
{
  name: 'Jungle',
  emoji: '🌿',
  background:
  'linear-gradient(135deg, #1a2e05 0%, #2d5016 50%, #4a7c2e 100%)',
  gridLines: 'rgba(190, 242, 100, 0.15)',
  accent: '#a3e635',
  pieceColors: {
    I: '#a3e635', // lime
    O: '#fcd34d', // banana
    T: '#84cc16', // grass
    L: '#facc15', // gold-leaf
    J: '#65a30d', // deep green
    S: '#bef264', // light lime
    Z: '#22c55e' // emerald
  }
},
{
  name: 'Cosmic',
  emoji: '🌌',
  background:
  'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #7c3aed 100%)',
  gridLines: 'rgba(196, 181, 253, 0.15)',
  accent: '#c084fc',
  pieceColors: {
    I: '#c084fc', // purple
    O: '#fde047', // star yellow
    T: '#e879f9', // magenta
    L: '#a855f7', // violet
    J: '#818cf8', // indigo
    S: '#f0abfc', // light magenta
    Z: '#7c3aed' // deep violet
  }
}];


export class ProceduralGenerator {
  private bag: TetrominoType[] = [];
  private readonly types: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

  private fillBag() {
    this.bag = [...this.types];
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }

  getNextPiece(): TetrominoType {
    if (this.bag.length === 0) this.fillBag();
    return this.bag.pop()!;
  }

  getTheme(linesCleared: number): Theme {
    const themeIndex = Math.floor(linesCleared / 5) % THEMES.length;
    return THEMES[themeIndex];
  }

  /**
   * Milliseconds between automatic drops. Uses game level (not line count).
   * Levels 1–4 ease in gently; level 5+ ramps up noticeably.
   */
  getFallSpeed(level: number): number {
    const lv = Math.max(1, level);
    if (lv <= 4) {
      return 1000 - (lv - 1) * 50;
    }
    const level5Speed = 700;
    return Math.max(90, Math.round(level5Speed * Math.pow(0.9, lv - 5)));
  }

  getLevel(linesCleared: number): number {
    return Math.floor(linesCleared / 10) + 1;
  }

  getGravityInterval(): number {
    return 30000 + Math.random() * 15000;
  }

  getCorruptionColumn(cols: number): number {
    return Math.floor(Math.random() * cols);
  }
}