# 디자인 시스템 — EM·KM 아이스브레이킹 카드

## 한 줄 요약

조용한 종이 카드 한 장이 화면의 주인공이고, 나머지는 거의 보이지 않는다.
플레잉 카드(무늬, 모서리 숫자)나 종교 클리셰(십자가, 비둘기, 꽃, 빛줄기) 없이,
Toss의 명료함(화면당 행동 하나, 고정 CTA, 해요체)과 Apple의 Deference/Depth
(콘텐츠가 주인공, UI는 뒤로 물러남, 레이어·모션으로 위계 표현)를 결합한다.

**Step 3 디자인 연혁**: 처음엔 어두운 카드 뒷면(Step 1~2)이었는데 "너무 어둡다"는
피드백으로 추수감사절 "Harvest" 6색 팔레트로 바꿨다가, "색을 너무 많이 썼다"는
재피드백으로 지금의 **"Minimal" 무채색 시스템**으로 다시 바꿨다. 색은 **주요 버튼
1개와 입력 포커스 링에만** 쓰고, 나머지는 전부 흰 면 + 얇은 선 + 큰 숫자 + 여백으로
위계를 만든다. 일러스트·아이콘·이모지 장식, 카테고리별 색, 그라디언트, 이중 프레임,
질감, 광택 스윕은 전부 뺐다(아래 "지운 것" 참고).

## 색 토큰 — "Minimal" (라이트 모드 전용, `src/app/globals.css`의 `@theme`)

| 토큰 | 값 | 용도 / 대비 |
|---|---|---|
| `--color-canvas` | `#FAFAF9` | 앱 배경 |
| `--color-paper` | `#FFFFFF` | 카드 면, 입력창, 메뉴 시트 |
| `--color-ink` | `#171717` | 글자 (canvas 위 17.2:1) |
| `--color-ink-sub` | `#6B6B66` | 보조 글자 (canvas 5.13, paper 5.36, fill-weak 위 4.61) |
| `--color-hairline` | `#E4E4E0` | 카드/구분선 1px — **의도적으로 낮은 대비의 장식 경계** |
| `--color-line-strong` | `#8C8C87` | 입력창 테두리 (paper 위 3.38:1, UI 경계 3:1 충족) |
| `--color-fill-weak` | `#EEEEEC` | `weak` 버튼, 세그먼트 트랙, 사용된 카드 면 |
| `--color-accent` | `#3F5B73` | **주요 버튼 채움과 포커스 링에만.** 숫자·점·아이콘·배경엔 안 쓴다 |
| `--color-danger` | `#B42318` | 오류/연결 끊김 글자·테두리 (paper 위 6.57:1). 아이콘+문구 병행 |
| `--color-on-accent` | `#FFFFFF` | fill 버튼 글자 (accent 위 7.11:1) |
| `--color-scrim` | `rgb(23 23 23 / 0.4)` | 열린 카드 뒤 어둡게 하기 |

`scripts/check-contrast.mjs`(`npm run check-contrast`)로 전 쌍을 검증한다. 컴포넌트에는
항상 토큰만 쓰고 raw hex를 쓰지 않는다 — 유일한 예외는 `layout.tsx`의
`<meta name="theme-color">`(CSS 변수를 못 받는 자리라 리터럴 유지, `--color-canvas`와
손으로 동기화).

### 지운 것 (Harvest → Minimal)

- 카테고리별 6색 카드 뒷면, 카테고리 색 점(메뉴·제목 영역 전부) — `src/lib/categoryColors.ts` 삭제
- 카드 안쪽 이중 프레임, 사선 텍스처
- 카드 오픈 애니메이션의 광택(gloss) 스윕 — **모션 구조(이동→뒤집기→문구) 자체는 그대로**,
  순수 장식이던 이 한 효과만 뺐다
- `canvas #F7F0E3`·`accent #A33F1C` 등 Harvest 토큰 전부, `accent-ink`/`accent-weak`/
  `outline-border`/`cat-*` 토큰
- 세리프 폰트(Noto Serif KR, Newsreader) — 서체는 Pretendard Variable 하나로 통일
  (`layout.tsx`에서 `next/font/google` 호출도 제거)

## 카드 (격자 뒷면 / 열린 앞면)

- **격자 뒷면**: `paper` 면, 1px `hairline` 테두리, radius `--radius-track`(12px), 그림자 없음.
  가운데에 **번호만** — Pretendard 600, 28/32, `ink`, `tabular-nums`, letter-spacing -0.02em.
  카테고리 이름은 뒷면에 넣지 않는다(열린 앞면에서만 보인다).
- **사용된 카드**: 면을 `fill-weak`(중성 회색)로 바꾼다. 색이 아니라 명도 차이로 구분되므로
  opacity를 낮추지 않아도 대비가 유지된다. `aria-label`에도 "이미 사용함"을 넣는다.
