// src/api/espn.js
// ESPN helper (normalized team abbrs + fallback conference/div + height support)

const TEAMS_URL = "/espnapi/sports/basketball/nba/teams";
const teamDetailUrl = (id) =>
  `/espnapi/sports/basketball/nba/teams/${id}?enable=roster`;

async function fetchJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`ESPN ${r.status} for ${url}`);
  return r.json();
}

// ESPN short codes -> standard 3-letter
const ESPN_TO_STD = {
  // East
  ATL: "ATL",
  BOS: "BOS",
  BKN: "BKN",
  BRO: "BKN",
  NY: "NYK",
  NYK: "NYK",
  PHI: "PHI",
  TOR: "TOR",
  CHI: "CHI",
  CLE: "CLE",
  DET: "DET",
  IND: "IND",
  MIL: "MIL",
  CHA: "CHA",
  CHO: "CHA",
  MIA: "MIA",
  ORL: "ORL",
  WAS: "WAS",
  WSH: "WAS",
  // West
  DAL: "DAL",
  HOU: "HOU",
  MEM: "MEM",
  NO: "NOP",
  NOP: "NOP",
  SA: "SAS",
  SAS: "SAS",
  DEN: "DEN",
  MIN: "MIN",
  OKC: "OKC",
  POR: "POR",
  UTA: "UTA",
  UTAH: "UTA",
  GS: "GSW",
  GSW: "GSW",
  LAC: "LAC",
  LAL: "LAL",
  PHX: "PHX",
  PHO: "PHX",
  SAC: "SAC",
};

function toStdAbbr(a) {
  const up = String(a || "").toUpperCase();
  return ESPN_TO_STD[up] || up;
}

// Stable fallbacks (2025 alignment) keyed by standard 3-letter codes
const TEAM_META = {
  // East
  ATL: { conference: "EC", division: "SE" },
  BOS: { conference: "EC", division: "A" },
  BKN: { conference: "EC", division: "A" },
  NYK: { conference: "EC", division: "A" },
  PHI: { conference: "EC", division: "A" },
  TOR: { conference: "EC", division: "A" },

  CHI: { conference: "EC", division: "C" },
  CLE: { conference: "EC", division: "C" },
  DET: { conference: "EC", division: "C" },
  IND: { conference: "EC", division: "C" },
  MIL: { conference: "EC", division: "C" },

  CHA: { conference: "EC", division: "SE" },
  MIA: { conference: "EC", division: "SE" },
  ORL: { conference: "EC", division: "SE" },
  WAS: { conference: "EC", division: "SE" },

  // West
  DAL: { conference: "WC", division: "SW" },
  HOU: { conference: "WC", division: "SW" },
  MEM: { conference: "WC", division: "SW" },
  NOP: { conference: "WC", division: "SW" },
  SAS: { conference: "WC", division: "SW" },

  DEN: { conference: "WC", division: "NW" },
  MIN: { conference: "WC", division: "NW" },
  OKC: { conference: "WC", division: "NW" },
  POR: { conference: "WC", division: "NW" },
  UTA: { conference: "WC", division: "NW" },

  GSW: { conference: "WC", division: "P" },
  LAC: { conference: "WC", division: "P" },
  LAL: { conference: "WC", division: "P" },
  PHX: { conference: "WC", division: "P" },
  SAC: { conference: "WC", division: "P" },
};

function posGFC(p) {
  if (!p) return "—";
  const up = String(p).toUpperCase();
  if (up.includes("C")) return "C";
  if (up.includes("PG") || up.includes("SG") || up.includes("G")) return "G";
  if (up.includes("SF") || up.includes("PF") || up.includes("F")) return "F";
  return "—";
}

function toAge(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d)) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

