// src/App.jsx
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import Board from "./components/Board";
import { MAX_GUESSES } from "./api/game";

import InfoModal from "./components/modal/InfoModal";
import StatsModal from "./components/modal/StatsModal";
import SettingsModal from "./components/modal/SettingsModal";
import { recordGameResult } from "./api/stats"; // persists stats

export default function App() {
  // --- modal state (collapsed to a single enum) ---
  const [activeModal, setActiveModal] = useState(null); // "info" | "stats" | "settings" | null

  // tell <Board> to start a brand-new round
  const [resetNonce, setResetNonce] = useState(0);

  // data for Stats modal when a round ends
  // shape: { result: "won" | "lost" | "inprogress", solution, guessesUsed }
  const [endInfo, setEndInfo] = useState(null);

  // --- theme boot without flash ---
  useLayoutEffect(() => {
    const saved = localStorage.getItem("sigdle-theme");
    const theme = saved || "light";
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "business"); // keep your existing mapping
  }, []);

  // --- first-load: decide which modal to show (Stats if prior round exists; Info if first time) ---
  useEffect(() => {
    const hasEverStarted = localStorage.getItem("sigdle-in-progress") === "1";
    const raw = localStorage.getItem("sigdle-state-v1");

    let saved = null;
    try {
      saved = raw ? JSON.parse(raw) : null;
    } catch {
      saved = null;
    }

    const status = saved?.gameState; // "playing" | "won" | "lost"
    const guessesUsed = Array.isArray(saved?.guesses)
      ? saved.guesses.length
      : 0;

    if (status === "playing" && guessesUsed > 0) {
      setEndInfo({
        result: "inprogress",
        solution: saved.solution,
        guessesUsed,
      });
      setActiveModal("stats");
      return;
    }
    if (status === "won" || status === "lost") {
      setEndInfo({ result: status, solution: saved.solution, guessesUsed });
      setActiveModal("stats");
      return;
    }
    // first visit? show Info
    if (!hasEverStarted) setActiveModal("info");
  }, []);

  // --- ESC closes the currently open modal (only listens while one is open) ---
  const anyModalOpen = useMemo(() => activeModal !== null, [activeModal]);
  useEffect(() => {
    if (!anyModalOpen) return;
    const onKey = (e) => e.key === "Escape" && setActiveModal(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anyModalOpen]);

  // called by <Board> when a round ends
  const handleGameEnd = ({ result, solution, guessesUsed }) => {
    if (result === "won" || result === "lost") {
      recordGameResult(result, guessesUsed);
    }
    setEndInfo({ result, solution, guessesUsed });
    setActiveModal("stats");
  };

  // called by Stats modal's Play Again button
  const handlePlayAgain = () => {
    setActiveModal(null);
    setEndInfo(null);
    setResetNonce((n) => n + 1);
  };

  return (
    <div className="relative w-full min-h-dvh flex flex-col bg-base-100 text-base-content">
      <div
        role="presentation"
        aria-hidden
        className="
          pointer-events-none absolute inset-0 -z-10
          [background:
            radial-gradient(1100px_520px_at_50%_0,rgba(0,0,0,0.04),transparent_60%),
            radial-gradient(900px_440px_at_50%_100%,rgba(0,0,0,0.03),transparent_60%)
          ]
          dark:[background:
            radial-gradient(1100px_520px_at_50%_0,rgba(255,255,255,0.06),transparent_60%),
            radial-gradient(900px_440px_at_50%_100%,rgba(255,255,255,0.04),transparent_60%)
          ]
        "
      />

      <Header
        onInfo={() => setActiveModal("info")}
        onStats={() => setActiveModal("stats")}
        onSettings={() => setActiveModal("settings")}
      />

      <Board onGameEnd={handleGameEnd} resetNonce={resetNonce} />

      {activeModal === "info" && (
        <InfoModal open onClose={() => setActiveModal(null)} />
      )}

      {activeModal === "stats" && (
        <StatsModal
          open
          onClose={() => setActiveModal(null)}
          onPlayAgain={handlePlayAgain}
          result={endInfo?.result}
          solution={endInfo?.solution}
          guessesUsed={endInfo?.guessesUsed}
          maxGuesses={MAX_GUESSES}
        />
      )}

      {activeModal === "settings" && (
        <SettingsModal open onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}
