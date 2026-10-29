const RETRY_DELAYS_MS = [200, 600];

/** 네트워크성 실패만 재시도한다 — 요청은 clientId로 멱등이라 안전하다 (spec Part B §4-2). */
export async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await run();
    } catch (err) {
      lastError = err;
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  console.error("Convex request failed after retries:", lastError);
  throw new Error("요청을 처리하지 못했어요. 다시 시도해 주세요.");
}
