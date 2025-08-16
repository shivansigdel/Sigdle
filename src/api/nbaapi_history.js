// src/api/nbaapi_history.js

// ==========================
// Config & Logging
// ==========================
const API_BASE = "/nbaapi";
const LOG_PREFIX = "[nbaapi]";

// Toggle to reduce console chatter
const DEBUG = true;
const log = (...args) => DEBUG && console.log(LOG_PREFIX, ...args);
const warn = (...args) => console.warn(LOG_PREFIX, ...args);
const err = (...args) => console.error(LOG_PREFIX, ...args);

// ==========================
// Small utilities
// ==========================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Safe JSON fetch with:
 * - request logging
 * - 404 handling (returns null)
 * - basic retry for transient 5xx
 */
async function fetchJSON(url, { retries = 1, retryDelayMs = 250 } = {}) {
  if (DEBUG) {
    // Mirror your console lines like the ones you shared
    // Example: nbaapi_history.js:15 [nbaapi] GET /nbaapi/PlayerDataTotals/query?...
    console.log("nbaapi_history.js:15", LOG_PREFIX, "GET", url);
  }

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });

    if (res.status === 404) {
      warn("404 (Not Found) →", url);
      return null;
    }

    if (!res.ok) {
      // Retry basic 5xx errors once
      if (retries > 0 && res.status >= 500) {
        warn(`Server ${res.status}; retrying in ${retryDelayMs}ms →`, url);
        await sleep(retryDelayMs);
        return fetchJSON(url, {
          retries: retries - 1,
          retryDelayMs: retryDelayMs * 2,
        });
      }
      throw new Error(`HTTP ${res.status} for ${url}`);
    }

    return await res.json();
  } catch (e) {
    if (retries > 0) {
      warn(`Fetch error (${e.message}); retrying in ${retryDelayMs}ms →`, url);
      await sleep(retryDelayMs);
      return fetchJSON(url, {
        retries: retries - 1,
        retryDelayMs: retryDelayMs * 2,
      });
    }
    err("Fetch failed:", e.message);
    throw e;
  }
}

// ==========================
// Diacritics handling
// ==========================

const toASCII = (s) =>
  s
    .normalize("NFD") // split base + combining marks
    .replace(/\p{M}/gu, "") // remove combining marks
    .replace(/ß/g, "ss")
    .replace(/ø/g, "o")
    .replace(/ł/g, "l")
    .replace(/đ/g, "dj");

