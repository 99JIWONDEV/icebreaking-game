"use client";

import { useId, useState } from "react";
import { TABLE_COUNT } from "@/lib/config";
import { pick, tableEntry } from "@/lib/i18n";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useViewStore } from "@/store/useViewStore";

export function TableEntry({ onJoin }: { onJoin: (table: number) => void }) {
  const mode = useViewStore((state) => state.mode);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const inputId = useId();
  const errorId = useId();

  function submit() {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > TABLE_COUNT) {
      setError(true);
      return;
    }
    setError(false);
    onJoin(n);
  }

  const errorText = tableEntry.error(TABLE_COUNT);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-5" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="flex flex-1 flex-col justify-center gap-4 pb-20">
        <div className="flex flex-col gap-2 text-left">
          <h1 className="text-pretty font-serif-kr text-ink text-question-ko-solo">
            {mode === "en" ? tableEntry.title.en : tableEntry.title.ko}
          </h1>
          {mode === "both" && (
            <p lang="en" className="font-serif-en text-ink-sub text-question-en-both px-1">
              {tableEntry.title.en}
            </p>
          )}
          <div>
            {mode !== "en" && <p className="text-body text-ink-sub px-1">{tableEntry.subtitle.ko}</p>}
            {mode !== "ko" && <p className="text-body text-ink-sub px-1">{tableEntry.subtitle.en}</p>}
          </div>
        </div>

        <div>
          <label htmlFor={inputId} className="sr-only">
            {pick(mode, tableEntry.title.ko, tableEntry.title.en)}
          </label>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/\D/g, ""));
              setError(false);
            }}
            aria-invalid={error}
            aria-describedby={error ? errorId : undefined}
            className="w-full border-b bg-transparent py-2 text-question-ko-solo text-ink outline-none"
            style={{ borderColor: error ? "var(--color-accent)" : "var(--color-hairline)" }}
          />
          {error && (
            <p id={errorId} className="mt-2 text-label text-accent">
              {pick(mode, errorText.ko, errorText.en)}
            </p>
          )}
        </div>
      </div>

      <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <PrimaryButton onClick={submit}>{pick(mode, tableEntry.join.ko, tableEntry.join.en)}</PrimaryButton>
      </div>
    </div>
  );
}
