// src/components/Header.jsx
import { Info, BarChart3, Settings } from "lucide-react";

export default function Header({ onInfo, onStats, onSettings }) {
  const icon =
    "h-7 w-7 transition-transform duration-150 ease-out group-hover:scale-95 pointer-events-none";

  // Transparent buttons; inherit color; theme-aware hover/focus using DaisyUI tokens
  const btn =
    "group inline-flex items-center justify-center rounded-full h-12 w-12 " +
    "hover:bg-base-200/60 " +
    "focus:outline-none focus-visible:outline-none ring-inset " +
    "focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-base-100 " +
    "transition duration-150 ease-out active:scale-95";

  return (
    // Bottom border color is tied to the same var the cells use
    <header
      className="w-full bg-transparent text-base-content border-b shadow-none"
      style={{ borderColor: "var(--sg-cell-border-idle)" }}
    >
      <div className="grid grid-cols-3 items-center h-20 px-8">
        <div />

        <h1 className="justify-self-center relative select-none leading-none text-5xl md:text-6xl font-bebas uppercase tracking-[0.02em]">
          {/* outline layer */}
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              WebkitTextStroke: "4px #241547",
              paintOrder: "stroke fill",
              textShadow:
                "0 1px 0 #241547, 1px 0 0 #241547, 0 -1px 0 #241547, -1px 0 0 #241547," +
                "1px 1px 0 #241547, -1px 1px 0 #241547, 1px -1px 0 #241547, -1px -1px 0 #241547",
            }}
          >
            Sigdle
          </span>
          <span className="relative">Sigdle</span>
        </h1>

        <div className="justify-self-end flex items-center gap-4 pr-2">
          <button
            aria-label="Info"
            title="Info"
            onClick={onInfo}
            className={btn}
          >
            <Info className={icon} strokeWidth={2} absoluteStrokeWidth />
          </button>
          <button
            aria-label="Stats"
            title="Stats"
            onClick={onStats}
            className={btn}
          >
            <BarChart3 className={icon} strokeWidth={2} absoluteStrokeWidth />
          </button>
          <button
            aria-label="Settings"
            title="Settings"
            onClick={onSettings}
            className={btn}
          >
            <Settings className={icon} strokeWidth={2} absoluteStrokeWidth />
          </button>
        </div>
      </div>
    </header>
  );
}
