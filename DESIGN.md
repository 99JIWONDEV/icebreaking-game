# 디자인 시스템 — EM·KM 아이스브레이킹 카드

## 한 줄 요약

조용한 종이 카드 한 장이 화면의 주인공이고, 나머지는 거의 보이지 않는다.
플레잉 카드(무늬, 모서리 숫자)나 종교 클리셰(십자가, 비둘기, 꽃, 빛줄기) 없이,
Toss의 명료함(화면당 행동 하나, 고정 CTA, 해요체)과 Apple의 Deference/Depth
(콘텐츠가 주인공, UI는 뒤로 물러남, 레이어·모션으로 위계 표현)를 결합한다.

**디자인 연혁**: 처음엔 어두운 카드 뒷면(Step 1~2)이었는데 "너무 어둡다"는 피드백으로
추수감사절 "Harvest" 6색 팔레트로 바꿨다가, "색을 너무 많이 썼다"는 재피드백으로
"Minimal" 무채색 시스템(accent 1색만 버튼·포커스 링에 허용)으로 바꿨다. 그다음
"확인 버튼 색이 구리다, 버튼이 너무 크다"는 피드백으로 **v3("검정 버튼")** 로 다시
바꿨다 — accent(슬레이트 블루)도 완전히 없애고 주요 버튼을 **ink(검정) 채움 + 흰
글자**로 통일했다. 화면에 남는 유채색은 `danger`(오류)뿐이다. 동시에 버튼을 작게
줄이고(56→44px), 입력창의 placeholder를 없애고, 첫 화면을 테이블별 셔플 대신 **1~55
번호 순서 + 카테고리 구간 헤더**로 바꾸고, 카드 뒷면에 안쪽 프레임(또는 모서리 틱)
디자인을 넣었다. v3 후속으로 "열릴 때 더 반짝였으면 좋겠다"는 요청에 Minimal
재개정 때 지웠던 **광택 스윕을 흑백 톤으로 되살렸고**(아래 "모션" 참고), 메뉴
간격·언어 세그먼트 thumb 치수도 다듬었다. 일러스트·아이콘·이모지 장식, 카테고리별
색, 그라디언트, 컨페티·글로우·파티클은 전부 뺐다(아래 "지운 것" 참고) — 광택 스윕은
색이 아니라 ink 5% 그림자 가장자리로만 만들어서 이 규칙과 충돌하지 않는다.

## 색 토큰 — v3 "검정 버튼" (라이트 모드 전용, `src/app/globals.css`의 `@theme`)

| 토큰 | 값 | 용도 / 대비 |
|---|---|---|
| `--color-canvas` | `#FAFAF9` | 앱 배경 |
| `--color-paper` | `#FFFFFF` | 카드 면, 입력창, 메뉴 시트 |
| `--color-ink` | `#171717` | 글자, **주요 버튼 채움**, 포커스 링 (canvas 위 17.2:1) |
| `--color-ink-sub` | `#6B6B66` | 보조 글자 (canvas 5.13, paper 5.36, fill-weak 위 4.61) |
| `--color-hairline` | `#E4E4E0` | 카드/구분선 1px — **의도적으로 낮은 대비의 장식 경계** |
| `--color-line-strong` | `#8C8C87` | 입력창 테두리 (paper 위 3.38:1, UI 경계 3:1 충족) |
| `--color-fill-weak` | `#EEEEEC` | `weak` 버튼, 세그먼트 트랙, 사용된 카드 면 |
| `--color-danger` | `#B42318` | 오류/연결 끊김 글자·테두리 (paper 위 6.57:1). 아이콘+문구 병행. **화면에 남는 유일한 유채색** |
| `--color-on-ink` | `#FFFFFF` | fill 버튼 글자, 포커스 링 offset (ink 위 17.9:1) |
| `--color-scrim` | `rgb(23 23 23 / 0.4)` | 열린 카드 뒤 어둡게 하기 |

