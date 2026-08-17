export type TruthLabel = "real" | "simulated" | "integration-simulated" | "future";

export type RunState =
  | { status: "draft" }
  | { status: "needs-input"; missing: readonly string[] }
  | { status: "planning" }
  | { status: "generating"; currentStep: string }
  | { status: "awaiting-approval"; actionId: string }
  | { status: "executing"; actionId: string }
  | { status: "recoverable-failure"; errorCode: string }
  | { status: "completed"; receiptId: string };

export interface CourseScope {
  readonly tenantId: string;
  readonly teacherId: string;
  readonly courseId: string;
}

