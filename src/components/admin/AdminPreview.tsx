"use client";

import { useMemo } from "react";
import { ConvexProvider, type ConvexReactClient } from "convex/react";
import { AdminSession } from "@/components/admin/AdminApp";
import { createFakeClient } from "@/components/admin/FakeConvexClient";
import { useVisualViewportVars } from "@/lib/useVisualViewportVars";

export function AdminPreview() {
  useVisualViewportVars();
  const scenario = useMemo(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("scenario")), []);
  const client = useMemo(() => createFakeClient(scenario) as unknown as ConvexReactClient, [scenario]);
  return (
    <ConvexProvider client={client}>
      <main>
        <AdminSession />
      </main>
    </ConvexProvider>
  );
}
