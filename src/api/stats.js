const KEY = "sigdle-stats-v1";

export function defaultStats() {
  return {
    played: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    maxStreak: 0,
    // index 0..5 -> solved in 1..6 guesses
    guessDist: [0, 0, 0, 0, 0, 0],
  };
}

export function getStats() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw);
    const base = defaultStats();
    return {
      ...base,
      ...parsed,
      guessDist:
        Array.isArray(parsed?.guessDist) && parsed.guessDist.length === 6
          ? parsed.guessDist
          : base.guessDist,
    };
  } catch {
    return defaultStats();
  }
}

export function saveStats(stats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {}
}

/** Call when a round ends. */
export function recordGameResult(result, guessesUsed) {
  const s = getStats();

  if (result === "won") {
    s.wins += 1;
    s.currentStreak += 1;
    s.maxStreak = Math.max(s.maxStreak, s.currentStreak);
    if (Number.isFinite(guessesUsed) && guessesUsed >= 1 && guessesUsed <= 6) {
      s.guessDist[guessesUsed - 1] += 1;
    }
  } else if (result === "lost") {
    s.losses += 1;
    s.currentStreak = 0;
  }

  s.played = s.wins + s.losses;
  saveStats(s);
  return s;
}
