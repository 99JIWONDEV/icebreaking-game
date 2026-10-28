"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getClientId } from "@/lib/table/clientId";
import { getDefaultStorage } from "@/lib/table/storage";
import { tableRepository } from "@/lib/table/LocalMockRepository";
import type { ConnectionState, TableState } from "@/lib/table/types";

const noSubscription = () => () => {};

export function useClientId(): string {
  // clientId never changes after creation, so there's nothing to subscribe to —
  // getSnapshot just reads/creates it from localStorage (allowed to be impure).
  return useSyncExternalStore(noSubscription, () => getClientId(getDefaultStorage()), () => "");
}

export function useTableState(table: number | null) {
  const [state, setState] = useState<TableState | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connected");
  const clientId = useClientId();

  useEffect(() => {
    if (table === null) return;
    return tableRepository.subscribe(table, setState, setConnection);
  }, [table]);

  const drawCard = useCallback(
    (cardId: string) => {
      if (table === null || !state) return Promise.reject(new Error("no table"));
      return tableRepository.drawCard({ table, cardId, epoch: state.epoch, clientId });
    },
    [table, state, clientId],
  );

  const drawRandom = useCallback(
    (category?: string) => {
      if (table === null || !state) return Promise.reject(new Error("no table"));
      return tableRepository.drawRandom({ table, category, epoch: state.epoch, clientId });
    },
    [table, state, clientId],
  );

  const closeCard = useCallback(
    (cardId: string) => {
      if (table === null || !state) return Promise.reject(new Error("no table"));
      return tableRepository.closeCard({ table, cardId, epoch: state.epoch, clientId });
    },
    [table, state, clientId],
  );

  const reshuffleCategory = useCallback(
    (category: string) => {
      if (table === null || !state) return Promise.reject(new Error("no table"));
      return tableRepository.reshuffleCategory({ table, category, epoch: state.epoch });
    },
    [table, state],
  );

  return { state, connection, clientId, drawCard, drawRandom, closeCard, reshuffleCategory };
}