const keyify = (s) =>
  toASCII(s)
    .toLowerCase()
    .replace(/[\s'’.-]/g, "");
const hasDiacritics = (name) =>
  keyify(name) !== name.toLowerCase().replace(/[\s'’.-]/g, "");

// In-memory index built from active players
let _indexReady = null; // Promise<void>
let _asciiIndex = new Map(); // Map<asciiKey, Player[]>
let _playersById = new Map(); // Map<id, Player>

// Build once; safe to call multiple times
async function initPlayerNameIndex(fetchBase = API_BASE) {
  if (_indexReady) return _indexReady;

  _indexReady = (async () => {
    try {
      log("Loading active players…");
      const res = await fetch(`${fetchBase}/players/active`);
      if (!res.ok) throw new Error(`active players ${res.status}`);
      const players = await res.json(); // [{id, name, teamAbbr, position, ...}]

      _asciiIndex = new Map();
      _playersById = new Map(players.map((p) => [p.id, p]));

      for (const p of players) {
        if (!p?.name) continue;
        if (!hasDiacritics(p.name)) continue; // only track names with diacritics
        const asciiKey = keyify(p.name); // e.g., "Luka Dončić" -> "lukadoncic"
        const list = _asciiIndex.get(asciiKey) || [];
        list.push(p);
        _asciiIndex.set(asciiKey, list);
      }

      log("Diacritics index built:", _asciiIndex.size, "keys");
    } catch (e) {
      warn("Failed to build diacritics index:", e.message);
      _asciiIndex = new Map();
      _playersById = new Map();
    }
  })();

  return _indexReady;
}

/**
 * Given ASCII-ish name (e.g., from ESPN) and optional context,
 * return the official display name with diacritics if known.
 */
function resolveOfficialName(asciiName, ctx = {}) {
  if (!_asciiIndex) return asciiName; // not initialized yet; no-op
  const k = keyify(asciiName);
  const candidates = _asciiIndex.get(k);
  if (!candidates || candidates.length === 0) return asciiName;

  if (candidates.length === 1) return candidates[0].name;

  const { teamAbbr, position } = ctx;
  if (teamAbbr) {
    const hit = candidates.find(
      (p) => (p.teamAbbr || "").toUpperCase() === teamAbbr.toUpperCase()
    );
    if (hit) return hit.name;
  }
  if (position) {
    const hit = candidates.find(
      (p) => (p.position || "").toUpperCase() === position.toUpperCase()
    );
    if (hit) return hit.name;
  }
  return candidates[0].name;
}

// Make sure the index is kicked off early.
initPlayerNameIndex().catch(() => {});

// ==========================
// Team-code normalization
// ==========================

// Map legacy/alternate codes to the modern 3-letter codes used by ESPN
const TEAM_FIXES = {
  // Alt short codes
  PHO: "PHX",
  BRK: "BKN",
  CHO: "CHA",

  // Franchise renames
  NOH: "NOP",
  NOK: "NOP",
  NJN: "BKN",
  WSB: "WAS",

  // Optional: treat Sonics as Thunder for franchise continuity.
  // Remove/comment the next line if you want SEA to remain distinct.
  SEA: "OKC",

  // Optional: 90s Grizzlies
  VAN: "MEM",
};

// Aggregate markers we should not count as a "team"
const AGG_CODES = new Set([
  "TOT",
  "2TM",
  "3TM",
  "4TM",
  "5TM",
  "6TM",
  "7TM",
  "8TM",
]);

function normalizeTeam(code) {
  const up = String(code || "").toUpperCase();
  if (!up || AGG_CODES.has(up)) return null;
  return TEAM_FIXES[up] || up;
}

// ==========================
// Data queries + caches
// ==========================

/**
 * Cache key helpers
 */
const qKey = (o) => JSON.stringify(o);

// Simple in-memory caches (session-level)
const _totalsCache = new Map(); // key: {playerName, pageSize} -> array|null
const _careerTeamsCache = new Map(); // key: playerName -> array

/**
 * queryAllTotals
 * Calls your backend search for totals by playerName.
 * Returns: array of result rows or [] if none or 404.
 */
export async function queryAllTotals({
  playerName,
  pageSize = 1000,
  ctx = {},
}) {
  await initPlayerNameIndex();

  // Attempt to normalize to official spelling for better backend matches
  const canonicalName = resolveOfficialName(playerName, ctx);
  const params = new URLSearchParams({
    playerName: canonicalName,
    pageSize: String(pageSize),
  });
  const url = `${API_BASE}/PlayerDataTotals/query?${params.toString()}`;
  const cacheKey = qKey({ playerName: canonicalName, pageSize });

  if (_totalsCache.has(cacheKey)) {
    log("cache hit → PlayerDataTotals", canonicalName);
    return _totalsCache.get(cacheKey) || [];
  }

  log(
    "GET /PlayerDataTotals/query?playerName=",
    canonicalName,
    "&pageSize=",
    pageSize
  );
  const json = await fetchJSON(url);

  // Normalize return shape to []
  const rows = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json)
    ? json
    : [];
  _totalsCache.set(cacheKey, rows);
  return rows;
}

/**
 * getCareerTeams
 * Uses totals to derive a list of unique team abbreviations the player has played for,
 * ordered by first appearance (season ascending).
 * Returns: string[] (teamAbbr) — or [] if none.
 */
export async function getCareerTeams(playerName, ctx = {}) {
  try {
    await initPlayerNameIndex();

    const canonicalName = resolveOfficialName(playerName, ctx);
    log("career teams for", playerName, "→", canonicalName);

    // cache check
    if (_careerTeamsCache.has(canonicalName)) {
      const cached = _careerTeamsCache.get(canonicalName);
      log("Career teams (cache):", canonicalName, cached);
      return cached;
    }

    // Pull totals
    const totals = await queryAllTotals({
      playerName: canonicalName,
      pageSize: 1000,
      ctx,
    });

    if (!totals || totals.length === 0) {
      log("Career teams:", canonicalName, "[]");
      _careerTeamsCache.set(canonicalName, []);
      return [];
    }

    // 1) sort by season ascending
    const sorted = [...totals].sort((a, b) => {
      const sa = Number(a.season ?? a.Season ?? 0);
      const sb = Number(b.season ?? b.Season ?? 0);
      return sa - sb;
    });

    // 2) collect unique, normalized team codes in first-seen order
    const seen = new Set();
    for (const row of sorted) {
      const raw =
        row.teamAbbr ??
        row.TeamAbbr ??
        row.team ??
        row.Team ??
        row.franchise ??
        "";
      const fixed = normalizeTeam(raw);
      if (!fixed) continue;
      if (!seen.has(fixed)) seen.add(fixed);
    }
    const teams = Array.from(seen);

    log("Career teams:", canonicalName, teams);
    _careerTeamsCache.set(canonicalName, teams);
    return teams;
  } catch (e) {
    warn("getCareerTeams error:", e.message);
    return [];
  }
}

// ==========================
// Optional convenience API
// ==========================

/**
 * Use when you ingest a feed object and want the corrected display name.
 * Example:
 *   const display = canonicalDisplayName(espn.name, { teamAbbr: espn.teamAbbr, position: espn.position });
 */
export function canonicalDisplayName(feedName, ctx = {}) {
  return resolveOfficialName(feedName, ctx);
}

/**
 * Explicitly reinitialize the diacritics index (e.g., after a roster update).
 */
export async function refreshDiacriticsIndex() {
  _indexReady = null;
  _asciiIndex = new Map();
  _playersById = new Map();
  await initPlayerNameIndex();
  return _asciiIndex.size;
}

// For debugging in console if needed
export const __debug = {
  toASCII,
  keyify,
  hasDiacritics,
  normalizeTeam,
  TEAM_FIXES,
  AGG_CODES,
  _asciiIndex: () => _asciiIndex,
  _playersById: () => _playersById,
  _totalsCache: () => _totalsCache,
  _careerTeamsCache: () => _careerTeamsCache,
};
