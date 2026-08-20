import type { Dispatch, SetStateAction } from 'react';
import type { ClassInWritebackAdapter, WritebackScenario, WritebackScenarioController } from '@contracts/workbuddy/classin-writeback';
import type { WorkBuddyClock } from '@contracts/workbuddy/clock';
import type { WorkBuddyRuntimeFixture } from '@contracts/workbuddy/runtime-fixture';
import { addMinutesToTimestamp } from '@domain/workbuddy/action-time';
import {
  confirmContext, createContextProposal, selectContextItems,
  type ContextProposal, type ContextSnapshot, type CoreContextItem,
} from '@domain/workbuddy/core-context';
import {
  approveCoursewareArtifact, confirmCoursewareBrief, createSingleCoursewareRun, executeCoursewarePlan, replanCoursewareRun,
  reviseCoursewareBrief, updateCoursewareBrief,
  type CoursewareBrief, type CoursewareExecutionOutput, type CoursewareRunDefinition, type SingleCoursewareRun,
} from '@domain/workbuddy/course-production';
import {
  approveAction, createCoursewareSaveAction, expireAction, rejectAction, renewCoursewareSaveAction,
  type Approval, type CoursewareSaveActionInput, type ExecutionReceipt, type ProposedAction,
} from '@domain/workbuddy/writeback';
import type { CoursewarePanel, WorkBuddyCourseware } from './workbuddy-workspace';

type CoursewareControllerParams = Readonly<{
  contextSnapshot: ContextSnapshot | null;
  initialContextItems: readonly CoreContextItem[];
  coursewareDefinition: CoursewareRunDefinition;
  coursewareOutput: CoursewareExecutionOutput;
  replannedCoursewareOutput: CoursewareExecutionOutput;
  coursewareActionInput: CoursewareSaveActionInput;
  runtimeFixture: WorkBuddyRuntimeFixture;
  clock: WorkBuddyClock;
  writebackAdapter: ClassInWritebackAdapter;
  writebackScenarioController: WritebackScenarioController;
  run: SingleCoursewareRun | null;
  action: ProposedAction | null;
  approval: Approval | null;
  receipt: ExecutionReceipt | null;
  writebackScenario: WritebackScenario;
  activePanel: CoursewarePanel;
  setRun: Dispatch<SetStateAction<SingleCoursewareRun | null>>;
  setAction: Dispatch<SetStateAction<ProposedAction | null>>;
  setApproval: Dispatch<SetStateAction<Approval | null>>;
  setReceipt: Dispatch<SetStateAction<ExecutionReceipt | null>>;
  setWritebackScenario: Dispatch<SetStateAction<WritebackScenario>>;
  setActivePanel: Dispatch<SetStateAction<CoursewarePanel>>;
  setContextSnapshot: Dispatch<SetStateAction<ContextSnapshot | null>>;
  setContextProposal: Dispatch<SetStateAction<ContextProposal>>;
  setSnapshotsById: Dispatch<SetStateAction<Readonly<Record<string, ContextSnapshot>>>>;
}>;

export type WorkBuddyCoursewareController = Readonly<{
  run: SingleCoursewareRun | null;
  action: ProposedAction | null;
  receipt: ExecutionReceipt | null;
  reset: () => void;
  commands: Omit<WorkBuddyCourseware, 'coursewareView'>;
}>;