// Height helpers
const toInches = (val) => {
  if (Number.isFinite(val)) {
    // Treat 48–100 as inches; >= 100 is likely centimeters
    if (val >= 48 && val <= 100) return Math.round(val);
    if (val > 100) return Math.round(val / 2.54);
  }
  if (typeof val === "string") {
    // Patterns like 6'7", 6’7”, 6-7, 6 ft 7 in
    const m = /(\d+)\s*(?:ft|['’\-])\s*(\d{1,2})/i.exec(val);
    if (m) return parseInt(m[1], 10) * 12 + parseInt(m[2], 10);
    // raw inches like "79"
    const n = parseInt(val, 10);
    if (n >= 48 && n <= 100) return n;
  }
  return null;
};

// Read conf/div from team payload; fall back to TEAM_META
function extractConfDivFromTeamObject(team) {
  const grp = team?.groups || team?.group || {};
  const divName = grp?.name || "";
  const confName = grp?.parent?.name || "";

  const confAbbr = confName.toLowerCase().startsWith("e")
    ? "EC"
    : confName.toLowerCase().startsWith("w")
    ? "WC"
    : "";

  const d = divName.toLowerCase();
  let divAbbr = "";
  if (d.startsWith("pac")) divAbbr = "P";
  else if (d.startsWith("atl")) divAbbr = "A";
  else if (d.startsWith("cen")) divAbbr = "C";
  else if (d.startsWith("southw")) divAbbr = "SW";
  else if (d.startsWith("southe")) divAbbr = "SE";
  else if (d.startsWith("northw")) divAbbr = "NW";

  return { conference: confAbbr, division: divAbbr };
}

function mergeWithFallback(stdAbbr, fromTeamObj) {
  const fb = TEAM_META[stdAbbr] || { conference: "", division: "" };
  return {
    conference: fromTeamObj.conference || fb.conference,
    division: fromTeamObj.division || fb.division,
  };
}

function extractTeams(json) {
  const sports = json?.sports || [];
  const leagues = sports[0]?.leagues || [];
  const teams = leagues[0]?.teams || [];
  return teams.map((t) => t.team).filter(Boolean);
}

// ESPN rosters are grouped by position: each block has "items" = players
function extractAthletesFromTeam(root) {
  const blocks = root?.athletes || [];
  let items = [];

  if (Array.isArray(blocks)) {
    for (const blk of blocks) {
      const arr = blk?.items || blk?.athletes || blk?.entries || [];
      if (Array.isArray(arr)) items = items.concat(arr);
    }
  }

  // Some variants put players directly
  if (!items.length) {
    const direct = root?.athlete || root?.athletes || [];
    if (Array.isArray(direct)) items = items.concat(direct);
  }

  return items;
}

function normalizePlayer(item, teamMeta) {
  // ESPN sometimes nests player under item.athlete
  const a = item?.athlete || item;

  const name =
    a?.displayName ||
    `${a?.firstName || ""} ${a?.lastName || ""}`.trim() ||
    "Unknown";

  // jersey may live on either level
  const jerseyRaw =
    a?.displayJersey ??
    a?.jersey ??
    item?.displayJersey ??
    item?.jersey ??
    null;
  const jersey =
    jerseyRaw != null && jerseyRaw !== "" ? Number(jerseyRaw) : null;

  const dob = a?.dateOfBirth || a?.dob || a?.birthDate || item?.dateOfBirth;

  const pos = posGFC(
    a?.position?.abbreviation ||
      a?.position?.name ||
      a?.position ||
      item?.position
  );

  const heightIn =
    toInches(a?.displayHeight) ??
    toInches(a?.height) ??
    toInches(item?.displayHeight) ??
    toInches(item?.height) ??
    null;

  return {
    id: String(a?.id || item?.id || `${teamMeta.abbreviation}-${name}`),
    name,
    teamAbbr: teamMeta.abbreviation,
    position: pos,
    age: toAge(dob),
    jersey,
    conference: teamMeta.conference,
    division: teamMeta.division,
    // height
    heightIn,
  };
}

async function getAllTeams() {
  const json = await fetchJSON(TEAMS_URL);
  const raw = extractTeams(json);

  return raw.map((t) => {
    const espnAbbr = t?.abbreviation || "";
    const stdAbbr = toStdAbbr(espnAbbr);

    // derive from team object, then merge with fallback map
    const fromObj = extractConfDivFromTeamObject(t);
    const merged = mergeWithFallback(stdAbbr, fromObj);

    return {
      id: t.id,
      abbreviation: stdAbbr,
      conference: merged.conference,
      division: merged.division,
    };
  });
}

async function getRosterForTeam(team) {
  const json = await fetchJSON(teamDetailUrl(team.id));
  const root = json?.team || json;

  // prefer roster endpoint abbr if present, then normalize again
  const espnAbbr = root?.abbreviation || team.abbreviation;
  const stdAbbr = toStdAbbr(espnAbbr);
  const fromObj = extractConfDivFromTeamObject(root);
  const merged = mergeWithFallback(stdAbbr, fromObj);

  const meta = {
    abbreviation: stdAbbr,
    conference: merged.conference,
    division: merged.division,
  };

  const items = extractAthletesFromTeam(root);
  return items.map((a) => normalizePlayer(a, meta));
}

// cache (bump version when shape changes)
const CACHE_KEY = "espn-nba-players-v5"; // bumped to refresh pool ordering
const CACHE_MS = 1000 * 60 * 60 * 6; // 6 hours

export async function getAllActivePlayers() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { at, data } = JSON.parse(cached);
      if (Date.now() - at < CACHE_MS) return data;
    }
  } catch {}

  const teams = await getAllTeams();
  const results = await Promise.allSettled(teams.map(getRosterForTeam));
  const players = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  );

  // de-dupe by id just in case
  const byId = new Map();
  for (const p of players) byId.set(p.id, p);
  const deduped = Array.from(byId.values());

  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ at: Date.now(), data: deduped })
    );
  } catch {}

  return deduped;
}

// diacritic-insensitive search (so "Doncic" finds Dončić, "Sengun" finds Şengün)
export function stripDiacritics(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function suggestPlayers(term, limit = 10) {
  const q = stripDiacritics(term).trim().toLowerCase();
  if (!q) return [];
  const list = await getAllActivePlayers();

  const hits = [];
  for (const p of list) {
    const n = stripDiacritics(p.name).toLowerCase();
    if (n.includes(q)) hits.push(p);
    if (hits.length >= limit) break;
  }
  return hits;
}