`scripts/check-contrast.mjs`(`npm run check-contrast`)로 전 쌍을 검증한다. 컴포넌트에는
항상 토큰만 쓰고 raw hex를 쓰지 않는다 — 유일한 예외는 `layout.tsx`의
`<meta name="theme-color">`(CSS 변수를 못 받는 자리라 리터럴 유지, `--color-canvas`와
손으로 동기화).

### 지운 것 (Minimal → v3)

- **`accent`(슬레이트 블루) 토큰 전체 삭제** — `--color-on-accent`도 `--color-on-ink`로
  대체. "accent는 주요 버튼 1개·포커스 링에만" 규칙 자체가 사라졌다(accent가 없으므로).
- "`ink`(검정) 채움 버튼 금지" 규칙 폐기 — 이제 주요 버튼은 ink 채움이 기본이다.
- 버튼 `xl`(56px) 삭제, 전폭(`display="full"`) 버튼 전부 제거 — 폭은 항상 내용+패딩.
- 입력창 placeholder(`예: 7 · e.g. 7`을 반투명 placeholder로 넣던 방식) — 라벨 아래
  작은 글씨 줄로 뺐다.
- 격자의 **테이블 시드 셔플**(`src/lib/seededShuffle.ts`) — 격자는 이제 항상
  `questions.json` 배열 순서(번호 순서)다. 아래 "시드 셔플 제거" 참고.
- (Harvest → Minimal에서 이미 지운 것: 카테고리별 6색 카드 뒷면·색 점, 카드 안쪽
  이중 프레임·사선 텍스처, 세리프 폰트. **광택 스윕은 그때 지웠다가 v3 후속에서
  흑백 톤으로 되살렸다** — 아래 "모션" 참고, 완전히 사라진 게 아니다.)
- 스파클(반짝임 글린트) 효과는 **추가하지 않았다** — 요청 문서가 전송 중 손상돼
  핵심 내용이 빠졌고, "스파클/파티클"은 이 프로젝트가 디자인 개정마다 금지해 온
  항목(컨페티·글로우·파티클 금지)이라 섣불리 구현하지 않고 사용자에게 확인했다 —
  "광택 스윕만으로 충분하다, 스파클은 스킵"으로 확정.

## 첫 화면 격자 — 1~55 번호 순서 + 카테고리 구간

`src/components/SequentialGrid.tsx`(메뉴 "전체" — 기본값)가 `src/lib/categorySections.ts`로
카테고리 구간을 **`questions.json`에서 계산**해(하드코딩 아님) 6개 `<section
aria-labelledby>`로 나눠 보여준다. 구간 헤더(`<h2>`)는 왼쪽에 카테고리명(`text-btn`,
15/22/600, `ink`), 오른쪽에 번호 범위 + 사용 현황(`01–10 · 3/10`, `text-label`,
`ink-sub`, `tabular-nums`). 구간 사이 32px(`--size-section-gap`), 헤더 위 구분선은
긋지 않는다(여백으로만 구분). 격자는 4열, gap 8px(`--size-grid-gap-all`). 마지막 줄의
남는 칸은 채우지 않는다(빈 칸). 메뉴에서 특정 카테고리를 고르면 `CardGrid`가 그 구간만
3열·gap 12px(`--size-grid-gap`)로 단독 렌더링한다(기존 동작 유지, 헤더 없음).

카드 번호는 `questionIndex()`(= `questions.json` 배열 1-based 인덱스)로 고정이다.
**테이블 시드 셔플은 뺐다** — 아래 "시드 셔플 제거" 참고.

## 카드 (격자 뒷면 / 열린 앞면)