export function createWorkBuddyCoursewareController(params: CoursewareControllerParams): WorkBuddyCoursewareController {
  const {
    contextSnapshot, initialContextItems, coursewareDefinition, coursewareOutput, replannedCoursewareOutput, coursewareActionInput,
    runtimeFixture, clock, writebackAdapter, writebackScenarioController, run, action, approval, receipt, writebackScenario, activePanel,
    setRun, setAction, setApproval, setReceipt, setWritebackScenario, setActivePanel, setContextSnapshot, setContextProposal, setSnapshotsById,
  } = params;
  const clearWriteback = () => { setAction(null); setApproval(null); setReceipt(null); };

  return Object.freeze({
    run,
    action,
    receipt,
    reset: () => {
      setRun(null); clearWriteback(); setActivePanel('none');
      writebackScenarioController.setScenario('success'); setWritebackScenario('success');
    },
    commands: Object.freeze({
      createCoursewareTask: (goal: string) => {
        if (!contextSnapshot || !goal.trim()) return null;
        const next = createSingleCoursewareRun(coursewareDefinition, goal, contextSnapshot.id);
        setRun(next); clearWriteback();
        setSnapshotsById((current) => ({ ...current, [contextSnapshot.id]: contextSnapshot }));
        return next.id;
      },
      updateCoursewareTaskBrief: (patch: Partial<CoursewareBrief>) => setRun((current) => current ? updateCoursewareBrief(current, patch) : current),
      confirmCoursewareTaskBrief: () => setRun((current) => current ? confirmCoursewareBrief(current) : current),
      reviseCoursewareTaskBrief: () => setRun((current) => current ? reviseCoursewareBrief(current) : current),
      executeCoursewareTaskPlan: () => setRun((current) => current
        ? executeCoursewarePlan(current, current.revision > 1 ? replannedCoursewareOutput : coursewareOutput)
        : current),
      approveCoursewareArtifact: () => setRun((current) => current ? approveCoursewareArtifact(current) : current),
      proposeCoursewareSave: () => {
        if (!run?.artifact || run.reviewStatus !== 'approved') return;
        const next = action?.status === 'expired'
          ? renewCoursewareSaveAction(action, {
            id: runtimeFixture.expirationRecovery.coursewareActionId,
            idempotencyKey: runtimeFixture.expirationRecovery.coursewareIdempotencyKey,
            expiresAt: addMinutesToTimestamp(clock.now(), runtimeFixture.expirationRecovery.ttlMinutes),
          })
          : createCoursewareSaveAction({
            ...coursewareActionInput,
            id: run.revision > 1 ? runtimeFixture.replan.actionId : coursewareActionInput.id,
            idempotencyKey: run.revision > 1 ? runtimeFixture.replan.idempotencyKey : coursewareActionInput.idempotencyKey,
            runRef: run.id, contextSnapshotId: run.contextSnapshotId,
            artifactId: run.artifact.id, artifactVersion: run.artifact.version,
            target: run.revision > 1 ? runtimeFixture.replan.target : coursewareActionInput.target,
          });
        setAction(next); setApproval(null); setReceipt(null);
      },
      approveCoursewareSave: () => {
        if (!action) return;
        const checkedAction = expireAction(action, clock.now());
        if (checkedAction.status === 'expired') { setAction(checkedAction); setApproval(null); return; }
        const approvalId = action.id === runtimeFixture.coursewareRecovery.actionId
          ? runtimeFixture.coursewareRecovery.approvalId
          : action.id === runtimeFixture.expirationRecovery.coursewareActionId ? runtimeFixture.expirationRecovery.coursewareApprovalId
          : run && run.revision > 1 ? runtimeFixture.replan.approvalId : runtimeFixture.approval.coursewareApproveId;
        const result = approveAction(checkedAction, approvalId, clock.now(), runtimeFixture.approval.actorId);
        if (result) { setAction(result.action); setApproval(result.approval); }
      },
      rejectCoursewareSave: () => {
        if (!action) return;
        const checkedAction = expireAction(action, clock.now());
        if (checkedAction.status === 'expired') { setAction(checkedAction); setApproval(null); return; }
        const result = rejectAction(checkedAction, runtimeFixture.approval.coursewareRejectId, clock.now(), runtimeFixture.approval.actorId);
        if (result) { setAction(result.action); setApproval(result.approval); }
      },
      executeApprovedCoursewareSave: () => {
        if (!run?.artifact || !action || !approval) return;
        const checkedAction = expireAction(action, clock.now());
        if (checkedAction.status === 'expired') { setAction(checkedAction); setApproval(null); setReceipt(null); setActivePanel('action'); return; }
        if (checkedAction.runRef !== run.id || checkedAction.contextSnapshotId !== run.contextSnapshotId
          || checkedAction.artifactRef.id !== run.artifact.id || checkedAction.artifactRef.version !== run.artifact.version
          || approval.actionId !== checkedAction.id) return;
        setReceipt(writebackAdapter.execute(checkedAction, approval));
      },
      recoverCoursewareSave: () => {
        if (!run?.artifact || !receipt || receipt.status === 'success') return;
        const previousTarget = action?.target ?? (run.revision > 1 ? runtimeFixture.replan.target : coursewareActionInput.target);
        const target = receipt.status === 'permission_denied'
          ? { ...previousTarget, ...runtimeFixture.coursewareRecovery.fallbackTarget }
          : { ...previousTarget, expectedVersion: receipt.status === 'version_conflict' ? receipt.currentVersion : previousTarget.expectedVersion };
        if (receipt.status === 'permission_denied') {
          writebackScenarioController.setScenario('success'); setWritebackScenario('success');
        }
        setAction(createCoursewareSaveAction({
          ...coursewareActionInput, id: runtimeFixture.coursewareRecovery.actionId, idempotencyKey: runtimeFixture.coursewareRecovery.idempotencyKey,
          runRef: run.id, contextSnapshotId: run.contextSnapshotId,
          artifactId: run.artifact.id, artifactVersion: run.artifact.version, target,
        }));
        setApproval(null); setReceipt(null); setActivePanel('action');
      },
      writebackScenario,
      setWritebackScenario: (scenario: WritebackScenario) => {
        writebackScenarioController.setScenario(scenario); setWritebackScenario(scenario); clearWriteback();
      },
      activePanel,
      setActivePanel,
      replanScope: Object.freeze({ previousLabel: runtimeFixture.replan.previousScopeLabel, nextLabel: runtimeFixture.replan.nextScopeLabel }),
      replanToWaveContext: () => {
        if (!run || run.revision > 1) return;
        const proposal = selectContextItems(createContextProposal(initialContextItems, 'single-courseware'), runtimeFixture.replan.selectedContextItemIds);
        const result = confirmContext(proposal, { snapshotId: runtimeFixture.snapshot.replannedCoursewareId, confirmedAt: runtimeFixture.snapshot.replannedAt });
        if (!result.ok) return;
        const nextPlan = run.plan.map((step) => Object.freeze({ ...step, id: `${step.id}-r${run.revision + 1}`, expectedOutput: `机械波主题 · ${step.expectedOutput}` }));
        const next = replanCoursewareRun(
          run, result.snapshot.id, runtimeFixture.replan.reason,
          { title: runtimeFixture.replan.title, goal: runtimeFixture.replan.goal, plan: nextPlan },
          { action: action ?? undefined, receipt: receipt ?? undefined },
        );
        setSnapshotsById((current) => ({ ...current, [result.snapshot.id]: result.snapshot }));
        setContextSnapshot(result.snapshot); setContextProposal(proposal); setRun(next);
        clearWriteback(); setActivePanel('none');
      },
    }),
  });
}
