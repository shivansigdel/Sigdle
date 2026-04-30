export default function Cell({ value = "", state = "idle", hint, delay }) {
  const animate = Number.isFinite(delay) && delay >= 0;

  const idleColors = {
    bg: "hsl(var(--b2))",
    bd: "var(--sg-cell-border-idle)",
    fg: "hsl(var(--bc))",
  };

  const finalColors =
    state === "correct"
      ? { bg: "#16a34a", bd: "#16a34a", fg: "#ffffff" }
      : state === "present"
      ? { bg: "#eab308", bd: "#eab308", fg: "#000000" }
      : state === "absent"
      ? { bg: "#262626", bd: "#404040", fg: "#d4d4d4" }
      : { ...idleColors };

  const base =
    "relative aspect-square w-full flex items-center justify-center rounded-md border " +
    "text-xs md:text-sm font-medium origin-top will-change-transform [backface-visibility:hidden]";

  const style = animate
    ? {
        "--bg-idle": idleColors.bg,
        "--bd-idle": idleColors.bd,
        "--fg-idle": idleColors.fg,
        "--bg-final": finalColors.bg,
        "--bd-final": finalColors.bd,
        "--fg-final": finalColors.fg,
        "--sg-flip-delay": `${delay}ms`,
        // Keep final colors visible even if animation is skipped by the browser.
        backgroundColor: "var(--bg-final)",
        borderColor: "var(--bd-final)",
        color: "var(--fg-final)",
      }
    : {
        backgroundColor: finalColors.bg,
        borderColor: finalColors.bd,
        color: finalColors.fg,
      };

  const arrow = hint === "up" ? "▲" : hint === "down" ? "▼" : "";

  return (
    <div className={`${base} ${animate ? "sg-flip" : ""}`} style={style}>
      <span className="pointer-events-none">{value}</span>

      {arrow && (
        <span
          className="absolute bottom-1 right-1 text-[10px] md:text-xs opacity-80"
          style={
            animate
              ? {
                  opacity: 0,
                  animation: "sg-appear 1ms linear both",
                  animationDelay: `calc(var(--sg-flip-delay, 0ms) + 620ms)`,
                }
              : undefined
          }
        >
          {arrow}
        </span>
      )}
    </div>
  );
}
