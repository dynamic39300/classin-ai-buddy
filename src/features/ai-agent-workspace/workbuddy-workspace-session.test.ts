import { beforeEach, describe, expect, it } from 'vitest';
import { beginPackageGeneration, completePackageGeneration, createCoursePackageRun } from '@domain/workbuddy/course-package';
import { WORKBUDDY_COURSE_PACKAGE_DEFINITION } from '@mocks/scenarios/workbuddy-course-production';
import { WORKBUDDY_QUIZ_PAPER } from '@mocks/scenarios/workbuddy-quiz-activity';
import { QuizActivityCreationModule } from '@domain/workbuddy/quiz-activity-creation';
import { loadWorkBuddyWorkspaceSession } from './workbuddy-workspace-session';
import { loadTeacherInDraftReceipts, saveTeacherInDraftReceipts } from './teacherin-draft-session';

const STORAGE_KEY = 'workbuddy:workspace-session:v3';

function validSession() {
  const teacher = {
    id: 'teacher-1', section: 'actor_organization', kind: 'teacher', label: '王老师', source: 'classin',
    sourceVersion: 'actor-v1', permission: 'read', sensitivity: 'organization', selection: 'locked', included: true,
  };
  return {
    version: 3,
    contextProposal: { taskType: 'single-courseware', status: 'needs_attention', items: [teacher] },
    contextSnapshot: null,
    snapshotsById: {},
    taskType: 'single-courseware',
    coursewareRun: null,
    coursewareAction: null,
    coursewareApproval: null,
    coursewareReceipt: null,
    writebackScenario: 'success',
    activeCoursewarePanel: 'none',
    packageRun: null,
    packageAction: null,
    packageApproval: null,
    packageReceipt: null,
    packageReceiptHistory: [],
    packageActionHistory: [],
    packageApprovalHistory: [],
    packageWritebackScenario: 'success',
    activePackagePanel: 'none',
    activePackageArtifactId: null,
    quizRun: null,
    quizScenario: 'success',
    draftGoal: '',
  };
}

