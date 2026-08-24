import type { ContextProjection, ContextProposal, ContextSnapshot, CoreContextSection } from '@domain/workbuddy/core-context';
import type { SingleCoursewareRun } from '@domain/workbuddy/course-production';
import { getPackageApprovableArtifactIds, type CoursePackageRun, type PackageExecutionReceipt } from '@domain/workbuddy/course-package';
import type { PackageApproval, PackageProposedAction } from '@domain/workbuddy/package-writeback';
import type { Approval, ExecutionReceipt, ProposedAction } from '@domain/workbuddy/writeback';
import { EvaluationModule, type EvaluationEvent } from '@domain/workbuddy/evaluation';

type CoursewarePresentation = Readonly<{
  id: string; title: string; goal: string; contextSnapshotId: string; statusLabel: string; stage: SingleCoursewareRun['stage'];
  brief: SingleCoursewareRun['brief']; plan: SingleCoursewareRun['plan']; events: SingleCoursewareRun['events'];
  artifact: SingleCoursewareRun['artifact']; artifactHistory: SingleCoursewareRun['artifactHistory']; revision: number;
  derivedPackageRunRef: string | null;
  reviewStatus: SingleCoursewareRun['reviewStatus'];
  supersededEvidence: readonly Readonly<SingleCoursewareRun['supersededEvidence'][number] & { contextLabels: readonly string[] }>[];
  allowedCommands: SingleCoursewareRun['allowedCommands']; recovery: SingleCoursewareRun['recovery'];
  showBrief: boolean; showPlan: boolean; showArtifact: boolean;
}>;
type PackagePresentation = Readonly<{
  id: string; title: string; goal: string; contextSnapshotId: string | null; statusLabel: string;
  artifacts: CoursePackageRun['artifacts']; parentRunRef?: string; sourceArtifactRef?: CoursePackageRun['sourceArtifactRef'];
  allowedCommands: CoursePackageRun['allowedCommands']; recovery: CoursePackageRun['recovery'];
  showContextConfirmation: boolean; showPackageConfiguration: boolean; showGeneration: boolean; showArtifacts: boolean;
}>;
type CoursewareActionPresentation = Pick<ProposedAction, 'id' | 'runRef' | 'contextSnapshotId' | 'status' | 'artifactRef' | 'target' | 'difference' | 'impact' | 'permission' | 'risk' | 'reversible' | 'expiresAt' | 'idempotencyKey'>;
type PackageActionPresentation = Pick<PackageProposedAction, 'id' | 'status' | 'artifactRefs' | 'target' | 'difference' | 'impact' | 'permission' | 'risk' | 'reversible' | 'expiresAt' | 'idempotencyKey'>;
type CoursewareReceiptPresentation =
  | Readonly<{
    id: string; actionId: string; approvalId: string; idempotencyKey: string; executedAt: string;
    status: 'success'; result: string; truthLabel: string; object: Readonly<{ id: string; version: string; label: string; returnUrl: string }>;
  }>
  | Readonly<{
    id: string; actionId: string; approvalId: string; idempotencyKey: string; executedAt: string;
    status: 'permission_denied'; result: string; truthLabel: string; recovery: 'choose-another-target'; unexecutedTarget: string;
  }>
  | Readonly<{
    id: string; actionId: string; approvalId: string; idempotencyKey: string; executedAt: string;
    status: 'version_conflict'; result: string; truthLabel: string; recovery: 'compare-and-reconfirm'; unexecutedTarget: string;
    expectedVersion: string; currentVersion: string;
  }>
  | Readonly<{
    id: string; actionId: string; approvalId: string; idempotencyKey: string; executedAt: string;
    status: 'recoverable_failure' | 'timeout'; result: string; truthLabel: string; recovery: 'retry'; unexecutedTarget: string;
  }>;
type PackageReceiptPresentation = PackageExecutionReceipt;
export type PackageExecutionAttemptView = Readonly<{
  action: PackageActionPresentation;
  approval: PackageApproval;
  receipt: PackageReceiptPresentation;
  evaluations: readonly EvaluationEvent[];
}>;

export type CoursewareRunView = Readonly<{
  run: CoursewarePresentation;
  projections: readonly ContextProjection[];
  action: CoursewareActionPresentation | null;
  approval: Approval | null;
  receipt: CoursewareReceiptPresentation | null;
  evaluation: EvaluationEvent | null;
}>;