- **열린 카드(앞면)**: `paper` 면, 1px `hairline` 테두리, radius `--radius-card`(16px — 격자
  뒷면보다 한 단계 큰, 유일하게 더 큰 radius). 카테고리/번호 라벨은 `ink-sub`(이전엔 `accent`였는데
  "accent는 주요 버튼과 포커스 링에만" 규칙에 맞춰 내렸다). 그림자 `--shadow-lifted`는 **열린
  카드 1단계만의 예외**(격자 카드·버튼엔 그림자 없음).

## 타이포그래피

Tailwind v4의 compound font-size 토큰으로 정의, **13 / 15 / 17 / 22 / 28 / 32px 여섯
단계만** 쓴다(Step 3 재개정에서 확정, 단계를 늘리지 않는다). 서체는 Pretendard Variable 하나.

| 역할 | 토큰 클래스 | 크기/행간 | 굵기 | 비고 |
|---|---|---|---|---|
| 라벨/출처 | `text-label` | 13/18, ls 0.01em | 600 | |
| 버튼 sm | `text-label` 재사용 | 13/18 | 600 | |
| 버튼 md | `text-btn-md` | 15/22 | 600 | |
| UI 본문 | `text-body` | 15/24 | 400 | 16에서 스냅 |
| 인트로 EN | `text-intro-en` | 15/22, ls 0.02em | 400, `ink-sub` | |
| 버튼 lg/xl | `text-btn-lg`/`text-btn-xl` | 17/24 | 600 | lg 16→17로 스냅, xl과 같은 크기 공유 |
| 질문 EN(둘 다) | `text-question-en-both` | 17/26 | 400, `ink-sub` | |
| 인트로 KO | `text-intro-ko` | 22/32 | 600 | 24→22로 스냅(원문 단계 제한과 충돌 — 더 가까운 값 채택) |
| 질문 KO(둘 다) | `text-question-ko-both` | 28/40 | 500 | 26→28로 스냅 |
| 질문 EN(단일) | `text-question-en-solo` | 28/38 | 400 | |
| 화면 제목(카테고리명) | `text-title` | 28/36 | 700 | |
| 카드 뒷면 번호 | `text-card-number` | 28/32, ls -0.02em | 600 | Pretendard(세리프 아님), 위 "카드" 참고 |
| 질문 KO(단일) | `text-question-ko-solo` | 32/48 | 500 | 30→32로 스냅, "둘 다"보다 뚜렷이 크게 |
| 테이블 번호 입력 | `text-input-number` | 32/40 | 700, 가운데 정렬 | |

- 한국어 요소는 `lang="ko"` + 전역 `:lang(ko){ word-break: keep-all }`.
- `text-pretty` 유틸로 줄바꿈 정돈. 숫자는 전역 `font-variant-numeric: tabular-nums`.

## 버튼 시스템 — `src/components/Button.tsx` 하나로 통일

임의의 스타일 버튼 금지. `grep -rn "<button" src/components/`로 확인한 예외는
아이콘 전용 트리거(메뉴 버튼), 세그먼트 옵션, 메뉴 카테고리 행(리스트 아이템),
`/dev` 패널(개발용, production 404)뿐 — 전부 CTA가 아닌 다른 위젯.

| size | 높이 | radius | 가로 패딩 |
|---|---|---|---|
| `xl` | 56px | 12px | 20px |
| `lg` | 48px | 10px | 20px |
| `md` | 40px | 10px | 16px |
| `sm` | 32px | 8px | 12px |

radius는 전체 시스템에서 **8 / 10 / 12 / 16 네 가지만** 쓴다(버튼 sm/md·lg/입력창·xl·
격자 카드 + 열린 카드 16). `sm`/`md`는 보이는 크기는 그대로 두고
`min-h-[--size-touch-min]`(44px)으로 터치 영역만 확장.

| variant | 배경 | 글자 | 테두리 | 쓰는 곳 |
|---|---|---|---|---|
| `fill` | `accent` | `on-accent`(흰색) | 없음 | 화면당 주요 행동 1개: 입장하기, 랜덤으로 뽑기, 카드 덮기 |
| `weak` | `fill-weak` | `ink` | 없음 | 보조 행동: 다시 섞기 |
| `outline` | 투명 | `ink` | 1px `line-strong` | 가장 낮은 위계: 메뉴의 테이블 변경 |

- **`ink`(검정) 채움 버튼은 어디에도 없다. `accent` 채움 버튼도 화면당 1개뿐.**
- 상태: pressed `scale(0.98)` + 검정 12% 오버레이(120ms), disabled `opacity 0.4`,
  focus-visible 2px `accent` 링 + 2px offset, `loading`은 점 3개 순차 애니메이션(너비 고정,
  `aria-busy`) — **"무한 반복 애니메이션 금지" 규칙의 예외**: 장식이 아니라 실제 요청 진행
  상태를 알리는 기능적 표시이고, 끝나면 즉시 사라진다.
- 그라디언트·글로우·아이콘 장식·그림자 없음.

## 하단 고정 CTA 바 — `src/components/BottomBar.tsx`

