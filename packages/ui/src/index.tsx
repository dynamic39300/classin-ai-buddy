import type { ReactNode } from "react";

export const wireframeTokens = {
  canvas: "#f5f5f3",
  surface: "#ffffff",
  ink: "#20211f",
  muted: "#6f716d",
  line: "#dedfdb",
  accent: "#2f5f53",
} as const;

export function ScaffoldNotice({ children }: { readonly children: ReactNode }) {
  return <p data-testid="scaffold-notice">{children}</p>;
}