export type PackageRunView = Readonly<{
  run: PackagePresentation;
  action: PackageActionPresentation | null;
  approval: PackageApproval | null;
  receipt: PackageReceiptPresentation | null;
  receiptHistory: readonly PackageReceiptPresentation[];
  evaluations: readonly EvaluationEvent[];
  executionAttempts: readonly PackageExecutionAttemptView[];
  contextConfirmed: boolean;
  retryableArtifactIds: readonly string[];
  canProposeSave: boolean;
}>;

export type CoreContextView = Readonly<{
  status: 'needs_attention' | 'ready_to_confirm' | 'confirmed';
  includedCount: number;
  snapshotVersion: string | null;
  snapshotId: string | null;
  items: readonly Readonly<{
    id: string; parentId?: string; section: CoreContextSection; kind: string; label: string; sourceLabel: string; sourceVersion: string;
    reference?: Readonly<{ system: 'classin-space' | 'teacherin'; objectId: string; version: string }>;
    permissionLabel: string; sensitivity: string; included: boolean; locked: boolean; selectable: boolean;
  }>[];
}>;

const SOURCE_LABELS = {
  classin: 'ClassIn 业务事实', 'teacher-input': '教师输入', 'institution-rule': '机构规则', 'domain-knowledge': '受版本治理的知识',
  'workbuddy-artifact': 'WorkBuddy AI 产物', teacherin: 'TeacherIn 资源',
} as const;

const SENSITIVITY_LABELS = {
  public: '公开信息', organization: '机构内信息', class: '班级范围信息', personal: '教师个人信息', student_sensitive: '学生敏感信息',
} as const;

export function projectCoreContextView(proposal: ContextProposal, snapshot: ContextSnapshot | null): CoreContextView {
  const selectedIds = new Set(snapshot?.items.map(({ id }) => id) ?? proposal.items.filter(({ included }) => included).map(({ id }) => id));
  const items = proposal.items.map((item) => Object.freeze({
    id: item.id, parentId: item.parentId, section: item.section, kind: item.kind, label: item.label, sourceLabel: SOURCE_LABELS[item.source],
    sourceVersion: item.sourceVersion, reference: item.reference, permissionLabel: item.permission === 'read' ? '可读取' : '受限', sensitivity: SENSITIVITY_LABELS[item.sensitivity],
    included: selectedIds.has(item.id), locked: item.selection === 'locked',
    selectable: !snapshot && item.selection !== 'locked' && (!item.parentId || selectedIds.has(item.parentId)),
  }));
  return Object.freeze({
    status: snapshot ? 'confirmed' : proposal.status,
    includedCount: items.filter(({ included }) => included).length,
    snapshotVersion: snapshot?.version ?? null,
    snapshotId: snapshot?.id ?? null,
    items: Object.freeze(items),
  });
}

export function projectCoursewareRunView(
  run: SingleCoursewareRun | null,
  projections: readonly ContextProjection[],
  action: ProposedAction | null,
  approval: Approval | null,
  receipt: ExecutionReceipt | null,
  snapshotsById: Readonly<Record<string, ContextSnapshot>>,
  derivedPackageRunRef: string | null,
): CoursewareRunView | null {
  if (!run) return null;
  const evaluation = action && approval && receipt && run.artifact
    ? EvaluationModule.recordExecutionOutcome({
      runRef: run.id,
      contextSnapshotRef: run.contextSnapshotId,
      artifactRef: { id: run.artifact.id, version: run.artifact.version },
      action,
      approval,
      receipt,
    })
    : null;
  const stageProjection = {
    needs_information: { statusLabel: '需要补充', showBrief: true, showPlan: false, showArtifact: false },
    awaiting_plan_confirmation: { statusLabel: '待确认计划', showBrief: false, showPlan: true, showArtifact: false },
    artifact_ready: { statusLabel: '完成待复查', showBrief: false, showPlan: false, showArtifact: true },
  }[run.stage];
  return Object.freeze({
    run: Object.freeze({
      id: run.id, title: run.title, goal: run.goal, contextSnapshotId: run.contextSnapshotId, stage: run.stage, ...stageProjection,
      brief: run.brief, plan: run.plan, events: run.events, artifact: run.artifact, artifactHistory: run.artifactHistory, revision: run.revision, reviewStatus: run.reviewStatus,
      derivedPackageRunRef,
      supersededEvidence: Object.freeze(run.supersededEvidence.map((evidence) => Object.freeze({
        ...evidence,
        contextLabels: Object.freeze(snapshotsById[evidence.snapshotId]?.items.map(({ label }) => label) ?? []),
      }))),
      allowedCommands: run.allowedCommands, recovery: run.recovery,
    }),
    projections,
    action: action ? Object.freeze({
      id: action.id, runRef: action.runRef, contextSnapshotId: action.contextSnapshotId, status: action.status, artifactRef: action.artifactRef, target: action.target,
      difference: action.difference, impact: action.impact, permission: action.permission, risk: action.risk, reversible: action.reversible,
      expiresAt: action.expiresAt, idempotencyKey: action.idempotencyKey,
    }) : null,
    approval: approval ? Object.freeze({ ...approval }) : null,
    receipt: receipt ? Object.freeze({ ...receipt }) : null,
    evaluation,
  });
}

