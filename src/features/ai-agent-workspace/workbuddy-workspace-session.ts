import type { WritebackScenario } from '@contracts/workbuddy/classin-writeback';
import type { PackageWritebackScenario } from '@contracts/workbuddy/package-writeback';
import type { ContextProposal, ContextSnapshot, WorkBuddyTaskType } from '@domain/workbuddy/core-context';
import type { SingleCoursewareRun } from '@domain/workbuddy/course-production';
import type { CoursePackageRun, PackageExecutionReceipt } from '@domain/workbuddy/course-package';
import type { PackageApproval, PackageProposedAction } from '@domain/workbuddy/package-writeback';
import type { Approval, ExecutionReceipt, ProposedAction } from '@domain/workbuddy/writeback';
import type { QuizActivityCreationRun } from '@domain/workbuddy/quiz-activity-creation';
import type { QuizActivityDraftScenario } from '@contracts/workbuddy/quiz-activity-draft';
import type { CoursewarePanel, PackagePanel } from './workbuddy-workspace';

const STORAGE_KEY = 'workbuddy:workspace-session:v3';

function storageKey(namespace = 'ideal-full'): string {
  return namespace === 'ideal-full' ? STORAGE_KEY : `${STORAGE_KEY}:${namespace}`;
}

export type WorkBuddyWorkspaceSession = Readonly<{
  version: 3;
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
  packageActionHistory: readonly PackageProposedAction[];
  packageApprovalHistory: readonly PackageApproval[];
  packageWritebackScenario: PackageWritebackScenario;
  activePackagePanel: PackagePanel;
  activePackageArtifactId: string | null;
  quizRun: QuizActivityCreationRun | null;
  quizScenario: QuizActivityDraftScenario;
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
const TASK_TYPES = new Set(['single-courseware', 'course-package', 'quiz-activity-creation']);

function isContextItem(value: unknown): boolean {
  return isRecord(value)
    && hasStrings(value, ['id', 'kind', 'label', 'sourceVersion'])
    && (value.parentId === undefined || typeof value.parentId === 'string')
    && CONTEXT_SECTIONS.has(String(value.section))
    && ['classin', 'teacher-input', 'institution-rule', 'domain-knowledge', 'workbuddy-artifact', 'teacherin'].includes(String(value.source))
    && ['read', 'restricted'].includes(String(value.permission))
    && ['public', 'organization', 'class', 'personal', 'student_sensitive'].includes(String(value.sensitivity))
    && ['locked', 'suggested'].includes(String(value.selection))
    && typeof value.included === 'boolean'
    && (value.reference === undefined || (isRecord(value.reference)
      && ['classin-space', 'teacherin', 'workbuddy-personal-files'].includes(String(value.reference.system))
      && hasStrings(value.reference, ['objectId', 'version'])));
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
  if (!isRecord(value) || !hasStrings(value, ['id', 'actionId', 'approvalId', 'idempotencyKey', 'executedAt', 'truthLabel', 'result']) || !Array.isArray(value.items)) return false;
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

function isQuizArtifact(value: unknown): boolean {
  if (!isRecord(value) || !hasStrings(value, ['id', 'version', 'title', 'description', 'truthLabel'])
    || !Array.isArray(value.questions) || typeof value.totalScore !== 'number'
    || !isRecord(value.validation) || value.validation.status !== 'passed' || typeof value.validation.summary !== 'string') return false;
  const validQuestions = value.questions.every((question) => isRecord(question)
    && hasStrings(question, ['id', 'type', 'prompt', 'answer', 'explanation', 'difficulty'])
    && typeof question.score === 'number' && question.score > 0
    && (question.options === undefined || isStringArray(question.options)));
  return validQuestions && value.questions.reduce((sum: number, question) => sum + Number((question as Record<string, unknown>).score), 0) === value.totalScore;
}

function isQuizReceipt(value: unknown): boolean {
  if (!isRecord(value) || !hasStrings(value, ['id', 'actionId', 'approvalId', 'idempotencyKey', 'executedAt', 'truthLabel', 'result'])) return false;
  if (value.status === 'success') return isRecord(value.object) && value.object.publication === 'draft' && hasStrings(value.object, ['id', 'version', 'label', 'returnUrl']);
  if (value.status === 'evidence_mismatch') return value.recovery === 'manual-review';
  if (!hasStrings(value, ['unexecutedTarget'])) return false;
  if (value.status === 'permission_denied') return value.recovery === 'choose-another-target';
  if (value.status === 'version_conflict') return value.recovery === 'compare-and-reconfirm' && hasStrings(value, ['expectedVersion', 'currentVersion']);
  return (value.status === 'recoverable_failure' || value.status === 'timeout') && value.recovery === 'retry';
}

function isQuizPaperReview(value: unknown, artifact: unknown): boolean {
  if (!isRecord(value) || value.status !== 'approved' || !hasStrings(value, ['reviewedBy', 'reviewedAt'])
    || !isObjectRef(value.artifactRef) || !isRecord(artifact)) return false;
  const artifactRef = value.artifactRef as Record<string, unknown>;
  return artifactRef.id === artifact.id && artifactRef.version === artifact.version;
}

function isQuizRun(value: unknown): value is QuizActivityCreationRun {
  if (!isRecord(value) || value.fixtureVersion !== 'workbuddy-quiz-activity-v1' || value.taskType !== 'quiz-activity-creation'
    || !hasStrings(value, ['id', 'goal', 'contextSnapshotId', 'createdAt']) || !isTarget(value.target) || typeof value.settingsRevision !== 'number'
    || !isRecord(value.brief) || typeof value.brief.questionCount !== 'number' || typeof value.brief.totalScore !== 'number' || !isStringArray(value.brief.questionTypes)
    || !isRecord(value.settings) || !hasStrings(value.settings, ['title', 'description', 'startAt', 'endAt', 'scoring']) || !isRecord(value.settings.duration)
    || !isStringArray(value.allowedCommands) || (value.recovery !== null && typeof value.recovery !== 'string')) return false;
  if (value.artifact !== null && !isQuizArtifact(value.artifact)) return false;
  if (value.paperReview !== null && !isQuizPaperReview(value.paperReview, value.artifact)) return false;
  if (value.action !== null) {
    if (!isRecord(value.action) || value.action.kind !== 'create-quiz-activity-draft'
      || !hasStrings(value.action, ['id', 'runRef', 'contextSnapshotId', 'difference', 'impact', 'expiresAt', 'idempotencyKey'])
      || value.action.runRef !== value.id || value.action.contextSnapshotId !== value.contextSnapshotId || !isObjectRef(value.action.artifactRef)
      || !isQuizArtifact(value.action.paper) || !isTarget(value.action.target) || value.action.publication !== 'draft'
      || JSON.stringify(value.action.target) !== JSON.stringify(value.target) || !isRecord(value.artifact)) return false;
    const artifactRef = value.action.artifactRef as Record<string, unknown>;
    const paper = value.action.paper as Record<string, unknown>;
    if (artifactRef.id !== value.artifact.id || artifactRef.version !== value.artifact.version
      || paper.id !== value.artifact.id || paper.version !== value.artifact.version) return false;
  }
  if (value.approval !== null && (!isRecord(value.approval) || value.approval.decision !== 'approved'
    || !hasStrings(value.approval, ['id', 'actionId', 'decidedBy', 'decidedAt']) || !isRecord(value.action) || value.approval.actionId !== value.action.id)) return false;
  if (value.receipt !== null && (!isRecord(value.receipt) || !isQuizReceipt(value.receipt))) return false;
  if (value.receipt !== null && value.stage !== 'evidence_mismatch' && (!isRecord(value.action) || !isRecord(value.approval)
    || value.receipt.actionId !== value.action.id || value.receipt.approvalId !== value.approval.id || value.receipt.idempotencyKey !== value.action.idempotencyKey)) return false;
  if (value.evaluation !== null) {
    if (!isRecord(value.evaluation) || !isRecord(value.artifact) || !isRecord(value.action) || !isRecord(value.approval) || !isRecord(value.receipt)
      || value.evaluation.runRef !== value.id || value.evaluation.contextSnapshotRef !== value.contextSnapshotId
      || !isObjectRef(value.evaluation.artifactRef)
      || value.evaluation.actionRef !== value.action.id || value.evaluation.approvalRef !== value.approval.id || value.evaluation.receiptRef !== value.receipt.id) return false;
    const evaluationArtifactRef = value.evaluation.artifactRef as Record<string, unknown>;
    if (evaluationArtifactRef.id !== value.artifact.id || evaluationArtifactRef.version !== value.artifact.version) return false;
  }

  const emptyEvidence = value.action === null && value.approval === null && value.receipt === null && value.evaluation === null;
  const stateRule = {
    needs_parameters: { commands: ['update-paper-brief', 'generate-paper'], recovery: 'complete-paper-parameters' },
    plan_ready: { commands: ['begin-generation'], recovery: 'start-or-revise-paper-plan' },
    generating: { commands: ['complete-generation'], recovery: 'wait-for-generation' },
    awaiting_paper_review: { commands: ['approve-paper'], recovery: 'review-and-approve-paper' },
    awaiting_activity_parameters: { commands: ['update-activity-settings', 'propose-draft'], recovery: 'complete-activity-parameters' },
    artifact_saved: { commands: ['open-personal-content'], recovery: null },
    awaiting_approval: { commands: ['approve-draft', 'update-activity-settings'], recovery: 'approve-or-revise-draft' },
    creating_draft: { commands: ['execute-draft'], recovery: 'execute-approved-draft' },
    draft_created: { commands: ['open-class-detail'], recovery: null },
    permission_denied: { commands: ['close-and-request-permission'], recovery: 'choose-another-target' },
    version_conflict: { commands: ['refresh-target'], recovery: 'compare-and-reconfirm' },
    recoverable_failure: { commands: ['retry-draft'], recovery: 'retry' },
    timeout: { commands: ['retry-draft'], recovery: 'retry' },
    evidence_mismatch: { commands: ['manual-review'], recovery: 'manual-review' },
  }[String(value.stage) as QuizActivityCreationRun['stage']];
  if (!stateRule || JSON.stringify(value.allowedCommands) !== JSON.stringify(stateRule.commands) || value.recovery !== stateRule.recovery) return false;
  if (['needs_parameters', 'plan_ready', 'generating'].includes(String(value.stage))) return value.artifact === null && value.paperReview === null && emptyEvidence;
  if (value.stage === 'awaiting_paper_review') return value.artifact !== null && value.paperReview === null && emptyEvidence;
  const reviewed = isQuizPaperReview(value.paperReview, value.artifact);
  if (value.stage === 'awaiting_activity_parameters') return value.artifact !== null && reviewed && emptyEvidence;
  if (value.stage === 'artifact_saved') return value.artifact !== null && reviewed && emptyEvidence;
  if (value.stage === 'awaiting_approval') return value.artifact !== null && reviewed && isRecord(value.action) && value.action.status === 'proposed' && value.approval === null && value.receipt === null && value.evaluation === null;
  if (value.stage === 'creating_draft') return value.artifact !== null && reviewed && isRecord(value.action) && value.action.status === 'approved' && isRecord(value.approval) && value.receipt === null && value.evaluation === null;
  if (value.stage === 'draft_created') return value.artifact !== null && reviewed && isRecord(value.action) && value.action.status === 'approved' && isRecord(value.approval) && isRecord(value.receipt) && value.receipt.status === 'success' && isRecord(value.evaluation);
  if (value.stage === 'evidence_mismatch') return value.artifact !== null && reviewed && isRecord(value.action) && isRecord(value.approval) && isRecord(value.receipt) && value.receipt.status === 'evidence_mismatch' && value.evaluation === null;
  if (['permission_denied', 'version_conflict', 'recoverable_failure', 'timeout'].includes(String(value.stage))) return value.artifact !== null && reviewed && isRecord(value.action) && value.action.status === 'approved' && isRecord(value.approval) && isRecord(value.receipt) && value.receipt.status === value.stage && isRecord(value.evaluation);
  return false;
}

function isWorkspaceSession(value: unknown): value is WorkBuddyWorkspaceSession {
  if (!isRecord(value) || value.version !== 3) return false;
  const shapeValid = isContextProposal(value.contextProposal)
    && isNullable(value.contextSnapshot, isContextSnapshot)
    && isRecord(value.snapshotsById) && Object.values(value.snapshotsById).every(isContextSnapshot)
    && TASK_TYPES.has(String(value.taskType))
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
    && Array.isArray(value.packageActionHistory) && value.packageActionHistory.every(isPackageAction)
    && Array.isArray(value.packageApprovalHistory) && value.packageApprovalHistory.every(isPackageApproval)
    && ['success', 'partial_success', 'permission_denied', 'version_conflict', 'recoverable_failure', 'timeout'].includes(String(value.packageWritebackScenario))
    && ['navigator', 'approval', 'receipt', 'core_context', 'none'].includes(String(value.activePackagePanel))
    && (value.activePackageArtifactId === null || typeof value.activePackageArtifactId === 'string')
    && isNullable(value.quizRun, isQuizRun)
    && ['success', 'permission_denied', 'version_conflict', 'recoverable_failure', 'timeout'].includes(String(value.quizScenario))
    && typeof value.draftGoal === 'string';
  if (!shapeValid || !isRecord(value.snapshotsById)) return false;
  const snapshots = value.snapshotsById;
  if (Object.entries(snapshots).some(([id, snapshot]) => !isRecord(snapshot) || snapshot.id !== id)) return false;
  if (isRecord(value.contextSnapshot) && !isRecord(snapshots[String(value.contextSnapshot.id)])) return false;

  const coursewareRun = isRecord(value.coursewareRun) ? value.coursewareRun : null;
  const coursewareAction = isRecord(value.coursewareAction) ? value.coursewareAction : null;
  const coursewareApproval = isRecord(value.coursewareApproval) ? value.coursewareApproval : null;
  const coursewareReceipt = isRecord(value.coursewareReceipt) ? value.coursewareReceipt : null;
  if (coursewareRun && !isRecord(snapshots[String(coursewareRun.contextSnapshotId)])) return false;
  const coursewareArtifactRef = coursewareAction && isRecord(coursewareAction.artifactRef) ? coursewareAction.artifactRef : null;
  if (coursewareAction && (!coursewareRun || coursewareAction.runRef !== coursewareRun.id || coursewareAction.contextSnapshotId !== coursewareRun.contextSnapshotId
    || !coursewareArtifactRef || !Array.isArray(coursewareRun.artifactHistory)
    || !coursewareRun.artifactHistory.some((artifact: unknown) => isRecord(artifact) && artifact.id === coursewareArtifactRef.id && artifact.version === coursewareArtifactRef.version))) return false;
  if (coursewareApproval && (!coursewareAction || coursewareApproval.actionId !== coursewareAction.id)) return false;
  if (coursewareReceipt && (!coursewareAction || !coursewareApproval || coursewareReceipt.actionId !== coursewareAction.id || coursewareReceipt.approvalId !== coursewareApproval.id)) return false;

  const packageRun = isRecord(value.packageRun) ? value.packageRun : null;
  const packageAction = isRecord(value.packageAction) ? value.packageAction : null;
  const packageApproval = isRecord(value.packageApproval) ? value.packageApproval : null;
  const packageReceipt = isRecord(value.packageReceipt) ? value.packageReceipt : null;
  const packageReceiptHistory = Array.isArray(value.packageReceiptHistory) ? value.packageReceiptHistory : [];
  const packageActionHistory = Array.isArray(value.packageActionHistory) ? value.packageActionHistory : [];
  const packageApprovalHistory = Array.isArray(value.packageApprovalHistory) ? value.packageApprovalHistory : [];
  if (packageRun && typeof packageRun.contextSnapshotId === 'string' && !isRecord(snapshots[packageRun.contextSnapshotId])) return false;
  if (packageAction && (!packageRun || packageAction.runRef !== packageRun.id || packageAction.contextSnapshotId !== packageRun.contextSnapshotId
    || !Array.isArray(packageAction.artifactRefs) || !Array.isArray(packageRun.artifacts)
    || !packageAction.artifactRefs.every((ref) => isRecord(ref) && (packageRun.artifacts as unknown[]).some((artifact: unknown) => isRecord(artifact) && artifact.id === ref.id && artifact.version === ref.version)))) return false;
  if (packageApproval && (!packageAction || packageApproval.actionId !== packageAction.id)) return false;
  if (packageActionHistory.some((historicalAction) => !isRecord(historicalAction) || !packageRun
    || historicalAction.runRef !== packageRun.id || historicalAction.contextSnapshotId !== packageRun.contextSnapshotId)) return false;
  if (packageApprovalHistory.some((historicalApproval) => !isRecord(historicalApproval)
    || !packageActionHistory.some((historicalAction) => isRecord(historicalAction) && historicalAction.id === historicalApproval.actionId))) return false;
  if (packageReceiptHistory.some((historicalReceipt) => !isRecord(historicalReceipt)
    || !packageActionHistory.some((historicalAction) => isRecord(historicalAction) && historicalAction.id === historicalReceipt.actionId)
    || !packageApprovalHistory.some((historicalApproval) => isRecord(historicalApproval) && historicalApproval.id === historicalReceipt.approvalId))) return false;
  if (packageReceipt) {
    const matchesCurrent = packageAction && packageApproval
      && packageReceipt.actionId === packageAction.id && packageReceipt.approvalId === packageApproval.id;
    const matchesHistory = packageActionHistory.some((historicalAction) => isRecord(historicalAction) && historicalAction.id === packageReceipt.actionId)
      && packageApprovalHistory.some((historicalApproval) => isRecord(historicalApproval) && historicalApproval.id === packageReceipt.approvalId);
    if (!matchesCurrent && !matchesHistory) return false;
  }
  if (packageReceiptHistory.length && (!packageRun || !Array.isArray(packageRun.artifacts))) return false;
  const packageArtifactIds = new Set(packageRun && Array.isArray(packageRun.artifacts)
    ? packageRun.artifacts.filter(isRecord).map((artifact) => String(artifact.id))
    : []);
  if (packageReceiptHistory.some((receipt) => !isRecord(receipt) || !Array.isArray(receipt.items)
    || receipt.items.some((item) => !isRecord(item) || !packageArtifactIds.has(String(item.artifactId))))) return false;
  if (typeof value.activePackageArtifactId === 'string' && (!packageRun || !Array.isArray(packageRun.artifacts) || !packageRun.artifacts.some((artifact) => isRecord(artifact) && artifact.id === value.activePackageArtifactId))) return false;
  if (isRecord(value.quizRun)) {
    const snapshot = snapshots[String(value.quizRun.contextSnapshotId)];
    if (!isRecord(snapshot) || snapshot.taskType !== 'quiz-activity-creation' || !Array.isArray(snapshot.items) || !isRecord(value.quizRun.target)) return false;
    const quizTarget = value.quizRun.target;
    const classItem = snapshot.items.find((item) => isRecord(item) && item.id === quizTarget.classId);
    const courseItem = snapshot.items.find((item) => isRecord(item) && item.id === quizTarget.courseId);
    const unitItem = snapshot.items.find((item) => isRecord(item) && item.id === quizTarget.unitId);
    if (!isRecord(classItem) || !isRecord(courseItem) || !isRecord(unitItem)
      || courseItem.parentId !== classItem.id || unitItem.parentId !== courseItem.id
      || unitItem.sourceVersion !== value.quizRun.target.expectedVersion) return false;
  }
  return true;
}

export function loadWorkBuddyWorkspaceSession(namespace = 'ideal-full'): WorkBuddyWorkspaceSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(storageKey(namespace)) ?? 'null');
    return isWorkspaceSession(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveWorkBuddyWorkspaceSession(session: WorkBuddyWorkspaceSession, namespace = 'ideal-full'): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(storageKey(namespace), JSON.stringify(session));
}

export function clearWorkBuddyWorkspaceSession(namespace = 'ideal-full'): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(storageKey(namespace));
}
