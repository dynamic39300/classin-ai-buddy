import type { WritebackScenario } from '@contracts/workbuddy/classin-writeback';
import type { PackageWritebackScenario } from '@contracts/workbuddy/package-writeback';
import type { ContextProposal, ContextSnapshot, WorkBuddyTaskType } from '@domain/workbuddy/core-context';
import type { SingleCoursewareRun } from '@domain/workbuddy/course-production';
import type { CoursePackageRun, PackageExecutionReceipt } from '@domain/workbuddy/course-package';
import type { PackageApproval, PackageProposedAction } from '@domain/workbuddy/package-writeback';
import type { Approval, ExecutionReceipt, ProposedAction } from '@domain/workbuddy/writeback';
import type { CoursewarePanel, PackagePanel } from './workbuddy-workspace';

const STORAGE_KEY = 'workbuddy:workspace-session:v2';

export type WorkBuddyWorkspaceSession = Readonly<{
  version: 2;
  contextProposal: ContextProposal;
  contextSnapshot: ContextSnapshot | null;
  snapshotsById: Readonly<Record<string, ContextSnapshot>>;
  taskType: WorkBuddyTaskType;
  coursewareRun: SingleCoursewareRun | null;
  coursewareAction: ProposedAction | null;
  coursewareApproval: Approval | null;
  coursewareReceipt: ExecutionReceipt | null;
  writebackScenario: WritebackScenario;
  activeCoursewarePanel: CoursewarePanel;
  packageRun: CoursePackageRun | null;
  packageAction: PackageProposedAction | null;
  packageApproval: PackageApproval | null;
  packageReceipt: PackageExecutionReceipt | null;
  packageReceiptHistory: readonly PackageExecutionReceipt[];
  packageWritebackScenario: PackageWritebackScenario;
  activePackagePanel: PackagePanel;
  activePackageArtifactId: string | null;
  draftGoal: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function hasStrings(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return fields.every((field) => typeof value[field] === 'string');
}

function isNullable<T>(value: unknown, guard: (candidate: unknown) => candidate is T): value is T | null {
  return value === null || guard(value);
}

const CONTEXT_SECTIONS = new Set(['actor_organization', 'teaching_scope', 'learner_scope', 'time_schedule', 'resources_input', 'teaching_evidence', 'domain_knowledge']);
const TASK_TYPES = new Set(['single-courseware', 'course-package']);

function isContextItem(value: unknown): boolean {
  return isRecord(value)
    && hasStrings(value, ['id', 'kind', 'label', 'sourceVersion'])
    && (value.parentId === undefined || typeof value.parentId === 'string')
    && CONTEXT_SECTIONS.has(String(value.section))
    && ['classin', 'teacher-input', 'institution-rule', 'domain-knowledge'].includes(String(value.source))
    && ['read', 'restricted'].includes(String(value.permission))
    && ['public', 'organization', 'class', 'personal', 'student_sensitive'].includes(String(value.sensitivity))
    && ['locked', 'suggested'].includes(String(value.selection))
    && typeof value.included === 'boolean';
}

function hasValidHierarchy(items: readonly unknown[]): boolean {
  if (!items.every(isContextItem)) return false;
  const records = items as readonly Record<string, unknown>[];
  const ids = new Set(records.map(({ id }) => String(id)));
  if (ids.size !== records.length || records.some(({ parentId }) => parentId !== undefined && !ids.has(String(parentId)))) return false;
  return records.every((item) => {
    const seen = new Set<string>();
    let parentId = item.parentId;
    while (typeof parentId === 'string') {
      if (seen.has(parentId)) return false;
      seen.add(parentId);
      parentId = records.find(({ id }) => id === parentId)?.parentId;
    }
    return true;
  });
}

function isContextProposal(value: unknown): value is ContextProposal {
  return isRecord(value) && TASK_TYPES.has(String(value.taskType))
    && ['needs_attention', 'ready_to_confirm'].includes(String(value.status))
    && Array.isArray(value.items) && hasValidHierarchy(value.items);
}

function isContextSnapshot(value: unknown): value is ContextSnapshot {
  return isRecord(value) && hasStrings(value, ['id', 'confirmedAt'])
    && value.version === 'workbuddy-m4-context-v1' && TASK_TYPES.has(String(value.taskType))
    && Array.isArray(value.items) && hasValidHierarchy(value.items);
}

function isObjectRef(value: unknown): boolean {
  return isRecord(value) && hasStrings(value, ['id', 'version']);
}

function isTarget(value: unknown): boolean {
  return isRecord(value) && hasStrings(value, ['classId', 'courseId', 'unitId', 'expectedVersion', 'label']);
}

function isApproval(value: unknown): value is Approval {
  return isRecord(value) && hasStrings(value, ['id', 'actionId', 'decidedBy', 'decidedAt'])
    && ['approved', 'rejected'].includes(String(value.decision));
}

function isAction(value: unknown): value is ProposedAction {
  return isRecord(value) && value.kind === 'save-courseware-to-classin'
    && hasStrings(value, ['id', 'runRef', 'contextSnapshotId', 'difference', 'impact', 'expiresAt', 'idempotencyKey'])
    && ['proposed', 'approved', 'rejected', 'expired'].includes(String(value.status))
    && isObjectRef(value.artifactRef) && isTarget(value.target)
    && ['allowed', 'denied'].includes(String(value.permission)) && ['low', 'medium', 'high'].includes(String(value.risk))
    && typeof value.reversible === 'boolean';
}

function isExecutionReceipt(value: unknown): value is ExecutionReceipt {
  if (!isRecord(value) || !hasStrings(value, ['id', 'actionId', 'approvalId', 'idempotencyKey', 'executedAt', 'truthLabel', 'result'])) return false;
  if (value.status === 'success') return isRecord(value.object) && hasStrings(value.object, ['id', 'version', 'label', 'returnUrl']);
  if (!hasStrings(value, ['unexecutedTarget'])) return false;
  if (value.status === 'permission_denied') return value.recovery === 'choose-another-target';
  if (value.status === 'version_conflict') return value.recovery === 'compare-and-reconfirm' && hasStrings(value, ['expectedVersion', 'currentVersion']);
  return (value.status === 'recoverable_failure' || value.status === 'timeout') && value.recovery === 'retry';
}

function isCoursewareArtifact(value: unknown): boolean {
  return isRecord(value) && value.kind === 'courseware' && value.validationState === 'passed'
    && hasStrings(value, ['id', 'version', 'title', 'sourceStepId', 'validationSummary', 'truthLabel'])
    && typeof value.pageCount === 'number'
    && (value.revisionInstruction === undefined || typeof value.revisionInstruction === 'string')
    && (value.changeSummary === undefined || isStringArray(value.changeSummary));
}

function isCoursewareRun(value: unknown): value is SingleCoursewareRun {
  if (!isRecord(value) || value.fixtureVersion !== 'workbuddy-m4-course-production-v1' || value.taskType !== 'single-courseware'
    || !hasStrings(value, ['id', 'title', 'goal', 'contextSnapshotId']) || typeof value.revision !== 'number'
    || !isRecord(value.brief) || typeof value.brief.durationMinutes !== 'number' || typeof value.brief.expectedPages !== 'number' || typeof value.brief.teachingApproach !== 'string'
    || !Array.isArray(value.plan) || !value.plan.every((step) => isRecord(step) && hasStrings(step, ['id', 'title', 'capability', 'capabilitySummary', 'expectedOutput']))
    || !Array.isArray(value.events) || !value.events.every((event) => isRecord(event) && hasStrings(event, ['id', 'title', 'summary']) && event.state === 'completed' && (event.capability === undefined || typeof event.capability === 'string'))
    || !Array.isArray(value.artifactHistory) || !value.artifactHistory.every(isCoursewareArtifact)
    || !Array.isArray(value.supersededEvidence) || !value.supersededEvidence.every((evidence) => isRecord(evidence) && hasStrings(evidence, ['snapshotId', 'reason']) && (evidence.artifact === null || isCoursewareArtifact(evidence.artifact)) && Array.isArray(evidence.artifactHistory) && evidence.artifactHistory.every(isCoursewareArtifact) && Array.isArray(evidence.plan) && Array.isArray(evidence.events) && (evidence.action === undefined || isAction(evidence.action)) && (evidence.receipt === undefined || isExecutionReceipt(evidence.receipt)))
    || !isStringArray(value.allowedCommands)) return false;
  if (value.stage === 'needs_information') return value.artifact === null && value.reviewStatus === 'not_available' && value.recovery === 'complete-required-information';
  if (value.stage === 'awaiting_plan_confirmation') return value.artifact === null && value.reviewStatus === 'not_available' && value.recovery === 'confirm-or-revise-plan';
  return value.stage === 'artifact_ready' && isCoursewareArtifact(value.artifact)
    && ['pending', 'approved'].includes(String(value.reviewStatus)) && value.recovery === null;
}

function isPackageAction(value: unknown): value is PackageProposedAction {
  return isRecord(value) && value.kind === 'save-course-package-to-classin'
    && hasStrings(value, ['id', 'runRef', 'contextSnapshotId', 'difference', 'impact', 'expiresAt', 'idempotencyKey'])
    && ['proposed', 'approved', 'rejected', 'expired'].includes(String(value.status))
    && Array.isArray(value.artifactRefs) && value.artifactRefs.every(isObjectRef) && isTarget(value.target)
    && ['allowed', 'denied'].includes(String(value.permission)) && ['low', 'medium', 'high'].includes(String(value.risk))
    && typeof value.reversible === 'boolean';
}

function isPackageApproval(value: unknown): value is PackageApproval {
  return isApproval(value);
}

function isPackageReceipt(value: unknown): value is PackageExecutionReceipt {
  if (!isRecord(value) || !hasStrings(value, ['id', 'actionId', 'approvalId', 'idempotencyKey', 'truthLabel', 'result']) || !Array.isArray(value.items)) return false;
  const itemValid = value.items.every((item) => isRecord(item) && typeof item.artifactId === 'string'
    && ['succeeded', 'failed', 'not_executed', 'waiting'].includes(String(item.result))
    && (item.result !== 'succeeded' || typeof item.objectId === 'string'));
  if (!itemValid) return false;
  if (value.status === 'success' || value.status === 'partial_success') return true;
  if (value.status === 'permission_denied') return value.recovery === 'choose-another-target';
  if (value.status === 'version_conflict') return value.recovery === 'compare-and-reconfirm' && hasStrings(value, ['expectedVersion', 'currentVersion']);
  return (value.status === 'recoverable_failure' || value.status === 'timeout') && value.recovery === 'retry';
}

function isPackageRun(value: unknown): value is CoursePackageRun {
  if (!isRecord(value) || value.fixtureVersion !== 'workbuddy-m4-course-production-v1' || value.taskType !== 'course-package'
    || !hasStrings(value, ['id', 'title', 'goal']) || !Array.isArray(value.artifacts) || !isStringArray(value.allowedCommands)
    || (value.parentRunRef !== undefined && typeof value.parentRunRef !== 'string') || (value.sourceArtifactRef !== undefined && !isObjectRef(value.sourceArtifactRef))) return false;
  const artifactsValid = value.artifacts.every((artifact) => isRecord(artifact)
    && hasStrings(artifact, ['id', 'title', 'version']) && ['courseware', 'homework', 'quiz', 'recording-script'].includes(String(artifact.kind))
    && ['planned', 'generating', 'waiting', 'ready', 'failed', 'excluded', 'approved', 'written_back'].includes(String(artifact.state))
    && isStringArray(artifact.dependsOn) && isStringArray(artifact.allowedCommands)
    && (artifact.recovery === null || artifact.recovery === 'retry-or-exclude' || artifact.recovery === 'include'));
  if (!artifactsValid) return false;
  if (value.stage === 'awaiting_context') return value.contextSnapshotId === null && value.recovery === 'confirm-context';
  if (typeof value.contextSnapshotId !== 'string') return false;
  const recoveries: Record<string, unknown> = { configuring: 'confirm-package-scope', generating: 'wait-or-complete-fixture', artifact_ready: null, partial_success: 'retry-failed-items', completed: null };
  return Object.hasOwn(recoveries, String(value.stage)) && value.recovery === recoveries[String(value.stage)];
}

function isWorkspaceSession(value: unknown): value is WorkBuddyWorkspaceSession {
  if (!isRecord(value) || value.version !== 2) return false;
  return isContextProposal(value.contextProposal)
    && isNullable(value.contextSnapshot, isContextSnapshot)
    && isRecord(value.snapshotsById) && Object.values(value.snapshotsById).every(isContextSnapshot)
    && (value.taskType === 'single-courseware' || value.taskType === 'course-package')
    && isNullable(value.coursewareRun, isCoursewareRun)
    && isNullable(value.coursewareAction, isAction)
    && isNullable(value.coursewareApproval, isApproval)
    && isNullable(value.coursewareReceipt, isExecutionReceipt)
    && ['success', 'permission_denied', 'version_conflict', 'recoverable_failure', 'timeout'].includes(String(value.writebackScenario))
    && ['artifact', 'core_context', 'process_detail', 'action', 'receipt', 'replan', 'none'].includes(String(value.activeCoursewarePanel))
    && isNullable(value.packageRun, isPackageRun)
    && isNullable(value.packageAction, isPackageAction)
    && isNullable(value.packageApproval, isPackageApproval)
    && isNullable(value.packageReceipt, isPackageReceipt)
    && Array.isArray(value.packageReceiptHistory) && value.packageReceiptHistory.every(isPackageReceipt)
    && ['success', 'partial_success'].includes(String(value.packageWritebackScenario))
    && ['navigator', 'approval', 'receipt', 'core_context', 'none'].includes(String(value.activePackagePanel))
    && (value.activePackageArtifactId === null || typeof value.activePackageArtifactId === 'string')
    && typeof value.draftGoal === 'string';
}

export function loadWorkBuddyWorkspaceSession(): WorkBuddyWorkspaceSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? 'null');
    return isWorkspaceSession(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveWorkBuddyWorkspaceSession(session: WorkBuddyWorkspaceSession): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearWorkBuddyWorkspaceSession(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
