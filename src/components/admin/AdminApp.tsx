"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { convexClient } from "@/app/ConvexClientProvider";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminTables } from "@/components/admin/AdminTables";
import { copy, lockedMessage } from "@/components/admin/adminCopy";
import { useVisualViewportVars } from "@/lib/useVisualViewportVars";

const noSubscription = () => () => {};
function isLocalQuery(): boolean {
  return new URLSearchParams(window.location.search).get("local") === "1";
}

type Auth = { passcode: string; token: string };

/** 로컬 모드(?local=1)나 Convex 미연결이면 안내만 보여 준다(빈 화면 금지). */
export function AdminApp() {
  useVisualViewportVars(); // 10/11번: 대화상자/하단 바가 iOS 키보드 위에서 가려지지 않게
  const local = useSyncExternalStore(noSubscription, isLocalQuery, () => false);

  if (!convexClient || local) {
    return (
      <main className="flex min-h-dvh flex-col items-center px-5 text-center" style={{ paddingTop: "var(--entry-form-top)" }}>
        <h1 className="text-btn text-ink">{copy.title}</h1>
        <p role="status" className="mt-4 text-body text-ink">
          {copy.localOnly}
        </p>
        <p className="mt-2 text-caption text-ink-sub-bg">{copy.localOnlyHint}</p>
      </main>
    );
  }
  return (
    <main>
      <AdminSession />
    </main>
  );
}

export function AdminSession() {
  const login = useMutation(api.admin.checkPasscode);
  const signOutMutation = useMutation(api.admin.signOut);
  // passcode와 토큰은 이 React 상태(메모리)에만 둔다 — storage/쿠키/URL 금지. 새로고침하면 사라진다.
  const [auth, setAuth] = useState<Auth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(passcode: string) {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const r = await login({ passcode });
      if (r.status === "ok" && r.token) {
        setAuth({ passcode, token: r.token });
      } else if (r.status === "locked") {
        setError(lockedMessage(r.retryAfterMs ?? 0));
      } else if (r.status === "not_configured") {
        setError(copy.notConfigured);
      } else {
        setError(copy.denied);
      }
    } catch {
      setError(copy.failed);
    } finally {
      setPending(false);
    }
  }

  const expire = useCallback(() => {
    setAuth(null);
    setNotice(copy.expiredSession);
  }, []);

  function signOut() {
    const token = auth?.token;
    setAuth(null); // 먼저 폐기 — 서버 호출이 실패해도 이 화면에서는 이미 로그아웃이다
    setNotice(null);
    if (token) void signOutMutation({ token }).catch(() => {});
  }

  if (!auth) return <AdminLogin onSubmit={submit} error={error} notice={notice} pending={pending} />;
  return <AdminTables token={auth.token} passcode={auth.passcode} onExpired={expire} onSignOut={signOut} />;
}
