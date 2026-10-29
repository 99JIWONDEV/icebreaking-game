"use client";

import { useId, useState } from "react";
import { TABLE_COUNT } from "@/lib/config";
import { pick, tableEntry } from "@/lib/i18n";
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
      {/* v3 §3: 화면에 보이는 큰 제목은 TableNumberInput의 라벨과 중복이라 지웠다.
          sr-only h1은 남긴다 — 페이지에 h1이 하나는 있어야 한다(axe-core 지적). */}
      <h1 className="sr-only">{pick(mode, tableEntry.title.ko, tableEntry.title.en)}</h1>
      <div className="flex flex-1 flex-col justify-center">
        <TableNumberInput id={inputId} value={value} onChange={(v) => { setValue(v); setError(false); }} error={error} />
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
