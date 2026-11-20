"use client";

import { useId, useState } from "react";
import { BottomBar, bottomBarClearance } from "@/components/BottomBar";
import { Button } from "@/components/Button";
import { copy } from "@/components/admin/adminCopy";

/** 비밀번호 입력 — 입장 화면과 같은 밑줄 입력 언어. passcode는 부모의 React 상태로만 넘어가고
 *  localStorage/sessionStorage/쿠키/URL 어디에도 쓰지 않는다. */
export function AdminLogin({
  onSubmit,
  error,
  notice,
  pending,
}: {
  onSubmit: (passcode: string) => void;
  error: string | null;
  notice: string | null;
  pending: boolean;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <form
      className="flex min-h-dvh flex-col px-5"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: bottomBarClearance(1) }}
      onSubmit={(e) => {
        e.preventDefault();
        if (value.length > 0 && !pending) onSubmit(value);
      }}
    >
      <h1 className="sr-only">{copy.title}</h1>
      <div className="flex flex-1 flex-col" style={{ paddingTop: "var(--entry-form-top)" }}>
        <div className="mx-auto flex w-full flex-col items-center" style={{ maxWidth: "min(280px, calc(100% - 2.5rem))" }}>
          <label htmlFor={inputId} className="text-center text-entry-label text-ink">
            {copy.passcodeLabel}
          </label>
          <div className="mt-5 w-full" style={{ height: "var(--size-input-table)" }}>
            <input
              id={inputId}
              type="password"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              name="admin-passcode-not-autofillable"
              data-1p-ignore
              data-lpignore="true"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="h-full w-full bg-transparent text-center text-input-number text-ink outline-none"
              style={{
                borderBottom: `2px solid ${error ? "var(--color-danger)" : focused ? "var(--color-ink)" : "var(--color-line-on-bg)"}`,
                caretColor: "var(--color-ink)",
              }}
            />
          </div>
          {/* 오류/안내는 aria-live로 — 어느 쪽이 틀렸는지 단서 없이 단순한 문구만 보여 준다 */}
          <div aria-live="polite" className="mt-3 min-h-[1.125rem] text-center">
            {error && (
              <p id={errorId} className="text-label text-danger">
                {error}
              </p>
            )}
            {!error && notice && <p className="text-label text-ink-sub-bg">{notice}</p>}
          </div>
        </div>
      </div>
      <BottomBar>
        <Button type="submit" size="lg" variant="fill" loading={pending} disabled={value.length === 0}>
          {copy.confirm}
        </Button>
      </BottomBar>
    </form>
  );
}
