import {
  TEACHERIN_CONTENT_SCHEMA_VERSION,
  isTeacherInCompatibleContentPackage,
  type TeacherInCompatibleContentPackage,
} from '@domain/teacherin/content';

export type { TeacherInCompatibleContentPackage } from '@domain/teacherin/content';

export type PersonalContentProposedAction = Readonly<{
  id: string;
  kind: 'publish-personal-content';
  accountId: string;
  packageId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  risk: 'low';
  reversible: true;
  status: 'approved';
}>;

export type PersonalContentApproval = Readonly<{
  id: string;
  actionId: string;
  decision: 'approved';
  decidedBy: string;
  decidedAt: string;
}>;

export type PersonalContentReceipt = Readonly<{
  id: string;
  actionId: string;
  approvalId: string;
  idempotencyKey: string;
  status: 'success';
  packageId: string;
  objectVersion: string;
  executedAt: string;
  truthLabel: '[模拟] 个人内容库执行回执';
}>;

export type StandaloneContentSession = Readonly<{
  version: 1;
  packages: readonly TeacherInCompatibleContentPackage[];
  actions: readonly PersonalContentProposedAction[];
  approvals: readonly PersonalContentApproval[];
  receipts: readonly PersonalContentReceipt[];
}>;

export type PublishPersonalContentInput = Readonly<{
  accountId: string;
  idempotencyKey: string;
  contentType: TeacherInCompatibleContentPackage['contentType'];
  title: string;
  description: string;
  stage: string;
  subject: string;
  tags: readonly string[];
  sourceRunRef: string;
  sourceArtifactRef: Readonly<{ id: string; version: string }>;
  assetFormat: string;
  visibility: TeacherInCompatibleContentPackage['authorization']['visibility'];
  decidedAt: string;
}>;

export type PublishPersonalContentResult =
  | Readonly<{ status: 'success'; content: TeacherInCompatibleContentPackage; action: PersonalContentProposedAction; approval: PersonalContentApproval; receipt: PersonalContentReceipt }>
  | Readonly<{ status: 'evidence_mismatch'; idempotencyKey: string }>;

export type StandaloneContentModule = Readonly<{
  list: (accountId: string) => readonly TeacherInCompatibleContentPackage[];
  receiptForArtifact: (accountId: string, artifactId: string) => PersonalContentReceipt | null;
  publish: (input: PublishPersonalContentInput) => PublishPersonalContentResult;
  exportSession: () => StandaloneContentSession;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function stableFingerprint(parts: readonly string[]): string {
  let hash = 0x811c9dc5;
  for (const character of parts.join('\u001f')) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function isStandaloneContentSession(value: unknown): value is StandaloneContentSession {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.packages) || !Array.isArray(value.actions)
    || !Array.isArray(value.approvals) || !Array.isArray(value.receipts)
    || !value.packages.every(isTeacherInCompatibleContentPackage)) return false;
  const packageIds = new Set<string>();
  for (const content of value.packages) {
    if (packageIds.has(content.id)) return false;
    packageIds.add(content.id);
  }
  const actions = new Map<string, PersonalContentProposedAction>();
  const keys = new Set<string>();
  for (const candidate of value.actions) {
    if (!isRecord(candidate) || !isNonEmptyString(candidate.id) || candidate.kind !== 'publish-personal-content'
      || !isNonEmptyString(candidate.accountId) || !isNonEmptyString(candidate.packageId)
      || !isNonEmptyString(candidate.idempotencyKey) || keys.has(candidate.idempotencyKey)
      || !/^[0-9a-f]{8}$/.test(String(candidate.requestFingerprint)) || candidate.risk !== 'low'
      || candidate.reversible !== true || candidate.status !== 'approved' || actions.has(candidate.id)) return false;
    actions.set(candidate.id, candidate as PersonalContentProposedAction);
    keys.add(candidate.idempotencyKey);
  }
  const approvals = new Map<string, PersonalContentApproval>();
  for (const candidate of value.approvals) {
    if (!isRecord(candidate) || !isNonEmptyString(candidate.id) || approvals.has(candidate.id)
      || !isNonEmptyString(candidate.actionId) || !actions.has(candidate.actionId) || candidate.decision !== 'approved'
      || !isNonEmptyString(candidate.decidedBy) || !isNonEmptyString(candidate.decidedAt)
      || Number.isNaN(Date.parse(candidate.decidedAt))) return false;
    approvals.set(candidate.id, candidate as PersonalContentApproval);
  }
  const receiptIds = new Set<string>();
  for (const candidate of value.receipts) {
    if (!isRecord(candidate) || !isNonEmptyString(candidate.id) || receiptIds.has(candidate.id)
      || !isNonEmptyString(candidate.actionId) || !isNonEmptyString(candidate.approvalId)
      || !isNonEmptyString(candidate.idempotencyKey) || candidate.status !== 'success'
      || !isNonEmptyString(candidate.packageId) || !isNonEmptyString(candidate.objectVersion)
      || !isNonEmptyString(candidate.executedAt) || Number.isNaN(Date.parse(candidate.executedAt))
      || candidate.truthLabel !== '[模拟] 个人内容库执行回执') return false;
    const action = actions.get(candidate.actionId);
    const approval = approvals.get(candidate.approvalId);
    const content = value.packages.find(({ id }) => id === candidate.packageId);
    if (!action || !approval || approval.actionId !== action.id || action.packageId !== candidate.packageId
      || action.idempotencyKey !== candidate.idempotencyKey || !content || content.version !== candidate.objectVersion
      || content.provenance.authorId !== action.accountId) return false;
    receiptIds.add(candidate.id);
  }
  return value.actions.length === value.approvals.length && value.actions.length === value.receipts.length;
}

