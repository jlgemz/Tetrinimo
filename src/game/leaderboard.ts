export interface LeaderboardEntry {
  username: string;
  score: number;
  lines: number;
  timestamp: number;
}

const LEADERBOARD_KEY = 'tetris_leaderboard';

export const leaderboard = {
  getScores(): LeaderboardEntry[] {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveScore(username: string, score: number, lines: number) {
    const scores = this.getScores();
    scores.push({
      username,
      score,
      lines,
      timestamp: Date.now()
    });

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);

    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(scores));
  },

  getTopScores(limit: number = 10): LeaderboardEntry[] {
    return this.getScores().slice(0, limit);
  },

  getUserRank(username: string): number | null {
    const scores = this.getScores();
    // Find highest score for this user
    const userBestIndex = scores.findIndex((s) => s.username === username);
    return userBestIndex !== -1 ? userBestIndex + 1 : null;
  }
};