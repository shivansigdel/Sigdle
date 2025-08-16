// src/components/Board.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import Searchbar from "./utilities/Searchbar";
import { suggestPlayers, getAllActivePlayers } from "../api/espn";
import { getTopPlayers } from "../api/nbaapi_stats";
import { getCareerTeams } from "../api/nbaapi_history";
import GuessGrid from "./utilities/GuessGrid";

import {
  MAX_GUESSES,
  HEADERS as headers,
  toRowValues,
  evaluateGuess,
  saveSaved,
  updateInProgressFlag,
  // NEW helpers
  restoreOrCreateRound,
  newRound,
  toSolutionTeamSet,
  nextGameStateAfterGuess,
  getMode,
} from "../api/game";

export default function Board({ onGameEnd, resetNonce }) {
  // search UI
  const [term, setTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // game state
  const [solution, setSolution] = useState(null);
  const [solutionTeams, setSolutionTeams] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [gameState, setGameState] = useState("playing");

  const [revealTick, setRevealTick] = useState(0);

  const solutionTeamSet = useMemo(
    () => toSolutionTeamSet(solutionTeams),
    [solutionTeams]
  );

  const didPick = useRef(false);
  const wrapperRef = useRef(null);

  // hold a timer so we can delay the modal until flips finish
  const revealTimerRef = useRef(null);

  // Boot: restore saved state or create a new round
  useEffect(() => {
    if (didPick.current) return;
    didPick.current = true;

    (async () => {
      try {
        const { solution, solutionTeams, guesses, gameState } =
          await restoreOrCreateRound({
            getAllActivePlayers,
            getTopPlayers,
            getCareerTeams,
            mode: getMode(),
          });
        setSolution(solution);
        setSolutionTeams(solutionTeams);
        setGuesses(guesses);
        setGameState(gameState);
      } catch (e) {
        console.error("Failed to init board:", e);
      }
    })();
  }, []);

  // persist state
  useEffect(() => {
    if (!solution) return;
    saveSaved({ solution, guesses, gameState, solutionTeams });
  }, [solution, guesses, gameState, solutionTeams]);

  // update the “in progress” flag for your How-to modal logic
  useEffect(() => {
    updateInProgressFlag(gameState, guesses.length);
  }, [gameState, guesses.length]);

  // // 🔎 DEV: log current pools and print Top 250 to console whenever a round is ready
  // useEffect(() => {
  //   if (!solution) return;
  //   let cancelled = false;

  //   (async () => {
  //     try {
  //       const mode = getMode(); // "easy" | "hard"
  //       const [all, top] = await Promise.all([
  //         getAllActivePlayers(),
  //         getTopPlayers(), // Top 250
  //       ]);
  //       if (cancelled) return;

  //       console.info(
  //         `[SIGDLE] Mode=${mode} — Top pool: ${top.length} | All: ${all.length}`
  //       );
  //       console.table(
  //         top.map((p) => ({
  //           id: p.id,
  //           name: p.name,
  //           team: p.teamAbbr,
  //           pos: p.position,
  //         }))
  //       );
  //     } catch (e) {
  //       console.warn("Pool debug failed:", e);
  //     }
  //   })();

  //   return () => {
  //     cancelled = true;
  //   };
  // }, [solution, resetNonce]);

  // respond to App's "Play Again" signal
  useEffect(() => {
    if (resetNonce > 0) {
      handleNewGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetNonce]);

  // cleanup any pending reveal timers on unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  async function handleNewGame() {
    try {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      const next = await newRound({
        getAllActivePlayers,
        getTopPlayers,
        getCareerTeams,
        mode: getMode(),
      });
      setSolution(next.solution);
      setSolutionTeams(next.solutionTeams);
      setGuesses(next.guesses);
      setGameState(next.gameState);
      setTerm("");
      setSuggestions([]);
      setOpen(false);
      setError("");
      setRevealTick(0); // reset animation tick
    } catch (e) {
      console.error("Failed to start new round:", e);
    }
  }

  // debounced suggestions
  useEffect(() => {
    if (gameState !== "playing") return;
    const q = term.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      setError("");
      return;
    }
    setOpen(true);
    setLoading(true);
    setError("");
    let cancelled = false;
    const cur = q;

    const id = setTimeout(async () => {
      try {
        const rows = await suggestPlayers(q, 8);
        if (!cancelled && cur === term.trim()) {
          setSuggestions(rows);
          setLoading(false);
          setError("");
          setOpen(true);
        }
      } catch (e) {
        if (!cancelled && cur === term.trim()) {
          console.error("suggest failed (ESPN):", e);
          setSuggestions([]);
          setLoading(false);
          setError(
            typeof e?.message === "string" ? e.message : "Failed to load"
          );
          setOpen(true);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [term, gameState]);

  // close suggestions on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const handleBlur = () => setOpen(false);
  const handleFocus = () => {
    if (term.trim().length >= 2 && suggestions.length > 0) setOpen(true);
  };

  // submit / pick
  const submitGuess = async (e) => {
    e.preventDefault();
    if (gameState !== "playing") return;

    const q = term.trim();
    if (!q || guesses.length >= MAX_GUESSES) return;

    if (suggestions.length > 0) {
      pickSuggestion(suggestions[0]);
      return;
    }

    try {
      const rows = await suggestPlayers(q, 1);
      if (rows[0]) pickSuggestion(rows[0]);
      else {
        setError("No player found");
        setOpen(false);
      }
    } catch (err) {
      console.error(err);
      setError("Lookup failed");
      setOpen(false);
    }
  };

  // delay modal until the last tile finishes flipping
  const endGameIfNeeded = (newGuess) => {
    if (!solution) return;
    const next = nextGameStateAfterGuess(
      newGuess,
      solution,
      guesses.length,
      MAX_GUESSES
    );

    if (next !== "playing") {
      setGameState(next);
      setOpen(false);

      // compute reveal time: (last col start) + flip duration + tiny buffer
      const COLS = headers.length; // 7
      const STAGGER_MS = 380; // must match GuessGrid
      const FLIP_MS = 600; // must match Cell's DURATION
      const BUFFER_MS = 60;

      const total = (COLS - 1) * STAGGER_MS + FLIP_MS + BUFFER_MS;

      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      revealTimerRef.current = setTimeout(() => {
        onGameEnd?.({
          result: next, // "won" | "lost"
          solution,
          guessesUsed: guesses.length + 1,
        });
        revealTimerRef.current = null;
      }, total);
    }
  };

  const pickSuggestion = (s) => {
    if (gameState !== "playing") return;
    setOpen(false);
    setTerm("");
    if (guesses.length >= MAX_GUESSES) return;

    setGuesses((prev) => [...prev, s]);
    setRevealTick((t) => t + 1); //Trigger flip animation for newest row
    endGameIfNeeded(s);
  };

  const gameOver = gameState === "won" || gameState === "lost";

  return (
    <section className="w-full flex justify-center">
      <div className="w-full max-w-[48rem] px-4 md:px-6">
        {/* search + overlay suggestions */}
        <div className="relative w-full mt-3 md:mt-4" ref={wrapperRef}>
          <Searchbar
            value={term}
            onChange={setTerm}
            onSubmit={submitGuess}
            onBlur={handleBlur}
            onFocus={handleFocus}
          />

          {gameOver && (
            <div className="absolute inset-0 rounded-lg pointer-events-auto bg-transparent" />
          )}

          {term.trim().length >= 2 && open && !gameOver && (
            <ul
              className="
                absolute left-1/2 -translate-x-1/2
                top-[calc(100%+0.5rem)]
                w-full max-w-[48rem]
                z-40
                bg-base-100/95 backdrop-blur-md
                border border-base-300
                rounded-xl shadow-2xl
                divide-y divide-base-300
                overflow-hidden
              "
              role="listbox"
            >
              {loading && (
                <li className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  Searching…
                </li>
              )}
              {!loading && error && (
                <li className="px-4 py-3 text-red-600 dark:text-red-400">
                  {error}
                </li>
              )}
              {!loading && !error && suggestions.length === 0 && (
                <li className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  No matches
                </li>
              )}
              {!loading &&
                !error &&
                suggestions.map((s) => (
                  <li
                    key={s.id}
                    className="px-4 py-3 cursor-pointer hover:bg-base-200/70 transition-colors"
                    onMouseDown={() => pickSuggestion(s)}
                  >
                    <span className="block truncate text-base-content">
                      {s.name}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* {solution && (
          <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="font-mono opacity-70">[debug]</span> Solution:{" "}
            {solution.name} — {solution.teamAbbr}
          </div>
        )} */}

        {/* column headers */}
        <div className="mt-4 mb-1">
          <div
            className="grid justify-items-center gap-3 text-xs font-medium uppercase tracking-wide text-neutral-600 dark:text-neutral-400"
            style={{
              gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))`,
            }}
            role="row"
          >
            {headers.map((h, i) => (
              <div
                key={h.key ?? h.abbr ?? h.label ?? h.name ?? i}
                className="grid place-items-center text-center leading-none"
                role="columnheader"
              >
                {typeof h === "string"
                  ? h
                  : h.label ?? h.abbr ?? h.name ?? `Col ${i + 1}`}
              </div>
            ))}
          </div>
        </div>

        {/* Guess grid (headers + rows) */}
        <GuessGrid
          guesses={guesses}
          solution={solution}
          evaluateGuess={evaluateGuess}
          toRowValues={toRowValues}
          maxGuesses={MAX_GUESSES}
          solutionTeamSet={solutionTeamSet}
          revealTick={revealTick}
        />
      </div>
    </section>
  );
}
