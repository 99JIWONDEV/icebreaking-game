# 디자인 시스템 — EM·KM 아이스브레이킹 카드

## 한 줄 요약

조용한 종이 카드 한 장이 화면의 주인공이고, 나머지는 거의 보이지 않는다.
플레잉 카드(무늬, 모서리 숫자)나 종교 클리셰(십자가, 비둘기, 꽃, 빛줄기) 없이,
Toss의 명료함(화면당 행동 하나, 고정 CTA, 해요체)과 Apple의 Deference/Depth
(콘텐츠가 주인공, UI는 뒤로 물러남, 레이어·모션으로 위계 표현)를 결합한다.

**Step 3 변경**: 카드가 너무 어둡고 AI가 만든 티가 난다는 피드백을 받아 "Harvest"
(추수감사절) 팔레트로 전면 교체했다. 계절감은 **색으로만** 내고 일러스트·아이콘·
이모지 장식은 쓰지 않는다. 버튼도 검정 채움 금지 — `Button.tsx` 하나로 통일.

## 색 토큰 — "Harvest" (라이트 모드 전용, `src/app/globals.css`의 `@theme`, Step 3)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-canvas` | `#F7F0E3` | 앱 배경, 따뜻한 크림 |
| `--color-paper` | `#FFFDF8` | 카드 앞면, 입력창 채움 |
| `--color-ink` | `#2B2118` | **글자 전용**. 버튼/카드 채움에 쓰지 않는다 |
| `--color-ink-sub` | `#6B5E4E` | 보조 텍스트 (canvas 위 5.55:1, paper 위 6.19:1) |
| `--color-hairline` | `#E0D2B8` | 구분선, 카드 안쪽 프레임 |
| `--color-line-strong` | `#8F7F66` | 입력창 테두리 (UI 경계 3:1 충족) |
| `--color-fill` | `#EBE0CC` | 세그먼트 컨트롤 트랙 |
| `--color-accent` | `#A33F1C` | 주요 버튼 채움, 카드 번호, 작은 점 **1개 행동 전용** |
| `--color-accent-ink` | `#7F3216` | `weak` 버튼 글자 |
| `--color-accent-weak` | `color-mix(in srgb, var(--color-accent) 12%, var(--color-canvas))` | `weak` 버튼 배경 |
| `--color-scrim` | `rgb(60 38 22 / 0.55)` | 열린 카드 뒤 어둡게 하기 — 이전 near-black 72%보다 밝고 따뜻함 |
| `--color-danger` | `#B42318` | 오류/연결 끊김. 아이콘+문구 병행, 색만으로 구분 안 함 |
| `--color-on-accent` | `#FFFFFF` | fill 버튼 글자 |
| `--color-outline-border` | `#A09075` | outline 버튼 테두리 |

**카드 뒷면 색(카테고리 = 색, 채도 낮춘 수확기 6색, 전부 밝음)**:
`--color-cat-warmup #F2C497`(호박), `--color-cat-me #EFDAA6`(밀),
`--color-cat-memories #CFD8B8`(세이지), `--color-cat-whatif #EBB8B2`(크랜베리),
`--color-cat-faith #E0CDB0`(귀리), `--color-cat-together #F7E3C8`(살구 크림).
`src/lib/categoryColors.ts`의 `categoryColorVar(categoryId)`로 조회.

- 카드 테두리(1px) = 카드색을 `ink` 28%와 섞은 색, 안쪽 프레임(6px 안쪽, 1px) = `ink` 22% 혼합.
  카드-배경 자체 대비는 의도적으로 낮다(1.05~1.7:1) — 테두리가 경계를 대신한다.
- 카드 안 글자는 항상 `ink`(색상별로 9.0~13.2:1, `ink-sub`는 일부 색에서 기준 미달).
- 사용된 카드: 카드색을 `canvas`와 60% 섞어서 연하게. 번호는 여전히 `ink`(opacity 낮추지 않음,
  대비 유지) + 작은 `accent` 점 + `aria-label`의 "이미 사용함"으로 구분.
- 이전의 `ink` 채움 + 사선 텍스처 뒷면은 **삭제**했다(어둡고 AI 티 나는 원인으로 지목됨).
- `scripts/check-contrast.mjs`로 전 쌍을 검증한다(`npm run check-contrast`).

> 컴포넌트에서는 항상 토큰(Tailwind 유틸 또는 `var(--token)`)만 쓰고 raw hex를 쓰지 않는다
> (예외: `layout.tsx`의 `<meta name="theme-color">`는 CSS 변수를 못 받아 리터럴 유지,
> `--color-canvas`와 손으로 동기화).

