"use client";

import { useState, type KeyboardEvent } from "react";

/**
 * 09 §1/§2: 테이블 번호 밑줄 입력 — 입장 화면과 메뉴의 인라인 편집에서 공유한다(둘 다
 * 둘레가 다르다: 입장은 라벨+예시가 위에, 메뉴는 버튼 줄이 아래에 있다 — 그 부분은
 * 각 화면이 직접 조립하고, 이 컴포넌트는 입력 자체 + 깜빡이는 커서만 맡는다).
 */
export function TableNumberInput({
  id,
  value,
  onChange,
  error,
  autoFocus,
  ariaLabel,
  ariaDescribedBy,
  onKeyDown,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error: boolean;
  /** 메뉴의 편집 상태는 사용자가 "테이블 변경"을 눌러서 연 것이므로 자동 포커스해도 된다
   *  (입장 화면은 iOS 키보드가 갑자기 올라오지 않게 autoFocus를 쓰지 않는다). */
  autoFocus?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [focused, setFocused] = useState(false);
  // 값이 비어 있고 포커스가 없을 때만 커스텀 커서를 보여준다 — 포커스되면 네이티브
  // caret(caret-color: ink)로 넘어간다.
  const showCustomCursor = !focused && value === "";

  return (
    <div className="relative w-full" style={{ height: "var(--size-input-table)" }}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={3}
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        aria-invalid={error}
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        className="h-full w-full bg-transparent text-center text-input-number text-ink outline-none"
        style={{
          borderBottom: `2px solid ${error ? "var(--color-danger)" : focused ? "var(--color-ink)" : "var(--color-line-strong)"}`,
          caretColor: "var(--color-ink)",
        }}
      />
      {showCustomCursor && (
        <span
          aria-hidden
          className="caret-blink pointer-events-none absolute bg-ink"
          style={{ left: "50%", top: "50%", width: "2px", height: "30px", transform: "translate(-50%, -50%)" }}
        />
      )}
    </div>
  );
}
