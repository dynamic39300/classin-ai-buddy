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
export type CoreContextSource = 'classin' | 'teacher-input' | 'institution-rule' | 'domain-knowledge' | 'workbuddy-artifact' | 'teacherin';
export type CoreContextSensitivity = 'public' | 'organization' | 'class' | 'personal' | 'student_sensitive';
export type CoreContextPermission = 'read' | 'restricted';
export type CoreContextSelection = 'locked' | 'suggested';
export type CoreContextReference = Readonly<{
  system: 'classin-space' | 'teacherin';
  objectId: string;
  version: string;
}>;

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
  reference?: CoreContextReference;
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
  taskGoal: string;
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

function validateContextHierarchy(items: readonly CoreContextItem[]): void {
  const byId = new Map<string, CoreContextItem>();
  for (const item of items) {
    if (byId.has(item.id)) throw new Error(`Duplicate Core Context item id: ${item.id}`);
    byId.set(item.id, item);
  }
  for (const item of items) {
    if (item.parentId && !byId.has(item.parentId)) throw new Error(`Unknown Core Context parent ${item.parentId} for item ${item.id}`);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (itemId: string): void => {
    if (visiting.has(itemId)) throw new Error(`Cyclic Core Context hierarchy at: ${itemId}`);
    if (visited.has(itemId)) return;
    visiting.add(itemId);
    const parentId = byId.get(itemId)?.parentId;
    if (parentId) visit(parentId);
    visiting.delete(itemId);
    visited.add(itemId);
  };
  for (const item of items) visit(item.id);
}

export function createContextProposal(items: readonly CoreContextItem[], taskType: WorkBuddyTaskType): ContextProposal {
  validateContextHierarchy(items);
  return buildProposal(taskType, items.map((item) => Object.freeze({ ...item, included: item.selection === 'locked' })));
}

export function upsertContextReference(proposal: ContextProposal, item: CoreContextItem): ContextProposal {
  const nextItems = proposal.items.some(({ id }) => id === item.id)
    ? proposal.items.map((current) => current.id === item.id
      ? Object.freeze({ ...item, included: true })
      : current)
    : [...proposal.items, Object.freeze({ ...item, included: true })];
  validateContextHierarchy(nextItems);
  return buildProposal(proposal.taskType, nextItems);
}

export function selectContextItems(proposal: ContextProposal, selectedIds: readonly string[]): ContextProposal {
  const selected = new Set(selectedIds);
  const byId = new Map(proposal.items.map((item) => [item.id, item]));

  const hasSelectedAncestors = (item: ProposedContextItem, visited = new Set<string>()): boolean => {
    if (visited.has(item.id)) return false;
    if (!item.parentId) return true;
    const parent = byId.get(item.parentId);
    if (!parent) return false;
    return (parent.selection === 'locked' || selected.has(parent.id)) && hasSelectedAncestors(parent, new Set(visited).add(item.id));
  };

  const items = proposal.items.map((item) => Object.freeze({
    ...item,
    included: item.selection === 'locked' || (selected.has(item.id) && hasSelectedAncestors(item)),
  }));
  return buildProposal(proposal.taskType, items);
}

export function toggleContextItem(proposal: ContextProposal, itemId: string): ContextProposal {
  const target = proposal.items.find(({ id }) => id === itemId);
  if (!target || target.selection === 'locked') return proposal;
  const selected = new Set(proposal.items.filter(({ included, selection }) => included && selection === 'suggested').map(({ id }) => id));
  const byId = new Map(proposal.items.map((item) => [item.id, item]));
  const isDescendantOf = (item: ProposedContextItem, ancestorId: string, visited = new Set<string>()): boolean => {
    if (visited.has(item.id)) return false;
    if (!item.parentId) return false;
    return item.parentId === ancestorId || Boolean(byId.get(item.parentId)
      && isDescendantOf(byId.get(item.parentId)!, ancestorId, new Set(visited).add(item.id)));
  };

  if (target.included) {
    selected.delete(target.id);
    proposal.items.filter((item) => isDescendantOf(item, target.id)).forEach(({ id }) => selected.delete(id));
  } else {
    if (target.parentId && !proposal.items.find(({ id }) => id === target.parentId)?.included) return proposal;
    if (['class', 'course', 'unit'].includes(target.kind)) {
      proposal.items.filter((item) => item.kind === target.kind && item.id !== target.id).forEach((item) => {
        selected.delete(item.id);
        proposal.items.filter((candidate) => isDescendantOf(candidate, item.id)).forEach(({ id }) => selected.delete(id));
      });
    }
    selected.add(target.id);
  }
  return selectContextItems(proposal, [...selected]);
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
  input: Readonly<{ generatedAt: string; taskGoal: string }>,
): ContextProjection {
  const allowed = new Set(manifest.allowedSections);
  const items = Object.freeze(snapshot.items.filter((item) => allowed.has(item.section) && item.sensitivity !== 'student_sensitive'));
  const excludedSensitiveCount = snapshot.items.filter((item) => allowed.has(item.section) && item.sensitivity === 'student_sensitive').length;
  return Object.freeze({
    snapshotId: snapshot.id,
    snapshotVersion: snapshot.version,
    capabilityId: manifest.capabilityId,
    purpose: manifest.purpose,
    taskGoal: input.taskGoal,
    generatedAt: input.generatedAt,
    excludedSensitiveCount,
    items,
  });
}