export function projectPackageRunView(
  run: CoursePackageRun | null,
  action: PackageProposedAction | null,
  approval: PackageApproval | null,
  receipt: PackageExecutionReceipt | null,
  receiptHistory: readonly PackageExecutionReceipt[],
  actionHistory: readonly PackageProposedAction[],
  approvalHistory: readonly PackageApproval[],
): PackageRunView | null {
  if (!run) return null;
  const projectAction = (candidate: PackageProposedAction): PackageActionPresentation => Object.freeze({
    id: candidate.id, status: candidate.status, artifactRefs: candidate.artifactRefs, target: candidate.target,
    difference: candidate.difference, impact: candidate.impact, permission: candidate.permission, risk: candidate.risk,
    reversible: candidate.reversible, expiresAt: candidate.expiresAt, idempotencyKey: candidate.idempotencyKey,
  });
  const executionAttempts = receiptHistory.flatMap((historicalReceipt) => {
    const historicalAction = actionHistory.find(({ id }) => id === historicalReceipt.actionId);
    const historicalApproval = approvalHistory.find(({ id }) => id === historicalReceipt.approvalId);
    if (!historicalAction || !historicalApproval || !run.contextSnapshotId) return [];
    const evaluations = historicalAction.artifactRefs.flatMap((artifactRef) => {
      const evaluation = EvaluationModule.recordExecutionOutcome({
        runRef: run.id, contextSnapshotRef: run.contextSnapshotId!, artifactRef,
        action: historicalAction, approval: historicalApproval, receipt: historicalReceipt,
      });
      return evaluation ? [evaluation] : [];
    });
    return [Object.freeze({
      action: projectAction(historicalAction), approval: Object.freeze({ ...historicalApproval }),
      receipt: Object.freeze({ ...historicalReceipt }), evaluations: Object.freeze(evaluations),
    })];
  });
  const evaluations = executionAttempts.flatMap((attempt) => attempt.evaluations);
  const stageProjection = {
    awaiting_context: { statusLabel: '待确认上下文', showContextConfirmation: true, showPackageConfiguration: false, showGeneration: false, showArtifacts: false },
    configuring: { statusLabel: '确认范围', showContextConfirmation: false, showPackageConfiguration: true, showGeneration: false, showArtifacts: false },
    generating: { statusLabel: '生成中', showContextConfirmation: false, showPackageConfiguration: false, showGeneration: true, showArtifacts: false },
    artifact_ready: { statusLabel: '完成待复查', showContextConfirmation: false, showPackageConfiguration: false, showGeneration: false, showArtifacts: true },
    partial_success: { statusLabel: '部分成功', showContextConfirmation: false, showPackageConfiguration: false, showGeneration: false, showArtifacts: true },
    completed: { statusLabel: '已完成', showContextConfirmation: false, showPackageConfiguration: false, showGeneration: false, showArtifacts: true },
  }[run.stage];
  return Object.freeze({
    run: Object.freeze({
      id: run.id, title: run.title, goal: run.goal, contextSnapshotId: run.contextSnapshotId, ...stageProjection,
      artifacts: run.artifacts, parentRunRef: run.parentRunRef, sourceArtifactRef: run.sourceArtifactRef,
      allowedCommands: run.allowedCommands, recovery: run.recovery,
    }),
    action: action ? projectAction(action) : null,
    approval: approval ? Object.freeze({ ...approval }) : null,
    receipt: receipt ? Object.freeze({ ...receipt }) : null,
    receiptHistory: Object.freeze(receiptHistory.map((item) => Object.freeze({ ...item }))),
    evaluations: Object.freeze(evaluations),
    executionAttempts: Object.freeze(executionAttempts),
    contextConfirmed: run.contextSnapshotId !== null,
    retryableArtifactIds: Object.freeze(run.artifacts.filter(({ state, allowedCommands }) => state === 'failed' && allowedCommands.includes('retry')).map(({ id }) => id)),
    canProposeSave: getPackageApprovableArtifactIds(run).length > 0,
  });
}
