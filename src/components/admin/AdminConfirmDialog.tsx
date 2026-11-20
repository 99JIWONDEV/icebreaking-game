"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { copy } from "@/components/admin/adminCopy";

/**
 * 초기화 확인 대화상자. 네이티브 <dialog>.showModal()을 쓴다 — 포커스 트랩, Escape, 배경 inert,
 * 닫힐 때 포커스 복귀를 브라우저가 처리한다. 위치는 10/11번의 --vv-* 변수로 잡아서 iOS 키보드가
 * 올라와도(전체 초기화의 "전체" 입력) 보이는 영역의 가운데에 머문다.
 * requireWord가 있으면 그 단어를 입력해야 확인 버튼이 켜진다.
 */
export function AdminConfirmDialog({
  open,
  title,
  ko,
  en,
  requireWord,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  ko: string;
  en: string;
  requireWord?: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const inputId = useId();
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const wordOk = !requireWord || typed.normalize("NFC").trim() === requireWord;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="admin-dialog"
      onCancel={(e) => {
        // Escape — 실행 중에는 닫히지 않게, 아니면 취소로 처리(상태는 부모가 쥔다)
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      {open && (
        <div className="flex flex-col gap-4 p-5">
          <h2 id={titleId} className="text-btn text-ink">
            {title}
          </h2>
          <div className="flex flex-col gap-1">
            <p lang="ko" className="text-body text-ink text-pretty">
              {ko}
            </p>
            <p lang="en" className="text-caption text-ink-sub">
              {en}
            </p>
          </div>
          {requireWord && (
            <div className="flex flex-col gap-1">
              <label htmlFor={inputId} className="text-label text-ink-sub">
                {copy.typeToConfirm}
              </label>
              <input
                id={inputId}
                lang="ko"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={busy}
                className="h-11 w-full bg-transparent text-center text-body text-ink outline-none"
                style={{ borderBottom: "2px solid var(--color-line-strong)" }}
              />
            </div>
          )}
          <div aria-live="polite" className="min-h-[1.125rem]">
            {error && <p className="text-label text-danger">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button size="md" variant="weak" onClick={onCancel} disabled={busy}>
              {copy.cancel}
            </Button>
            <Button size="md" variant="fill" onClick={onConfirm} disabled={!wordOk} loading={busy}>
              {copy.reset}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