- **격자 뒷면**: `paper`(사용 시 `fill-weak`) 면, 1px `hairline` 테두리, radius
  `--radius-track`(12px), 그림자 없음. `src/components/CardBackFace.tsx`가 안쪽에
  **변형 A 또는 B**(`src/lib/cardVariant.ts`, `/dev?card=a|b`로 전환, localStorage에
  저장, 기본값 A)를 그린다.
  - **변형 A(기본)**: 안쪽 6px 들임 프레임(1px `hairline`, radius 7px), 위에 작은
    `No.` 라벨(`text-label`, `ink-sub`, ls 0.04em — "전체" 구간처럼 카드가 작으면
    숨긴다), 가운데 번호(`text-card-number`/`text-card-number-sm`, `ink`,
    `tabular-nums`), 번호 아래 12px에 16px짜리 가로선(1px `line-strong`).
  - **변형 B(비교용)**: 프레임 대신 네 모서리에 8px L자 틱(1px `line-strong`)만.
    번호는 가운데, 라벨/가로선 없음.
  - 장식 요소는 전부 CSS(`border`)로 만든다 — 이미지/일러스트/이모지/그라디언트 없음.
- **사용된 카드**: 면을 `fill-weak`로, 번호를 `ink-sub`로 바꾸고 우상단에 14px 체크
  아이콘을 올린다(프레임/틱은 그대로 유지) — **색이 아니라 면+아이콘으로 구분**.
  `aria-label`도 `{번호}번 카드, {카테고리} (사용함)`으로 카테고리를 포함한다.
- **열린 카드(앞면)**: `paper` 면, 1px `hairline` 테두리, radius `--radius-card`(16px —
  격자 뒷면보다 한 단계 큰, 유일하게 더 큰 radius). 카테고리/번호 라벨은 `ink-sub`.
  변형 A/B의 라벨·가로선·틱은 열린 카드까지 옮기지 않았다 — 질문 본문 가독성이
  우선이라, 이미 있던 `paper`+`hairline` 테두리 하나로 "같은 프레임 언어"를 잇는다.
  그림자 `--shadow-lifted`는 **열린 카드 1단계만의 예외**(격자 카드·버튼엔 그림자 없음).

## 타이포그래피

Tailwind v4의 compound font-size 토큰으로 정의, **13 / 15 / 17 / 22 / 28 / 32px 여섯
단계만** 쓴다(Step 3 재개정에서 확정, 단계를 늘리지 않는다). 서체는 Pretendard Variable 하나.

| 역할 | 토큰 클래스 | 크기/행간 | 굵기 | 비고 |
|---|---|---|---|---|
| 라벨/출처/입력 오류 | `text-label` | 13/18, ls 0.01em | 600 | |
| 버튼 sm, 구간 헤더 오른쪽(범위·사용 현황) | `text-label` 재사용 | 13/18 | 600 | |
| 입력 예시 줄(`예: 7 · e.g. 7`) | `text-caption` | 13/18 | 400 | text-label과 굵기만 다름 |
| UI 본문 | `text-body` | 15/24 | 400 | 16에서 스냅 |
| 인트로 EN | `text-intro-en` | 15/22, ls 0.02em | 400, `ink-sub` | |
| 버튼 lg/md, 구간 헤더 왼쪽(카테고리명) | `text-btn` | 15/22 | 600 | v3: lg·md가 글자 크기를 공유(md의 요청값 14는 단계에 없어 스냅) |
| 질문 EN(둘 다) | `text-question-en-both` | 17/26 | 400, `ink-sub` | |
| 인트로 KO, 입력 숫자 | `text-intro-ko`, `text-input-number` | 22/32 | 600 | 입력 숫자는 v3에서 32→22로 축소(요청값 24가 단계에 없어 스냅) |
| 카드 뒷면 번호(축소, 변형 A "전체" 구간) | `text-card-number-sm` | 22/28, ls -0.02em | 600 | |
| 질문 KO(둘 다) | `text-question-ko-both` | 28/40 | 500 | 26→28로 스냅 |
| 질문 EN(단일) | `text-question-en-solo` | 28/38 | 400 | |
| 화면 제목(카테고리명) | `text-title` | 28/36 | 700 | |
| 카드 뒷면 번호(기본) | `text-card-number` | 28/32, ls -0.02em | 600 | Pretendard(세리프 아님), 위 "카드" 참고 |
| 질문 KO(단일) | `text-question-ko-solo` | 32/48 | 500 | 30→32로 스냅, "둘 다"보다 뚜렷이 크게 |

