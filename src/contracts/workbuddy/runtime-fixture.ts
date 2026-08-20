import type { CoreContextItem } from '@domain/workbuddy/core-context';

export type WorkBuddyRuntimeFixture = Readonly<{
  projectionGeneratedAt: string;
  snapshot: Readonly<{ coursewareId: string; packageId: string; replannedCoursewareId: string; confirmedAt: string; replannedAt: string }>;
  approval: Readonly<{
    actorId: string; coursewareApproveId: string; coursewareRejectId: string; coursewareDecidedAt: string;
    packageApproveId: string; packageRejectId: string; packageDecidedAt: string;
  }>;
  coursewareRecovery: Readonly<{
    actionId: string; idempotencyKey: string; fallbackTarget: Readonly<{ unitId: string; label: string }>;
  }>;
  packageRecovery: Readonly<{
    actionId: string; idempotencyKey: string; retryActionId: string; retryIdempotencyKey: string;
    fallbackTarget: Readonly<{ unitId: string; label: string }>;
  }>;
  history: Readonly<{
    coursewareEyebrow: string;
    packageSummary: string;
    packageEyebrow: string;
    relativeTime: string;
    eventTime: string;
    currentStepTime: string;
  }>;
  derivedPackage: Readonly<{ goal: string; recommendedContextItemIds: readonly string[] }>;
  replan: Readonly<{
    selectedContextItemIds: readonly string[];
    reason: string;
    goal: string;
    artifact: Readonly<{ id: string; version: string; title: string }>;
    target: Readonly<{ classId: string; courseId: string; unitId: string; expectedVersion: string; label: string }>;
    previousScopeLabel: string;
    nextScopeLabel: string;
  }>;
  contextSummaryKinds: readonly CoreContextItem['kind'][];
}>;
