"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

/**
 * NEXT_PUBLIC_CONVEX_URL이 없으면(배포 전, 또는 로컬 폴백 전용 실행) 그냥 children을
 * 통과시킨다 — src/lib/table/index.ts가 이 경우 LocalMockRepository로 자동 전환한다.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convexClient) return <>{children}</>;
  return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
}

export { convexClient };
