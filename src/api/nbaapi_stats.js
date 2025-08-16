// src/api/nbaapi_stats.js
// Rank "top N" players using *percentile-blended* per-game stats
// from https://api.server.nbaapi.com, then return ESPN-normalized
// player objects so the rest of the app keeps working.

import { getAllActivePlayers, stripDiacritics } from "./espn";
import { getTopPlayers as fallbackHeuristicTop } from "./espn";

const NBAAPI_ROOT = "https://api.server.nbaapi.com";
const SEASON = 2025; // use the season you want (you tested with 2025)

// ---- utils ----
const toKey = (name) =>
  stripDiacritics(String(name || ""))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const num = (...vals) => {
  for (const v of vals) {
    const n = typeof v === "string" ? parseFloat(v) : v;
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

const safeDiv = (a, b) =>
  Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : undefined;

// Compute TS% from totals: TS = PTS / (2 * (FGA + 0.44*FTA))
const computeTS = (points, fga, fta) => {
  const denom = Number(fga) + 0.44 * Number(fta);
  return denom > 0 ? Number(points) / (2 * denom) : undefined;
};

// ---- fetch & normalize totals ----
async function fetchJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`stats ${r.status} for ${url}`);
  return r.json();
}

// Pull ALL players for the season by paging (pageSize big to reduce calls)
async function fetchAllTotals(season = SEASON) {
  const pageSize = 500; // try a large page size; API supports paging
  let page = 1;
  let all = [];

  // loop on pagination
  // guard against runaway loops even if pagination info is weird
  for (let safety = 0; safety < 20; safety++) {
    const url =
      `${NBAAPI_ROOT}/api/playertotals?` +
      `page=${page}&pageSize=${pageSize}&sortBy=points&ascending=false&season=${season}`;

    const res = await fetchJSON(url);
    const rows = Array.isArray(res?.data) ? res.data : [];
    all = all.concat(rows);

    const totalPages = res?.pagination?.pages;
    if (!Number.isFinite(totalPages) || page >= totalPages) break;
    page += 1;
  }

  return all;
}

// Convert one totals row to the compact shape we score on
function normalizeTotalsRow(row) {
  const name = row?.playerName || "";
  if (!name) return null;

  const gp = num(row?.games);
  const minTotal = num(row?.minutesPg); // this field is actually TOTAL minutes (see your sample)
  const fga = num(row?.fieldAttempts);
  const fta = num(row?.ftAttempts);
  const ptsTot = num(row?.points);
  const astTot = num(row?.assists);
  const rebTot = num(row?.totalRb);

  const pts = safeDiv(ptsTot, gp);
  const ast = safeDiv(astTot, gp);
  const reb = safeDiv(rebTot, gp);
  const mpg = safeDiv(minTotal, gp);
  const ts = computeTS(ptsTot, fga, fta);

  return {
    key: toKey(name),
    gp,
    mpg,
    minTotal,
    pts,
    ast,
    reb,
    ts,
  };
}

async function fetchSeasonStats() {
  try {
    const totals = await fetchAllTotals(SEASON);
    return totals.map(normalizeTotalsRow).filter(Boolean);
  } catch (e) {
    console.warn(
      "[stats] fetch failed, falling back to heuristic Top list:",
      e
    );
    return [];
  }
}

// ---- percentile scoring ----
function percentilesFor(eligible, prop) {
  const arr = eligible.filter((r) => Number.isFinite(r[prop]));
  if (arr.length <= 1) {
    const m = new Map();
    for (const r of eligible) m.set(r.key, 0);
    return m;
  }
  const sorted = [...arr].sort((a, b) => a[prop] - b[prop]); // ASC
  const denom = sorted.length - 1;
  const map = new Map();
  sorted.forEach((r, i) => map.set(r.key, i / denom));
  return map;
}

/**
 * Public API: rank Top N by percentiles.
 * Returns *ESPN-normalized* player objects.
 */
export async function getTopPlayers(limit = 250) {
  // 1) ESPN-normalized roster (shape used everywhere else)
  const roster = await getAllActivePlayers();

  // 2) Stats feed
  const stats = await fetchSeasonStats();
  if (stats.length === 0) {
    return fallbackHeuristicTop(limit);
  }

  // 3) Eligibility gates (tune if you want stricter filters)
  const eligible = stats.filter(
    (s) => (s.gp ?? 0) >= 15 && (s.minTotal ?? 0) >= 300
  );
  if (eligible.length === 0) {
    return fallbackHeuristicTop(limit);
  }

  // 4) Percentiles per metric
  const PTS = percentilesFor(eligible, "pts");
  const AST = percentilesFor(eligible, "ast");
  const REB = percentilesFor(eligible, "reb");
  const TS = percentilesFor(eligible, "ts");
  const MIN = percentilesFor(eligible, "mpg");

  const eligibleKeys = new Set(eligible.map((e) => e.key));

  // 5) Weighted blend of percentiles
  const W = { pts: 0.35, ast: 0.2, reb: 0.2, ts: 0.15, min: 0.1 };
  const scoreOf = (p) => {
    const key = toKey(p.name);
    if (!eligibleKeys.has(key)) return -1e9; // push non-eligible behind
    const v = (m) => m.get(key) ?? 0;
    return (
      W.pts * v(PTS) +
      W.ast * v(AST) +
      W.reb * v(REB) +
      W.ts * v(TS) +
      W.min * v(MIN)
    );
  };

  // 6) Sort roster by score (DESC) and take Top N
  return [...roster].sort((a, b) => scoreOf(b) - scoreOf(a)).slice(0, limit);
}
