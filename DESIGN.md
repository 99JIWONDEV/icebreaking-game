# 디자인 시스템 — EM·KM 아이스브레이킹 카드

## 한 줄 요약

조용한 종이 카드 한 장이 화면의 주인공이고, 나머지는 거의 보이지 않는다.
플레잉 카드(무늬, 모서리 숫자)나 종교 클리셰(십자가, 비둘기, 꽃, 빛줄기) 없이,
Toss의 명료함(화면당 행동 하나, 고정 CTA, 해요체)과 Apple의 Deference/Depth
(콘텐츠가 주인공, UI는 뒤로 물러남, 레이어·모션으로 위계 표현)를 결합한다.

## 색 토큰 (라이트 모드 전용, `src/app/globals.css`의 `@theme`)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-canvas` | `#EFEBE3` | 앱 배경, 따뜻한 회베이지 |
| `--color-paper` | `#FAF6EE` | 카드/세그먼트 thumb 배경 |
| `--color-ink` | `#211E1A` | 본문·CTA 배경 |
| `--color-ink-sub` | `#6F6859` | 보조 텍스트(영문 질문 both 모드, 라벨) |
| `--color-hairline` | `#DED6C4` | 카드·세그먼트 테두리 (그림자 대체) |
| `--color-fill` | `#E4DECF` | 세그먼트 트랙 배경 |
| `--color-accent` | `#A34A2B` | 유일한 강조색. 질문 번호, 연결 끊김 표시, 서스펜스 하이라이트에 사용 (Step 2에서 확장) |
| `--color-scrim` | `color-mix(in srgb, var(--color-ink) 72%, transparent)` | 카드가 열렸을 때 배경을 덮는 어둡게 하기 (Step 2) |

> **확인 필요**: `--color-paper`, `--color-accent` 등 일부 hex는 원본 지침 텍스트가
> 전송 중 깨져서 정확한 값이 유실되었습니다. 위 값은 `canvas`와 조화되는 따뜻한
> 중성 팔레트로 직접 추정해 채운 것이며, 실제 브랜드 가이드가 있다면 교체가 필요합니다.

컴포넌트에서는 항상 Tailwind 토큰 유틸리티(`bg-canvas`, `text-ink-sub` 등)만 쓰고
raw hex를 쓰지 않습니다.

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
| 버튼 | `text-btn` | 17/24 | 600 |
| UI 본문 | `text-body` | 16/24 | 400 |
| 인트로 KO | `text-intro-ko` | 24/34 | 500 |
| 인트로 EN | `text-intro-en` | 15/22, ls 0.02em | 400, `ink-sub` |
| 화면 제목(카테고리명) | `text-title` | 28/36 | 700 (Step 2) |

- 한국어 요소는 `lang="ko"` + 전역 `:lang(ko){ word-break: keep-all }`.
- `text-pretty` 유틸(`text-wrap: pretty`)로 줄바꿈을 정돈.
- 숫자는 `body`에 전역 `font-variant-numeric: tabular-nums`.
- 폰트: Pretendard Variable(자체 호스팅, `public/fonts/`), Noto Serif KR·Newsreader는
  `next/font/google`로 자체 호스팅(런타임에 구글 서버를 호출하지 않음).

## 레이아웃

- 4px 그리드 (Tailwind 기본 spacing 스케일이 이미 4px 단위라 별도 토큰 불필요).
- 컨테이너 `max-width: 430px`, 가운데 정렬, `min-height: 100dvh`.
- 상단 바 52px(`--size-topbar`), 하단 CTA 56px(`--size-cta`), 세그먼트 트랙 36px(`--size-segment-track`).
- 카드: `width: min(calc(100% - 40px), 360px)`(`--size-card-max`), `aspect-ratio: 3/4.2`,
  radius `--radius-card`(1.25rem — **확인 필요**, 원문에 숫자가 명시되지 않아 추정).
- 그림자 없음. 모든 경계는 hairline(`--color-hairline`, 1px)로 표현.
  **Step 2 예외**: 들린 카드(눌림)와 열린 카드(다이얼로그)에만 `--shadow-lifted`
  (`0 12px 24px -8px color-mix(in srgb, var(--color-ink) 28%, transparent)`) 한 종류를 쓴다.
- Safe area: `env(safe-area-inset-top/bottom)` + `viewport-fit: cover`.
- **Radius 3종 원칙 유지(Step 2)**: 새 "작은 카드"(격자의 카드 뒷면) radius를 따로 추가하지 않고
  기존 `--radius-track`(0.75rem)을 재사용한다. 세그먼트 트랙과 격자 카드가 같은 radius를 공유.
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

**추가 금지 목록 (Step 2)**: 컨페티, 글로우, 파티클, 무지개 그라디언트, 무한 반복
애니메이션(연결 상태 점 등 — 광택 효과는 카드 오픈 시 1회만).

## 카드 뒷면 질감 (Step 2)

`ink` 배경 + `card-back-texture` 유틸(사선 `repeating-linear-gradient`, paper 색 6%
투명도)로 종이 인쇄 느낌을 낸다. 스크린샷으로 확인한 결과 과하지 않아 그대로 유지.

## 금지 사항 체크리스트 (스크린샷 검수 기준)

- [x] 플레잉 카드 무늬/모서리 숫자 없음
- [x] 종교 클리셰 일러스트/아이콘 없음
- [x] box-shadow 없음 (hairline만 사용)
- [x] 카드 위 이모지/일러스트/그라디언트/글로우/블러 없음
- [x] "Welcome to…", "Unlock…", "Seamless" 류 마케팅 카피 없음
- [x] 가운데 정렬 히어로 + CTA + 카드 3장 레이아웃 아님
- [x] shadcn/Tailwind 기본 팔레트 그대로 쓰지 않음
