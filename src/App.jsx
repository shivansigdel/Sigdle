// src/App.jsx
import { useEffect, useState } from "react";
import Header from "./components/Header";
import Board from "./components/Board";
import { MAX_GUESSES } from "./api/game";

// ⬇️ Direct imports (no lazy-load)
import InfoModal from "./components/modal/InfoModal";
import StatsModal from "./components/modal/StatsModal";
import SettingsModal from "./components/modal/SettingsModal";
import { recordGameResult } from "./api/stats"; // <-- ADDED

export default function App() {
  const [infoOpen, setInfoOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // tell <Board> to start a brand-new round
  const [resetNonce, setResetNonce] = useState(0);

  // data for Stats modal when a round ends
  const [endInfo, setEndInfo] = useState(null);
  // shape: { result: "won" | "lost" | "inprogress", solution, guessesUsed }

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sigdle-state-v1");
      const saved = raw ? JSON.parse(raw) : null;

      const status = saved?.gameState; // "playing" | "won" | "lost" | undefined
      const guessesUsed = Array.isArray(saved?.guesses)
        ? saved.guesses.length
        : 0;

      if (status === "playing" && guessesUsed > 0) {
        setEndInfo({
          result: "inprogress",
          solution: saved.solution,
          guessesUsed,
        });
        setStatsOpen(true);
        setInfoOpen(false);
        return;
      }

      if (status === "won" || status === "lost") {
        setEndInfo({ result: status, solution: saved.solution, guessesUsed });
        setStatsOpen(true);
        setInfoOpen(false);
        return;
      }

      const hasEverStarted = localStorage.getItem("sigdle-in-progress") === "1";
      setInfoOpen(!hasEverStarted);
    } catch {
      const hasEverStarted = localStorage.getItem("sigdle-in-progress") === "1";
      setInfoOpen(!hasEverStarted);
    }
  }, []);

  // Boot theme
  useEffect(() => {
    const saved = localStorage.getItem("sigdle-theme");
    const theme = saved || "light";
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "business");
  }, []);

  // ESC closes any modal
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setInfoOpen(false);
        setStatsOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // called by <Board> when a round ends
  const handleGameEnd = ({ result, solution, guessesUsed }) => {
    // <-- ADDED: persist stats so Info/Stats modals can render distributions
    if (result === "won" || result === "lost") {
      recordGameResult(result, guessesUsed);
    }

    setEndInfo({ result, solution, guessesUsed });
    setStatsOpen(true);
  };

  // called by Stats modal's Play Again button
  const handlePlayAgain = () => {
    setStatsOpen(false);
    setEndInfo(null);
    setResetNonce((n) => n + 1);
  };

  return (
    <div className="relative w-full min-h-dvh flex flex-col bg-base-100 text-base-content">
      <div
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
        onInfo={() => setInfoOpen(true)}
        onStats={() => setStatsOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />

      <Board onGameEnd={handleGameEnd} resetNonce={resetNonce} />

      {infoOpen && (
        <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      )}

      {statsOpen && (
        <StatsModal
          open={statsOpen}
          onClose={() => setStatsOpen(false)}
          onPlayAgain={handlePlayAgain}
          result={endInfo?.result}
          solution={endInfo?.solution}
          guessesUsed={endInfo?.guessesUsed}
          maxGuesses={MAX_GUESSES}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
