export type CardKind = "pick" | "random";

export type TableState = {
  number: number;
  epoch: number;
  current: null | { cardId: string; openedAt: number; kind: CardKind; by: string };
  used: string[];
  updatedAt: number;
};

export type ConnectionState = "connected" | "reconnecting" | "offline";

// "invalid"는 스펙 §3 표에는 drawCard에만 적혀 있지만, 서버 백엔드는 테이블을 미리
// seed해 둬야 해서(로컬 mock과 달리 읽을 때 자동 생성되지 않는다) 범위 밖/안 만들어진
// 테이블 번호를 나머지 세 함수에서도 똑같이 만날 수 있다 — Part B에서 확인된 차이.
export type DrawCardStatus = "opened" | "busy" | "already_used" | "reset" | "invalid";
export type DrawRandomStatus = "opened" | "busy" | "exhausted" | "reset" | "invalid";
export type CloseStatus = "closed" | "noop" | "too_soon" | "reset" | "invalid";
export type ReshuffleStatus = "reshuffled" | "not_exhausted" | "reset" | "invalid";

// state는 대부분의 결과에 항상 딸려 오지만("reset"/"busy" 등도 최신 상태를 보여줘야 하므로),
// 테이블 자체를 못 찾거나(범위 밖 번호) clientId 형식이 잘못된 "invalid"는 보여줄 state가 없다.
export type DrawResult = { status: DrawCardStatus; state?: TableState };
export type DrawRandomResult = { status: DrawRandomStatus; state?: TableState };
export type CloseResult = { status: CloseStatus; state?: TableState };
export type ReshuffleResult = { status: ReshuffleStatus; state?: TableState };

export interface TableRepository {
  subscribe(
    table: number,
    onState: (s: TableState) => void,
    onConn: (c: ConnectionState) => void,
  ): () => void;
  drawCard(a: { table: number; cardId: string; epoch: number; clientId: string }): Promise<DrawResult>;
  drawRandom(a: {
    table: number;
    category?: string;
    epoch: number;
    clientId: string;
  }): Promise<DrawRandomResult>;
  closeCard(a: { table: number; cardId: string; epoch: number; clientId: string }): Promise<CloseResult>;
  reshuffleCategory(a: { table: number; category: string; epoch: number }): Promise<ReshuffleResult>;
}
