"use client";

import { useEffect, useSyncExternalStore } from "react";

const KEY = "saathi-text-size";
const EVENT = "saathi-text-size-change";
const SIZES = ["normal", "large", "xlarge"] as const;
type Size = (typeof SIZES)[number];
const LABEL: Record<Size, { short: string; long: string }> = {
  normal: { short: "A", long: "Normal text" },
  large: { short: "A+", long: "Large text" },
  xlarge: { short: "A++", long: "Extra large text" },
};

function read(): Size {
  try {
    const saved = localStorage.getItem(KEY) as Size | null;
    return saved && SIZES.includes(saved) ? saved : "normal";
  } catch {
    return "normal"; // storage blocked (private mode): the default still works
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function choose(size: Size) {
  try {
    localStorage.setItem(KEY, size);
  } catch {
    /* see read() */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Lets anyone make the whole app larger. The choice is remembered on this device only. */
export function TextSizeToggle() {
  const size = useSyncExternalStore(subscribe, read, () => "normal" as Size);

  useEffect(() => {
    document.documentElement.dataset.textSize = size;
  }, [size]);

  return (
    <div className="text-size" role="group" aria-label="Text size">
      {SIZES.map((s) => (
        <button
          key={s}
          type="button"
          className={s === size ? "active" : undefined}
          aria-pressed={s === size}
          onClick={() => choose(s)}
        >
          <span aria-hidden="true">{LABEL[s].short}</span>
          <span className="sr-only">{LABEL[s].long}</span>
        </button>
      ))}
    </div>
  );
}
