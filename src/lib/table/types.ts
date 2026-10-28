export type CardKind = "pick" | "random";

export type TableState = {
  number: number;
  epoch: number;
  current: null | { cardId: string; openedAt: number; kind: CardKind; by: string };
  used: string[];
  updatedAt: number;
};

export type ConnectionState = "connected" | "reconnecting" | "offline";

export type DrawCardStatus = "opened" | "busy" | "already_used" | "reset" | "invalid";
export type DrawRandomStatus = "opened" | "busy" | "exhausted" | "reset";
export type CloseStatus = "closed" | "noop" | "too_soon" | "reset";
export type ReshuffleStatus = "reshuffled" | "not_exhausted" | "reset";

export type DrawResult = { status: DrawCardStatus; state: TableState };
export type DrawRandomResult = { status: DrawRandomStatus; state: TableState };
export type CloseResult = { status: CloseStatus; state: TableState };
export type ReshuffleResult = { status: ReshuffleStatus; state: TableState };

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
