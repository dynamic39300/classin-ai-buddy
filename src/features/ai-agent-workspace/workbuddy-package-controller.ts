import type { Dispatch, SetStateAction } from 'react';
import type { WorkBuddyClock } from '@contracts/workbuddy/clock';
import type { PackageWritebackAdapter, PackageWritebackScenario, PackageWritebackScenarioController } from '@contracts/workbuddy/package-writeback';
import type { WorkBuddyRuntimeFixture } from '@contracts/workbuddy/runtime-fixture';
import { addMinutesToTimestamp } from '@domain/workbuddy/action-time';
import {
  createContextProposal, selectContextItems,
  type ContextProposal, type ContextSnapshot, type CoreContextItem, type WorkBuddyTaskType,
} from '@domain/workbuddy/core-context';
import type { SingleCoursewareRun } from '@domain/workbuddy/course-production';
import {
  applyPackageExecutionReceipt, attachPackageContext, beginPackageGeneration, completePackageGeneration, createCoursePackageRun,
  markPackageArtifactsApproved, reopenPackageArtifacts, retryPackageArtifact, setPackageArtifactIncluded,
  type CoursePackageDefinition, type CoursePackageRun, type PackageExecutionReceipt,
} from '@domain/workbuddy/course-package';
import {
  createPackageSaveAction, decidePackageAction, expirePackageAction, renewPackageSaveAction,
  type PackageActionInput, type PackageApproval, type PackageProposedAction,
} from '@domain/workbuddy/package-writeback';
import type { PackagePanel, WorkBuddyCoursePackage } from './workbuddy-workspace';

type PackageControllerParams = Readonly<{
  contextSnapshot: ContextSnapshot | null;
  taskType: WorkBuddyTaskType;
  initialContextItems: readonly CoreContextItem[];
  packageDefinition: CoursePackageDefinition;
  packageActionInput: PackageActionInput;
  failedArtifactIds: readonly string[];
  runtimeFixture: WorkBuddyRuntimeFixture;
  clock: WorkBuddyClock;
  writebackAdapter: PackageWritebackAdapter;
  writebackScenarioController: PackageWritebackScenarioController;
  sourceCoursewareRun: SingleCoursewareRun | null;
  run: CoursePackageRun | null;
  action: PackageProposedAction | null;
  approval: PackageApproval | null;
  receipt: PackageExecutionReceipt | null;
  writebackScenario: PackageWritebackScenario;
  activePanel: PackagePanel;
  activeArtifactId: string | null;
  setRun: Dispatch<SetStateAction<CoursePackageRun | null>>;
  setAction: Dispatch<SetStateAction<PackageProposedAction | null>>;
  setApproval: Dispatch<SetStateAction<PackageApproval | null>>;
  setReceipt: Dispatch<SetStateAction<PackageExecutionReceipt | null>>;
  setReceiptHistory: Dispatch<SetStateAction<readonly PackageExecutionReceipt[]>>;
  setWritebackScenario: Dispatch<SetStateAction<PackageWritebackScenario>>;
  setActivePanel: Dispatch<SetStateAction<PackagePanel>>;
  setActiveArtifactId: Dispatch<SetStateAction<string | null>>;
  setTaskType: Dispatch<SetStateAction<WorkBuddyTaskType>>;
  setContextSnapshot: Dispatch<SetStateAction<ContextSnapshot | null>>;
  setContextProposal: Dispatch<SetStateAction<ContextProposal>>;
  setSnapshotsById: Dispatch<SetStateAction<Readonly<Record<string, ContextSnapshot>>>>;
}>;

export type WorkBuddyPackageController = Readonly<{
  run: CoursePackageRun | null;
  action: PackageProposedAction | null;
  receipt: PackageExecutionReceipt | null;
  attachContext: (snapshot: ContextSnapshot) => void;
  reset: () => void;
  commands: Omit<WorkBuddyCoursePackage, 'packageView'>;
}>;

