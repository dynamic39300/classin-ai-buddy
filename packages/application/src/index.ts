import type { CourseScope, TruthLabel } from "@workbuddy/domain";

export interface CourseDraftInput {
  readonly scope: CourseScope;
  readonly title: string;
  readonly expectedVersion: number;
}

export type CourseDraftReceipt =
  | { readonly status: "saved"; readonly objectId: string; readonly version: number; readonly truthLabel: TruthLabel }
  | { readonly status: "conflict"; readonly currentVersion: number; readonly truthLabel: TruthLabel }
  | { readonly status: "permission-denied"; readonly truthLabel: TruthLabel };

export interface CourseDraftGateway {
  saveDraft(input: CourseDraftInput): Promise<CourseDraftReceipt>;
}

