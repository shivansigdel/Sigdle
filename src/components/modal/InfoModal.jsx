// src/components/modal/InfoModal.jsx
import Modal from "./Modal";

export default function InfoModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      panelClassName="
        border bg-base-100/60 text-base-content backdrop-blur-md
      "
      style={{ borderColor: "var(--sg-cell-border-idle)" }}
    >
      <div className="space-y-5">
        {/* Header */}
        <header className="flex flex-col items-center text-center gap-2">
          <div>
            <h3 className="text-3xl font-bebas leading-none">
              Welcome to SIGDLE
            </h3>
            <p className="text-sm text-base-content/60">
              An NBA player guessing game
            </p>
          </div>
        </header>

        {/* How to play (top) */}
        <section
          className="
            rounded-xl border p-4 backdrop-blur-sm bg-base-100/40
          "
          style={{ borderColor: "var(--sg-cell-border-idle)" }}
        >
          <h4 className="font-semibold mb-2">How to play</h4>
          <ol className="list-decimal pl-5 text-sm text-base-content/80 space-y-1">
            <li>Search for an NBA player and submit your guess.</li>
            <li>
              The board gives hints for{" "}
              <span className="text-base-content">
                Team, Conf, Div, Pos, Height, Age, #
              </span>
              .
            </li>
            <li>Use the feedback to find out the answer in 6 guesses.</li>
          </ol>
        </section>

        {/* Colors & icons (bottom) */}
        <section
          className="
            rounded-xl border p-4 backdrop-blur-sm bg-base-100/40
          "
          style={{ borderColor: "var(--sg-cell-border-idle)" }}
        >
          <h4 className="font-semibold mb-2">Colors &amp; icons</h4>
          <ul className="text-sm text-base-content/80 space-y-1">
            <li className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm bg-success" />
              <span className="text-base-content/90">Green</span> — exact match.
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm bg-warning" />
              <span className="text-base-content/90">Yellow</span> — close
              (within range or former team).
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm bg-neutral" />
              <span className="text-base-content/90">Gray</span> — no match.
            </li>
            <li className="flex items-center gap-2">
              <span
                className="
                  text-xs px-1.5 py-0.5 rounded border
                  bg-base-content/10
                "
                style={{ borderColor: "var(--sg-cell-border-idle)" }}
              >
                ▲ ▼
              </span>
              Height / Age / # — target is higher or lower than your guess.
            </li>
          </ul>
        </section>

        {/* Pro tips (bottom) */}
        <section
          className="
            rounded-xl border p-4 backdrop-blur-sm bg-base-100/40
          "
          style={{ borderColor: "var(--sg-cell-border-idle)" }}
        >
          <h4 className="font-semibold mb-2">Tips</h4>
          <ul className="list-disc pl-5 text-sm text-base-content/80 space-y-1">
            <li>
              Try to narrow down the player based on Conference and Division.
            </li>
            <li>Yellow on Team means the player once played there.</li>

            <li>If you want a challenge, switch to Hard Mode in settings.</li>
          </ul>
        </section>
      </div>
    </Modal>
  );
}
