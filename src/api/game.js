// src/api/game.js
// Central game utilities: helpers, evaluation, and persistence.

export const MAX_GUESSES = 6;
export const HEADERS = [
  "Team",
  "Conf",
  "Div",
  "Pos",
  "Height",
  "Age",
  "Jersey #",
];

/* -------------------------
   Modes (Easy/Hard)
-------------------------- */
export const MODE_KEY = "sigdle-mode"; // persisted in localStorage
export const MODE_EASY = "topN"; // Easy = Top N players
export const MODE_HARD = "all"; // Hard = all active players
export const EASY_LIMIT = 250; // change to 300 if you prefer

export function getMode() {
  const m = localStorage.getItem(MODE_KEY);
  return m === MODE_HARD ? MODE_HARD : MODE_EASY;
}

export function setMode(mode) {
  localStorage.setItem(MODE_KEY, mode === MODE_HARD ? MODE_HARD : MODE_EASY);
}

// Choose the player pool based on mode.
// deps must include: { getAllActivePlayers, getTopPlayers? }
async function getPlayerPool(deps, mode, limit = EASY_LIMIT) {
  if (mode === MODE_HARD) {
    return await deps.getAllActivePlayers();
  }
  if (typeof deps.getTopPlayers === "function") {
    const top = await deps.getTopPlayers(limit);
    if (Array.isArray(top) && top.length) return top;
  }
  // Fallback to all players if top list isn't available
  return await deps.getAllActivePlayers();
}

/* -------------------------
   Height helpers
-------------------------- */
export const parseHeightInchesFromString = (s) => {
  if (typeof s !== "string") return null;
  // patterns like 6'7", 6' 7", 6-7, 6’7”, 6 ft 7 in
  const m = /(\d+)\s*['’\- ]\s*(\d{1,2})/.exec(s);
  if (m) {
    const ft = parseInt(m[1], 10);
    const inch = parseInt(m[2], 10);
    if (Number.isFinite(ft) && Number.isFinite(inch)) return ft * 12 + inch;
  }
  const num = parseInt(s, 10);
  if (Number.isFinite(num) && num > 48 && num < 100) return num;
  return null;
};

export const getHeightInches = (p) => {
  const candidates = [p?.heightIn, p?.heightInches, p?.htIn, p?.ht].filter(
    (x) => Number.isFinite(x)
  );
  if (candidates.length) return Math.round(candidates[0]);

  const cm = [p?.heightCm, p?.heightCM, p?.cmHeight].find((x) =>
    Number.isFinite(x)
  );
  if (Number.isFinite(cm)) return Math.round(cm / 2.54);

  const str = [p?.height, p?.Height, p?.htString].find(
    (x) => typeof x === "string"
  );
  const parsed = parseHeightInchesFromString(str);
  if (Number.isFinite(parsed)) return parsed;

  return null;
};

export const formatHeight = (inches) => {
  if (!Number.isFinite(inches)) return "—";
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
};

/* -------------------------
   Row values for the grid
-------------------------- */
export const toRowValues = (p) => {
  const hIn = getHeightInches(p);
  return [
    p?.teamAbbr || "—",
    p?.conference || "—",
    p?.division || "—",
    p?.position || "—",
    formatHeight(hIn),
    Number.isFinite(p?.age) ? p.age : "—",
    Number.isFinite(p?.jersey) ? p.jersey : "—",
  ];
};

/* -------------------------
   Evaluation helpers
-------------------------- */
// Returns [state, hint]; state: "correct"|"present"|"absent"
// hint: "up"|"down"|undefined. Hint shows whenever not green (correct) and both numbers exist.
export const evalNumeric = (g, s, band = 3) => {
  if (!Number.isFinite(g) || !Number.isFinite(s)) return ["absent", undefined];
  if (g === s) return ["correct", undefined];
  const hint = g < s ? "up" : "down"; // up = target is higher than guess
  const state = Math.abs(g - s) <= band ? "present" : "absent";
  return [state, hint];
};

// Evaluate a guess vs solution given precomputed Set of solution career teams
export const evaluateGuess = (g, sol, solutionTeamSet) => {
  if (!g || !sol)
    return { states: Array(7).fill("idle"), hints: Array(7).fill(undefined) };

  const guessTeam = (g.teamAbbr || "").toUpperCase();
  const solTeam = (sol.teamAbbr || "").toUpperCase();

  const teamState =
    guessTeam && solTeam
      ? guessTeam === solTeam
        ? "correct"
        : solutionTeamSet?.has(guessTeam)
        ? "present"
        : "absent"
      : "absent";

  const confState =
    g.conference && sol.conference && g.conference === sol.conference
      ? "correct"
      : "absent";

  const divState =
    g.division && sol.division && g.division === sol.division
      ? "correct"
      : "absent";

  const posState =
    g.position && sol.position && g.position === sol.position
      ? "correct"
      : "absent";

  const [heightState, heightHint] = evalNumeric(
    getHeightInches(g),
    getHeightInches(sol),
    3
  );
  const [ageState, ageHint] = evalNumeric(
    Number.isFinite(g?.age) ? g.age : NaN,
    Number.isFinite(sol?.age) ? sol.age : NaN,
    3
  );
  const [jerseyState, jerseyHint] = evalNumeric(
    Number.isFinite(g?.jersey) ? g.jersey : NaN,
    Number.isFinite(sol?.jersey) ? sol.jersey : NaN,
    3
  );

  return {
    states: [
      teamState,
      confState,
      divState,
      posState,
      heightState,
      ageState,
      jerseyState,
    ],
    hints: [
      undefined,
      undefined,
      undefined,
      undefined,
      heightHint,
      ageHint,
      jerseyHint,
    ],
  };
};

/* -------------------------
   Persistence (localStorage)
-------------------------- */
const STORAGE_KEY = "sigdle-state-v1";
const IN_PROGRESS_KEY = "sigdle-in-progress";

export function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed; // { solution, guesses, gameState, solutionTeams }
  } catch {
    return null;
  }
}

