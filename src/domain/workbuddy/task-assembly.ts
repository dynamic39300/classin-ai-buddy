import type { WorkBuddyTaskType } from './core-context';

export type TaskSkillIntent = Readonly<{
  taskType: WorkBuddyTaskType;
  suggestedGoal: string;
}>;

export type TaskAgentReference = Readonly<{
  kind: 'agent';
  id: string;
  title: string;
  avatarAsset: string | null;
  source: 'agentin';
  recommendedPrompt: string;
}>;

export type TaskSkillReference = Readonly<{
  kind: 'skill';
  id: string;
  title: string;
  description: string;
  source: 'official' | 'installed';
  taskIntent: TaskSkillIntent | null;
}>;

export type TaskFileReference = Readonly<{
  kind: 'file';
  id: string;
  title: string;
  source: 'local' | 'my-files' | 'classin-space';
  mimeType: string;
  sizeBytes: number | null;
  version: string | null;
  locationLabel: string;
}>;

export type TaskMaterialReference = TaskAgentReference | TaskSkillReference | TaskFileReference;

export type TaskMaterialState =
  | Readonly<{ status: 'ready' }>
  | Readonly<{ status: 'reading'; progress: number | null }>
  | Readonly<{ status: 'failed'; reason: 'unsupported' | 'read_error' | 'too_large' }>
  | Readonly<{ status: 'permission_denied' }>
  | Readonly<{ status: 'stale'; reason: 'local_file_reselect' | 'source_changed' }>
  | Readonly<{ status: 'cancelled' }>;

export type SelectedTaskMaterial = Readonly<{
  reference: TaskMaterialReference;
  state: TaskMaterialState;
  selectionOrder: number;
}>;

export type AgentPromptFragment = Readonly<{
  id: string;
  agentId: string;
  originalTemplate: string;
  range: Readonly<{ start: number; end: number }>;
  editState: 'untouched' | 'edited' | 'uncertain';
}>;

type AddUndoEntry = Readonly<{
  id: string;
  operation: 'add-material';
  targetKey: string;
  createdOrder: number;
}>;

type RemoveUndoEntry = Readonly<{
  id: string;
  operation: 'remove-material';
  targetKey: string;
  createdOrder: number;
  material: SelectedTaskMaterial;
  fragment: AgentPromptFragment | null;
  deletedPrompt: Readonly<{ text: string; start: number }> | null;
}>;

export type TaskAssemblyUndoEntry = AddUndoEntry | RemoveUndoEntry;

export type TaskAssemblySession = Readonly<{
  version: 1;
  text: string;
  caret: number;
  materials: readonly SelectedTaskMaterial[];
  promptFragments: readonly AgentPromptFragment[];
  expanded: boolean;
  undoEntries: readonly TaskAssemblyUndoEntry[];
}>;

export type TaskAssemblyCommand =
  | Readonly<{ type: 'replace-text'; value: string; caret: number }>
  | Readonly<{ type: 'select-agent'; agent: TaskAgentReference }>
  | Readonly<{ type: 'select-skill'; skill: TaskSkillReference }>
  | Readonly<{ type: 'add-file'; file: TaskFileReference; state: TaskMaterialState }>
  | Readonly<{ type: 'update-file-state'; key: string; state: TaskMaterialState }>
  | Readonly<{ type: 'remove-material'; key: string }>
  | Readonly<{ type: 'undo'; undoId: string }>
  | Readonly<{ type: 'set-expanded'; expanded: boolean }>
  | Readonly<{ type: 'clear' }>;

export type TaskAssemblyEffect =
  | Readonly<{ kind: 'material-added'; key: string; promptChanged: boolean }>
  | Readonly<{ kind: 'material-removed'; key: string; promptPreserved: boolean }>
  | Readonly<{ kind: 'text-changed' }>
  | Readonly<{ kind: 'file-state-changed'; key: string }>
  | Readonly<{ kind: 'undo-applied'; key: string }>
  | Readonly<{ kind: 'layout-changed' }>
  | Readonly<{ kind: 'cleared' }>;