`position: fixed; bottom: 0`, `padding: 12px 20px calc(24px + env(safe-area-inset-bottom))`,
버튼 위 28px `canvas→투명` 페이드(`cta-fade-mask`, 장식이 아니라 가림막이라 그라디언트
금지 규칙의 예외). 뒤의 스크롤 영역은 `bottomBarClearance()`만큼 하단 패딩을 받는다.
**카드가 열려 있으면 이 바는 아예 렌더링하지 않는다** — `OpenCardOverlay`가 자기 자신의
CTA(카드 덮기)를 보여 주므로, 동시에 그리면 disabled 상태(0.4 투명도)의 버튼 뒤로
이 바의 글자가 비쳐 겹쳐 보이는 문제가 있었다(스크린샷으로 발견, `hidden` prop으로 수정).

## 테이블 번호 입력창 — `src/components/TableNumberInput.tsx`

폭 100%(최대 280px, 가운데), 높이 72px, radius 12px, `paper` 면, 1.5px `line-strong`
테두리, 글자 32/40 bold 가운데 정렬 + `tabular-nums`, 포커스 시 `box-shadow`로 2px
`accent` 테두리 + 4px 18% 링(레이아웃 안 흔들림), 오류 시 `danger` 테두리 + 아이콘 + 문구.
테이블 입장 화면과 메뉴의 테이블 변경 시트가 이 컴포넌트를 공유한다.

## 메뉴 — `src/components/MenuDrawer.tsx`

드로어 배경 `paper`, 오른쪽 가장자리 1px `hairline`. 카테고리 행 높이 56, 행 사이
`hairline`, 이름 + 오른쪽 `{사용}/{전체}`(`ink-sub`), 선택된 행은 체크 아이콘(`ink`) +
`aria-current` — **색 점 없음**. 언어 세그먼트: 트랙 `fill-weak`, 높이 40, radius
`--radius-btn-lg`(10px), thumb `paper` + 1px `hairline`, 이동은 기존 `layoutId` 유지.

## 레이아웃

- 4px 그리드, 화면 좌우 여백 20px, 간격은 4px 배수(8/12/16/20/24/28)만.
- 컨테이너 `max-width: 430px`, 가운데 정렬, `min-height: 100dvh`.
- 상단 바 52px(`--size-topbar`), 세그먼트 트랙 40px(`--size-segment-track`).
- 카드: `width: min(calc(100% - 40px), 360px)`(`--size-card-max`), `aspect-ratio: 3/4.2`.
- 그림자 없음. 모든 경계는 hairline(1px)로 표현. 예외는 열린 카드의 `--shadow-lifted`
  **1단계뿐**(Step 2의 "들린 카드" 단계는 Step 3에서 없앴다 — 실제로 쓰인 적 없었다).
  **버튼에는 그림자를 쓰지 않는다.**
- Safe area: `env(safe-area-inset-top/bottom)` + `viewport-fit: cover`.
- 격자 gap: `카테고리` 보기 12px(`--size-grid-gap`), `전체` 보기 8px(`--size-grid-gap-all`).
- `--size-touch-min`(2.75rem, 최소 터치 영역).

## 모션

`src/lib/motion.ts`의 spring/transition 상수들은 **Step 3에서 값도 구조도 바꾸지 않았다**
(광택 스윕 하나만 삭제, 아래 "지운 것" 참고). `prefers-reduced-motion`이면
`useReducedMotion`(useSyncExternalStore 기반) 훅이 120ms opacity 트랜지션으로 대체한다.
카드 오픈/뒤집기/덮기, 격자 stagger, 랜덤 뽑기 서스펜스 전부 Step 2 그대로.

**금지 목록**: 컨페티, 글로우, 파티클, 무지개 그라디언트, 계절 일러스트/이모지, 무한 반복
장식 애니메이션. **버튼 loading 점 3개는 예외**(기능적 진행 표시, 위 "버튼 시스템" 참고).

## 금지 사항 체크리스트 (스크린샷 검수 기준)

- [x] 플레잉 카드 무늬/모서리 숫자 없음
- [x] 종교 클리셰 일러스트/아이콘 없음
- [x] box-shadow 없음 (hairline만 사용, 버튼은 그림자 자체가 없음, 열린 카드만 예외)
- [x] 카드 위 이모지/일러스트/그라디언트/글로우/블러 없음
- [x] "Welcome to…", "Unlock…", "Seamless" 류 마케팅 카피 없음
- [x] 가운데 정렬 히어로 + CTA + 카드 3장 레이아웃 아님
- [x] shadcn/Tailwind 기본 팔레트 그대로 쓰지 않음
- [x] **`ink`(검정) 채움 버튼 없음**
- [x] **카테고리별 색, 장식 프레임/질감/광택 없음** (Minimal 재개정)
- [x] **계절 일러스트/이모지 장식 없음**
- [x] **`accent`가 주요 버튼 1개와 포커스 링 외에 쓰이지 않음** (번호·점·아이콘은 `ink`/`ink-sub`)
- [x] 화면에 보이는 유채색은 주요 버튼과 포커스뿐 (스크린샷 확인)