## 타이포그래피

Tailwind v4의 compound font-size 토큰(`--text-*`, `--text-*--line-height`,
`--text-*--font-weight`)으로 정의, 표의 값만 사용합니다.

| 역할 | 토큰 클래스 | 크기/행간 | 굵기 |
|---|---|---|---|
| 질문 KO (둘 다) | `text-question-ko-both` | 26/38 | 500 |
| 질문 EN (둘 다) | `text-question-en-both` | 17/26 | 400, `ink-sub` |
| 질문 KO (단일) | `text-question-ko-solo` | 30/44 | 500 |
| 질문 EN (단일) | `text-question-en-solo` | 28/38 | 400 |
| 라벨/출처 | `text-label` | 13/18, ls 0.01em | 600 |
| 버튼 xl | `text-btn-xl` | 17/24 | 600 |
| 버튼 lg | `text-btn-lg` | 16/24 | 600 |
| 버튼 md | `text-btn-md` | 15/22 | 600 |
| 버튼 sm | `text-label` 재사용 | 13/18 | 600 |
| UI 본문 | `text-body` | 16/24 | 400 |
| 인트로 KO | `text-intro-ko` | 24/34 | 500 |
| 인트로 EN | `text-intro-en` | 15/22, ls 0.02em | 400, `ink-sub` |
| 화면 제목(카테고리명) | `text-title` | 28/36 | 700 |
| 테이블 번호 입력 | `text-input-number` | 32/40 | 700, 가운데 정렬 |

- 한국어 요소는 `lang="ko"` + 전역 `:lang(ko){ word-break: keep-all }`.
- `text-pretty` 유틸(`text-wrap: pretty`)로 줄바꿈을 정돈.
- 숫자는 `body`에 전역 `font-variant-numeric: tabular-nums`.
- 폰트: Pretendard Variable(자체 호스팅, `public/fonts/`), Noto Serif KR·Newsreader는
  `next/font/google`로 자체 호스팅(런타임에 구글 서버를 호출하지 않음).

## 버튼 시스템 (Step 3) — `src/components/Button.tsx` 하나로 통일

임의의 스타일 버튼 금지. `grep -rn "<button" src/components/`로 확인한 예외는
아이콘 전용 트리거(메뉴 버튼), 세그먼트 옵션, 메뉴 카테고리 행(리스트 아이템),
`/dev` 패널(개발용, production 404)뿐 — 전부 CTA가 아닌 다른 위젯.

| size | 높이 | radius | 가로 패딩 |
|---|---|---|---|
| `xl` | 56px | 12px | 20px |
| `lg` | 48px | 10px | 20px |
| `md` | 40px | 10px | 16px |
| `sm` | 32px | 8px | 12px |

Toss 비공식 측정값(참고용, 공식 문서엔 px 수치 없음)보다 radius를 한 단계씩 줄였다(사용자 요청).
`sm`/`md`는 보이는 크기는 그대로 두고 `min-h-[--size-touch-min]`(44px)으로 터치 영역만 확장.

| variant | 배경 | 글자 | 쓰는 곳 |
|---|---|---|---|
| `fill` | `accent` | `on-accent`(흰색) | 화면당 주요 행동 1개: 입장하기, 랜덤으로 뽑기, 카드 덮기 |
| `weak` | `accent-weak` | `accent-ink` | 보조 행동: 다시 섞기 |
| `outline` | 투명, 1px `outline-border` | `ink` | 가장 낮은 위계: 메뉴의 테이블 변경(처음엔 `weak`였으나 너무 채워 보여 outline으로 낮춤) |

- **`ink`(검정) 채움 버튼은 어디에도 없다.**
- 상태: pressed `scale(0.98)` + 검정 12% 오버레이(120ms), disabled `opacity 0.4`,
  focus-visible 2px `accent` 링 + 2px offset, `loading`은 점 3개 순차 애니메이션(너비 고정,
  `aria-busy`) — **"무한 반복 애니메이션 금지" 규칙의 예외**: 장식이 아니라 실제 요청 진행
  상태를 알리는 기능적 표시이고, 요청이 끝나면 즉시 사라진다.
- 그라디언트·글로우·아이콘 장식·그림자 없음.

## 하단 고정 CTA 바 — `src/components/BottomBar.tsx` (Step 3)

