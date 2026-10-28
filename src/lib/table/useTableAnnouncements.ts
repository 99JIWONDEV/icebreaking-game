"use client";

import { useState } from "react";
import { liveMessages, pick } from "@/lib/i18n";
import type { TableState } from "@/lib/table/types";
import type { LanguageMode } from "@/store/useViewStore";

/**
 * Turns table-state transitions into aria-live announcements, skipping the
 * action the local client itself just took (spec §9: "내가 한 동작은 중복 안내하지 않는다").
 *
 * Uses React's "adjust state during render" pattern (comparing against the previous
 * state snapshot) instead of a useEffect, since the derived announcement depends on
 * the transition between two renders, not on syncing with an external system.
 */
export function useTableAnnouncements(state: TableState | null, clientId: string, mode: LanguageMode) {
  const [prev, setPrev] = useState<TableState | null>(null);
  const [message, setMessage] = useState("");
  const [closedByMe, setClosedByMe] = useState<ReadonlySet<string>>(() => new Set());

  if (state && clientId && state !== prev) {
    const prevSnapshot = prev;
    setPrev(state);

    if (prevSnapshot && state.epoch !== prevSnapshot.epoch) {
      setMessage(pick(mode, liveMessages.tableReset.ko, liveMessages.tableReset.en));
    } else if (state.current && (!prevSnapshot?.current || prevSnapshot.current.cardId !== state.current.cardId)) {
      if (state.current.by !== clientId) {
        setMessage(pick(mode, liveMessages.cardOpenedByOther.ko, liveMessages.cardOpenedByOther.en));
      }
    } else if (prevSnapshot?.current && !state.current) {
      const cardId = prevSnapshot.current.cardId;
      if (closedByMe.has(cardId)) {
        const next = new Set(closedByMe);
        next.delete(cardId);
        setClosedByMe(next);
      } else {
        setMessage(pick(mode, liveMessages.cardClosed.ko, liveMessages.cardClosed.en));
      }
    }
  }

  function notifyLocalClose(cardId: string) {
    setClosedByMe((prevSet) => new Set(prevSet).add(cardId));
  }

  return { message, notifyLocalClose };
}
