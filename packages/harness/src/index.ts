import type { ScaffoldStatus } from "@workbuddy/contracts";

export const harnessModules = [
  "context",
  "runtime",
  "capabilities",
  "control",
  "evaluation",
] as const;

export function getHarnessScaffoldStatus(): ScaffoldStatus {
  return {
    service: "workbuddy-harness",
    status: "ready",
    truthLabel: "simulated",
    modules: [...harnessModules],
  };
}

