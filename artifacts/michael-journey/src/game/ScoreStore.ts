/**
 * ScoreStore — persists a top-3 leaderboard in localStorage.
 */

export interface ScoreEntry {
  name:  string;
  score: number;
}

const KEY = "mj_leaderboard";

export function getTopScores(n = 3): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const all: ScoreEntry[] = raw ? JSON.parse(raw) : [];
    return all.slice(0, n);
  } catch {
    return [];
  }
}

export function getHighScore(): number {
  const top = getTopScores(1);
  return top.length > 0 ? top[0].score : 0;
}

export function saveScore(name: string, score: number): void {
  if (score <= 0) return;
  try {
    const raw = localStorage.getItem(KEY);
    const all: ScoreEntry[] = raw ? JSON.parse(raw) : [];
    all.push({ name: name.trim().toUpperCase().slice(0, 14) || "ANON", score });
    all.sort((a, b) => b.score - a.score);
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 3)));
  } catch {}
}

/** Returns true if this score would enter the top-3 leaderboard. */
export function isQualifyingForLeaderboard(score: number): boolean {
  if (score <= 0) return false;
  const top = getTopScores(3);
  if (top.length < 3) return true;
  return score > top[top.length - 1].score;
}