export function saveSaved({ solution, guesses, gameState, solutionTeams }) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ solution, guesses, gameState, solutionTeams })
    );
  } catch {}
}

export function updateInProgressFlag(gameState, guessesLen) {
  try {
    if (gameState === "playing" && guessesLen > 0) {
      localStorage.setItem(IN_PROGRESS_KEY, "1");
    } else {
      localStorage.removeItem(IN_PROGRESS_KEY);
    }
  } catch {}
}

/* -------------------------
   Round lifecycle helpers
-------------------------- */

// Lightly normalize/capitalize for membership checks
export function toSolutionTeamSet(teams) {
  return new Set((teams || []).map((t) => String(t).toUpperCase()));
}

// Decide next game state after adding this guess
export function nextGameStateAfterGuess(
  guess,
  solution,
  guessesSoFar,
  max = MAX_GUESSES
) {
  if (guess?.id && solution?.id && guess.id === solution.id) return "won";
  if (guessesSoFar + 1 >= max) return "lost";
  return "playing";
}

// Resolve career teams with fallback to current team
export async function resolveSolutionTeams(getCareerTeams, sol) {
  try {
    const teams = await getCareerTeams(sol.name);
    if (Array.isArray(teams) && teams.length) return teams;
  } catch {}
  return [sol.teamAbbr].filter(Boolean);
}

// Pick a random player from a pre-fetched list
export function pickRandomSolution(allPlayers) {
  if (!Array.isArray(allPlayers) || allPlayers.length === 0) return null;
  return allPlayers[Math.floor(Math.random() * allPlayers.length)];
}

/**
 * Restore a saved round if present; otherwise create a fresh one.
 * `deps` are passed in so we don't hard-couple this file to fetchers.
 *    { getAllActivePlayers, getTopPlayers?, getCareerTeams, mode?, topLimit? }
 * Returns: { solution, solutionTeams, guesses, gameState }
 */
export async function restoreOrCreateRound(deps) {
  const saved = loadSaved();
  if (saved?.solution) {
    const solutionTeams =
      Array.isArray(saved.solutionTeams) && saved.solutionTeams.length
        ? saved.solutionTeams
        : await resolveSolutionTeams(deps.getCareerTeams, saved.solution);
    return {
      solution: saved.solution,
      solutionTeams,
      guesses: Array.isArray(saved.guesses) ? saved.guesses : [],
      gameState: saved.gameState || "playing",
    };
  }

  const mode = deps.mode || getMode();
  const pool = await getPlayerPool(
    deps,
    mode,
    Number.isFinite(deps?.topLimit) ? deps.topLimit : EASY_LIMIT
  );
  const solution = pickRandomSolution(pool);

  if (!solution)
    return {
      solution: null,
      solutionTeams: [],
      guesses: [],
      gameState: "playing",
    };

  const solutionTeams = await resolveSolutionTeams(
    deps.getCareerTeams,
    solution
  );
  return { solution, solutionTeams, guesses: [], gameState: "playing" };
}

/**
 * Start a brand-new round.
 * Returns the same shape as restoreOrCreateRound.
 */
export async function newRound(deps) {
  const mode = deps.mode || getMode();
  const pool = await getPlayerPool(
    deps,
    mode,
    Number.isFinite(deps?.topLimit) ? deps.topLimit : EASY_LIMIT
  );
  const solution = pickRandomSolution(pool);
  const solutionTeams = solution
    ? await resolveSolutionTeams(deps.getCareerTeams, solution)
    : [];
  const state = { solution, solutionTeams, guesses: [], gameState: "playing" };
  saveSaved(state);
  return state;
}

export function canChangeModeNow() {
  const saved = loadSaved();
  const playing = saved?.gameState === "playing";
  const guessesUsed = Array.isArray(saved?.guesses) ? saved.guesses.length : 0;
  // lock if currently playing AND at least one guess used
  return !(playing && guessesUsed > 0);
}

/**
 * Try to set mode. Returns true if changed, false if blocked.
 * Use this from Settings to enforce the rule.
 */
export function setModeGuarded(mode) {
  if (!canChangeModeNow()) return false;
  setMode(mode);
  return true;
}
