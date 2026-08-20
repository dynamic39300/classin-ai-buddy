export const CORE_CONTEXT_SECTIONS = [
  'actor_organization',
  'teaching_scope',
  'learner_scope',
  'time_schedule',
  'resources_input',
  'teaching_evidence',
  'domain_knowledge',
] as const;

export type CoreContextSection = typeof CORE_CONTEXT_SECTIONS[number];
export type WorkBuddyTaskType = 'single-courseware' | 'course-package';
export type CoreContextSource = 'classin' | 'teacher-input' | 'institution-rule' | 'domain-knowledge';
export type CoreContextSensitivity = 'public' | 'organization' | 'class' | 'personal' | 'student_sensitive';
export type CoreContextPermission = 'read' | 'restricted';
export type CoreContextSelection = 'locked' | 'suggested';

export type CoreContextItem = Readonly<{
  id: string;
  parentId?: string;
  section: CoreContextSection;
  kind: string;
  label: string;
  source: CoreContextSource;
  sourceVersion: string;
  permission: CoreContextPermission;
  sensitivity: CoreContextSensitivity;
  selection: CoreContextSelection;
}>;

export type ProposedContextItem = CoreContextItem & Readonly<{ included: boolean }>;

export type ContextProposal = Readonly<{
  taskType: WorkBuddyTaskType;
  status: 'needs_attention' | 'ready_to_confirm';
  items: readonly ProposedContextItem[];
}>;

export type ContextSnapshot = Readonly<{
  id: string;
  version: 'workbuddy-m4-context-v1';
  taskType: WorkBuddyTaskType;
  confirmedAt: string;
  items: readonly ProposedContextItem[];
}>;

export type ContextProjection = Readonly<{
  snapshotId: string;
  snapshotVersion: ContextSnapshot['version'];
  capabilityId: string;
  purpose: string;
  generatedAt: string;
  excludedSensitiveCount: number;
  items: readonly ProposedContextItem[];
}>;

export type CapabilityContextManifest = Readonly<{
  capabilityId: string;
  purpose: string;
  allowedSections: readonly CoreContextSection[];
}>;

function proposalStatus(taskType: WorkBuddyTaskType, items: readonly ProposedContextItem[]): ContextProposal['status'] {
  const included = items.filter((item) => item.included);
  const hasTeachingScope = included.some(({ section }) => section === 'teaching_scope');
  if (taskType === 'single-courseware') return hasTeachingScope ? 'ready_to_confirm' : 'needs_attention';
  const hasClass = included.some(({ kind }) => kind === 'class');
  const hasCourse = included.some(({ kind }) => kind === 'course');
  return hasClass && hasCourse ? 'ready_to_confirm' : 'needs_attention';
}

function buildProposal(taskType: WorkBuddyTaskType, items: readonly ProposedContextItem[]): ContextProposal {
  return Object.freeze({ taskType, status: proposalStatus(taskType, items), items });
}

export function createContextProposal(items: readonly CoreContextItem[], taskType: WorkBuddyTaskType): ContextProposal {
  return buildProposal(taskType, items.map((item) => Object.freeze({ ...item, included: item.selection === 'locked' })));
}

export function selectContextItems(proposal: ContextProposal, selectedIds: readonly string[]): ContextProposal {
  const selected = new Set(selectedIds);
  const byId = new Map(proposal.items.map((item) => [item.id, item]));

  const hasSelectedAncestors = (item: ProposedContextItem): boolean => {
    if (!item.parentId) return true;
    const parent = byId.get(item.parentId);
    if (!parent) return false;
    return (parent.selection === 'locked' || selected.has(parent.id)) && hasSelectedAncestors(parent);
  };

  const items = proposal.items.map((item) => Object.freeze({
    ...item,
    included: item.selection === 'locked' || (selected.has(item.id) && hasSelectedAncestors(item)),
  }));
  return buildProposal(proposal.taskType, items);
}

export function confirmContext(
  proposal: ContextProposal,
  metadata: Readonly<{ snapshotId: string; confirmedAt: string }>,
): Readonly<{ ok: true; snapshot: ContextSnapshot }> | Readonly<{ ok: false; reason: 'missing-required-context' }> {
  if (proposal.status !== 'ready_to_confirm') return Object.freeze({ ok: false, reason: 'missing-required-context' });

  const items = Object.freeze(proposal.items.filter(({ included }) => included).map((item) => Object.freeze({ ...item })));
  const snapshot = Object.freeze({
    id: metadata.snapshotId,
    version: 'workbuddy-m4-context-v1' as const,
    taskType: proposal.taskType,
    confirmedAt: metadata.confirmedAt,
    items,
  });
  return Object.freeze({ ok: true, snapshot });
}

export function projectContext(
  snapshot: ContextSnapshot,
  manifest: CapabilityContextManifest,
  generatedAt: string,
): ContextProjection {
  const allowed = new Set(manifest.allowedSections);
  const items = Object.freeze(snapshot.items.filter((item) => allowed.has(item.section) && item.sensitivity !== 'student_sensitive'));
  const excludedSensitiveCount = snapshot.items.filter((item) => allowed.has(item.section) && item.sensitivity === 'student_sensitive').length;
  return Object.freeze({
    snapshotId: snapshot.id,
    snapshotVersion: snapshot.version,
    capabilityId: manifest.capabilityId,
    purpose: manifest.purpose,
    generatedAt,
    excludedSensitiveCount,
    items,
  });
}
