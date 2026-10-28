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
    // v3: 전부 가운데 정렬이 아니라 "입력 상자 폭(최대 240px)에 맞춘" 왼쪽 정렬 묶음 —
    // 이 묶음 자체는 화면/시트 가운데에 둔다(mx-auto).
    <div className="mx-auto flex w-full flex-col gap-1.5" style={{ maxWidth: "var(--size-input-table-max)" }}>
      <label htmlFor={id} className="text-label text-ink">
        {pick(mode, tableNumberLabel.ko, tableNumberLabel.en)}
      </label>
      <p className="text-caption text-ink-sub">{pick(mode, tableNumberPlaceholder.ko, tableNumberPlaceholder.en)}</p>
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
        aria-invalid={error}
        aria-describedby={error ? errorId : undefined}
        className="w-full text-center text-input-number text-ink outline-none"
        style={{
          height: "var(--size-input-table)",
          borderRadius: "var(--radius-input)",
          background: "var(--color-paper)",
          border: `1.5px solid ${error ? "var(--color-danger)" : "var(--color-line-strong)"}`,
          caretColor: "var(--color-ink)",
          boxShadow: error ? "0 0 0 2px var(--color-danger)" : focused ? "0 0 0 2px var(--color-ink)" : "none",
        }}
      />
      {/* v3: 평소엔 숨겨서 화면을 비운다 — 오류일 때만 렌더링 */}
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-label" style={{ color: "var(--color-danger)" }}>
          <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6.25" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 4v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="9.75" r="0.75" fill="currentColor" />
          </svg>
          {pick(mode, helpText.ko, helpText.en)}
        </p>
      )}
    </div>
  );
}
