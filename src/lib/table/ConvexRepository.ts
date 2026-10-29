"use client";

import type { ConvexReactClient } from "convex/react";
// 실제 파일은 `npx convex dev` codegen이 만든다 (Part B §1, 사람이 하는 단계). 그 전까지는
// convex/_generated/api.ts의 임시 스텁(느슨한 any 타입)을 쓴다 — 번들러가 모듈을 못 찾아
// 죽는 것만 막는 용도, 실제 타입 안전성은 codegen 이후에 생긴다.
import { api } from "../../../convex/_generated/api";
import { withRetry } from "@/lib/table/withRetry";
import type {
  CloseResult,
  ConnectionState,
  DrawRandomResult,
  DrawResult,
  ReshuffleResult,
  TableRepository,
  TableState,
} from "@/lib/table/types";

function mapConnectionState(cs: { isWebSocketConnected: boolean }): ConnectionState {
  // Convex 클라이언트는 자동으로 재시도를 계속하고 "포기"하는 개념이 없다 — isWebSocketConnected
  // 가 false면 전부 reconnecting으로 본다. "offline"은 로컬 30초 타임아웃 로직(§4-5)이 별도로 판단한다.
  return cs.isWebSocketConnected ? "connected" : "reconnecting";
}

export class ConvexRepository implements TableRepository {
  constructor(private client: ConvexReactClient) {}

  subscribe(
    table: number,
    onState: (s: TableState) => void,
    onConn: (c: ConnectionState) => void,
  ): () => void {
    const watch = this.client.watchQuery(api.tables.get, { number: table });

    const pushState = () => {
      const result = watch.localQueryResult();
      if (result?.exists) onState(result.state);
      // exists:false(아직 seed 안 됨) 또는 아직 결과 없음(로딩)은 onState를 호출하지 않는다 —
      // useTableState의 state가 null로 남아 "잘못된 빈 격자"를 보여주지 않는다 (spec §4-1).
    };
    pushState();
    const unsubQuery = watch.onUpdate(pushState);

    onConn(mapConnectionState(this.client.connectionState()));
    const unsubConn = this.client.subscribeToConnectionState((cs) => onConn(mapConnectionState(cs)));

    return () => {
      unsubQuery();
      unsubConn();
    };
  }

  drawCard(a: { table: number; cardId: string; epoch: number; clientId: string }): Promise<DrawResult> {
    return withRetry(() => this.client.mutation(api.tables.drawCard, a));
  }

  drawRandom(a: {
    table: number;
    category?: string;
    epoch: number;
    clientId: string;
  }): Promise<DrawRandomResult> {
    return withRetry(() => this.client.mutation(api.tables.drawRandom, a));
  }

  closeCard(a: { table: number; cardId: string; epoch: number; clientId: string }): Promise<CloseResult> {
    return withRetry(() => this.client.mutation(api.tables.closeCard, a));
  }

  reshuffleCategory(a: { table: number; category: string; epoch: number }): Promise<ReshuffleResult> {
    return withRetry(() => this.client.mutation(api.tables.reshuffleCategory, a));
  }
}
