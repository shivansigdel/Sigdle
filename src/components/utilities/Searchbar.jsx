// src/components/utilities/Searchbar.jsx
export default function Searchbar({
  value,
  onChange,
  onSubmit,
  onBlur,
  onFocus,
  placeholder = "Search player…",
}) {
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.currentTarget.blur();
      onBlur?.();
    }
  };

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="relative w-full">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          onFocus={onFocus}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          aria-label="Search players"
          className="
            peer w-full h-14 md:h-16 rounded-lg px-5 md:px-6
            bg-transparent border-0 outline-none ring-0
            focus:outline-none focus:ring-0 focus-visible:outline-none
            text-base-content placeholder:text-base-content/50
            text-base md:text-xl
          "
        />

        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{ border: "1.5px solid var(--sg-cell-border-idle)" }}
        />
      </div>
    </form>
  );
}