export function createStandaloneContentModule(initialSession?: StandaloneContentSession): StandaloneContentModule {
  let packages = [...(initialSession?.packages ?? [])];
  let actions = [...(initialSession?.actions ?? [])];
  let approvals = [...(initialSession?.approvals ?? [])];
  let receipts = [...(initialSession?.receipts ?? [])];
  const exportSession = (): StandaloneContentSession => Object.freeze({
    version: 1,
    packages: Object.freeze(packages),
    actions: Object.freeze(actions),
    approvals: Object.freeze(approvals),
    receipts: Object.freeze(receipts),
  });
  return Object.freeze({
    list: (accountId) => Object.freeze(packages.filter(({ provenance }) => provenance.authorId === accountId)),
    receiptForArtifact: (accountId, artifactId) => {
      const content = packages.find(({ provenance }) => provenance.authorId === accountId && provenance.sourceArtifactRef.id === artifactId);
      return content ? receipts.find(({ packageId }) => packageId === content.id) ?? null : null;
    },
    publish: (input) => {
      const title = input.title.trim();
      const description = input.description.trim();
      const stage = input.stage.trim();
      const subject = input.subject.trim();
      const tags = input.tags.map((tag) => tag.trim()).filter(Boolean);
      const fingerprint = stableFingerprint([
        input.accountId, input.contentType, title, description, stage, subject, tags.join('|'), input.sourceRunRef,
        input.sourceArtifactRef.id, input.sourceArtifactRef.version, input.assetFormat, input.visibility, input.decidedAt,
      ]);
      const existingAction = actions.find(({ idempotencyKey }) => idempotencyKey === input.idempotencyKey);
      if (existingAction) {
        if (existingAction.requestFingerprint !== fingerprint) return Object.freeze({ status: 'evidence_mismatch' as const, idempotencyKey: input.idempotencyKey });
        const content = packages.find(({ id }) => id === existingAction.packageId)!;
        const approval = approvals.find(({ actionId }) => actionId === existingAction.id)!;
        const receipt = receipts.find(({ actionId }) => actionId === existingAction.id)!;
        return Object.freeze({ status: 'success' as const, content, action: existingAction, approval, receipt });
      }
      if (!title || !description || !stage || !subject || !input.accountId || !input.sourceRunRef
        || !input.sourceArtifactRef.id || !input.sourceArtifactRef.version || !input.assetFormat) {
        return Object.freeze({ status: 'evidence_mismatch' as const, idempotencyKey: input.idempotencyKey });
      }
      const suffix = `${input.accountId}-${input.sourceArtifactRef.id}-${input.sourceArtifactRef.version}`.replace(/[^a-zA-Z0-9-]/g, '-');
      const packageId = `personal-content-${suffix}`;
      const action: PersonalContentProposedAction = Object.freeze({
        id: `action-${packageId}`, kind: 'publish-personal-content', accountId: input.accountId, packageId,
        idempotencyKey: input.idempotencyKey, requestFingerprint: fingerprint, risk: 'low', reversible: true, status: 'approved',
      });
      const approval: PersonalContentApproval = Object.freeze({
        id: `approval-${packageId}`, actionId: action.id, decision: 'approved', decidedBy: input.accountId, decidedAt: input.decidedAt,
      });
      const content: TeacherInCompatibleContentPackage = Object.freeze({
        schemaVersion: TEACHERIN_CONTENT_SCHEMA_VERSION, id: packageId, version: 'v1', contentType: input.contentType,
        title, description, stage, subject, tags: Object.freeze(tags),
        assets: Object.freeze([Object.freeze({ id: `asset-${packageId}`, kind: 'document' as const, format: input.assetFormat, version: input.sourceArtifactRef.version })]),
        provenance: Object.freeze({ sourceRunRef: input.sourceRunRef, sourceArtifactRef: Object.freeze({ ...input.sourceArtifactRef }), authorId: input.accountId, generatedBy: 'workbuddy' as const }),
        authorization: Object.freeze({ visibility: input.visibility, reuse: 'reference-and-adapt' as const, attributionRequired: true }),
        lifecycle: Object.freeze({ state: 'published' as const, createdAt: input.decidedAt, updatedAt: input.decidedAt }), truthLabel: '[模拟]' as const,
      });
      if (!isTeacherInCompatibleContentPackage(content)) {
        return Object.freeze({ status: 'evidence_mismatch' as const, idempotencyKey: input.idempotencyKey });
      }
      const receipt: PersonalContentReceipt = Object.freeze({
        id: `receipt-${packageId}`, actionId: action.id, approvalId: approval.id, idempotencyKey: input.idempotencyKey,
        status: 'success', packageId, objectVersion: content.version, executedAt: input.decidedAt, truthLabel: '[模拟] 个人内容库执行回执',
      });
      packages = [...packages, content]; actions = [...actions, action]; approvals = [...approvals, approval]; receipts = [...receipts, receipt];
      return Object.freeze({ status: 'success' as const, content, action, approval, receipt });
    },
    exportSession,
  });
}
