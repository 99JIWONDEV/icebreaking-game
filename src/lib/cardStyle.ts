import type { CSSProperties } from "react";

export const cardWidthStyle: CSSProperties = {
  width: "min(calc(100% - 40px), var(--size-card-max))",
};

export const cardShapeStyle: CSSProperties = {
  width: "100%",
  aspectRatio: "3 / 4.2",
  borderRadius: "var(--radius-card)",
};