export function createWorkBuddyPackageController(params: PackageControllerParams): WorkBuddyPackageController {
  const {
    contextSnapshot, taskType, initialContextItems, packageDefinition, packageActionInput, failedArtifactIds, runtimeFixture, clock,
    writebackAdapter, writebackScenarioController, sourceCoursewareRun, run, action, approval, receipt, writebackScenario,
    activePanel, activeArtifactId, setRun, setAction, setApproval, setReceipt, setReceiptHistory, setWritebackScenario, setActivePanel,
    setActiveArtifactId, setTaskType, setContextSnapshot, setContextProposal, setSnapshotsById,
  } = params;
  const clearWriteback = () => { setAction(null); setApproval(null); setReceipt(null); };

  return Object.freeze({
    run,
    action,
    receipt,
    attachContext: (snapshot) => {
      if (run?.stage !== 'awaiting_context') return;
      setSnapshotsById((current) => ({ ...current, [snapshot.id]: snapshot }));
      setRun(attachPackageContext(run, snapshot.id));
    },
    reset: () => {
      setRun(null); clearWriteback(); setReceiptHistory([]); setActivePanel('none'); setActiveArtifactId(null);
      writebackScenarioController.setScenario('success'); setWritebackScenario('success');
    },
    commands: Object.freeze({
      packageWritebackScenario: writebackScenario,
      setPackageWritebackScenario: (scenario: PackageWritebackScenario) => {
        writebackScenarioController.setScenario(scenario); setWritebackScenario(scenario); clearWriteback();
      },
      createPackageTask: (goal: string) => {
        if (!contextSnapshot || taskType !== 'course-package' || !goal.trim()) return null;
        const next = createCoursePackageRun(packageDefinition, goal, contextSnapshot.id);
        setRun(next); clearWriteback(); setReceiptHistory([]);
        writebackScenarioController.setScenario('success'); setWritebackScenario('success');
        setSnapshotsById((current) => ({ ...current, [contextSnapshot.id]: contextSnapshot }));
        return next.id;
      },
      beginPackageGeneration: () => setRun((current) => current ? beginPackageGeneration(current) : current),
      completePackageGeneration: () => setRun((current) => {
        if (!current) return current;
        const next = completePackageGeneration(current, failedArtifactIds);
        setActiveArtifactId(next.artifacts[0]?.id ?? null);
        return next;
      }),
      setPackageItemIncluded: (artifactId: string, included: boolean) => setRun((current) => {
        if (!current) return current;
        const next = setPackageArtifactIncluded(current, artifactId, included);
        if (action?.status === 'proposed') setAction(createPackageSaveAction(next, action));
        return next;
      }),
      proposePackageSave: () => {
        if (!run) return;
        const retrying = receipt?.status === 'partial_success';
        const actionRun = action?.status === 'expired' ? reopenPackageArtifacts(run) : run;
        const next = action?.status === 'expired'
          ? renewPackageSaveAction(actionRun, action, {
            id: runtimeFixture.expirationRecovery.packageActionId,
            idempotencyKey: runtimeFixture.expirationRecovery.packageIdempotencyKey,
            expiresAt: addMinutesToTimestamp(clock.now(), runtimeFixture.expirationRecovery.ttlMinutes),
          })
          : createPackageSaveAction(actionRun, retrying ? {
            ...packageActionInput,
            id: runtimeFixture.packageRecovery.retryActionId,
            idempotencyKey: runtimeFixture.packageRecovery.retryIdempotencyKey,
          } : packageActionInput);
        if (next) { setRun(actionRun); setAction(next); setApproval(null); setReceipt(null); }
      },
      approvePackageSave: () => {
        if (!action || !run) return;
        const checkedAction = expirePackageAction(action, clock.now());
        if (checkedAction.status === 'expired') { setAction(checkedAction); setApproval(null); return; }
        const approvalId = action.id === runtimeFixture.packageRecovery.retryActionId
          ? runtimeFixture.packageRecovery.retryApprovalId
          : action.id === runtimeFixture.expirationRecovery.packageActionId ? runtimeFixture.expirationRecovery.packageApprovalId
          : action.id === runtimeFixture.packageRecovery.actionId ? runtimeFixture.packageRecovery.approvalId : runtimeFixture.approval.packageApproveId;
        const result = decidePackageAction(checkedAction, { id: approvalId, decidedBy: runtimeFixture.approval.actorId, decidedAt: clock.now() }, 'approved');
        if (!result) return;
        setAction(result.action); setApproval(result.approval); setRun(markPackageArtifactsApproved(run, result.action.artifactRefs.map(({ id }) => id)));
      },
      rejectPackageSave: () => {
        if (!action) return;
        const checkedAction = expirePackageAction(action, clock.now());
        if (checkedAction.status === 'expired') { setAction(checkedAction); setApproval(null); return; }
        const result = decidePackageAction(checkedAction, { id: runtimeFixture.approval.packageRejectId, decidedBy: runtimeFixture.approval.actorId, decidedAt: clock.now() }, 'rejected');
        if (result) { setAction(result.action); setApproval(result.approval); }
      },
      executeApprovedPackageSave: () => {
        if (!run?.contextSnapshotId || !action || !approval) return;
        const checkedAction = expirePackageAction(action, clock.now());
        if (checkedAction.status === 'expired') { setAction(checkedAction); setApproval(null); setReceipt(null); setActivePanel('approval'); return; }
        if (checkedAction.runRef !== run.id || checkedAction.contextSnapshotId !== run.contextSnapshotId || approval.actionId !== checkedAction.id) return;
        const candidates = run.artifacts.map(({ id, kind, version, state }) => ({
          id, kind, version, runRef: run.id, contextSnapshotId: run.contextSnapshotId!,
          approvalState: state === 'approved' || state === 'written_back' || state === 'waiting' ? state : 'not_selected' as const,
        }));
        const nextReceipt = writebackAdapter.execute(checkedAction, approval, candidates);
        const application = applyPackageExecutionReceipt(run, checkedAction, approval, nextReceipt);
        if (!application.accepted) return;
        setReceipt(nextReceipt);
        setReceiptHistory((current) => current.some(({ id, actionId }) => id === nextReceipt.id && actionId === nextReceipt.actionId)
          ? current
          : Object.freeze([...current, nextReceipt]));
        setRun(application.run);
      },
      recoverPackageSave: () => {
        if (!run || !receipt || (receipt.status !== 'permission_denied' && receipt.status !== 'version_conflict')) return;
        const previousTarget = action?.target ?? packageActionInput.target;
        const target = receipt.status === 'permission_denied'
          ? { ...previousTarget, ...runtimeFixture.packageRecovery.fallbackTarget }
          : { ...previousTarget, expectedVersion: receipt.currentVersion };
        if (receipt.status === 'permission_denied') {
          writebackScenarioController.setScenario('success'); setWritebackScenario('success');
        }
        const reopened = reopenPackageArtifacts(run);
        const next = createPackageSaveAction(reopened, {
          ...packageActionInput, id: runtimeFixture.packageRecovery.actionId,
          idempotencyKey: runtimeFixture.packageRecovery.idempotencyKey, target,
        });
        if (next) { setRun(reopened); setAction(next); setApproval(null); setReceipt(null); setActivePanel('approval'); }
      },
      retryFailedPackageItems: () => {
        const retryingWriteback = receipt?.status === 'partial_success';
        setRun((current) => current
          ? current.artifacts
            .filter(({ state, allowedCommands }) => state === 'failed' && allowedCommands.includes('retry'))
            .reduce((next, artifact) => retryPackageArtifact(next, artifact.id), current)
          : current);
        if (retryingWriteback) {
          writebackScenarioController.setScenario('success'); setWritebackScenario('success');
        }
        setAction(null); setApproval(null);
        if (!retryingWriteback) setReceipt(null);
      },
      derivePackageFromCourseware: () => {
        if (!sourceCoursewareRun?.artifact || sourceCoursewareRun.reviewStatus !== 'approved') return null;
        const proposal = selectContextItems(createContextProposal(initialContextItems, 'course-package'), runtimeFixture.derivedPackage.recommendedContextItemIds);
        const next = createCoursePackageRun(packageDefinition, runtimeFixture.derivedPackage.goal, null, {
          parentRunRef: sourceCoursewareRun.id,
          sourceArtifactRef: Object.freeze({ id: sourceCoursewareRun.artifact.id, version: sourceCoursewareRun.artifact.version }),
        });
        setTaskType('course-package'); setContextSnapshot(null); setContextProposal(proposal);
        setRun(next); clearWriteback(); setReceiptHistory([]); setActivePanel('none');
        writebackScenarioController.setScenario('success'); setWritebackScenario('success');
        return next.id;
      },
      activePanel,
      setActivePanel,
      activePackageArtifactId: activeArtifactId,
      setActivePackageArtifactId: setActiveArtifactId,
    }),
  });
}