export type TaskAssemblyResult =
  | Readonly<{ outcome: 'changed'; undoId: string | null; effect: TaskAssemblyEffect }>
  | Readonly<{ outcome: 'unchanged'; reason: 'duplicate' | 'missing' | 'undo_expired' }>
  | Readonly<{ outcome: 'blocked'; reason: 'invalid_command' | 'unsafe_session' }>;

export type TaskAssemblyTransition = Readonly<{
  session: TaskAssemblySession;
  result: TaskAssemblyResult;
}>;

export type TaskMaterialView = Readonly<{
  key: string;
  kind: TaskMaterialReference['kind'];
  title: string;
  sourceLabel: string;
  status: TaskMaterialState['status'];
  statusLabel: string;
  canRemove: boolean;
  canRetry: boolean;
}>;

export type TaskAssemblyBlockingIssue = Readonly<{
  reason: 'material_not_ready' | 'permission_denied' | 'stale_reference';
  materialKey: string;
  message: string;
}>;

export type TaskAssemblyView = Readonly<{
  text: string;
  caret: number;
  materials: readonly TaskMaterialView[];
  expanded: boolean;
  canSubmitMaterials: boolean;
  blockingIssue: TaskAssemblyBlockingIssue | null;
  latestUndo: Readonly<{ id: string; label: string }> | null;
}>;

export type TaskAssemblySnapshot = Readonly<{
  id: string;
  version: 'task-assembly-v1';
  createdAt: string;
  goal: string;
  materials: readonly TaskMaterialReference[];
  agentPromptProvenance: readonly Readonly<{
    agentId: string;
    originalTemplate: string;
    finalText: string;
    editState: AgentPromptFragment['editState'];
  }>[];
}>;

export type TaskAssemblySnapshotResult =
  | Readonly<{ ok: true; snapshot: TaskAssemblySnapshot }>
  | Readonly<{
      ok: false;
      reason: 'empty_goal' | 'material_not_ready' | 'invalid_provenance';
      materialKey: string | null;
    }>;

export type TaskAssemblyModule = Readonly<{
  create(initial?: unknown): TaskAssemblySession;
  dispatch(session: TaskAssemblySession, command: TaskAssemblyCommand): TaskAssemblyTransition;
  project(session: TaskAssemblySession): TaskAssemblyView;
  createSnapshot(
    session: TaskAssemblySession,
    input: Readonly<{ id: string; createdAt: string }>,
  ): TaskAssemblySnapshotResult;
}>;

const SOURCE_LABELS: Readonly<Record<TaskMaterialReference['source'], string>> = Object.freeze({
  agentin: 'AgentIn',
  official: '官方 Skill',
  installed: '已安装 Skill',
  local: '本地文件',
  'my-files': '我的文件',
  'classin-space': 'ClassIn 空间',
});

const STATUS_LABELS: Readonly<Record<TaskMaterialState['status'], string>> = Object.freeze({
  ready: '可使用',
  reading: '读取中',
  failed: '读取失败',
  permission_denied: '无权访问',
  stale: '需要重新选择',
  cancelled: '已取消',
});

function materialStatusLabel(state: TaskMaterialState): string {
  if (state.status !== 'failed') return STATUS_LABELS[state.status];
  if (state.reason === 'unsupported') return '格式不支持';
  if (state.reason === 'too_large') return '文件过大';
  return '读取失败';
}

export function taskMaterialKey(reference: TaskMaterialReference): string {
  return `${reference.kind}:${reference.source}:${reference.id}`;
}

function emptySession(): TaskAssemblySession {
  return Object.freeze({
    version: 1,
    text: '',
    caret: 0,
    materials: Object.freeze([]),
    promptFragments: Object.freeze([]),
    expanded: false,
    undoEntries: Object.freeze([]),
  });
}

