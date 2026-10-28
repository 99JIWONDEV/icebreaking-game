"use client";

import { useId, useState } from "react";
import { TABLE_COUNT } from "@/lib/config";
import { pick, tableEntry } from "@/lib/i18n";
import { BottomBar, bottomBarClearance } from "@/components/BottomBar";
import { Button } from "@/components/Button";
import { TableNumberInput } from "@/components/TableNumberInput";
import { useViewStore } from "@/store/useViewStore";

export function TableEntry({ onJoin }: { onJoin: (table: number) => void }) {
  const mode = useViewStore((state) => state.mode);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const inputId = useId();

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
      <div className="flex flex-1 flex-col justify-center gap-6">
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

        <TableNumberInput id={inputId} value={value} onChange={(v) => { setValue(v); setError(false); }} error={error} />
      </div>

      <BottomBar>
        <Button onClick={submit} size="xl" variant="fill" display="full">
          {pick(mode, tableEntry.join.ko, tableEntry.join.en)}
        </Button>
      </BottomBar>
    </div>
  );
}
