type EventHandler = (payload?: any) => void;

class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(handler);
    }
  }

  emit(event: string, payload?: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((handler) => handler(payload));
    }
  }

  clear() {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();

export const EVENTS = {
  MOVE_LEFT: 'MOVE_LEFT',
  MOVE_RIGHT: 'MOVE_RIGHT',
  MOVE_DOWN: 'MOVE_DOWN',
  ROTATE: 'ROTATE',
  HARD_DROP: 'HARD_DROP',
  PIECE_LOCKED: 'PIECE_LOCKED',
  LINE_CLEARED: 'LINE_CLEARED',
  LEVEL_UP: 'LEVEL_UP',
  GAME_OVER: 'GAME_OVER',
  STATE_UPDATED: 'STATE_UPDATED',
  THEME_CHANGED: 'THEME_CHANGED',
  ACTIVATE_SHIELD: 'ACTIVATE_SHIELD',
  SWAP_PIECE: 'SWAP_PIECE',
  CORRUPTION_SPAWN: 'CORRUPTION_SPAWN',
  GRAVITY_SHIFT: 'GRAVITY_SHIFT',
  COMBO_BURST: 'COMBO_BURST',
  SCORE_SAVED_TO_LEADERBOARD: 'SCORE_SAVED_TO_LEADERBOARD',
  SHIELD_USED: 'SHIELD_USED',
  SHIELD_ABSORBED: 'SHIELD_ABSORBED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT'
};