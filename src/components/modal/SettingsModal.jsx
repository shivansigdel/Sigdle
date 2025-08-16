// src/components/modal/SettingsModal.jsx
import { useEffect, useState } from "react";
import Modal from "./Modal";
import {
  getMode,
  MODE_HARD,
  MODE_EASY,
  canChangeModeNow,
  setModeGuarded,
  EASY_LIMIT,
} from "../../api/game";

export default function SettingsModal({ open, onClose }) {
  const [theme, setTheme] = useState("light");
  const [hard, setHard] = useState(getMode() === MODE_HARD);
  const [locked, setLocked] = useState(!canChangeModeNow());

  // Sync values each time the modal opens
  useEffect(() => {
    if (!open) return;
    const t = document.documentElement.dataset.theme || "light";
    setTheme(t);
    setHard(getMode() === MODE_HARD);
    setLocked(!canChangeModeNow());
  }, [open]);

  const applyTheme = (t) => {
    const root = document.documentElement;
    root.classList.add("sg-no-trans");
    root.dataset.theme = t;
    root.classList.toggle("dark", t === "business");
    localStorage.setItem("sigdle-theme", t);
    setTheme(t);
    requestAnimationFrame(() => root.classList.remove("sg-no-trans"));
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="text-3xl font-bebas mb-4">Settings</h3>

      <div className="space-y-4">
        {/* Hard mode */}
        <label className="label cursor-pointer justify-between">
          <span className="text-base-content">
            Hard mode (All active players)
          </span>
          <input
            key={`hard-${hard}-${locked}-${open ? 1 : 0}`}
            type="checkbox"
            className="toggle bg-white/30 border-white/30 checked:bg-red-500 checked:border-red-500"
            defaultChecked={hard}
            disabled={locked}
            aria-label="Hard mode"
            title={
              locked
                ? "Finish or reset the current round to change mode."
                : "Toggle to include all active players."
            }
            onChange={(e) => {
              const wantHard = e.target.checked;
              const ok = setModeGuarded(wantHard ? MODE_HARD : MODE_EASY);
              if (!ok) {
                e.target.checked = !wantHard;
                return;
              }
              setHard(wantHard);
            }}
          />
        </label>

        <p
          className={`text-xs ${
            locked
              ? "text-amber-600 dark:text-amber-400"
              : "text-base-content/70"
          }`}
        >
          {locked
            ? "Finish or reset the current round to change mode."
            : `Hard Mode generates every possible NBA player (G-league, Bench Warmers, etc...)`}
        </p>

        <label className="label cursor-pointer justify-between">
          <span className="text-base-content">Dark Mode </span>
          <input
            key={`theme-${theme}-${open ? 1 : 0}`}
            type="checkbox"
            className="toggle bg-white/30 border-white/30 checked:bg-white checked:border-white"
            checked={theme === "business"}
            onChange={(e) =>
              applyTheme(e.target.checked ? "business" : "light")
            }
            aria-label="Toggle business theme"
            title="Switch between light and business"
          />
        </label>

        <label className="label cursor-pointer justify-start gap-3">
          <span className="text-base-content">
            Colorblind hints (coming soon)
          </span>
          <input
            type="checkbox"
            className="toggle bg-white border-white checked:bg-white checked:border-white"
            disabled
          />
        </label>
      </div>
    </Modal>
  );
}
