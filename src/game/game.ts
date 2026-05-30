import { eventBus, EVENTS } from './eventBus';
import { TETROMINOES, rotateMatrix, TetrominoType } from './tetromino';
import { ProceduralGenerator, Theme } from './procedural';

export const COLS = 10;
export const ROWS = 20;
export const CORRUPTION_COLOR = '#ff00ff';

export interface GameState {
  grid: (string | null)[][];
  currentPiece: {
    shape: number[][];
    color: string;
    x: number;
    y: number;
  } | null;
  nextPieceType: TetrominoType | null;
  score: number;
  linesCleared: number;
  level: number;
  gameOver: boolean;
  isPaused: boolean;

  // New Mechanics
  shieldAvailable: boolean;
  shieldActive: boolean;
  shieldCooldownEnd: number | null; // Date.now() ms when shield becomes available again
  heldPieceType: TetrominoType | null;
  canSwap: boolean;
  lastGravityShift: number;
  corruptionThreshold: number;
}

export const SHIELD_COOLDOWN_MS = 90_000; // 1 minute 30 seconds
export const SHIELD_COOLDOWN_SEC = SHIELD_COOLDOWN_MS / 1000;

export class Game {
  private state: GameState;
  private generator: ProceduralGenerator;
  private lastTime: number = 0;
  private dropCounter: number = 0;
  private animationFrameId: number | null = null;
  private currentTheme: Theme | null = null;
  private gravityInterval: number = 30000;

  constructor() {
    this.generator = new ProceduralGenerator();
    this.state = this.getInitialState();
    this.setupEventListeners();
  }

  private getInitialState(): GameState {
    return {
      grid: Array.from({ length: ROWS }, () => new Array(COLS).fill(null)),
      currentPiece: null,
      nextPieceType: null,
      score: 0,
      linesCleared: 0,
      level: 1,
      gameOver: false,
      isPaused: false,

      shieldAvailable: true,
      shieldActive: false,
      shieldCooldownEnd: null,
      heldPieceType: null,
      canSwap: true,
      lastGravityShift: performance.now(),
      corruptionThreshold: 15
    };
  }

  private setupEventListeners() {
    eventBus.on(EVENTS.MOVE_LEFT, () => this.move(-1, 0));
    eventBus.on(EVENTS.MOVE_RIGHT, () => this.move(1, 0));
    eventBus.on(EVENTS.MOVE_DOWN, () => this.move(0, 1));
    eventBus.on(EVENTS.ROTATE, () => this.rotate());
    eventBus.on(EVENTS.HARD_DROP, () => this.hardDrop());
    eventBus.on(EVENTS.SWAP_PIECE, () => this.swapPiece());
    eventBus.on(EVENTS.ACTIVATE_SHIELD, () => this.activateShield());
  }

