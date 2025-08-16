// src/components/modal/Modal.jsx
import React, { useEffect, useState } from "react";

export default function Modal({
  open,
  onClose,
  children,
  className = "",
  /** optional alias so callers can pass panelClassName (back-compat) */
  panelClassName,
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    } else if (mounted) {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 150);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  if (!mounted) return null;

  const closeOnBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={closeOnBackdrop}
      className={[
        "fixed inset-0 z-50 flex items-center justify-center",
        "transition-opacity duration-150 ease-out",
        visible ? "bg-black/60 opacity-100" : "bg-black/0 opacity-0",
        "motion-reduce:transition-none",
      ].join(" ")}
    >
      <div
        className={[
          "relative w-full max-w-md rounded-2xl shadow-2xl p-6 border",
          // theme-adaptive panel (no blur)
          "bg-base-100/60 text-base-content",
          // only animate opacity & transform for smoothness
          "transition-[opacity,transform] duration-150 ease-out",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          "motion-reduce:transition-none motion-reduce:transform-none",
          className || panelClassName || "",
        ].join(" ")}
        // match cell/header outline color
        style={{ borderColor: "var(--sg-cell-border-idle)" }}
      >
        {/* close button */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className={[
            // same placement/size, but no bg/border
            "absolute right-3 top-3 grid place-items-center h-9 w-9 rounded-xl",
            "text-base-content/70 hover:text-base-content",
            "bg-transparent", // ← no tint
            "transition-colors duration-150",
          ].join(" ")}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 6l12 12M18 6l-12 12" />
          </svg>
        </button>

        {children}
      </div>
    </div>
  );
}