function freezeSession(session: TaskAssemblySession): TaskAssemblySession {
  return Object.freeze({
    ...session,
    materials: Object.freeze(session.materials.map((material) => Object.freeze({
      ...material,
      reference: Object.freeze({ ...material.reference }),
      state: Object.freeze({ ...material.state }),
    }))),
    promptFragments: Object.freeze(session.promptFragments.map((fragment) => Object.freeze({
      ...fragment,
      range: Object.freeze({ ...fragment.range }),
    }))),
    undoEntries: Object.freeze(session.undoEntries.map((entry) => Object.freeze({ ...entry }))),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isMaterialState(value: unknown): value is TaskMaterialState {
  if (!isRecord(value) || typeof value.status !== 'string') return false;
  if (value.status === 'ready' || value.status === 'permission_denied' || value.status === 'cancelled') return true;
  if (value.status === 'reading') return value.progress === null || typeof value.progress === 'number';
  if (value.status === 'failed') return ['unsupported', 'read_error', 'too_large'].includes(String(value.reason));
  return value.status === 'stale' && ['local_file_reselect', 'source_changed'].includes(String(value.reason));
}

function isReference(value: unknown): value is TaskMaterialReference {
  if (!isRecord(value) || typeof value.kind !== 'string' || typeof value.id !== 'string'
    || typeof value.title !== 'string' || typeof value.source !== 'string') return false;
  if (value.kind === 'agent') {
    return value.source === 'agentin' && typeof value.recommendedPrompt === 'string'
      && (value.avatarAsset === null || typeof value.avatarAsset === 'string');
  }
  if (value.kind === 'skill') {
    return ['official', 'installed'].includes(value.source) && typeof value.description === 'string'
      && (value.taskIntent === null || (isRecord(value.taskIntent)
        && typeof value.taskIntent.taskType === 'string' && typeof value.taskIntent.suggestedGoal === 'string'));
  }
  return value.kind === 'file' && ['local', 'my-files', 'classin-space'].includes(value.source)
    && typeof value.mimeType === 'string' && (value.sizeBytes === null || typeof value.sizeBytes === 'number')
    && (value.version === null || typeof value.version === 'string') && typeof value.locationLabel === 'string';
}

function isPromptFragment(value: unknown, textLength: number): value is AgentPromptFragment {
  return isRecord(value) && typeof value.id === 'string' && typeof value.agentId === 'string'
    && typeof value.originalTemplate === 'string' && isRecord(value.range)
    && typeof value.range.start === 'number' && typeof value.range.end === 'number'
    && value.range.start >= 0 && value.range.end >= value.range.start && value.range.end <= textLength
    && ['untouched', 'edited', 'uncertain'].includes(String(value.editState));
}

export function isTaskAssemblySession(value: unknown): value is TaskAssemblySession {
  if (!isRecord(value) || value.version !== 1 || typeof value.text !== 'string'
    || typeof value.caret !== 'number' || value.caret < 0 || value.caret > value.text.length
    || typeof value.expanded !== 'boolean' || !Array.isArray(value.materials)
    || !Array.isArray(value.promptFragments) || !Array.isArray(value.undoEntries)) return false;
  const keys = new Set<string>();
  for (const candidate of value.materials) {
    if (!isRecord(candidate) || !isReference(candidate.reference) || !isMaterialState(candidate.state)
      || typeof candidate.selectionOrder !== 'number') return false;
    const key = taskMaterialKey(candidate.reference);
    if (keys.has(key)) return false;
    keys.add(key);
  }
  for (const candidate of value.promptFragments) {
    if (!isPromptFragment(candidate, value.text.length)) return false;
    if (!value.materials.some((material) => isRecord(material) && isReference(material.reference)
      && material.reference.kind === 'agent' && material.reference.id === candidate.agentId)) return false;
  }
  const textLength = value.text.length;
  return value.undoEntries.every((entry) => {
    if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.targetKey !== 'string'
      || typeof entry.createdOrder !== 'number') return false;
    if (entry.operation === 'add-material') return true;
    if (entry.operation !== 'remove-material' || !isRecord(entry.material)
      || !isReference(entry.material.reference) || !isMaterialState(entry.material.state)
      || typeof entry.material.selectionOrder !== 'number') return false;
    if (entry.fragment !== null && !isPromptFragment(entry.fragment, textLength + 100_000)) return false;
    return entry.deletedPrompt === null || (isRecord(entry.deletedPrompt)
      && typeof entry.deletedPrompt.text === 'string' && typeof entry.deletedPrompt.start === 'number'
      && entry.deletedPrompt.start >= 0);
  });
}

function nextOrder(session: TaskAssemblySession): number {
  return Math.max(0, ...session.materials.map(({ selectionOrder }) => selectionOrder)) + 1;
}

function nextUndoOrder(session: TaskAssemblySession): number {
  return Math.max(0, ...session.undoEntries.map(({ createdOrder }) => createdOrder)) + 1;
}

function appendUndo(session: TaskAssemblySession, entry: TaskAssemblyUndoEntry): readonly TaskAssemblyUndoEntry[] {
  return Object.freeze([...session.undoEntries.slice(-19), entry]);
}

function addMaterial(
  session: TaskAssemblySession,
  reference: TaskMaterialReference,
  state: TaskMaterialState,
): SelectedTaskMaterial {
  return Object.freeze({ reference, state, selectionOrder: nextOrder(session) });
}

function changed(
  session: TaskAssemblySession,
  effect: TaskAssemblyEffect,
  undoId: string | null = null,
): TaskAssemblyTransition {
  return Object.freeze({
    session: freezeSession(session),
    result: Object.freeze({ outcome: 'changed', undoId, effect }),
  });
}

function unchanged(session: TaskAssemblySession, reason: 'duplicate' | 'missing' | 'undo_expired'): TaskAssemblyTransition {
  return Object.freeze({ session, result: Object.freeze({ outcome: 'unchanged', reason }) });
}

function blocked(session: TaskAssemblySession): TaskAssemblyTransition {
  return Object.freeze({ session, result: Object.freeze({ outcome: 'blocked', reason: 'invalid_command' }) });
}

function commonPrefixLength(left: string, right: string): number {
  const limit = Math.min(left.length, right.length);
  let index = 0;
  while (index < limit && left[index] === right[index]) index += 1;
  return index;
}

function commonSuffixLength(left: string, right: string, prefix: number): number {
  const limit = Math.min(left.length, right.length) - prefix;
  let index = 0;
  while (index < limit && left[left.length - 1 - index] === right[right.length - 1 - index]) index += 1;
  return index;
}

function reconcileFragments(
  previousText: string,
  nextText: string,
  fragments: readonly AgentPromptFragment[],
): readonly AgentPromptFragment[] {
  if (previousText === nextText) return fragments;
  const start = commonPrefixLength(previousText, nextText);
  const suffix = commonSuffixLength(previousText, nextText, start);
  const oldEnd = previousText.length - suffix;
  const newEnd = nextText.length - suffix;
  const delta = (newEnd - start) - (oldEnd - start);
  const touched = fragments.filter(({ range }) => {
    if (start === oldEnd) return start >= range.start && start <= range.end;
    return start < range.end && oldEnd > range.start;
  });
  return Object.freeze(fragments.map((fragment) => {
    if (oldEnd <= fragment.range.start && !(start === oldEnd && start === fragment.range.start)) {
      return Object.freeze({ ...fragment, range: Object.freeze({
        start: fragment.range.start + delta,
        end: fragment.range.end + delta,
      }) });
    }
    if (start >= fragment.range.end && !(start === oldEnd && start === fragment.range.end)) return fragment;
    const nextStart = Math.max(0, Math.min(fragment.range.start, start, nextText.length));
    const nextFragmentEnd = Math.max(nextStart, Math.min(nextText.length, fragment.range.end + delta));
    return Object.freeze({
      ...fragment,
      range: Object.freeze({ start: nextStart, end: nextFragmentEnd }),
      editState: touched.length > 1 ? 'uncertain' : 'edited',
    });
  }));
}

function shiftFragmentsForDeletion(
  fragments: readonly AgentPromptFragment[],
  start: number,
  end: number,
  removedFragmentId: string | null,
): readonly AgentPromptFragment[] {
  const delta = start - end;
  return Object.freeze(fragments.flatMap((fragment) => {
    if (fragment.id === removedFragmentId) return [];
    if (fragment.range.end <= start) return [fragment];
    if (fragment.range.start >= end) return [Object.freeze({ ...fragment, range: Object.freeze({
      start: fragment.range.start + delta,
      end: fragment.range.end + delta,
    }) })];
    return [Object.freeze({
      ...fragment,
      range: Object.freeze({
        start: Math.min(fragment.range.start, start),
        end: Math.max(start, fragment.range.end + delta),
      }),
      editState: 'uncertain' as const,
    })];
  }));
}

type PromptRange = Readonly<{ start: number; end: number }>;

function findStandalonePrompt(text: string, prompt: string): PromptRange | null {
  let from = 0;
  while (from <= text.length - prompt.length) {
    const start = text.indexOf(prompt, from);
    if (start < 0) return null;
    const end = start + prompt.length;
    const startsOnLine = start === 0 || text[start - 1] === '\n';
    const endsOnLine = end === text.length || text[end] === '\n';
    if (startsOnLine && endsOnLine) return Object.freeze({ start, end });
    from = start + 1;
  }
  return null;
}

function stripAutomaticPrompts(session: TaskAssemblySession): string {
  const ranges: PromptRange[] = [];
  for (const fragment of session.promptFragments) {
    if (fragment.editState !== 'untouched') continue;
    if (session.text.slice(fragment.range.start, fragment.range.end) !== fragment.originalTemplate) continue;
    ranges.push(fragment.range);
  }
  for (const material of session.materials) {
    if (material.reference.kind !== 'skill' || !material.reference.taskIntent?.suggestedGoal) continue;
    const range = findStandalonePrompt(session.text, material.reference.taskIntent.suggestedGoal);
    if (range) ranges.push(range);
  }
  if (!ranges.length) return session.text;
  const expanded = ranges.map((range) => {
    if (range.start > 0 && session.text[range.start - 1] === '\n') {
      return { start: range.start - 1, end: range.end };
    }
    if (range.end < session.text.length && session.text[range.end] === '\n') {
      return { start: range.start, end: range.end + 1 };
    }
    return range;
  }).sort((left, right) => left.start - right.start);
  const merged: PromptRange[] = [];
  for (const range of expanded) {
    const previous = merged.at(-1);
    if (!previous || range.start > previous.end) {
      merged.push({ ...range });
      continue;
    }
    merged[merged.length - 1] = { start: previous.start, end: Math.max(previous.end, range.end) };
  }
  let text = session.text;
  for (const range of merged.reverse()) {
    text = `${text.slice(0, range.start)}${text.slice(range.end)}`;
  }
  return text;
}

function replaceAutomaticPrompt(session: TaskAssemblySession, prompt: string): Readonly<{
  text: string;
  start: number;
}> {
  const teacherText = stripAutomaticPrompts(session);
  const separator = teacherText && prompt ? '\n' : '';
  return Object.freeze({
    text: `${teacherText}${separator}${prompt}`,
    start: teacherText.length + separator.length,
  });
}

function removeMaterialTransition(session: TaskAssemblySession, key: string): TaskAssemblyTransition {
  const material = session.materials.find(({ reference }) => taskMaterialKey(reference) === key);
  if (!material) return unchanged(session, 'missing');
  const fragment = material.reference.kind === 'agent'
    ? session.promptFragments.find(({ agentId }) => agentId === material.reference.id) ?? null
    : null;
  let text = session.text;
  let promptFragments = session.promptFragments;
  let deletedPrompt: RemoveUndoEntry['deletedPrompt'] = null;
  let promptPreserved = Boolean(fragment);
  if (fragment?.editState === 'untouched'
    && text.slice(fragment.range.start, fragment.range.end) === fragment.originalTemplate) {
    const deleteStart = fragment.range.start > 0 && text[fragment.range.start - 1] === '\n'
      ? fragment.range.start - 1
      : fragment.range.start;
    const deleteEnd = fragment.range.end;
    deletedPrompt = Object.freeze({ text: text.slice(deleteStart, deleteEnd), start: deleteStart });
    text = `${text.slice(0, deleteStart)}${text.slice(deleteEnd)}`;
    promptFragments = shiftFragmentsForDeletion(promptFragments, deleteStart, deleteEnd, fragment.id);
    promptPreserved = false;
  } else if (fragment) {
    promptFragments = Object.freeze(promptFragments.filter(({ id }) => id !== fragment.id));
  }
  const order = nextUndoOrder(session);
  const undoId = `undo:${order}`;
  const undo: RemoveUndoEntry = Object.freeze({
    id: undoId,
    operation: 'remove-material',
    targetKey: key,
    createdOrder: order,
    material,
    fragment,
    deletedPrompt,
  });
  return changed({
    ...session,
    text,
    caret: Math.min(session.caret, text.length),
    materials: Object.freeze(session.materials.filter(({ reference }) => taskMaterialKey(reference) !== key)),
    promptFragments,
    undoEntries: appendUndo(session, undo),
  }, Object.freeze({ kind: 'material-removed', key, promptPreserved }), undoId);
}

function dispatch(session: TaskAssemblySession, command: TaskAssemblyCommand): TaskAssemblyTransition {
  if (!isTaskAssemblySession(session)) {
    return Object.freeze({ session: emptySession(), result: Object.freeze({ outcome: 'blocked', reason: 'unsafe_session' }) });
  }
  if (command.type === 'replace-text') {
    if (!Number.isInteger(command.caret) || command.caret < 0 || command.caret > command.value.length) return blocked(session);
    return changed({
      ...session,
      text: command.value,
      caret: command.caret,
      promptFragments: reconcileFragments(session.text, command.value, session.promptFragments),
    }, Object.freeze({ kind: 'text-changed' }));
  }
  if (command.type === 'select-agent') {
    const key = taskMaterialKey(command.agent);
    if (session.materials.some(({ reference }) => taskMaterialKey(reference) === key)) return unchanged(session, 'duplicate');
    const replacement = replaceAutomaticPrompt(session, command.agent.recommendedPrompt);
    const { start, text } = replacement;
    const fragment: AgentPromptFragment = Object.freeze({
      id: `fragment:${command.agent.id}:${nextOrder(session)}`,
      agentId: command.agent.id,
      originalTemplate: command.agent.recommendedPrompt,
      range: Object.freeze({ start, end: text.length }),
      editState: 'untouched',
    });
    const order = nextUndoOrder(session);
    const undoId = `undo:${order}`;
    const undo: AddUndoEntry = Object.freeze({ id: undoId, operation: 'add-material', targetKey: key, createdOrder: order });
    return changed({
      ...session,
      text,
      caret: text.length,
      materials: Object.freeze([...session.materials, addMaterial(session, command.agent, Object.freeze({ status: 'ready' }))]),
      promptFragments: Object.freeze([fragment]),
      undoEntries: appendUndo(session, undo),
    }, Object.freeze({ kind: 'material-added', key, promptChanged: true }), undoId);
  }
  if (command.type === 'select-skill') {
    const key = taskMaterialKey(command.skill);
    if (session.materials.some(({ reference }) => taskMaterialKey(reference) === key)) return unchanged(session, 'duplicate');
    const suggestion = command.skill.taskIntent?.suggestedGoal ?? '';
    const text = suggestion ? replaceAutomaticPrompt(session, suggestion).text : session.text;
    const order = nextUndoOrder(session);
    const undoId = `undo:${order}`;
    const undo: AddUndoEntry = Object.freeze({ id: undoId, operation: 'add-material', targetKey: key, createdOrder: order });
    return changed({
      ...session,
      text,
      caret: text.length,
      materials: Object.freeze([...session.materials, addMaterial(session, command.skill, Object.freeze({ status: 'ready' }))]),
      promptFragments: suggestion ? Object.freeze([]) : session.promptFragments,
      undoEntries: appendUndo(session, undo),
    }, Object.freeze({ kind: 'material-added', key, promptChanged: Boolean(suggestion) }), undoId);
  }
  if (command.type === 'add-file') {
    const key = taskMaterialKey(command.file);
    if (session.materials.some(({ reference }) => taskMaterialKey(reference) === key)) return unchanged(session, 'duplicate');
    const order = nextUndoOrder(session);
    const undoId = `undo:${order}`;
    const undo: AddUndoEntry = Object.freeze({ id: undoId, operation: 'add-material', targetKey: key, createdOrder: order });
    return changed({
      ...session,
      materials: Object.freeze([...session.materials, addMaterial(session, command.file, command.state)]),
      undoEntries: appendUndo(session, undo),
    }, Object.freeze({ kind: 'material-added', key, promptChanged: false }), undoId);
  }
  if (command.type === 'update-file-state') {
    const index = session.materials.findIndex(({ reference }) => taskMaterialKey(reference) === command.key && reference.kind === 'file');
    if (index < 0) return unchanged(session, 'missing');
    const materials = [...session.materials];
    const current = materials[index];
    if (!current) return unchanged(session, 'missing');
    materials[index] = Object.freeze({ ...current, state: command.state });
    return changed({ ...session, materials: Object.freeze(materials) }, Object.freeze({ kind: 'file-state-changed', key: command.key }));
  }
  if (command.type === 'remove-material') return removeMaterialTransition(session, command.key);
  if (command.type === 'undo') {
    const undo = session.undoEntries.find(({ id }) => id === command.undoId);
    if (!undo) return unchanged(session, 'undo_expired');
    const remainingUndo = Object.freeze(session.undoEntries.filter(({ id }) => id !== command.undoId));
    if (undo.operation === 'add-material') {
      const withoutUndo = freezeSession({ ...session, undoEntries: remainingUndo });
      const removal = removeMaterialTransition(withoutUndo, undo.targetKey);
      if (removal.result.outcome !== 'changed') return removal;
      return changed({ ...removal.session, undoEntries: remainingUndo }, Object.freeze({ kind: 'undo-applied', key: undo.targetKey }));
    }
    if (session.materials.some(({ reference }) => taskMaterialKey(reference) === undo.targetKey)) return unchanged(session, 'duplicate');
    let text = session.text;
    let promptFragments = session.promptFragments;
    if (undo.deletedPrompt) {
      const insertAt = Math.min(undo.deletedPrompt.start, text.length);
      text = `${text.slice(0, insertAt)}${undo.deletedPrompt.text}${text.slice(insertAt)}`;
      promptFragments = Object.freeze(promptFragments.map((fragment) => fragment.range.start >= insertAt
        ? Object.freeze({ ...fragment, range: Object.freeze({
            start: fragment.range.start + undo.deletedPrompt!.text.length,
            end: fragment.range.end + undo.deletedPrompt!.text.length,
          }) })
        : fragment));
      if (undo.fragment) {
        const separatorOffset = undo.deletedPrompt.text.startsWith('\n') ? 1 : 0;
        promptFragments = Object.freeze([...promptFragments, Object.freeze({
          ...undo.fragment,
          range: Object.freeze({
            start: insertAt + separatorOffset,
            end: insertAt + undo.deletedPrompt.text.length,
          }),
        })].sort((left, right) => left.range.start - right.range.start));
      }
    }
    const materials = Object.freeze([...session.materials, undo.material]
      .sort((left, right) => left.selectionOrder - right.selectionOrder));
    return changed({
      ...session,
      text,
      caret: Math.min(session.caret, text.length),
      materials,
      promptFragments,
      undoEntries: remainingUndo,
    }, Object.freeze({ kind: 'undo-applied', key: undo.targetKey }));
  }
  if (command.type === 'set-expanded') {
    if (session.expanded === command.expanded) return unchanged(session, 'missing');
    return changed({ ...session, expanded: command.expanded }, Object.freeze({ kind: 'layout-changed' }));
  }
  return changed(emptySession(), Object.freeze({ kind: 'cleared' }));
}

function blockingIssue(material: SelectedTaskMaterial): TaskAssemblyBlockingIssue | null {
  const key = taskMaterialKey(material.reference);
  if (material.state.status === 'ready') return null;
  if (material.state.status === 'permission_denied') {
    return Object.freeze({ reason: 'permission_denied', materialKey: key, message: `“${material.reference.title}”当前无权访问。` });
  }
  if (material.state.status === 'stale') {
    return Object.freeze({ reason: 'stale_reference', materialKey: key, message: `“${material.reference.title}”需要重新选择。` });
  }
  return Object.freeze({ reason: 'material_not_ready', materialKey: key, message: `“${material.reference.title}”尚未准备好。` });
}

function project(session: TaskAssemblySession): TaskAssemblyView {
  const issue = session.materials.map(blockingIssue).find(Boolean) ?? null;
  const latestUndo = session.undoEntries.at(-1) ?? null;
  return Object.freeze({
    text: session.text,
    caret: session.caret,
    materials: Object.freeze(session.materials.map((material) => Object.freeze({
      key: taskMaterialKey(material.reference),
      kind: material.reference.kind,
      title: material.reference.title,
      sourceLabel: SOURCE_LABELS[material.reference.source],
      status: material.state.status,
      statusLabel: materialStatusLabel(material.state),
      canRemove: true,
      canRetry: material.reference.kind === 'file'
        && ['failed', 'stale', 'permission_denied'].includes(material.state.status),
    }))),
    expanded: session.expanded,
    canSubmitMaterials: !issue,
    blockingIssue: issue,
    latestUndo: latestUndo ? Object.freeze({
      id: latestUndo.id,
      label: latestUndo.operation === 'add-material' ? '撤销添加' : '撤销移除',
    }) : null,
  });
}

function createSnapshot(
  session: TaskAssemblySession,
  input: Readonly<{ id: string; createdAt: string }>,
): TaskAssemblySnapshotResult {
  if (!session.text.trim()) return Object.freeze({ ok: false, reason: 'empty_goal', materialKey: null });
  const notReady = session.materials.find(({ state }) => state.status !== 'ready');
  if (notReady) return Object.freeze({
    ok: false,
    reason: 'material_not_ready',
    materialKey: taskMaterialKey(notReady.reference),
  });
  const invalid = session.promptFragments.find(({ range }) => range.start < 0 || range.end > session.text.length || range.start > range.end);
  if (invalid) return Object.freeze({ ok: false, reason: 'invalid_provenance', materialKey: `agent:agentin:${invalid.agentId}` });
  return Object.freeze({
    ok: true,
    snapshot: Object.freeze({
      id: input.id,
      version: 'task-assembly-v1',
      createdAt: input.createdAt,
      goal: session.text,
      materials: Object.freeze(session.materials.map(({ reference }) => Object.freeze({ ...reference }))),
      agentPromptProvenance: Object.freeze(session.promptFragments.map((fragment) => Object.freeze({
        agentId: fragment.agentId,
        originalTemplate: fragment.originalTemplate,
        finalText: session.text.slice(fragment.range.start, fragment.range.end),
        editState: fragment.editState,
      }))),
    }),
  });
}

export const taskAssemblyModule: TaskAssemblyModule = Object.freeze({
  create: (initial?: unknown) => {
    if (!isTaskAssemblySession(initial)) return emptySession();
    return freezeSession({
      ...initial,
      materials: Object.freeze(initial.materials.map((material) => material.reference.kind === 'file'
        && material.reference.source === 'local' && material.state.status === 'ready'
        ? Object.freeze({ ...material, state: Object.freeze({ status: 'stale', reason: 'local_file_reselect' }) })
        : material)),
    });
  },
  dispatch,
  project,
  createSnapshot,
});
