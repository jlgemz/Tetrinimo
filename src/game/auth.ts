import { apiFetch, ensureCsrf, isApiError, parseError } from '../api/client';

export interface User {
  id: string;
  username: string;
  totalScore: number;
  gamesPlayed: number;
  avatar: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
}

let cachedUser: User | null = null;

function mapUser(data: Record<string, unknown>): User {
  return {
    id: String(data.id),
    username: String(data.username),
    totalScore: Number(data.totalScore ?? 0),
    gamesPlayed: Number(data.gamesPlayed ?? 0),
    avatar: String(data.avatar ?? '🎮')
  };
}

function authErrorMessage(err: unknown, fallback: string): string {
  if (isApiError(err)) return err.message;
  return fallback;
}

export const auth = {
  getCurrentUser(): User | null {
    return cachedUser;
  },

  setCachedUser(user: User | null) {
    cachedUser = user;
  },

  async fetchCurrentUser(): Promise<User | null> {
    try {
      const res = await apiFetch('/auth/me/');
      if (!res.ok) {
        cachedUser = null;
        return null;
      }
      const data = await res.json();
      cachedUser = mapUser(data);
      return cachedUser;
    } catch {
      cachedUser = null;
      return null;
    }
  },

  async signup(username: string, password: string): Promise<AuthResult> {
    try {
      await ensureCsrf();
      const res = await apiFetch('/auth/register/', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        return {
          success: false,
          error: await parseError(res, 'Registration failed')
        };
      }
      const data = await res.json();
      cachedUser = mapUser(data);
      return { success: true, user: cachedUser };
    } catch (err) {
      return {
        success: false,
        error: authErrorMessage(err, 'Registration failed')
      };
    }
  },

  async login(username: string, password: string): Promise<AuthResult> {
    try {
      await ensureCsrf();
      const res = await apiFetch('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        return {
          success: false,
          error: await parseError(res, 'Invalid username or password')
        };
      }
      const data = await res.json();
      cachedUser = mapUser(data);
      return { success: true, user: cachedUser };
    } catch (err) {
      return {
        success: false,
        error: authErrorMessage(err, 'Invalid username or password')
      };
    }
  },

  async logout(): Promise<void> {
    try {
      await apiFetch('/auth/logout/', { method: 'POST' });
    } catch {
      // clear local session even if backend is down
    }
    cachedUser = null;
  },

  async refreshUser(): Promise<User | null> {
    return this.fetchCurrentUser();
  }
};
