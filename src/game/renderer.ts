import { GameState, COLS, ROWS, CORRUPTION_COLOR } from './game';
import { TETROMINOES } from './tetromino';
import type { Theme } from './procedural';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private nextCtx: CanvasRenderingContext2D;
  private holdCtx: CanvasRenderingContext2D;
  private blockSize: number;
  private theme: Theme | null = null;
  private fallback = {
    background: '#1e1b4b',
    gridLines: 'rgba(196, 181, 253, 0.15)',
    accent: '#c084fc'
  };

  constructor(
  canvas: HTMLCanvasElement,
  nextCanvas: HTMLCanvasElement,
  holdCanvas: HTMLCanvasElement)
  {
    this.ctx = canvas.getContext('2d')!;
    this.nextCtx = nextCanvas.getContext('2d')!;
    this.holdCtx = holdCanvas.getContext('2d')!;
    this.blockSize = canvas.width / COLS;
  }

  setTheme(theme: Theme) {
    this.theme = theme;
  }

  private getThemeColor(key: 'gridLines' | 'accent') {
    return this.theme?.[key] || this.fallback[key];
  }

  render(state: GameState) {
    this.drawBackground();
    this.drawGrid();
    this.drawBoard(state.grid);
    if (state.currentPiece) {
      this.drawGhostPiece(state);
      this.drawPiece(
        state.currentPiece.shape,
        state.currentPiece.x,
        state.currentPiece.y,
        state.currentPiece.color,
        1,
        state.shieldActive
      );
    }
    this.drawPreview(this.nextCtx, state.nextPieceType);
    this.drawPreview(this.holdCtx, state.heldPieceType);
  }

  private drawBackground() {
    // Solid dark background (the page itself shows the gradient behind canvas)
    this.ctx.fillStyle = 'rgba(15, 10, 40, 0.95)';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  private drawGrid() {
    this.ctx.strokeStyle = this.getThemeColor('gridLines');
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.blockSize, 0);
      this.ctx.lineTo(x * this.blockSize, ROWS * this.blockSize);
      this.ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.blockSize);
      this.ctx.lineTo(COLS * this.blockSize, y * this.blockSize);
      this.ctx.stroke();
    }
  }

  private drawBoard(grid: (string | null)[][]) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c];
        if (cell) {
          if (cell === CORRUPTION_COLOR) this.drawCorruptionBlock(c, r);else
          this.drawBlock(c, r, cell);
        }
      }
    }
  }

  private drawPiece(
  shape: number[][],
  x: number,
  y: number,
  color: string,
  alpha = 1,
  isShieldActive = false)
  {
    if (isShieldActive) {
      this.ctx.shadowColor = '#fde047';
      this.ctx.shadowBlur = 22;
    }
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          this.drawBlock(
            x + c,
            y + r,
            isShieldActive ? '#fde047' : color,
            alpha
          );
        }
      }
    }
    this.ctx.shadowBlur = 0;
  }

  private drawGhostPiece(state: GameState) {
    if (!state.currentPiece) return;
    let ghostY = state.currentPiece.y;
    while (
    !this.checkCollision(
      state.currentPiece.x,
      ghostY + 1,
      state.currentPiece.shape,
      state.grid
    ))
    {
      ghostY++;
    }
    this.drawPiece(
      state.currentPiece.shape,
      state.currentPiece.x,
      ghostY,
      state.currentPiece.color,
      0.18
    );
  }

  private checkCollision(
  x: number,
  y: number,
  shape: number[][],
  grid: (string | null)[][])
  : boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const nx = x + c;
          const ny = y + r;
          if (
          nx < 0 ||
          nx >= COLS ||
          ny >= ROWS ||
          ny >= 0 && grid[ny][nx] !== null)

          return true;
        }
      }
    }
    return false;
  }

  // Cartoony rounded block with inner glow
  private drawBlock(x: number, y: number, color: string, alpha = 1) {
    const ctx = this.ctx;
    const px = x * this.blockSize;
    const py = y * this.blockSize;
    const size = this.blockSize;
    const radius = 8;
    const pad = 2;

    ctx.globalAlpha = alpha;

    // Main rounded body
    ctx.fillStyle = color;
    this.roundRect(
      ctx,
      px + pad,
      py + pad,
      size - pad * 2,
      size - pad * 2,
      radius
    );
    ctx.fill();

    // Inner highlight (top-left)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    this.roundRect(
      ctx,
      px + pad + 3,
      py + pad + 3,
      size - pad * 2 - 6,
      (size - pad * 2 - 6) / 2.5,
      radius - 3
    );
    ctx.fill();

    // Inner shadow (bottom-right)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    this.roundRect(
      ctx,
      px + pad + 4,
      py + size - size / 3 - pad,
      size - pad * 2 - 8,
      size / 4,
      radius - 3
    );
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  private drawCorruptionBlock(x: number, y: number) {
    const ctx = this.ctx;
    const px = x * this.blockSize;
    const py = y * this.blockSize;
    const size = this.blockSize;
    const pad = 2;

    // Dark purple base
    ctx.fillStyle = '#3b0764';
    this.roundRect(ctx, px + pad, py + pad, size - pad * 2, size - pad * 2, 8);
    ctx.fill();

    // Magenta glitch dots
    ctx.fillStyle = CORRUPTION_COLOR;
    for (let i = 0; i < 4; i++) {
      const dx = px + 4 + Math.random() * (size - 8);
      const dy = py + 4 + Math.random() * (size - 8);
      ctx.fillRect(dx, dy, 3, 3);
    }

    // Grinning eyes
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(px + size * 0.35, py + size * 0.4, 2.5, 0, Math.PI * 2);
    ctx.arc(px + size * 0.65, py + size * 0.4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px + size / 2, py + size * 0.6, size * 0.18, 0, Math.PI);
    ctx.stroke();
  }

  private roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number)
  {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private drawPreview(ctx: CanvasRenderingContext2D, type: string | null) {
    ctx.fillStyle = 'rgba(30, 27, 75, 0.9)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!type) return;

    const tetromino = TETROMINOES[type as keyof typeof TETROMINOES];
    // Use current theme color if available
    const themeColor = this.theme?.pieceColors[type as keyof typeof TETROMINOES];
    const color = themeColor || tetromino.color;
    const shape = tetromino.shape;
    const blockSize = ctx.canvas.width / 5;
    const offsetX = (5 - shape[0].length) / 2;
    const offsetY = (5 - shape.length) / 2;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const x = (offsetX + c) * blockSize;
          const y = (offsetY + r) * blockSize;
          ctx.fillStyle = color;
          this.roundRect(ctx, x + 2, y + 2, blockSize - 4, blockSize - 4, 6);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          this.roundRect(
            ctx,
            x + 4,
            y + 4,
            blockSize - 8,
            (blockSize - 8) / 2.5,
            4
          );
          ctx.fill();
        }
      }
    }
  }
}