`position: fixed; bottom: 0`, `padding: 12px 20px calc(24px + env(safe-area-inset-bottom))`,
버튼 위 28px `canvas→투명` 페이드(`cta-fade-mask`, 장식이 아니라 가림막이라 그라디언트
금지 규칙의 예외). 뒤의 스크롤 영역은 `bottomBarClearance()`만큼 하단 패딩을 받는다.
**카드가 열려 있으면 이 바는 아예 렌더링하지 않는다** — `OpenCardOverlay`가 자기 자신의
CTA(카드 덮기)를 보여 주므로, 동시에 그리면 disabled 상태(0.4 투명도)의 버튼 뒤로
이 바의 글자가 비쳐 겹쳐 보이는 문제가 있었다(스크린샷으로 발견, `hidden` prop으로 수정).

## 테이블 번호 입력창 — `src/components/TableNumberInput.tsx` (Step 3)

높이 72px, radius 12px, 1.5px `line-strong` 테두리, 글자 32/40 bold 가운데 정렬
+ `tabular-nums`, 포커스 시 `box-shadow`로 2px `accent` 테두리 + 4px 18% 링(레이아웃 안 흔들림),
오류 시 `danger` 테두리 + 아이콘 + 문구. 테이블 입장 화면과 메뉴의 테이블 변경 시트가
이 컴포넌트를 공유한다.

## 레이아웃

- 4px 그리드 (Tailwind 기본 spacing 스케일이 이미 4px 단위라 별도 토큰 불필요).
- 컨테이너 `max-width: 430px`, 가운데 정렬, `min-height: 100dvh`.
- 상단 바 52px(`--size-topbar`), 세그먼트 트랙 40px(`--size-segment-track`, Step 3에서 36→40).
- 카드: `width: min(calc(100% - 40px), 360px)`(`--size-card-max`), `aspect-ratio: 3/4.2`,
  radius `--radius-card`(1.25rem).
- 그림자 없음. 모든 경계는 hairline(`--color-hairline`, 1px)로 표현.
  예외: 들린 카드/열린 카드의 `--shadow-lifted`. **버튼에는 그림자를 쓰지 않는다.**
- Safe area: `env(safe-area-inset-top/bottom)` + `viewport-fit: cover`.
- 격자 카드 뒷면 radius는 `--radius-track`(0.75rem)을 그대로 쓰고, 세그먼트 컨트롤은
  버튼 `lg`와 같은 `--radius-btn-lg`(0.625rem/10px)를 쓴다 — 둘 다 "버튼과 비슷한 크기의
  둥근 요소" 묶음으로 토큰을 공유하되, 각 용도에 맞는 값으로 Step 3에서 분리했다.
- `--size-grid-gap`(0.75rem, 격자 간격), `--size-touch-min`(2.75rem, 최소 터치 영역).

## 모션

`src/lib/motion.ts`:
```ts
export const spring = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 };
```
`prefers-reduced-motion`이면 `useReducedMotion`(useSyncExternalStore 기반) 훅이
120ms opacity 트랜지션으로 대체합니다. Step 1에선 세그먼트 thumb에만 적용했고,
Step 2에서 카드 오픈/뒤집기/덮기, 격자 stagger, 랜덤 뽑기 서스펜스까지 확장했습니다
(값은 `cardMoveSpring`, `cardFlipTransition`, `cardCloseFlipTransition`, `shineTransition`).
Step 3에서는 색만 바꿨고 모션 타이밍은 그대로 — scrim이 밝아져도 카드 대비는 유지돼
어색하지 않았다(스크린샷 확인).

**금지 목록**: 컨페티, 글로우, 파티클, 무지개 그라디언트, 무한 반복 애니메이션
(연결 상태 점 등 — 광택 효과는 카드 오픈 시 1회만). **버튼 loading 점 3개는 예외**
(위 "버튼 시스템" 참고 — 장식이 아니라 기능적 진행 표시).

## 금지 사항 체크리스트 (스크린샷 검수 기준)

- [x] 플레잉 카드 무늬/모서리 숫자 없음
- [x] 종교 클리셰 일러스트/아이콘 없음
- [x] box-shadow 없음 (hairline만 사용, 버튼은 그림자 자체가 없음)
- [x] 카드 위 이모지/일러스트/그라디언트/글로우/블러 없음
- [x] "Welcome to…", "Unlock…", "Seamless" 류 마케팅 카피 없음
- [x] 가운데 정렬 히어로 + CTA + 카드 3장 레이아웃 아님
- [x] shadcn/Tailwind 기본 팔레트 그대로 쓰지 않음
- [x] **`ink`(검정) 채움 버튼 없음** (Step 3)
- [x] **어두운 카드 뒷면 없음** (Step 3 — 카테고리 색으로 교체)
- [x] **계절 일러스트/이모지 장식 없음** (칠면조·호박·낙엽 그림 금지, 색으로만 계절감)
