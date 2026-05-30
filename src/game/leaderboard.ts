import { apiFetch } from '../api/client';
import { auth } from './auth';

export interface LeaderboardEntry {
  username: string;
  score: number;
  lines: number;
  timestamp: number;
}

export const leaderboard = {
  async getTopScores(limit = 10): Promise<LeaderboardEntry[]> {
    try {
      const res = await apiFetch(`/scores/?limit=${limit}`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async saveScore(_username: string, score: number, lines: number): Promise<void> {
    try {
      const res = await apiFetch('/scores/', {
        method: 'POST',
        body: JSON.stringify({ score, lines })
      });
      if (res.ok) {
        await auth.refreshUser();
      }
    } catch {
      // score not saved if backend unavailable
    }
  },

  async getUserRank(username: string): Promise<number | null> {
    try {
      const res = await apiFetch(
        `/scores/rank/?username=${encodeURIComponent(username)}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.rank ?? null;
    } catch {
      return null;
    }
  }
};
