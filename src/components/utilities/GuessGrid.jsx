import { useEffect } from "react";
import Cell from "./Cell";

export default function GuessGrid({
  guesses,
  solution,
  evaluateGuess,
  toRowValues,
  maxGuesses,
  solutionTeamSet,
  /** animate only when this increments (set by Board on new guess) */
  revealTick = 0,
}) {
  const step = 380;

  return (
    <div
      role="grid"
      aria-label="guess grid"
      className="mt-3 space-y-2 md:space-y-3"
    >
      {Array.from({ length: maxGuesses }).map((_, row) => {
        const g = guesses[row];
        const values = g ? toRowValues(g) : Array(7).fill("");
        const { states, hints } =
          g && solution
            ? evaluateGuess(g, solution, solutionTeamSet)
            : {
                states: Array(7).fill("idle"),
                hints: Array(7).fill(undefined),
              };

        // animate only for the newest row when a guess was just added
        const shouldAnimateRow =
          revealTick > 0 && row === guesses.length - 1 && !!g;

        return (
          <div
            key={row}
            role="row"
            className="grid grid-cols-7 gap-2 md:gap-3"
            style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
          >
            {values.map((val, col) => (
              <Cell
                key={`${row}-${col}`}
                value={val}
                state={states[col]}
                hint={hints[col]}
                delay={shouldAnimateRow ? col * step : undefined}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
