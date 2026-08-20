export type ProposedActionStatus = 'proposed' | 'approved' | 'rejected' | 'expired';

export type ProposedAction = Readonly<{
  id: string;
  kind: 'save-courseware-to-classin';
  runRef: string;
  contextSnapshotId: string;
  status: ProposedActionStatus;
  artifactRef: Readonly<{ id: string; version: string }>;
  target: Readonly<{
    classId: string;
    courseId: string;
    unitId: string;
    expectedVersion: string;
    label: string;
  }>;
  difference: string;
  impact: string;
  permission: 'allowed' | 'denied';
  risk: 'low' | 'medium' | 'high';
  reversible: boolean;
  expiresAt: string;
  idempotencyKey: string;
}>;

export type Approval = Readonly<{
  id: string;
  actionId: ProposedAction['id'];
  decision: 'approved' | 'rejected';
  decidedBy: string;
  decidedAt: string;
}>;

type ExecutionReceiptBase = Readonly<{
  id: string;
  actionId: ProposedAction['id'];
  approvalId: string;
  idempotencyKey: ProposedAction['idempotencyKey'];
  executedAt: string;
  truthLabel: string;
}>;

export type SuccessfulExecutionReceipt = ExecutionReceiptBase & Readonly<{
  status: 'success';
  object: Readonly<{
    id: string;
    version: string;
    label: string;
    returnUrl: string;
  }>;
  result: string;
}>;

type FailedExecutionReceiptBase = ExecutionReceiptBase & Readonly<{
  result: string;
  unexecutedTarget: string;
}>;

export type FailedExecutionReceipt =
  | FailedExecutionReceiptBase & Readonly<{ status: 'permission_denied'; recovery: 'choose-another-target'; expectedVersion?: never; currentVersion?: never }>
  | FailedExecutionReceiptBase & Readonly<{ status: 'version_conflict'; recovery: 'compare-and-reconfirm'; expectedVersion: string; currentVersion: string }>
  | FailedExecutionReceiptBase & Readonly<{ status: 'recoverable_failure' | 'timeout'; recovery: 'retry'; expectedVersion?: never; currentVersion?: never }>;

export type ExecutionReceipt = SuccessfulExecutionReceipt | FailedExecutionReceipt;

export type CoursewareSaveActionInput = Readonly<{
  id: string;
  runRef: string;
  contextSnapshotId: string;
  artifactId: string;
  artifactVersion: string;
  target: ProposedAction['target'];
  difference: string;
  impact: string;
  permission: ProposedAction['permission'];
  risk: ProposedAction['risk'];
  reversible: boolean;
  expiresAt: string;
  idempotencyKey: string;
}>;

export type ActionRenewal = Readonly<{
  id: string;
  expiresAt: string;
  idempotencyKey: string;
}>;

export function createCoursewareSaveAction(input: CoursewareSaveActionInput): ProposedAction {
  return Object.freeze({
    id: input.id,
    kind: 'save-courseware-to-classin',
    runRef: input.runRef,
    contextSnapshotId: input.contextSnapshotId,
    status: 'proposed',
    artifactRef: Object.freeze({ id: input.artifactId, version: input.artifactVersion }),
    target: Object.freeze({ ...input.target }),
    difference: input.difference,
    impact: input.impact,
    permission: input.permission,
    risk: input.risk,
    reversible: input.reversible,
    expiresAt: input.expiresAt,
    idempotencyKey: input.idempotencyKey,
  });
}

export function renewCoursewareSaveAction(action: ProposedAction, renewal: ActionRenewal): ProposedAction {
  return createCoursewareSaveAction({
    ...renewal,
    runRef: action.runRef,
    contextSnapshotId: action.contextSnapshotId,
    artifactId: action.artifactRef.id,
    artifactVersion: action.artifactRef.version,
    target: action.target,
    difference: action.difference,
    impact: action.impact,
    permission: action.permission,
    risk: action.risk,
    reversible: action.reversible,
  });
}

function decideAction(action: ProposedAction, approvalId: string, decidedAt: string, decidedBy: string, decision: Approval['decision']) {
  const current = expireAction(action, decidedAt);
  if (current.status !== 'proposed') return null;
  return Object.freeze({
    action: Object.freeze({ ...current, status: decision === 'approved' ? 'approved' as const : 'rejected' as const }),
    approval: Object.freeze({ id: approvalId, actionId: current.id, decision, decidedBy, decidedAt }),
  });
}

export function expireAction(action: ProposedAction, at: string): ProposedAction {
  if (action.status === 'rejected' || action.status === 'expired') return action;
  const expiresAt = Date.parse(action.expiresAt);
  const checkedAt = Date.parse(at);
  return Number.isFinite(expiresAt) && Number.isFinite(checkedAt) && checkedAt < expiresAt
    ? action
    : Object.freeze({ ...action, status: 'expired' });
}

export function approveAction(action: ProposedAction, approvalId: string, decidedAt: string, decidedBy: string) {
  return decideAction(action, approvalId, decidedAt, decidedBy, 'approved');
}

export function rejectAction(action: ProposedAction, approvalId: string, decidedAt: string, decidedBy: string) {
  return decideAction(action, approvalId, decidedAt, decidedBy, 'rejected');
}
