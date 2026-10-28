const CLIENT_ID_KEY = "icebreaker:clientId";

/** Anonymous per-device id, not tied to any identity. Used only to dedupe double-taps. */
export function getClientId(storage: { getItem(k: string): string | null; setItem(k: string, v: string): void }): string {
  const existing = storage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `client-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  storage.setItem(CLIENT_ID_KEY, id);
  return id;
}
