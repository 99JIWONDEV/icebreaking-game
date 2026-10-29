/** 화면 맨 아래 카피라이트 — 언어 전환과 무관하게 항상 영어, 연도는 하드코딩한다
 *  (Cache Components가 켜진 서버 컴포넌트에서 `new Date()`는 prerender 오류를 낸다).
 *  메인 화면 격자와 입장 화면에만 둔다 — 열린 카드 화면과 메뉴에는 없다. */
export function Footer({ hideOnKeyboard }: { hideOnKeyboard?: boolean } = {}) {
  // 10 §3-4: 입장 화면에서 키보드가 열리면 입력창·버튼이 우선이라 푸터를 숨긴다
  // (globals.css의 :root[data-keyboard="open"] .hide-on-keyboard). 메인 화면
  // 푸터는 이 prop을 안 받으므로 영향 없다.
  return (
    <footer className={`mt-8 flex flex-col items-center text-center text-caption text-ink-sub ${hideOnKeyboard ? "hide-on-keyboard" : ""}`}>
      <p>Developed by Jiwon Park</p>
      <p>© 2026 Jiwon Park</p>
    </footer>
  );
}
