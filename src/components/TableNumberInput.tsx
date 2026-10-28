"use client";

import { useState } from "react";
import { TABLE_COUNT } from "@/lib/config";
import { pick, tableEntry, tableNumberLabel, tableNumberPlaceholder } from "@/lib/i18n";
import { useViewStore } from "@/store/useViewStore";

/** Reused by the first-entry screen and the menu's "change table" sheet — spec A-6. */
export function TableNumberInput({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error: boolean;
}) {
  const mode = useViewStore((state) => state.mode);
  const [focused, setFocused] = useState(false);
  const errorId = `${id}-help`;
  const helpText = tableEntry.error(TABLE_COUNT);

  return (
    <div className="flex flex-col items-center gap-2">
      <label htmlFor={id} className="self-start text-label text-ink-sub">
        {pick(mode, tableNumberLabel.ko, tableNumberLabel.en)}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={3}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={pick(mode, tableNumberPlaceholder.ko, tableNumberPlaceholder.en)}
        aria-invalid={error}
        aria-describedby={errorId}
        className="w-full text-center text-input-number text-ink outline-none placeholder:text-ink-sub"
        style={{
          maxWidth: "17.5rem",
          height: "var(--size-input-table)",
          borderRadius: "var(--radius-input)",
          background: "var(--color-paper)",
          border: `1.5px solid ${error ? "var(--color-danger)" : "var(--color-line-strong)"}`,
          caretColor: "var(--color-accent)",
          boxShadow: focused
            ? "0 0 0 2px var(--color-accent), 0 0 0 6px color-mix(in srgb, var(--color-accent) 18%, transparent)"
            : "none",
        }}
      />
      <p
        id={errorId}
        className="flex items-center gap-1 self-start text-label"
        style={{ color: error ? "var(--color-danger)" : "var(--color-ink-sub)" }}
      >
        {error && (
          <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6.25" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 4v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="9.75" r="0.75" fill="currentColor" />
          </svg>
        )}
        {pick(mode, helpText.ko, helpText.en)}
      </p>
    </div>
  );
}
