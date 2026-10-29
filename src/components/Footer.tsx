/** 화면 맨 아래 카피라이트 — 언어 전환과 무관하게 항상 영어, 연도는 하드코딩한다
 *  (Cache Components가 켜진 서버 컴포넌트에서 `new Date()`는 prerender 오류를 낸다).
 *  메인 화면 격자와 입장 화면에만 둔다 — 열린 카드 화면과 메뉴에는 없다. */
export function Footer() {
  return (
    <footer className="mt-8 flex flex-col items-center text-center text-caption text-ink-sub">
      <p>Developed by Jiwon Park</p>
      <p>© 2026 Jiwon Park</p>
    </footer>
  );
}
