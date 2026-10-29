"use client";

import { useSyncExternalStore } from "react";
import { convexClient } from "@/app/ConvexClientProvider";
import { ConvexRepository } from "@/lib/table/ConvexRepository";
import { tableRepository as localRepository } from "@/lib/table/LocalMockRepository";
import type { TableRepository } from "@/lib/table/types";

export type RepositoryMode = "server" | "local";

const serverRepository: TableRepository | null = convexClient ? new ConvexRepository(convexClient) : null;

function startsInLocalMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("local") === "1";
}

let activeMode: RepositoryMode = serverRepository && !startsInLocalMode() ? "server" : "local";
const listeners = new Set<() => void>();

export function hasServerRepository(): boolean {
  return serverRepository !== null;
}

export function getActiveMode(): RepositoryMode {
  return activeMode;
}

export function getActiveRepository(): TableRepository {
  return activeMode === "server" && serverRepository ? serverRepository : localRepository;
}

/** LocalMockRepository는 지우지 않는다 — 연결이 오래 끊길 때의 로컬 폴백(스펙 §4)과
 *  개발용으로 계속 쓴다. */
export function setActiveMode(mode: RepositoryMode): void {
  if (mode === activeMode) return;
  if (mode === "server" && !serverRepository) return; // 서버 설정이 아예 없으면 무시
  activeMode = mode;
  for (const listener of listeners) listener();
}

export function subscribeActiveMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useActiveMode(): RepositoryMode {
  return useSyncExternalStore(subscribeActiveMode, getActiveMode, getActiveMode);
}

function getServerConnectedSnapshot(): boolean {
  return convexClient?.connectionState().isWebSocketConnected ?? false;
}

function subscribeServerConnection(onChange: () => void): () => void {
  if (!convexClient) return () => {};
  return convexClient.subscribeToConnectionState(onChange);
}

/** 활성 repository와 무관하게 Convex 서버 자체의 연결 상태를 본다 — local 모드로 폴백한
 *  동안에도 서버가 복구됐는지 알아야 "서버로 돌아가기" 버튼을 보여줄 수 있다. */
export function useServerConnected(): boolean {
  return useSyncExternalStore(subscribeServerConnection, getServerConnectedSnapshot, () => false);
}