  start() {
    this.state = this.getInitialState();
    this.generator = new ProceduralGenerator();
    this.gravityInterval = this.generator.getGravityInterval();
    this.currentTheme = this.generator.getTheme(0);
    this.state.nextPieceType = this.generator.getNextPiece();
    this.spawnPiece();
    this.updateTheme();

    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.lastTime = performance.now();
    this.state.lastGravityShift = this.lastTime;
    this.loop(this.lastTime);

    this.emitState();
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  getState(): GameState {
    return this.state;
  }

  private tryRechargeShield() {
    if (
      this.state.shieldAvailable ||
      this.state.shieldActive ||
      this.state.shieldCooldownEnd === null
    ) {
      return;
    }
    if (Date.now() >= this.state.shieldCooldownEnd) {
      this.state.shieldAvailable = true;
      this.state.shieldCooldownEnd = null;
      this.emitState();
    }
  }

  private loop = (time: number) => {
    this.tryRechargeShield();

    if (!this.state.gameOver && !this.state.isPaused) {
      const deltaTime = time - this.lastTime;
      this.lastTime = time;
      this.dropCounter += deltaTime;

      if (time - this.state.lastGravityShift > this.gravityInterval) {
        this.applyGravityShift();
        this.state.lastGravityShift = time;
        this.gravityInterval = this.generator.getGravityInterval();
      }

      const dropSpeed = this.generator.getFallSpeed(this.state.level);

      if (this.dropCounter > dropSpeed) {
        this.move(0, 1);
        this.dropCounter = 0;
      }
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private getPieceColor(type: TetrominoType): string {
    if (this.currentTheme) return this.currentTheme.pieceColors[type];
    return TETROMINOES[type].color;
  }

  private spawnPiece() {
    const type = this.state.nextPieceType || this.generator.getNextPiece();
    const tetromino = TETROMINOES[type];

    this.state.currentPiece = {
      shape: tetromino.shape,
      color: this.getPieceColor(type),
      x: Math.floor(COLS / 2) - Math.floor(tetromino.shape[0].length / 2),
      y: 0
    };

    this.state.nextPieceType = this.generator.getNextPiece();
    this.state.canSwap = true;

    if (
    this.checkCollision(
      this.state.currentPiece.x,
      this.state.currentPiece.y,
      this.state.currentPiece.shape
    ))
    {
      this.state.gameOver = true;
      eventBus.emit(EVENTS.GAME_OVER, {
        score: this.state.score,
        lines: this.state.linesCleared
      });
    }

    this.emitState();
  }

  private swapPiece() {
    if (!this.state.canSwap || !this.state.currentPiece || this.state.gameOver)
    return;

    const currentType = Object.keys(TETROMINOES).find(
      (key) =>
      this.getPieceColor(key as TetrominoType) ===
      this.state.currentPiece!.color
    ) as TetrominoType;

    if (this.state.heldPieceType === null) {
      this.state.heldPieceType = currentType;
      this.spawnPiece();
    } else {
      const temp = this.state.heldPieceType;
      this.state.heldPieceType = currentType;

      const tetromino = TETROMINOES[temp];
      this.state.currentPiece = {
        shape: tetromino.shape,
        color: this.getPieceColor(temp),
        x: Math.floor(COLS / 2) - Math.floor(tetromino.shape[0].length / 2),
        y: 0
      };
    }

    this.state.canSwap = false;
    if (this.state.shieldActive) {
      this.beginShieldCooldown();
    }
    this.emitState();
  }

  private activateShield() {
    if (
      this.state.shieldAvailable &&
      !this.state.shieldActive &&
      !this.state.gameOver &&
      this.state.currentPiece
    ) {
      this.state.shieldAvailable = false;
      this.state.shieldActive = true;
      eventBus.emit(EVENTS.SHIELD_USED);
      this.emitState();
    }
  }

  /** Starts the 90s recharge after the shield is spent on the current piece. */
  private beginShieldCooldown() {
    if (!this.state.shieldActive) return;
    this.state.shieldActive = false;
    this.state.shieldCooldownEnd = Date.now() + SHIELD_COOLDOWN_MS;
    this.emitState();
  }

  private clearCorruptionNear(boardY: number, boardX: number): boolean {
    const offsets: [number, number][] = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    let cleared = false;
    for (const [dr, dc] of offsets) {
      const ny = boardY + dr;
      const nx = boardX + dc;
      if (
        ny >= 0 &&
        ny < ROWS &&
        nx >= 0 &&
        nx < COLS &&
        this.state.grid[ny][nx] === CORRUPTION_COLOR
      ) {
        this.state.grid[ny][nx] = null;
        cleared = true;
      }
    }
    return cleared;
  }

  private applyGravityShift() {
    eventBus.emit(EVENTS.GRAVITY_SHIFT);
    const shiftDir = Math.random() > 0.5 ? 1 : -1;
    for (let r = ROWS - 4; r < ROWS; r++) {
      if (r < 0) continue;
      const newRow = new Array(COLS).fill(null);
      for (let c = 0; c < COLS; c++) {
        const newC = c + shiftDir;
        if (newC >= 0 && newC < COLS) newRow[newC] = this.state.grid[r][c];
      }
      this.state.grid[r] = newRow;
    }
    this.emitState();
  }

  private spawnCorruption() {
    eventBus.emit(EVENTS.CORRUPTION_SPAWN);
    const col = this.generator.getCorruptionColumn(COLS);
    let row = ROWS - 1;
    for (let r = 0; r < ROWS; r++) {
      if (this.state.grid[r][col] !== null) {
        row = Math.max(0, r - 1);
        break;
      }
    }
    this.state.grid[row][col] = CORRUPTION_COLOR;
  }

  private move(dx: number, dy: number) {
    if (!this.state.currentPiece || this.state.gameOver) return;

    const newX = this.state.currentPiece.x + dx;
    const newY = this.state.currentPiece.y + dy;

    if (!this.checkCollision(newX, newY, this.state.currentPiece.shape)) {
      this.state.currentPiece.x = newX;
      this.state.currentPiece.y = newY;
      this.emitState();
    } else if (dy > 0) {
      this.lockPiece();
    }
  }

  private rotate() {
    if (!this.state.currentPiece || this.state.gameOver) return;

    const newShape = rotateMatrix(this.state.currentPiece.shape);

    let newX = this.state.currentPiece.x;
    if (this.checkCollision(newX, this.state.currentPiece.y, newShape)) {
      newX++;
      if (this.checkCollision(newX, this.state.currentPiece.y, newShape)) {
        newX -= 2;
        if (this.checkCollision(newX, this.state.currentPiece.y, newShape)) {
          return;
        }
      }
    }

    this.state.currentPiece.shape = newShape;
    this.state.currentPiece.x = newX;
    this.emitState();
  }

  private hardDrop() {
    if (!this.state.currentPiece || this.state.gameOver) return;

    let newY = this.state.currentPiece.y;
    while (
    !this.checkCollision(
      this.state.currentPiece.x,
      newY + 1,
      this.state.currentPiece.shape
    ))
    {
      newY++;
      this.state.score += 2; // Hard drop bonus
    }
    this.state.currentPiece.y = newY;
    this.lockPiece();
  }

  private checkCollision(x: number, y: number, shape: number[][]): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newX = x + c;
          const newY = y + r;

          if (
          newX < 0 ||
          newX >= COLS ||
          newY >= ROWS ||
          newY >= 0 && this.state.grid[newY][newX] !== null)
          {
            return true;
          }
        }
      }
    }
    return false;
  }

  private lockPiece() {
    if (!this.state.currentPiece) return;

    const { shape, color, x, y } = this.state.currentPiece;
    const hadShield = this.state.shieldActive;
    let absorbedCorruption = false;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          if (y + r < 0) {
            this.state.gameOver = true;
            eventBus.emit(EVENTS.GAME_OVER, {
              score: this.state.score,
              lines: this.state.linesCleared
            });
            return;
          }

          const boardY = y + r;
          const boardX = x + c;

          if (hadShield && this.clearCorruptionNear(boardY, boardX)) {
            absorbedCorruption = true;
          }

          this.state.grid[boardY][boardX] = color;
        }
      }
    }

    if (absorbedCorruption) {
      eventBus.emit(EVENTS.SHIELD_ABSORBED);
    }

    if (hadShield) {
      this.beginShieldCooldown();
    }

    eventBus.emit(EVENTS.PIECE_LOCKED);
    this.clearLines();

    if (!this.state.gameOver) {
      this.spawnPiece();
    }
  }

  private clearLines() {
    let linesCleared = 0;

    for (let r = ROWS - 1; r >= 0; r--) {
      // A line is full if every cell is not null AND not corruption
      // Actually, corruption CANNOT be cleared unless adjacent to a line clear.
      // So a line with corruption is NOT full.
      if (
      this.state.grid[r].every(
        (cell) => cell !== null && cell !== CORRUPTION_COLOR
      ))
      {
        this.state.grid.splice(r, 1);
        this.state.grid.unshift(new Array(COLS).fill(null));
        linesCleared++;
        r++; // Check the same row index again since we shifted down
      }
    }

    if (linesCleared > 0) {
      this.state.linesCleared += linesCleared;

      const levelMultiplier = this.state.level;
      switch (linesCleared) {
        case 1:
          this.state.score += 40 * levelMultiplier;
          break;
        case 2:
          this.state.score += 100 * levelMultiplier;
          break;
        case 3:
          this.state.score += 300 * levelMultiplier;
          break;
        case 4:
          this.state.score += 1200 * levelMultiplier;
          break;
      }

      eventBus.emit(EVENTS.LINE_CLEARED, linesCleared);

      // Combo Burst
      if (linesCleared >= 4) {
        eventBus.emit(EVENTS.COMBO_BURST);
        // Remove bottom 2 rows completely
        this.state.grid.splice(ROWS - 2, 2);
        this.state.grid.unshift(
          new Array(COLS).fill(null),
          new Array(COLS).fill(null)
        );
      }

      // Corruption Spawn
      if (this.state.linesCleared >= this.state.corruptionThreshold) {
        this.spawnCorruption();
        this.state.corruptionThreshold += 15;
      }

      const newLevel = this.generator.getLevel(this.state.linesCleared);
      if (newLevel > this.state.level) {
        this.state.level = newLevel;
        eventBus.emit(EVENTS.LEVEL_UP, this.state.level);
      }

      this.updateTheme();
    }

    this.emitState();
  }

  private updateTheme() {
    const theme = this.generator.getTheme(this.state.linesCleared);
    this.currentTheme = theme;
    eventBus.emit(EVENTS.THEME_CHANGED, theme);
  }

  private emitState() {
    eventBus.emit(EVENTS.STATE_UPDATED, { ...this.state });
  }
}