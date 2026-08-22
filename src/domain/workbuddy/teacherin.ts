export type ArtifactObjectRef = Readonly<{
  id: string;
  version: string;
}>;

export type SpaceFileRef = Readonly<{
  id: string;
  version: string;
  pathLabel: string;
}>;

export type TeacherInResource = Readonly<{
  id: string;
  version: string;
  title: string;
  stage: string;
  subject: string;
  author: string;
  licenseLabel: string;
  permission: 'read' | 'restricted';
  sensitivity: 'public' | 'organization';
}>;

export type TeacherInDraftAction = Readonly<{
  id: string;
  kind: 'create-teacherin-draft';
  status: 'proposed' | 'approved';
  runRef: string;
  artifactRef: ArtifactObjectRef;
  spaceFileRef: SpaceFileRef;
  title: string;
  permission: 'allowed' | 'denied';
  idempotencyKey: string;
  proposedAt: string;
}>;

export type TeacherInDraftApproval = Readonly<{
  id: string;
  actionId: string;
  decision: 'approved';
  decidedBy: string;
  decidedAt: string;
}>;

export type TeacherInDraftLink = Readonly<{
  id: string;
  status: 'draft';
  title: string;
  sourceArtifactRef: ArtifactObjectRef;
  sourceSpaceFileRef: SpaceFileRef;
  createdAt: string;
  editorPath: string;
}>;

type TeacherInDraftReceiptBase = Readonly<{
  id: string;
  actionId: string;
  approvalId: string;
  idempotencyKey: string;
  executedAt: string;
  truthLabel: '[模拟] TeacherIn 草稿执行回执';
  result: string;
}>;

export type TeacherInDraftReceipt =
  | TeacherInDraftReceiptBase & Readonly<{
    status: 'success';
    draft: TeacherInDraftLink;
  }>
  | TeacherInDraftReceiptBase & Readonly<{
    status: 'permission_denied';
    recovery: 'open-teacherin-permissions';
    unexecutedArtifactRef: ArtifactObjectRef;
  }>
  | TeacherInDraftReceiptBase & Readonly<{
    status: 'recoverable_failure';
    recovery: 'retry';
    unexecutedArtifactRef: ArtifactObjectRef;
  }>;

export type CreateTeacherInDraftInput = Readonly<{
  runRef: string;
  artifactRef: ArtifactObjectRef;
  spaceFileRef: SpaceFileRef;
  title: string;
  permission: TeacherInDraftAction['permission'];
  proposedAt: string;
}>;

function stableToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

export function proposeTeacherInDraft(input: CreateTeacherInDraftInput): TeacherInDraftAction {
  const token = `${stableToken(input.artifactRef.id)}-${stableToken(input.artifactRef.version)}`;
  return Object.freeze({
    id: `action-teacherin-${token}`,
    kind: 'create-teacherin-draft',
    status: 'proposed',
    runRef: input.runRef,
    artifactRef: Object.freeze({ ...input.artifactRef }),
    spaceFileRef: Object.freeze({ ...input.spaceFileRef }),
    title: input.title,
    permission: input.permission,
    idempotencyKey: `teacherin-draft:${input.artifactRef.id}:${input.artifactRef.version}`,
    proposedAt: input.proposedAt,
  });
}

export function approveTeacherInDraft(
  action: TeacherInDraftAction,
  input: Readonly<{ approvalId: string; decidedBy: string; decidedAt: string }>,
): Readonly<{ action: TeacherInDraftAction; approval: TeacherInDraftApproval }> | null {
  if (action.status !== 'proposed') return null;
  return Object.freeze({
    action: Object.freeze({ ...action, status: 'approved' as const }),
    approval: Object.freeze({
      id: input.approvalId,
      actionId: action.id,
      decision: 'approved' as const,
      decidedBy: input.decidedBy,
      decidedAt: input.decidedAt,
    }),
  });
}

export function getTeacherInDraftLink(receipt: TeacherInDraftReceipt | null): TeacherInDraftLink | null {
  return receipt?.status === 'success' ? receipt.draft : null;
}

export function isTeacherInDraftCurrent(
  receipt: TeacherInDraftReceipt | null,
  artifactRef: ArtifactObjectRef,
): boolean {
  return receipt?.status === 'success'
    && receipt.draft.sourceArtifactRef.id === artifactRef.id
    && receipt.draft.sourceArtifactRef.version === artifactRef.version;
}

