// src/api/nbaapi_history.js

// ==========================
// Config & Logging
// ==========================

// Show debug logs only during local development (Vite)
const DEBUG = import.meta.env.MODE === "development";
const LOG_PREFIX = "[nbaapi]";

// In dev: log/warn. In prod: no-op. Errors always surface.
const log = (...args) => {
  if (DEBUG) console.log(LOG_PREFIX, ...args);
};
const warn = (...args) => {
  if (DEBUG) console.warn(LOG_PREFIX, ...args);
};
const err = (...args) => console.error(LOG_PREFIX, ...args);

// ==========================
// Small utilities
// ==========================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Safe JSON fetch with:
 * - request logging (dev only)
 * - 404 handling (returns null)
 * - basic retry for transient 5xx
 */
async function fetchJSON(url, { retries = 1, retryDelayMs = 250 } = {}) {
  log("GET", url);

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

const toASCII = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/ø/g, "o")
    .replace(/ł/g, "l")
    .replace(/đ/g, "dj");

const keyify = (s) =>
  toASCII(s)
    .toLowerCase()
    .replace(/[\s'’.-]/g, "");

const hasDiacritics = (name) =>
  keyify(name) !==
  String(name ?? "")
    .toLowerCase()
    .replace(/[\s'’.-]/g, "");

// No-op index
let _indexReady = Promise.resolve();
let _asciiIndex = new Map();

async function initPlayerNameIndex() {
  // No network call; immediately resolved
  return _indexReady;
}

// No-op: just return the input name
function resolveOfficialName(asciiName /*, ctx = {} */) {
  return asciiName;
}

// (Removed automatic init; nothing to fetch)

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

  SEA: "OKC",

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
  await initPlayerNameIndex(); // no-op, keeps structure

  // Keep call site shape; now it's effectively a pass-through
  const canonicalName = resolveOfficialName(playerName, ctx);
  const params = new URLSearchParams({
    playerName: canonicalName,
    pageSize: String(pageSize),
  });
  const url = `/nbaapi/PlayerDataTotals/query?${params.toString()}`;
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

export function canonicalDisplayName(feedName, ctx = {}) {
  return resolveOfficialName(feedName, ctx);
}

export async function refreshDiacriticsIndex() {
  // reset stubs and return zero keys
  _indexReady = Promise.resolve();
  _asciiIndex = new Map();
  return _asciiIndex.size; // 0
}

// For debugging in console if needed (kept as stubs to avoid breaking imports)
export const __debug = {
  toASCII,
  keyify,
  hasDiacritics,
  normalizeTeam,
  TEAM_FIXES,
  AGG_CODES,
  _asciiIndex: () => _asciiIndex,
  _totalsCache: () => _totalsCache,
  _careerTeamsCache: () => _careerTeamsCache,
};
