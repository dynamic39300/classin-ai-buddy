export type ProposedActionStatus = 'proposed' | 'approved' | 'rejected';

export type ProposedAction = Readonly<{
  id: 'action-courseware-save-1';
  kind: 'save-courseware-to-classin';
  status: ProposedActionStatus;
  artifactRef: Readonly<{ id: string; version: string }>;
  target: Readonly<{
    classId: 'physics-3';
    courseId: 'course-momentum';
    unitId: 'unit-momentum-1';
    expectedVersion: string;
    label: '高二物理 3 班 / 动量与碰撞 / 第一单元 受力与动量';
  }>;
  difference: '新增一份课件对象，不覆盖现有课程资料';
  impact: '课程教师可在单元资料中查看，尚未下发给学生';
  permission: 'allowed' | 'denied';
  risk: 'low';
  reversible: true;
  expiresAt: '2026-08-21T10:05:00+08:00';
  idempotencyKey: 'workbuddy-courseware-save-1';
}>;

export type Approval = Readonly<{
  id: string;
  actionId: ProposedAction['id'];
  decision: 'approved' | 'rejected';
  decidedBy: 'teacher-wang';
  decidedAt: string;
}>;

export type SuccessfulExecutionReceipt = Readonly<{
  id: 'receipt-courseware-save-1';
  actionId: ProposedAction['id'];
  approvalId: string;
  idempotencyKey: ProposedAction['idempotencyKey'];
  status: 'success';
  executedAt: '2026-08-20T10:06:00+08:00';
  object: Readonly<{
    id: 'classin-courseware-momentum-v1';
    version: 'v1';
    label: '动量守恒模型课件';
    returnUrl: '/teacher/classes/physics-3?course=course-momentum&unit=unit-momentum-1&activity=classin-courseware-momentum-v1&source=workbuddy';
  }>;
  result: '课件已保存到 ClassIn 单元资料';
}>;

export type FailedExecutionReceipt = Readonly<{
  id: string;
  actionId: ProposedAction['id'];
  approvalId: string;
  idempotencyKey: ProposedAction['idempotencyKey'];
  executedAt: string;
  status: 'permission_denied' | 'version_conflict' | 'recoverable_failure';
  result: string;
  recovery: 'choose-another-target' | 'compare-and-reconfirm' | 'retry';
  unexecutedTarget: string;
  expectedVersion?: string;
  currentVersion?: string;
}>;

export type ExecutionReceipt = SuccessfulExecutionReceipt | FailedExecutionReceipt;

export function createCoursewareSaveAction(artifact: Readonly<{ artifactId: string; artifactVersion: string }>): ProposedAction {
  return Object.freeze({
    id: 'action-courseware-save-1',
    kind: 'save-courseware-to-classin',
    status: 'proposed',
    artifactRef: Object.freeze({ id: artifact.artifactId, version: artifact.artifactVersion }),
    target: Object.freeze({
      classId: 'physics-3',
      courseId: 'course-momentum',
      unitId: 'unit-momentum-1',
      expectedVersion: 'unit-momentum-1-v1',
      label: '高二物理 3 班 / 动量与碰撞 / 第一单元 受力与动量',
    }),
    difference: '新增一份课件对象，不覆盖现有课程资料',
    impact: '课程教师可在单元资料中查看，尚未下发给学生',
    permission: 'allowed',
    risk: 'low',
    reversible: true,
    expiresAt: '2026-08-21T10:05:00+08:00',
    idempotencyKey: 'workbuddy-courseware-save-1',
  });
}

function decideAction(action: ProposedAction, approvalId: string, decidedAt: string, decision: Approval['decision']) {
  if (action.status !== 'proposed') return null;
  return Object.freeze({
    action: Object.freeze({ ...action, status: decision === 'approved' ? 'approved' as const : 'rejected' as const }),
    approval: Object.freeze({ id: approvalId, actionId: action.id, decision, decidedBy: 'teacher-wang' as const, decidedAt }),
  });
}

export function approveAction(action: ProposedAction, approvalId: string, decidedAt: string) {
  return decideAction(action, approvalId, decidedAt, 'approved');
}

export function rejectAction(action: ProposedAction, approvalId: string, decidedAt: string) {
  return decideAction(action, approvalId, decidedAt, 'rejected');
}
