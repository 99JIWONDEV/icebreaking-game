"use client";

import { useEffect, useState } from "react";
import { MainScreen } from "@/components/MainScreen";
import { hasSeenIntroRecently, Splash } from "@/components/Splash";
import { TableEntry } from "@/components/TableEntry";
import { TABLE_COUNT } from "@/lib/config";
import { useViewStore } from "@/store/useViewStore";

type Phase = "intro" | "tableEntry" | "main";

function readTableFromUrl(): number | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("t");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= TABLE_COUNT ? n : null;
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("intro");
  const tableNumber = useViewStore((s) => s.tableNumber);
  const setTableNumber = useViewStore((s) => s.setTableNumber);

  function proceedPastIntro() {
    const fromUrl = readTableFromUrl();
    const table = fromUrl ?? useViewStore.getState().tableNumber;
    if (fromUrl) setTableNumber(fromUrl);
    setPhase(table ? "main" : "tableEntry");
  }

  useEffect(() => {
    // queueMicrotask: html[data-intro=skip] already hid the splash visually (layout.tsx's
    // inline script), this just catches the React state up to it — deferred so it isn't a
    // bare synchronous setState call inside the effect body.
    if (hasSeenIntroRecently()) queueMicrotask(proceedPastIntro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // axe-core landmark-one-main/region: 앱 전체를 <main> 하나로 감싼다(여러 "페이지"가
  // 전환되는 SPA라 각 단계 컴포넌트 안이 아니라 여기 한 곳에만 둔다).
  if (phase === "intro") {
    return (
      <main>
        <Splash onDone={proceedPastIntro} />
      </main>
    );
  }

  if (phase === "tableEntry" || !tableNumber) {
    return (
      <main>
        <TableEntry
          onJoin={(n) => {
            setTableNumber(n);
            setPhase("main");
          }}
        />
      </main>
    );
  }

  return (
    <main>
      <MainScreen
        tableNumber={tableNumber}
        onChangeTable={(n) => {
          setTableNumber(n);
        }}
      />
    </main>
  );
}