- 한국어 요소는 `lang="ko"` + 전역 `:lang(ko){ word-break: keep-all }`.
- `text-pretty` 유틸로 줄바꿈 정돈. 숫자는 전역 `font-variant-numeric: tabular-nums`.

## 버튼 시스템 — `src/components/Button.tsx` 하나로 통일

임의의 스타일 버튼 금지. `grep -rn "<button" src/components/`로 확인한 예외는
아이콘 전용 트리거(메뉴 버튼), 세그먼트 옵션, 메뉴 카테고리 행(리스트 아이템),
`/dev` 패널(개발용, production 404)뿐 — 전부 CTA가 아닌 다른 위젯.

| size | 높이 | radius | 가로 패딩 | 글자 |
|---|---|---|---|---|
| `lg`(CTA) | 44px | 8px | 16px | `text-btn`(15/22, 600) |
| `md` | 36px | 8px | 14px | `text-btn`(15/22, 600) — lg와 공유 |
| `sm` | 32px | 8px | 12px | `text-label`(13/18, 600) |

v3에서 `xl`(56px)은 삭제됐다. radius는 전체 시스템에서 **8 / 12 / 16 세 가지만** 쓴다
(모든 버튼 8 — `--radius-btn`, 격자 카드 12, 열린 카드 16). **버튼 폭은 항상 내용+패딩
(`width: auto`)** — 전폭(`display="full"`) 버튼은 어디에도 없다. 하단 바의 버튼 하나는
가운데 정렬 + 최소 폭 160px(`--size-btn-min`, `BottomBar.tsx`의 `[&>button]:min-w-*`로
적용). 라벨은 두 줄로 꺾이지 않는다(`white-space: nowrap`). `sm`/`md`는 보이는 크기는
그대로 두고 `min-h-[--size-touch-min]`(44px)으로 터치 영역만 확장.

| variant | 배경 | 글자 | 테두리 | 쓰는 곳 |
|---|---|---|---|---|
| `fill` | `ink` | `on-ink`(흰색) | 없음 | 화면당 주요 행동 1개: 입장하기, 랜덤으로 뽑기, 카드 덮기 |
| `weak` | `fill-weak` | `ink` | 없음 | 보조 행동: 다시 섞기 |
| `outline` | 투명 | `ink` | 1px `line-strong` | 가장 낮은 위계: 메뉴의 테이블 변경/취소 |

- **v3: "`ink` 채움 버튼 금지" 규칙은 폐기됐다(사용자 직접 요청) — 이제 주요 버튼은
  ink 채움이 기본이다.** `accent` 자체가 삭제됐으므로 "accent는 버튼 1개만" 규칙도
  함께 사라졌다.
- 상태: pressed `scale(0.98)` + 검정 12% 오버레이(120ms — ink 위에 겹치면 거의 검정에
  가까워져 스펙의 "pressed는 #000000" 의도를 별도 토큰 없이 만족), disabled
  `opacity 0.4`, focus-visible 2px `ink` 링 + 2px `paper`(흰색) offset, `loading`은
  점 3개 순차 애니메이션(너비 고정, `aria-busy`) — **"무한 반복 애니메이션 금지" 규칙의
  예외**: 장식이 아니라 실제 요청 진행 상태를 알리는 기능적 표시이고, 끝나면 즉시 사라진다.
- 그라디언트·글로우·아이콘 장식·그림자 없음.

## 하단 고정 CTA 바 — `src/components/BottomBar.tsx`

