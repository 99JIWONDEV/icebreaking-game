import { describe, expect, it } from "vitest";
import { computeViewportVars } from "@/lib/useVisualViewportVars";

// 10 §4-2: 이 프로젝트의 vitest는 node 환경이라(jsdom/testing-library 미설치) 훅의
// DOM 배선(addEventListener, CSS 변수 적용, 언마운트 정리)은 여기서 테스트하지 않고
// Playwright 뷰포트 시뮬레이션(.review/)으로 대신 확인한다. 여기서는 훅이 위임하는
// 순수 계산만 단위 테스트한다 — 어차피 로직은 전부 이 함수 하나에 있다.
describe("computeViewportVars", () => {
  it("키보드가 닫혀 있으면(차이 ≤120px) closed를 반환한다", () => {
    const result = computeViewportVars(0, 852, 852);
    expect(result).toEqual({ vvTop: 0, vvHeight: 852, keyboard: "closed" });
  });

  it("차이가 정확히 120px이면 아직 closed다(초과해야 open)", () => {
    const result = computeViewportVars(0, 732, 852);
    expect(result.keyboard).toBe("closed");
  });

  it("차이가 120px를 넘으면(예: 336px 키보드) open을 반환한다", () => {
    const result = computeViewportVars(0, 516, 852);
    expect(result).toEqual({ vvTop: 0, vvHeight: 516, keyboard: "open" });
  });

  it("offsetTop이 0이 아닐 때도(예: 페이지가 스크롤됨) 그대로 전달한다", () => {
    const result = computeViewportVars(60, 500, 852);
    expect(result.vvTop).toBe(60);
    expect(result.vvHeight).toBe(500);
    expect(result.keyboard).toBe("open");
  });
});
