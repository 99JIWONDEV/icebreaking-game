"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { INTRO_CACHE_MS } from "@/lib/config";
import { intro } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/useReducedMotion";

const INTRO_SEEN_KEY = "icebreaker:introSeenAt";

const NORMAL_TIMING = { fadeIn: 700, hold: 1500, fadeOut: 800 };
const REDUCED_TIMING = { fadeIn: 200, hold: 600, fadeOut: 300 }; // 1.1s total, under the 1.2s cap

export function markIntroSeen(): void {
  try {
    window.localStorage.setItem(INTRO_SEEN_KEY, String(Date.now()));
  } catch {
    // localStorage unavailable (private mode etc.) — intro just replays next time, harmless
  }
}

export function hasSeenIntroRecently(): boolean {
  try {
    const raw = window.localStorage.getItem(INTRO_SEEN_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < INTRO_CACHE_MS;
  } catch {
    return false;
  }
}

export function Splash({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const timing = reduced ? REDUCED_TIMING : NORMAL_TIMING;
  const doneRef = useRef(false);

  useEffect(() => {
    const total = timing.fadeIn + timing.hold + timing.fadeOut;
    const timer = setTimeout(finish, total);
    return () => clearTimeout(timer);
    // reduced는 useSyncExternalStore가 hydration 직후 보정할 수 있으므로 의존성에 포함한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    // 마운트 시점이 아니라 "닫히는" 시점에 기록 — 그래야 page.tsx의 마운트 effect가
    // 같은 커밋 안에서 방금 쓴 값을 읽어 자기 자신을 건너뛰는 경합이 생기지 않는다.
    markIntroSeen();
    onDone();
  }

  return (
    // 전체 영역 탭으로 건너뛴다 — 지침에 따라 보이지 않는 버튼을 따로 두지 않는다.
    <div
      id="intro-splash"
      onClick={finish}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-canvas px-5 text-center"
    >
      <motion.span
        role="status"
        className="flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{
          duration: (timing.fadeIn + timing.hold + timing.fadeOut) / 1000,
          times: [
            0,
            timing.fadeIn / (timing.fadeIn + timing.hold + timing.fadeOut),
            (timing.fadeIn + timing.hold) / (timing.fadeIn + timing.hold + timing.fadeOut),
            1,
          ],
          ease: "easeOut",
        }}
      >
        <span lang="ko" className="font-serif-kr text-intro-ko text-ink text-pretty">
          {intro.ko}
        </span>
        <span lang="en" className="font-serif-en text-intro-en text-ink-sub">
          {intro.en}
        </span>
      </motion.span>
    </div>
  );
}
