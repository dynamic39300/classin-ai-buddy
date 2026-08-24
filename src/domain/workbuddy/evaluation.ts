export type EvaluationOutcome = 'adopted' | 'not_adopted';

export type EvaluationEvent = Readonly<{
  id: string;
  runRef: string;
  contextSnapshotRef: string;
  artifactRef: Readonly<{ id: string; version: string }>;
  actionRef: string;
  approvalRef: string;
  receiptRef: string;
  signal: Readonly<{
    type: 'artifact_adoption';
    outcome: EvaluationOutcome;
    executionStatus: string;
  }>;
  observedAt: string;
  evaluator: 'workbuddy-system';
  truthLabel: '[模拟] WorkBuddy 评价事件';
}>;

type ActionEvidence = Readonly<{
  id: string;
  runRef: string;
  contextSnapshotId: string;
  artifactRef?: Readonly<{ id: string; version: string | number }>;
  artifactRefs?: readonly Readonly<{ id: string; version: string | number }>[];
  draftRef?: Readonly<{ id: string; version: string | number }>;
}>;

type ApprovalEvidence = Readonly<{
  id: string;
  actionId: string;
  decision: 'approved' | 'rejected';
}>;

type ReceiptEvidence = Readonly<{
  id: string;
  actionId: string;
  approvalId: string;
  status: string;
  executedAt: string;
  items?: readonly Readonly<{ artifactId: string; result: string }>[];
}>;

export type RecordExecutionOutcomeInput = Readonly<{
  runRef: string;
  contextSnapshotRef: string;
  artifactRef: Readonly<{ id: string; version: string }>;
  action: ActionEvidence;
  approval: ApprovalEvidence;
  receipt: ReceiptEvidence;
}>;

function actionArtifactRefs(action: ActionEvidence): readonly Readonly<{ id: string; version: string }>[] {
  const refs = action.artifactRefs ?? (action.artifactRef ? [action.artifactRef] : action.draftRef ? [action.draftRef] : []);
  return refs.map(({ id, version }) => Object.freeze({ id, version: String(version).startsWith('v') ? String(version) : `v${version}` }));
}

function recordExecutionOutcome(input: RecordExecutionOutcomeInput): EvaluationEvent | null {
  const artifactMatches = actionArtifactRefs(input.action)
    .some(({ id, version }) => id === input.artifactRef.id && version === input.artifactRef.version);
  if (
    input.action.runRef !== input.runRef
    || input.action.contextSnapshotId !== input.contextSnapshotRef
    || !artifactMatches
    || input.approval.actionId !== input.action.id
    || input.approval.decision !== 'approved'
    || input.receipt.actionId !== input.action.id
    || input.receipt.approvalId !== input.approval.id
  ) return null;
  const receiptItem = input.receipt.items?.find(({ artifactId }) => artifactId === input.artifactRef.id);
  if (input.receipt.items && !receiptItem) return null;
  const executionStatus = receiptItem?.result ?? input.receipt.status;
  const adopted = executionStatus === 'success' || executionStatus === 'succeeded';
  return Object.freeze({
    id: `evaluation-${input.receipt.id}-${input.artifactRef.id}-${executionStatus}`,
    runRef: input.runRef,
    contextSnapshotRef: input.contextSnapshotRef,
    artifactRef: Object.freeze({ ...input.artifactRef }),
    actionRef: input.action.id,
    approvalRef: input.approval.id,
    receiptRef: input.receipt.id,
    signal: Object.freeze({
      type: 'artifact_adoption' as const,
      outcome: adopted ? 'adopted' as const : 'not_adopted' as const,
      executionStatus,
    }),
    observedAt: input.receipt.executedAt,
    evaluator: 'workbuddy-system' as const,
    truthLabel: '[模拟] WorkBuddy 评价事件' as const,
  });
}

export const EvaluationModule = Object.freeze({ recordExecutionOutcome });
