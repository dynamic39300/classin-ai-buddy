export type ProposedActionStatus = 'proposed' | 'approved' | 'rejected';

export type ProposedAction = Readonly<{
  id: string;
  kind: 'save-courseware-to-classin';
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

export function createCoursewareSaveAction(input: CoursewareSaveActionInput): ProposedAction {
  return Object.freeze({
    id: input.id,
    kind: 'save-courseware-to-classin',
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

function decideAction(action: ProposedAction, approvalId: string, decidedAt: string, decidedBy: string, decision: Approval['decision']) {
  if (action.status !== 'proposed') return null;
  return Object.freeze({
    action: Object.freeze({ ...action, status: decision === 'approved' ? 'approved' as const : 'rejected' as const }),
    approval: Object.freeze({ id: approvalId, actionId: action.id, decision, decidedBy, decidedAt }),
  });
}

export function approveAction(action: ProposedAction, approvalId: string, decidedAt: string, decidedBy: string) {
  return decideAction(action, approvalId, decidedAt, decidedBy, 'approved');
}

export function rejectAction(action: ProposedAction, approvalId: string, decidedAt: string, decidedBy: string) {
  return decideAction(action, approvalId, decidedAt, decidedBy, 'rejected');
}
