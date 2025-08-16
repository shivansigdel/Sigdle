import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { getStats, defaultStats } from "../../api/stats";

export default function StatsModal({
  open,
  onClose,
  onPlayAgain,
  result, // "won" | "lost" | "inprogress" | undefined
  solution, // { name, teamAbbr } | undefined
  guessesUsed, // number | undefined (1..6 when won)
  maxGuesses, // number | undefined
}) {
  const isInProgress = result === "inprogress";
  const showPlayAgain = result === "won" || result === "lost";

  // load stats each time the modal opens
  const [stats, setStats] = useState(defaultStats());
  useEffect(() => {
    if (open) setStats(getStats());
  }, [open]);

  const { played, wins, currentStreak, maxStreak, guessDist } = stats;
  const winRate = useMemo(
    () => (played ? Math.round((wins / played) * 100) : 0),
    [played, wins]
  );
  const distTotalWins = guessDist.reduce((a, b) => a + b, 0);

  const headline = isInProgress
    ? "Continue Game"
    : result === "won"
    ? "You Won!"
    : result === "lost"
    ? "Out of Guesses"
    : "Stats";

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="text-3xl font-bebas mb-3">{headline}</h3>

      {isInProgress && (
        <div className="text-sm text-base-content/80 space-y-1 mb-4">
          <p>
            Your progress:{" "}
            <span className="font-semibold">
              {guessesUsed ?? 0}/{maxGuesses}
            </span>
          </p>
        </div>
      )}

      {!isInProgress && result && solution && (
        <div className="text-sm text-base-content/80 space-y-1 mb-4">
          {result === "won" ? (
            <p>
              Solved in <span className="font-semibold">{guessesUsed}</span> /{" "}
              {maxGuesses}
            </p>
          ) : (
            <p>
              Answer:{" "}
              <span className="font-semibold">
                {solution.name} — {solution.teamAbbr}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Stats summary */}
      <section
        className="rounded-xl border p-4 bg-base-100/40 mb-4"
        style={{ borderColor: "var(--sg-cell-border-idle)" }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Played" value={played} />
          <StatCard label="Win %" value={winRate} />
          <StatCard label="Streak" value={currentStreak} />
          <StatCard label="Max Streak" value={maxStreak} />
        </div>
      </section>

      {/* Guess distribution bars (1..6) */}
      <section
        className="rounded-xl border p-4 bg-base-100/40"
        style={{ borderColor: "var(--sg-cell-border-idle)" }}
      >
        <h4 className="font-semibold mb-2">Guess distribution</h4>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => {
            const count = guessDist[i] || 0;
            const pct =
              distTotalWins > 0 ? Math.round((count / distTotalWins) * 100) : 0;
            const label = i + 1;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 text-right text-xs tabular-nums">
                  {label}
                </span>
                <progress
                  className="progress progress-success w-full"
                  value={pct}
                  max="100"
                  aria-label={`Solved in ${label} guesses`}
                  title={`${count} win${count !== 1 ? "s" : ""} (${pct}%)`}
                />
                <span className="w-10 text-right text-xs tabular-nums">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {!result && (
        <p className="mt-3 text-sm text-base-content/70">
          Your streaks and history will appear here.
        </p>
      )}

      {showPlayAgain && (
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onPlayAgain}
            className="
              inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold border shadow-sm
              bg-base-100/60 text-base-content
              hover:bg-base-100/70 active:bg-base-100/80
              focus:outline-none focus-visible:ring-2 focus-visible:ring-base-content/25
              focus-visible:ring-offset-2 focus-visible:ring-offset-base-100
              transition-colors
            "
            style={{ borderColor: "var(--sg-cell-border-idle)" }}
          >
            Play Again
          </button>
        </div>
      )}
    </Modal>
  );
}

function StatCard({ label, value }) {
  return (
    <div
      className="rounded-lg border p-3 text-center"
      style={{ borderColor: "var(--sg-cell-border-idle)" }}
    >
      <div className="text-2xl font-semibold tabular-nums">{value ?? 0}</div>
      <div className="text-xs text-base-content/70">{label}</div>
    </div>
  );
}