describe('WorkBuddy workspace session boundary', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('accepts a structurally valid empty workspace session', () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validSession()));
    expect(loadWorkBuddyWorkspaceSession()).toMatchObject({ version: 3, taskType: 'single-courseware' });
  });

  it('restores a standalone workspace whose ClassIn package writeback requires connection', () => {
    const session = { ...validSession(), writebackScenario: 'permission_denied', packageWritebackScenario: 'permission_denied' };
    window.sessionStorage.setItem(`${STORAGE_KEY}:standalone-teacher`, JSON.stringify(session));
    expect(loadWorkBuddyWorkspaceSession('standalone-teacher')).toMatchObject({
      writebackScenario: 'permission_denied',
      packageWritebackScenario: 'permission_denied',
    });
  });

  it('never falls back across ideal and MVP workspace namespaces', () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...validSession(), draftGoal: '终局任务' }));
    window.sessionStorage.setItem(`${STORAGE_KEY}:classin-mvp`, JSON.stringify({ ...validSession(), draftGoal: 'MVP 任务' }));

    expect(loadWorkBuddyWorkspaceSession('ideal-full')?.draftGoal).toBe('终局任务');
    expect(loadWorkBuddyWorkspaceSession('classin-mvp')?.draftGoal).toBe('MVP 任务');
    expect(loadWorkBuddyWorkspaceSession('unknown-profile')).toBeNull();
  });

  it('fails closed when a nested Context item is malformed', () => {
    const session = validSession();
    session.contextProposal.items[0]!.permission = 'write';
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(loadWorkBuddyWorkspaceSession()).toBeNull();
  });

  it('fails closed when a discriminated execution Receipt is incomplete', () => {
    const session = { ...validSession(), coursewareReceipt: {
      id: 'receipt-1', actionId: 'action-1', approvalId: 'approval-1', idempotencyKey: 'key-1', executedAt: '2026-08-21T10:00:00+08:00',
      truthLabel: '[模拟]', result: '版本冲突', status: 'version_conflict', recovery: 'compare-and-reconfirm', unexecutedTarget: 'unit-1',
    } };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(loadWorkBuddyWorkspaceSession()).toBeNull();
  });

  it('fails closed when a stored Snapshot key does not match its object identity', () => {
    const session = validSession();
    const snapshot = {
      id: 'context-snapshot-1',
      version: 'workbuddy-m4-context-v1',
      taskType: 'single-courseware',
      confirmedAt: '2026-08-21T10:00:00+08:00',
      items: session.contextProposal.items,
    };
    Object.assign(session, { contextSnapshot: snapshot, snapshotsById: { 'wrong-snapshot-key': snapshot } });
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(loadWorkBuddyWorkspaceSession()).toBeNull();
  });

  it('fails closed when a historical package Receipt references an artifact outside its Run', () => {
    const session = validSession();
    const snapshot = {
      id: 'context-package-1', version: 'workbuddy-m4-context-v1', taskType: 'course-package',
      confirmedAt: '2026-08-21T10:00:00+08:00', items: session.contextProposal.items,
    };
    const packageRun = completePackageGeneration(beginPackageGeneration(createCoursePackageRun(
      WORKBUDDY_COURSE_PACKAGE_DEFINITION, '生成函数单调性课程方案包', snapshot.id,
    )), []);
    const unrelatedReceipt = {
      id: 'receipt-package-foreign', actionId: 'action-package-old', approvalId: 'approval-package-old',
      idempotencyKey: 'package-old-key', truthLabel: '[模拟]课程方案包执行回执', result: '历史执行成功', status: 'success',
      items: [{ artifactId: 'foreign-artifact', result: 'succeeded', objectId: 'foreign-object' }],
    };
    Object.assign(session, { snapshotsById: { [snapshot.id]: snapshot }, packageRun, packageReceiptHistory: [unrelatedReceipt] });
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(loadWorkBuddyWorkspaceSession()).toBeNull();
  });

  it('restores a quiz Run by stable Run and ContextSnapshot identity', () => {
    const session = validSession();
    const classItem = { ...session.contextProposal.items[0]!, id: 'physics-3', kind: 'class', label: '高二物理 3 班', sourceVersion: 'class-v1', selection: 'suggested' };
    const courseItem = { ...classItem, id: 'course-momentum', parentId: classItem.id, kind: 'course', label: '动量与碰撞', sourceVersion: 'course-v1' };
    const unitItem = { ...classItem, id: 'unit-momentum-1', parentId: courseItem.id, kind: 'unit', label: '第一单元 受力与动量', sourceVersion: 'unit-momentum-1-v1' };
    const snapshot = { id: 'context-quiz-1', version: 'workbuddy-m4-context-v1', taskType: 'quiz-activity-creation', confirmedAt: '2026-08-24T17:40:00+08:00', items: [classItem, courseItem, unitItem] };
    const created = QuizActivityCreationModule.create({
      runId: 'run-quiz-activity-1', contextSnapshotId: snapshot.id, goal: '生成动量守恒诊断测验',
      target: { classId: classItem.id, courseId: courseItem.id, unitId: unitItem.id, expectedVersion: unitItem.sourceVersion, label: '高二物理 3 班 / 动量与碰撞 / 第一单元 受力与动量' },
      now: '2026-08-24T17:40:00+08:00',
    });
    const quizRun = QuizActivityCreationModule.generatePaper(QuizActivityCreationModule.beginGeneration(QuizActivityCreationModule.confirmPaperBrief(created)), WORKBUDDY_QUIZ_PAPER);
    Object.assign(session, { taskType: 'quiz-activity-creation', contextProposal: { taskType: 'quiz-activity-creation', status: 'ready_to_confirm', items: snapshot.items }, contextSnapshot: snapshot, snapshotsById: { [snapshot.id]: snapshot }, quizRun });
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(loadWorkBuddyWorkspaceSession()?.quizRun).toMatchObject({ id: 'run-quiz-activity-1', stage: 'awaiting_paper_review', paperReview: null });

    const reviewedRun = QuizActivityCreationModule.approvePaper(quizRun, { teacherId: 'teacher-wang', reviewedAt: '2026-08-24T17:44:00+08:00' });
    Object.assign(session, { quizRun: reviewedRun });
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(loadWorkBuddyWorkspaceSession()?.quizRun).toMatchObject({ stage: 'awaiting_activity_parameters', paperReview: { status: 'approved', artifactRef: { id: reviewedRun.artifact?.id, version: 'v1' } } });

    const artifactSavedRun = QuizActivityCreationModule.recordArtifactSaved(reviewedRun);
    Object.assign(session, { quizRun: artifactSavedRun });
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(loadWorkBuddyWorkspaceSession()?.quizRun).toMatchObject({ stage: 'artifact_saved', allowedCommands: ['open-personal-content'], recovery: null });

    Object.assign(session, { quizRun: { ...reviewedRun, paperReview: { ...reviewedRun.paperReview, artifactRef: { id: 'artifact-from-another-run', version: 'v1' } } } });
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(loadWorkBuddyWorkspaceSession()).toBeNull();
  });

  it('fails closed when a quiz stage claims completion without its evidence chain', () => {
    const session = validSession();
    const classItem = { ...session.contextProposal.items[0]!, id: 'physics-3', kind: 'class', sourceVersion: 'class-v1' };
    const courseItem = { ...classItem, id: 'course-momentum', parentId: classItem.id, kind: 'course', sourceVersion: 'course-v1' };
    const unitItem = { ...classItem, id: 'unit-momentum-1', parentId: courseItem.id, kind: 'unit', sourceVersion: 'unit-v1' };
    const snapshot = { id: 'context-quiz-invalid', version: 'workbuddy-m4-context-v1', taskType: 'quiz-activity-creation', confirmedAt: '2026-08-24T17:40:00+08:00', items: [classItem, courseItem, unitItem] };
    const run = QuizActivityCreationModule.create({ runId: 'run-invalid', contextSnapshotId: snapshot.id, goal: '生成测验', target: { classId: classItem.id, courseId: courseItem.id, unitId: unitItem.id, expectedVersion: unitItem.sourceVersion, label: '目标' }, now: snapshot.confirmedAt });
    Object.assign(session, { taskType: 'quiz-activity-creation', contextProposal: { taskType: 'quiz-activity-creation', status: 'ready_to_confirm', items: snapshot.items }, contextSnapshot: snapshot, snapshotsById: { [snapshot.id]: snapshot }, quizRun: { ...run, stage: 'draft_created' } });
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(loadWorkBuddyWorkspaceSession()).toBeNull();
  });

  it('persists a valid TeacherIn draft receipt outside the main Run session', () => {
    const receipt = {
      id: 'receipt-teacherin-1', actionId: 'action-teacherin-1', approvalId: 'approval-teacherin-1',
      idempotencyKey: 'teacherin-draft:artifact-1:v1', executedAt: '2026-08-22T10:10:00+08:00',
      truthLabel: '[模拟] TeacherIn 草稿执行回执' as const, result: '已创建草稿', status: 'success' as const,
      draft: {
        id: 'draft-1', status: 'draft' as const, title: '函数单调性课件', createdAt: '2026-08-22T10:10:00+08:00',
        editorPath: '/teacher/space/teacherin?draft=draft-1',
        sourceArtifactRef: { id: 'artifact-1', version: 'v1' },
        sourceSpaceFileRef: { id: 'space-file-1', version: 'v1', pathLabel: '我的云盘 / TeachBuddy 产物' },
      },
    };
    saveTeacherInDraftReceipts({ 'artifact-1': receipt });
    expect(loadTeacherInDraftReceipts()).toEqual({ 'artifact-1': receipt });
    expect(loadTeacherInDraftReceipts('classin-mvp')).toEqual({});
    saveTeacherInDraftReceipts({ 'artifact-1': receipt }, 'classin-mvp');
    expect(loadTeacherInDraftReceipts('classin-mvp')).toEqual({ 'artifact-1': receipt });
  });

  it('fails closed for a malformed TeacherIn draft receipt', () => {
    window.sessionStorage.setItem('workbuddy:teacherin-draft-receipts:v1', JSON.stringify({
      'artifact-1': { status: 'success', truthLabel: '[模拟] TeacherIn 草稿执行回执' },
    }));
    expect(loadTeacherInDraftReceipts()).toEqual({});
  });
});
