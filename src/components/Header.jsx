// src/components/Header.jsx
import { Info, BarChart3, Settings } from "lucide-react";

export default function Header({ onInfo, onStats, onSettings }) {
  // Slightly smaller on phones, comfy on desktop
  const icon =
    "h-6 w-6 md:h-7 md:w-7 transition-transform duration-150 ease-out group-hover:scale-95 pointer-events-none " +
    "motion-reduce:transition-none motion-reduce:transform-none";

  const btn =
    "group inline-flex items-center justify-center rounded-full h-10 w-10 md:h-12 md:w-12 " +
    "hover:bg-base-200/60 " +
    "focus:outline-none focus-visible:outline-none ring-inset " +
    "focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-base-100 " +
    "transition duration-150 ease-out active:scale-95 " +
    "motion-reduce:transition-none motion-reduce:transform-none";

  return (
    <header
      className="w-full bg-transparent text-base-content border-b shadow-none"
      style={{ borderColor: "var(--sg-cell-border-idle)" }}
    >
      {/* Same children, but grid becomes 2 rows on mobile, 1 row on desktop */}
      <div
        className="
          grid grid-cols-3 grid-rows-[auto_auto] md:grid-rows-1
          items-center h-20 md:h-20 px-4 md:px-8
          pt-[env(safe-area-inset-top)]
        "
      >
        {/* left spacer: keep on desktop, hide on mobile */}
        <div className="hidden md:block" />

        {/* Title: centered on both; spans full row on mobile */}
        <h1
          className="
            col-span-3 md:col-span-1 md:col-start-2
            row-start-1 justify-self-center
            relative select-none leading-none
            text-5xl md:text-6xl font-bebas uppercase tracking-[0.02em]
          "
        >
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              WebkitTextStroke: "2px #241547",
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

        {/* Buttons: centered under title on mobile; right on desktop */}
        <div
          className="
            col-span-3 md:col-span-1 md:col-start-3
            row-start-2 md:row-start-1
            justify-self-center md:justify-self-end
            flex items-center gap-3 md:gap-4 pr-1 md:pr-2
          "
        >
          <button
            type="button"
            aria-label="Info"
            title="Info"
            onClick={onInfo}
            className={btn}
          >
            <Info className={icon} strokeWidth={2} absoluteStrokeWidth />
          </button>
          <button
            type="button"
            aria-label="Stats"
            title="Stats"
            onClick={onStats}
            className={btn}
          >
            <BarChart3 className={icon} strokeWidth={2} absoluteStrokeWidth />
          </button>
          <button
            type="button"
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
