"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getClientId } from "@/lib/table/clientId";
import { getActiveRepository, subscribeActiveMode } from "@/lib/table";
import { getDefaultStorage } from "@/lib/table/storage";
import type { ConnectionState, TableState } from "@/lib/table/types";

const noSubscription = () => () => {};

export function useClientId(): string {
  // clientId never changes after creation, so there's nothing to subscribe to —
  // getSnapshot just reads/creates it from localStorage (allowed to be impure).
  return useSyncExternalStore(noSubscription, () => getClientId(getDefaultStorage()), () => "");
}

export function useTableState(table: number | null) {
  // server/local 전환(로컬 폴백, §4-5)에 반응해 활성 repository를 다시 읽는다.
  const repository = useSyncExternalStore(subscribeActiveMode, getActiveRepository, getActiveRepository);
  const [state, setState] = useState<TableState | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connected");
  const clientId = useClientId();

  // table이나 repository가 바뀌면 재구독 effect가 돌기 전에 이전 상태를 지운다 — 그래야
  // 구독이 비동기인 서버 repository에서 "다른 테이블의 상태가 섞여 보이는" 틈이 없다
  // (spec §4-2). 렌더 중 비교 패턴이라 effect의 setState-in-effect 규칙에 걸리지 않는다.
  const [subscribedKey, setSubscribedKey] = useState<{ table: number | null; repository: typeof repository } | null>(
    null,
  );
  if (!subscribedKey || subscribedKey.table !== table || subscribedKey.repository !== repository) {
    setSubscribedKey({ table, repository });
    if (state !== null) setState(null);
  }

  useEffect(() => {
    if (table === null) return;
    return repository.subscribe(table, setState, setConnection);
  }, [table, repository]);

  const drawCard = useCallback(
    (cardId: string) => {
      if (table === null || !state) return Promise.reject(new Error("no table"));
      return repository.drawCard({ table, cardId, epoch: state.epoch, clientId });
    },
    [repository, table, state, clientId],
  );

  const drawRandom = useCallback(
    (category?: string) => {
      if (table === null || !state) return Promise.reject(new Error("no table"));
      return repository.drawRandom({ table, category, epoch: state.epoch, clientId });
    },
    [repository, table, state, clientId],
  );

  const closeCard = useCallback(
    (cardId: string) => {
      if (table === null || !state) return Promise.reject(new Error("no table"));
      return repository.closeCard({ table, cardId, epoch: state.epoch, clientId });
    },
    [repository, table, state, clientId],
  );

  const reshuffleCategory = useCallback(
    (category: string) => {
      if (table === null || !state) return Promise.reject(new Error("no table"));
      return repository.reshuffleCategory({ table, category, epoch: state.epoch });
    },
    [repository, table, state],
  );

  return { state, connection, clientId, drawCard, drawRandom, closeCard, reshuffleCategory };
}