`position: fixed; bottom: 0`, `padding: 12px 20px calc(24px + env(safe-area-inset-bottom))`,
버튼 위 28px `canvas→투명` 페이드(`cta-fade-mask`, 장식이 아니라 가림막이라 그라디언트
금지 규칙의 예외). 버튼은 **가운데 정렬 + 최소 폭 160px**(전폭 아님 — v3). 뒤의 스크롤
영역은 `bottomBarClearance()`만큼 하단 패딩을 받는다. **카드가 열려 있으면 이 바는 아예
렌더링하지 않는다** — `OpenCardOverlay`가 자기 자신의 CTA(카드 덮기, 같은 `fill lg` 규격
+ 같은 가운데 정렬/최소 폭)를 보여 주므로, 동시에 그리면 disabled 상태(0.4 투명도)의
버튼 뒤로 이 바의 글자가 비쳐 겹쳐 보이는 문제가 있었다(스크린샷으로 발견, `hidden`
prop으로 수정).

## 테이블 번호 입력창 — `src/components/TableNumberInput.tsx`

위→아래: 라벨(`테이블 번호 · Table number`, `text-label`, `ink`) → 예시 줄(`예: 7 · e.g.
7`, `text-caption`, `ink-sub`) → 입력 상자 → (오류일 때만) 오류 문구. **묶음 전체는
화면/시트 가운데에 두되, 안의 텍스트는 입력 상자 폭에 맞춘 왼쪽 정렬**(가운데 정렬
아님). 입력 상자: 폭 100%(최대 240px, `--size-input-table-max`), 높이 52px, radius
8px, `paper` 면, 1.5px `line-strong` 테두리, **placeholder 없음**(v3에서 제거 —
비어 있으면 빈 상자), 글자 22/32 600 가운데 정렬 + `tabular-nums`, 포커스 시
`box-shadow`로 2px `ink` 테두리(레이아웃 안 흔들림, 이전의 4px 18% 외곽 링은 뺐다),
오류 시 `danger` 2px 테두리 + 아이콘 + 문구. 도움말/오류 문구는 **오류일 때만
렌더링**된다(평소엔 DOM에 없음 — 화면을 비운다). 테이블 입장 화면과 메뉴의 테이블
변경 시트가 이 컴포넌트를 공유한다.

## 메뉴 — `src/components/MenuDrawer.tsx`

드로어 배경 `paper`, 오른쪽 가장자리 1px `hairline`. 카테고리 행 높이 56, 행 사이
`hairline`, 이름 + 오른쪽 `{사용}/{전체}`(`ink-sub`), 선택된 행은 체크 아이콘(`ink`) +
`aria-current` — **색 점 없음**. 언어 세그먼트: 트랙 `fill-weak`, 높이 44px
(`--size-segment-track`), 안쪽 여백 4px, thumb 36px(트랙을 거의 채움) + radius 8px
(`--radius-btn` 재사용) + 1px `hairline`, 가로 padding 16px, 글자 세로 가운데, 이동은
기존 `layoutId` 유지.

### 섹션 간격 버그 수정 (v3 후속 §2)

