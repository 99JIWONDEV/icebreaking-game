"use client";

import { useId, useState } from "react";
import { TABLE_COUNT } from "@/lib/config";
import { pick, tableEntry, tableNumberLabel, tableNumberPlaceholder } from "@/lib/i18n";
import { BottomBar, bottomBarClearance } from "@/components/BottomBar";
import { Button } from "@/components/Button";
import { Footer } from "@/components/Footer";
import { TableNumberInput } from "@/components/TableNumberInput";
import { useViewStore } from "@/store/useViewStore";

export function TableEntry({ onJoin }: { onJoin: (table: number) => void }) {
  const mode = useViewStore((state) => state.mode);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-help`;
  const helpText = tableEntry.error(TABLE_COUNT);

  function submit() {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > TABLE_COUNT) {
      setError(true);
      return;
    }
    setError(false);
    onJoin(n);
  }

  return (
    <div
      className="flex min-h-dvh flex-col bg-canvas px-5"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: bottomBarClearance(1) }}
    >
      {/* v3 §3: 화면에 보이는 큰 제목은 라벨과 중복이라 지웠다. sr-only h1은 남긴다 —
          페이지에 h1이 하나는 있어야 한다(axe-core 지적). */}
      <h1 className="sr-only">{pick(mode, tableEntry.title.ko, tableEntry.title.en)}</h1>

      {/* 09 §1: 더는 화면 가운데가 아니라 위쪽 3분의 1 지점에 고정한다. iOS 키보드(약
          300px 가정)가 올라와도 입력이 가려지지 않는지는 실제 기기에서만 확인 가능 —
          확인 필요. */}
      <div className="flex flex-1 flex-col" style={{ paddingTop: "clamp(6rem, 22vh, 11.25rem)" }}>
        <div className="mx-auto flex w-full flex-col items-center" style={{ maxWidth: "min(240px, calc(100% - 2.5rem))" }}>
          <label htmlFor={inputId} className="text-center text-entry-label text-ink">
            {pick(mode, tableNumberLabel.ko, tableNumberLabel.en)}
          </label>
          <p className="mt-1 text-center text-caption text-ink-sub">
            {pick(mode, tableNumberPlaceholder.ko, tableNumberPlaceholder.en)}
          </p>
          <div className="mt-5 w-full">
            <TableNumberInput
              id={inputId}
              value={value}
              onChange={(v) => {
                setValue(v);
                setError(false);
              }}
              error={error}
              ariaLabel={pick(mode, tableNumberLabel.ko, tableNumberLabel.en)}
              ariaDescribedBy={error ? errorId : undefined}
            />
          </div>
          {error && (
            <p id={errorId} className="mt-2 flex items-center gap-1 text-center text-label" style={{ color: "var(--color-danger)" }} aria-live="polite">
              <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6.25" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7 4v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="7" cy="9.75" r="0.75" fill="currentColor" />
              </svg>
              {pick(mode, helpText.ko, helpText.en)}
            </p>
          )}
        </div>
      </div>
      <Footer />

      <BottomBar>
        <Button onClick={submit} size="lg" variant="fill">
          {pick(mode, tableEntry.join.ko, tableEntry.join.en)}
        </Button>
      </BottomBar>
    </div>
  );
}
