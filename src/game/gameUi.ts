import type { GameState } from './game';

/** Subset of game state that drives React UI (not the playfield canvas). */
export interface GameUIState {
  score: number;
  linesCleared: number;
  level: number;
  gameOver: boolean;
  shieldAvailable: boolean;
  shieldActive: boolean;
  shieldCooldownEnd: number | null;
}

export function pickGameUI(state: GameState): GameUIState {
  return {
    score: state.score,
    linesCleared: state.linesCleared,
    level: state.level,
    gameOver: state.gameOver,
    shieldAvailable: state.shieldAvailable,
    shieldActive: state.shieldActive,
    shieldCooldownEnd: state.shieldCooldownEnd
  };
}

export function gameUIChanged(
  prev: GameUIState | null,
  next: GameUIState
): boolean {
  if (!prev) return true;
  return (
    prev.score !== next.score ||
    prev.linesCleared !== next.linesCleared ||
    prev.level !== next.level ||
    prev.gameOver !== next.gameOver ||
    prev.shieldAvailable !== next.shieldAvailable ||
    prev.shieldActive !== next.shieldActive ||
    prev.shieldCooldownEnd !== next.shieldCooldownEnd
  );
}