카테고리 행 76px 컨테이너가 `py-5`(위아래 20px)였고, 바로 다음 "테이블" 섹션도
`py-5`였다. 두 패딩이 구분선(1px)을 사이에 두고 그대로 더해져 **마지막 카테고리
행 아래만 41px**(20+1+20)로, 행 사이 0px 리듬과 비교해 확연히 떠 보였다
(Playwright로 실측, `.review/menu_measure.mjs` — row 간 gap 0px, 섹션 간 gap 41px
로 확인). 고쳤다: 카테고리 섹션은 `pt-5`만(끝에 `pb` 없음), 그다음 섹션들은
`marginTop: calc(1.5rem - 1px)` + `borderTop: 1px hairline`로 — margin 23px +
border 1px = **24px 한 곳에서만** 준다(패딩을 더 얹지 않는다). 구분선은 그 24px
안에 끼워 넣었고, SequentialGrid의 구간 헤더와 같은 원칙으로 섹션 자체의 위쪽
패딩은 더 추가하지 않았다. 수정 후 섹션 간 gap은 23~24px로 측정됨(각 섹션의
`py-5`가 아니라 내용에 따라 달라지는 "자기 섹션의 남은 하단 패딩 + 다음 섹션의
24px margin"이 합쳐진 값은 이 버그와 다른 개념이라 정상이다). 행 높이는 7개
행 전부 정확히 56px, 텍스트 세로 중앙(위 16.5px/아래 15.5px — 1px 이내)으로 확인.

## 레이아웃

- 4px 그리드, 화면 좌우 여백 20px, 간격은 4px 배수(8/12/16/20/24/28)만.
- 컨테이너 `max-width: 430px`, 가운데 정렬, `min-height: 100dvh`.
- 상단 바 52px(`--size-topbar`), 세그먼트 트랙 44px(`--size-segment-track`).
- 카드: `width: min(calc(100% - 40px), 360px)`(`--size-card-max`), `aspect-ratio: 3/4.2`.
- 그림자 없음. 모든 경계는 hairline(1px)로 표현. 예외는 열린 카드의 `--shadow-lifted`
  **1단계뿐**(Step 2의 "들린 카드" 단계는 Step 3에서 없앴다 — 실제로 쓰인 적 없었다).
  **버튼에는 그림자를 쓰지 않는다.**
- Safe area: `env(safe-area-inset-top/bottom)` + `viewport-fit: cover`.
- 격자 gap: 카테고리 필터 보기(단일 구간, 3열) 12px(`--size-grid-gap`), "전체" 보기
  (구간별, 4열) 8px(`--size-grid-gap-all`). 구간 사이 32px(`--size-section-gap`).
- `--size-touch-min`(2.75rem, 최소 터치 영역).

## 모션

`src/lib/motion.ts`의 이동→뒤집기→덮기 spring/transition 상수들은 **v3에서도 값과
구조를 바꾸지 않았다**. `prefers-reduced-motion`이면 `useReducedMotion`
(useSyncExternalStore 기반) 훅이 120ms opacity 트랜지션으로 대체한다. 카드 오픈/
뒤집기/덮기, 격자 stagger, 랜덤 뽑기 서스펜스 전부 그대로 — 서스펜스가 훑는 순서만
테이블 셔플 대신 번호 순서로 바뀌었다(아래 "시드 셔플 제거" 참고, 타이밍 상수는 무관).

### 광택 스윕 (v3 후속 §1a — 되살림)

"열릴 때 더 반짝였으면 좋겠다"는 요청으로 Minimal 재개정 때 지웠던 스윕을
`OpenCardOverlay.tsx`에 다시 넣었다 — 색은 쓰지 않는다. 카드가 자리를 잡는 시점
(이동 스프링이 끝나고 뒤집기가 끝나는 시점, `shineTransition.delay = 0.85s`,
기존 `cardFlipTransition`의 완료 시점과 맞춘 값)에 폭 1/3짜리 띠가 왼쪽
(`left: -40%`)에서 오른쪽(`left: 110%`)으로 105도 대각선으로 한 번 지나간다
(`duration: 0.7s`, `ease: "easeOut"`). 카드 면이 `paper`(흰색)라 흰 띠만으로는
안 보여서, 띠 자체가 아니라 **그 양옆에 `color-mix(in srgb, var(--color-ink) 5%,
transparent)` 가장자리** 두 줄을 그라디언트로 그려 넣어 대비를 만든다(가운데는
투명). 영상 프레임 캡처(`.review/sweep_check.mjs`, 700~1600ms 구간)로 실제로
보이는지 확인했다 — 850~1250ms 프레임에서 대각선 명암 두 줄이 또렷이 보이고
1400ms 프레임에서는 완전히 사라져 깨끗하게 끝난다. 5% 밝기로 충분히 보여서
강도를 올리지 않았다. `playIntro`(직접 열었거나 재접속이 아닌 라이브 오픈)일 때만
재생 — 재접속 시 이미 열려 있던 카드에는 안 나온다(기존 텍스트 리빌 스태거와
같은 조건). **저사양 기기 성능은 확인 필요**(이 환경에서 측정 불가).

**스파클(글린트) 효과는 추가하지 않았다** — 원래 요청 문서가 전송 중 손상돼
핵심 내용이 빠졌고, 이 프로젝트가 계속 금지해 온 "컨페티·글로우·파티클"에
스파클이 해당할 수 있어 추측 구현 대신 사용자에게 확인했다. "광택 스윕만으로
충분하다"로 결론나서 스킵했다.

## 시드 셔플 제거 (v3 §4-1)

`src/lib/seededShuffle.ts`(mulberry32 기반 테이블별 고정 셔플)를 삭제했다. 격자는 이제
항상 `questions.json` 배열 순서다. 영향받은 곳:
- `src/components/MainScreen.tsx`: `allOrdered`/`categoryOrdered`가 `seededShuffle(...)`
  대신 `questions`/`questionsInCategory(category)`를 직접 쓴다(둘 다 랜덤 뽑기 서스펜스
  스윕과 카테고리 필터 격자가 참조).
- `src/components/CardGrid.tsx`: 셔플을 언급하던 주석만 지웠다(이 파일은 셔플을 직접
  import한 적 없다).
- 서버(`convex/`, `TableRepository`)는 카드 ID만 저장하므로 **변경 불필요** — 순서는
  항상 클라이언트가 계산한다.
- 단위 테스트: `seededShuffle.ts` 전용 테스트가 없었다(검색 결과 0건) — 갱신할 테스트가
  없다. `src/lib/table/LocalMockRepository.test.ts`·`convex/tables.test.ts` 28개는
  셔플과 무관해 그대로 통과한다.

**금지 목록**: 컨페티, 글로우, 파티클, 무지개 그라디언트, 계절 일러스트/이모지, 무한 반복
장식 애니메이션. **버튼 loading 점 3개는 예외**(기능적 진행 표시, 위 "버튼 시스템" 참고).

## 금지 사항 체크리스트 (스크린샷 검수 기준)

- [x] 플레잉 카드 무늬/모서리 숫자 없음
- [x] 종교 클리셰 일러스트/아이콘 없음
- [x] box-shadow 없음 (hairline만 사용, 버튼은 그림자 자체가 없음, 열린 카드만 예외)
- [x] 카드 위 이모지/일러스트/그라디언트/블러 없음(카드 변형 A/B는 전부 CSS border).
      **예외**: 열린 카드가 자리를 잡는 순간 한 번(0.7s) 지나가는 광택 스윕 — 색이
      아니라 ink 5% 그림자 가장자리로만 만든 모션이고, 반복되지 않는다(위 "모션" 참고)
- [x] "Welcome to…", "Unlock…", "Seamless" 류 마케팅 카피 없음
- [x] 가운데 정렬 히어로 + CTA + 카드 3장 레이아웃 아님
- [x] shadcn/Tailwind 기본 팔레트 그대로 쓰지 않음
- [x] **카테고리별 색, 장식 질감/광택 없음** — 카드 변형 A/B의 프레임·틱은 전부 중성
      `hairline`/`line-strong` 1px 선이지 색 장식이 아니다
- [x] **계절 일러스트/이모지 장식 없음**
- [x] **컨페티·글로우·파티클 없음** — 스파클(글린트) 효과는 이 규칙과 충돌할 수
      있어 추측 구현하지 않고 스킵했다(사용자 확인, 위 "광택 스윕" 참고)
- [x] **56px 이상의 큰 버튼 없음** (가장 큰 버튼 `lg` 44px)
- [x] **전폭(`display="full"`) 버튼 없음** — 전부 내용+패딩 폭
- [x] 화면에 보이는 유채색은 `danger`(오류)뿐 — `accent`가 삭제됐으므로 주요 버튼(`ink`
      채움)과 포커스 링(`ink`)도 무채색이다 (스크린샷 확인)
