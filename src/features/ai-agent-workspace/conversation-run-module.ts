import type {
  ConversationRunCommand,
  ConversationRunCommandReceipt,
  ConversationRunCommandType,
  ConversationRunEvent,
  ConversationRunListener,
  ConversationRunModule,
  ConversationRunPackageConfiguration,
  ConversationRunProgress,
  ConversationRunProjection,
} from '@contracts/workbuddy/conversation-run';

export type ConversationRunHostSnapshot = Readonly<{
  projection: ConversationRunProjection;
  progressStepCount: number;
}>;

export type ConversationRunHost = Readonly<{
  open: (runRef: string) => ConversationRunHostSnapshot | null;
  execute: (runRef: string, command: ConversationRunCommand) => ConversationRunHostExecutionResult;
  subscribe?: (listener: () => void) => () => void;
}>;

export type ConversationRunHostExecutionResult =
  | Readonly<{ status: 'accepted'; resultRef?: string }>
  | Readonly<{ status: 'rejected'; reason: string }>;

export type ConversationRunHostPort = Readonly<{
  host: ConversationRunHost;
  bind: (host: ConversationRunHost) => void;
}>;

export type ConversationRunScheduler = Readonly<{
  schedule: (delayMs: number, callback: () => void) => () => void;
}>;

type LocalEvent = Omit<ConversationRunEvent, 'sequence'>;
type RuntimeState = Readonly<{
  progress: ConversationRunProgress;
  localEvents: readonly LocalEvent[];
  eventOrder: readonly string[];
  eventJournal: readonly LocalEvent[];
  inspectorOpen: boolean;
  inspectorMode: 'context' | 'output';
  unreadOutputCount: number;
  composerDraft: string;
  executingAction: boolean;
  pendingActionCommand: ConversationRunCommand | null;
  replanPending: boolean;
  contextExpandedIds: readonly string[] | null;
  contextQuery: string;
  contextScrollTop: number;
  artifactFocused: boolean;
  artifactEditing: boolean;
  artifactEditDraft: string;
  artifactSelectedBlock: string;
  artifactPreviewPage: number;
  artifactScrollTop: number;
  packageEditingArtifactId: string | null;
  packageEditDraft: string;
  packageConfiguration: ConversationRunPackageConfiguration;
  cursorRevision: number;
  commandSequence: number;
}>;

type StoredState = Readonly<{
  runtimes: Readonly<Record<string, RuntimeState>>;
  commands: Readonly<Record<string, ConversationRunCommandReceipt>>;
}>;
const STORAGE_KEY = 'workbuddy:conversation-run:v6';
const EVENT_ACTORS = new Set(['teacher', 'agent', 'skill', 'tool', 'system']);
const EVENT_KINDS = new Set(['teacher_message', 'goal_understood', 'clarification_request', 'clarification_submitted', 'context_confirmed', 'plan', 'process', 'capability_call', 'artifact', 'proposed_action', 'approval', 'receipt', 'error', 'system']);
const EVENT_STATES = new Set(['queued', 'running', 'requires_teacher_input', 'completed', 'failed', 'stopped', 'cancelled', 'superseded']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isProgress(value: unknown): value is ConversationRunProgress {
  if (!isRecord(value) || typeof value.status !== 'string') return false;
  if (value.status === 'organizing' || value.status === 'idle') return true;
  if (value.status === 'completed' || value.status === 'stopped' || value.status === 'cancelled') {
    return typeof value.completedCount === 'number' && typeof value.totalCount === 'number';
  }
  return value.status === 'running'
    && typeof value.activeIndex === 'number'
    && typeof value.completedCount === 'number'
    && typeof value.totalCount === 'number';
}

function isLocalEvent(value: unknown): value is LocalEvent {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.runRef === 'string'
    && typeof value.occurredAt === 'string'
    && typeof value.updatedAt === 'string'
    && EVENT_ACTORS.has(String(value.actor))
    && EVENT_KINDS.has(String(value.kind))
    && EVENT_STATES.has(String(value.state))
    && typeof value.title === 'string'
    && typeof value.summary === 'string'
    && Array.isArray(value.objectRefs)
    && Array.isArray(value.allowedCommands);
}

function isRuntimeState(value: unknown): value is RuntimeState {
  return isRecord(value)
    && isProgress(value.progress)
    && Array.isArray(value.localEvents)
    && value.localEvents.every(isLocalEvent)
    && Array.isArray(value.eventOrder)
    && value.eventOrder.every((item) => typeof item === 'string')
    && Array.isArray(value.eventJournal)
    && value.eventJournal.every(isLocalEvent)
    && typeof value.inspectorOpen === 'boolean'
    && (value.inspectorMode === 'context' || value.inspectorMode === 'output')
    && typeof value.unreadOutputCount === 'number'
    && typeof value.composerDraft === 'string'
    && typeof value.executingAction === 'boolean'
    && (value.pendingActionCommand === null || (isRecord(value.pendingActionCommand) && value.pendingActionCommand.type === 'execute_action' && typeof value.pendingActionCommand.id === 'string'))
    && typeof value.replanPending === 'boolean'
    && (value.contextExpandedIds === null || (Array.isArray(value.contextExpandedIds) && value.contextExpandedIds.every((item) => typeof item === 'string')))
    && typeof value.contextQuery === 'string'
    && typeof value.contextScrollTop === 'number'
    && typeof value.artifactFocused === 'boolean'
    && typeof value.artifactEditing === 'boolean'
    && typeof value.artifactEditDraft === 'string'
    && typeof value.artifactSelectedBlock === 'string'
    && typeof value.artifactPreviewPage === 'number'
    && typeof value.artifactScrollTop === 'number'
    && (value.packageEditingArtifactId === null || typeof value.packageEditingArtifactId === 'string')
    && typeof value.packageEditDraft === 'string'
    && isRecord(value.packageConfiguration)
    && typeof value.packageConfiguration.lessonCount === 'number'
    && typeof value.packageConfiguration.homeworkCount === 'number'
    && typeof value.packageConfiguration.quizMinutes === 'number'
    && typeof value.packageConfiguration.recordingMinutes === 'number'
    && typeof value.cursorRevision === 'number'
    && typeof value.commandSequence === 'number';
}

function isCommandReceipt(value: unknown): value is ConversationRunCommandReceipt {
  return isRecord(value)
    && typeof value.commandId === 'string'
    && (value.status === 'accepted' || value.status === 'duplicate' || value.status === 'rejected')
    && typeof value.cursor === 'string'
    && (value.reason === undefined || typeof value.reason === 'string')
    && (value.resultRef === undefined || typeof value.resultRef === 'string');
}

function loadStoredState(): StoredState {
  const empty = () => Object.freeze({ runtimes: Object.freeze({}), commands: Object.freeze({}) });
  if (typeof window === 'undefined') return empty();
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!isRecord(parsed) || parsed.version !== 6 || !isRecord(parsed.runtimes) || !isRecord(parsed.commands)) return empty();
    return Object.freeze({
      runtimes: Object.freeze(Object.fromEntries(Object.entries(parsed.runtimes).filter((entry): entry is [string, RuntimeState] => isRuntimeState(entry[1])))),
      commands: Object.freeze(Object.fromEntries(Object.entries(parsed.commands).filter((entry): entry is [string, ConversationRunCommandReceipt] => isCommandReceipt(entry[1])))),
    });
  } catch {
    return empty();
  }
}

function actorForCommand(command: ConversationRunCommand): ConversationRunEvent['actor'] {
  return command.type === 'supplement' ? 'teacher' : 'system';
}

function localEvent(
  runRef: string,
  id: string,
  sequence: number,
  actor: ConversationRunEvent['actor'],
  title: string,
  summary: string,
  state: ConversationRunEvent['state'] = 'completed',
  allowedCommands: readonly ConversationRunCommandType[] = Object.freeze([]),
): LocalEvent {
  const occurredAt = `deterministic:command:${String(sequence).padStart(3, '0')}`;
  return Object.freeze({
    id,
    runRef,
    occurredAt,
    updatedAt: occurredAt,
    actor,
    kind: actor === 'teacher' ? 'teacher_message' : 'system',
    state,
    title,
    summary,
    objectRefs: Object.freeze([]),
    allowedCommands: Object.freeze([...allowedCommands]),
  });
}

function commandEvents(runRef: string, command: ConversationRunCommand, sequence: number): readonly LocalEvent[] {
  if (command.type === 'revise_package_artifact') return Object.freeze([
    localEvent(runRef, command.id, sequence, 'agent', '方案包产物已创建新版本', command.instruction.trim()),
  ]);
  if (command.type !== 'supplement') return Object.freeze([]);
  const teacherEvent = localEvent(
    runRef, command.id, sequence, actorForCommand(command),
    command.materialScopeChange ? '教师提出范围调整' : '教师补充要求', command.text.trim(),
  );
  if (command.materialScopeChange) return Object.freeze([
    teacherEvent,
    localEvent(
      runRef,
      `${command.id}:replanning-required`,
      sequence + 1,
      'system',
      '教学范围变化需要重新规划',
      '确认后会生成新的核心上下文快照与执行计划，旧计划、过程和产物保留为历史证据。',
      'requires_teacher_input',
      ['confirm_replan', 'dismiss_replan'],
    ),
  ]);
  return Object.freeze([
    teacherEvent,
    localEvent(runRef, `${command.id}:applied`, sequence + 1, 'agent', '已应用到尚未开始的步骤', '已完成步骤和既有产物不会被静默覆盖。'),
  ]);
}

function normalizePackageConfiguration(configuration: ConversationRunPackageConfiguration): ConversationRunPackageConfiguration {
  const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? Math.round(value) : minimum));
  return Object.freeze({
    lessonCount: clamp(configuration.lessonCount, 1, 3),
    homeworkCount: clamp(configuration.homeworkCount, 1, 50),
    quizMinutes: clamp(configuration.quizMinutes, 5, 60),
    recordingMinutes: clamp(configuration.recordingMinutes, 1, 30),
  });
}

function organizingEvent(runRef: string): ConversationRunEvent {
  return Object.freeze({
    id: `${runRef}:organizing`,
    runRef,
    sequence: 2,
    occurredAt: 'deterministic:002',
    updatedAt: 'deterministic:002',
    actor: 'agent',
    kind: 'process',
    state: 'running',
    title: '正在整理任务与上下文',
    summary: '正在核对教学目标、已选择的课程对象和仍需补充的信息。',
    stepRef: `${runRef}:goal-understanding`,
    objectRefs: Object.freeze([]),
    allowedCommands: Object.freeze(['stop'] as const),
  });
}

function freezeRuntime(runtime: RuntimeState): RuntimeState {
  return Object.freeze({
    ...runtime,
    localEvents: Object.freeze([...runtime.localEvents]),
    eventOrder: Object.freeze([...runtime.eventOrder]),
    eventJournal: Object.freeze([...runtime.eventJournal]),
    contextExpandedIds: runtime.contextExpandedIds ? Object.freeze([...runtime.contextExpandedIds]) : null,
    progress: Object.freeze({ ...runtime.progress }),
    packageConfiguration: Object.freeze({ ...runtime.packageConfiguration }),
  });
}

export function createBrowserConversationRunScheduler(): ConversationRunScheduler {
  return Object.freeze({
    schedule: (delayMs, callback) => {
      const timer = window.setTimeout(callback, delayMs);
      return () => window.clearTimeout(timer);
    },
  });
}

export function createConversationRunHostPort(): ConversationRunHostPort {
  let current: ConversationRunHost | null = null;
  const listeners = new Set<() => void>();
  return Object.freeze({
    host: Object.freeze({
      open: (runRef: string) => current?.open(runRef) ?? null,
      execute: (runRef: string, command: ConversationRunCommand) => current?.execute(runRef, command) ?? Object.freeze({ status: 'rejected', reason: 'host-not-ready' }),
      subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
    }),
    bind: (host) => { current = host; for (const listener of listeners) listener(); },
  });
}

export function createConversationRunModule(host: ConversationRunHost, scheduler: ConversationRunScheduler): ConversationRunModule {
  const restored = loadStoredState();
  const runtimes = new Map<string, RuntimeState>(Object.entries(restored.runtimes));
  const processedCommands = new Map<string, ConversationRunCommandReceipt>(Object.entries(restored.commands));
  const listeners = new Map<string, Map<ConversationRunListener, string | null>>();
  const scheduled = new Map<string, () => void>();

  const persist = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 6,
      runtimes: Object.fromEntries(runtimes),
      commands: Object.fromEntries(processedCommands),
    }));
  };
  const defaultRuntime = (snapshot: ConversationRunHostSnapshot): RuntimeState => {
    const completed = snapshot.projection.events.some(({ kind }) => kind === 'artifact' || kind === 'receipt');
    return freezeRuntime({
      progress: completed
        ? { status: 'completed', completedCount: snapshot.progressStepCount, totalCount: snapshot.progressStepCount }
        : { status: 'organizing' },
      localEvents: Object.freeze([]),
      eventOrder: Object.freeze([]),
      eventJournal: Object.freeze([]),
      inspectorOpen: true,
      inspectorMode: snapshot.projection.presentation.inspectorMode,
      unreadOutputCount: 0,
      composerDraft: '',
      executingAction: false,
      pendingActionCommand: null,
      replanPending: false,
      contextExpandedIds: null,
      contextQuery: '',
      contextScrollTop: 0,
      artifactFocused: false,
      artifactEditing: false,
      artifactEditDraft: '把第 6 页案例改成函数图像辨析，并增加一页易错点总结。',
      artifactSelectedBlock: '第 6 页 · 图像辨析',
      artifactPreviewPage: 1,
      artifactScrollTop: 0,
      packageEditingArtifactId: null,
      packageEditDraft: '增加一道结合函数图像判断单调区间的探究题。',
      packageConfiguration: Object.freeze({ lessonCount: 2, homeworkCount: 12, quizMinutes: 15, recordingMinutes: 8 }),
      cursorRevision: 0,
      commandSequence: 0,
    });
  };
  const ensureRuntime = (runRef: string, snapshot: ConversationRunHostSnapshot): RuntimeState => {
    const existing = runtimes.get(runRef);
    if (existing) return existing;
    const created = defaultRuntime(snapshot);
    runtimes.set(runRef, created);
    persist();
    return created;
  };
  const project = (runRef: string): ConversationRunProjection | null => {
    const snapshot = host.open(runRef);
    if (!snapshot) return null;
    let runtime = ensureRuntime(runRef, snapshot);
    const base = snapshot.projection;
    const teacherEvent = base.events.find(({ kind }) => kind === 'teacher_message') ?? base.events[0];
    const organizing = Object.freeze({
      ...organizingEvent(runRef),
      state: runtime.progress.status === 'organizing' ? 'running' as const : 'completed' as const,
      allowedCommands: runtime.progress.status === 'organizing' ? Object.freeze(['stop'] as const) : Object.freeze([]),
    });
    const capabilityEvents = base.events.filter(({ kind }) => kind === 'capability_call');
    const packageProcessEvents = base.events.filter((event) => event.kind === 'process' && event.objectRefs.some(({ type }) => type === 'artifact'));
    const projectedBaseEvents = base.events.flatMap((event): ConversationRunEvent[] => {
      if (event.kind === 'capability_call') {
        if (runtime.progress.status === 'organizing' || runtime.progress.status === 'idle') return [];
        const index = capabilityEvents.findIndex(({ id }) => id === event.id);
        const completedCount = runtime.progress.status === 'running' || runtime.progress.status === 'stopped' || runtime.progress.status === 'completed' ? runtime.progress.completedCount : 0;
        const state = runtime.progress.status === 'completed' || index < completedCount
          ? 'completed' as const
          : runtime.progress.status === 'running' && index === runtime.progress.activeIndex ? 'running' as const : 'queued' as const;
        return [Object.freeze({
          ...event,
          state,
          allowedCommands: state === 'running' ? Object.freeze(['stop'] as const) : Object.freeze([]),
          detail: event.detail ? Object.freeze({ ...event.detail, elapsedLabel: state === 'running' ? '计算中' : state === 'queued' ? '等待执行' : event.detail.elapsedLabel }) : undefined,
        })];
      }
      if (event.kind === 'process' && base.taskKind === 'course_package' && packageProcessEvents.length) {
        const packageProgressState = runtime.progress.status === 'completed'
          ? 'completed' as const
          : runtime.progress.status === 'stopped' ? 'stopped' as const : 'running' as const;
        if (event.id.endsWith(':package-progress')) return [Object.freeze({
          ...event,
          state: packageProgressState,
          allowedCommands: packageProgressState === 'running' ? Object.freeze(['stop'] as const) : Object.freeze([]),
        })];
        if (event.summary.includes('已排除')) return [event];
        const index = packageProcessEvents.findIndex(({ id }) => id === event.id);
        const lastIndex = packageProcessEvents.length - 1;
        const phase = runtime.progress.status === 'running' ? Math.min(2, runtime.progress.activeIndex)
          : runtime.progress.status === 'stopped' ? Math.min(2, runtime.progress.completedCount) : 0;
        const state = runtime.progress.status === 'completed'
          ? 'completed' as const
          : index === 0 ? phase === 0 ? 'running' as const : 'completed' as const
            : index === lastIndex ? phase === 2 ? 'running' as const : 'queued' as const
              : phase === 0 ? 'queued' as const : phase === 1 ? 'running' as const : 'completed' as const;
        const version = event.objectRefs.find(({ type }) => type === 'artifact')?.version ?? '当前版本';
        const summary = `${version} · ${state === 'completed' ? '可预览' : state === 'running' ? '生成中' : '等待依赖'}`;
        return [Object.freeze({ ...event, state, summary, allowedCommands: Object.freeze([]) })];
      }
      return [event];
    });
    const packageCompletedOutputCount = projectedBaseEvents.filter((event) => event.kind === 'process'
      && !event.id.endsWith(':package-progress')
      && event.state === 'completed'
      && event.objectRefs.some(({ type }) => type === 'artifact')).length;
    const publishedBaseEvents = runtime.progress.status === 'organizing'
      ? []
      : projectedBaseEvents.filter(({ id }) => id !== teacherEvent?.id);
    const candidates = [teacherEvent, organizing, ...publishedBaseEvents, ...runtime.localEvents].filter(Boolean) as ConversationRunEvent[];
    const journalById = new Map(runtime.eventJournal.map((event) => [event.id, event]));
    for (const candidate of candidates) {
      journalById.set(candidate.id, Object.freeze({ ...candidate }));
    }
    const eventOrder = [...runtime.eventOrder];
    for (const event of candidates) if (!eventOrder.includes(event.id)) eventOrder.push(event.id);
    const eventJournal = eventOrder.map((id) => journalById.get(id)!).filter(Boolean);
    const journalChanged = eventJournal.some((event, index) => {
      const previous = runtime.eventJournal[index];
      return !previous || JSON.stringify(previous) !== JSON.stringify(event);
    });
    if (eventOrder.length !== runtime.eventOrder.length || eventOrder.some((id, index) => id !== runtime.eventOrder[index]) || journalChanged) {
      runtime = freezeRuntime({ ...runtime, eventOrder, eventJournal, cursorRevision: runtime.cursorRevision + 1 });
      runtimes.set(runRef, runtime);
      persist();
    }
    const events = Object.freeze(eventJournal.map((event, index) => Object.freeze({ ...event, sequence: index + 1 })));
    const status = runtime.progress.status === 'organizing'
      ? 'organizing'
      : runtime.progress.status === 'running'
        ? 'running'
        : runtime.progress.status === 'stopped' ? 'stopped'
          : runtime.progress.status === 'cancelled' ? 'cancelled' : base.status;
    const allowedCommands = runtime.progress.status === 'running'
      ? Object.freeze(['supplement', 'stop'] as const)
      : runtime.progress.status === 'stopped'
        ? Object.freeze(['supplement', 'resume'] as const)
        : runtime.progress.status === 'cancelled'
          ? Object.freeze([])
        : base.allowedCommands;
    return Object.freeze({
      ...base,
      status,
      events,
      cursor: `${events.length}:${runtime.cursorRevision}`,
      allowedCommands,
      presentation: Object.freeze({
        inspectorOpen: runtime.inspectorOpen,
        inspectorMode: runtime.inspectorMode,
        outputCount: base.taskKind === 'course_package'
          ? Math.max(base.presentation.outputCount, packageCompletedOutputCount)
          : base.presentation.outputCount,
        unreadOutputCount: runtime.unreadOutputCount,
        composerDraft: runtime.composerDraft,
        progress: runtime.progress,
        executingAction: runtime.executingAction,
        replanPending: runtime.replanPending,
        contextExpandedIds: runtime.contextExpandedIds,
        contextQuery: runtime.contextQuery,
        contextScrollTop: runtime.contextScrollTop,
        artifactFocused: runtime.artifactFocused,
        artifactEditing: runtime.artifactEditing,
        artifactEditDraft: runtime.artifactEditDraft,
        artifactSelectedBlock: runtime.artifactSelectedBlock,
        artifactPreviewPage: runtime.artifactPreviewPage,
        artifactScrollTop: runtime.artifactScrollTop,
        packageEditingArtifactId: runtime.packageEditingArtifactId,
        packageEditDraft: runtime.packageEditDraft,
        packageConfiguration: runtime.packageConfiguration,
      }),
    });
  };
  const replayFromCursor = (projection: ConversationRunProjection, cursor: string | null) => {
    if (cursor === null) return projection.events;
    const [countText, revisionText] = cursor.split(':');
    const count = Number.parseInt(countText ?? '0', 10) || 0;
    const revision = Number.parseInt(revisionText ?? '-1', 10);
    const currentRevision = Number.parseInt(projection.cursor.split(':')[1] ?? '-2', 10);
    return revision === currentRevision ? projection.events.slice(Math.max(0, Math.min(projection.events.length, count))) : projection.events;
  };
  const notify = (runRef: string) => {
    const projection = project(runRef);
    if (!projection) return;
    const runListeners = listeners.get(runRef);
    if (!runListeners) return;
    for (const [listener, cursor] of runListeners) {
      const delta = replayFromCursor(projection, cursor);
      listener(delta, projection);
      runListeners.set(listener, projection.cursor);
    }
  };
  const replaceRuntime = (runRef: string, update: (current: RuntimeState) => RuntimeState) => {
    const snapshot = host.open(runRef);
    if (!snapshot) return;
    project(runRef);
    const current = ensureRuntime(runRef, snapshot);
    runtimes.set(runRef, freezeRuntime(update(current)));
    persist();
    notify(runRef);
  };
  const cancelScheduled = (runRef: string) => {
    scheduled.get(runRef)?.();
    scheduled.delete(runRef);
  };
  const scheduleProgress = (runRef: string) => {
    cancelScheduled(runRef);
    const cancel = scheduler.schedule(360, () => {
      scheduled.delete(runRef);
      const snapshot = host.open(runRef);
      const runtime = snapshot ? ensureRuntime(runRef, snapshot) : null;
      if (!snapshot || !runtime) return;
      if (runtime.progress.status === 'organizing') {
        replaceRuntime(runRef, (current) => ({ ...current, progress: { status: 'idle' } }));
        return;
      }
      if (runtime.progress.status !== 'running') return;
      const completedCount = runtime.progress.completedCount + 1;
      const totalCount = runtime.progress.totalCount;
      if (completedCount >= totalCount) {
        replaceRuntime(runRef, (current) => ({
          ...current,
          progress: { status: 'completed', completedCount, totalCount },
          inspectorMode: 'output',
          unreadOutputCount: current.inspectorOpen
            ? 0
            : snapshot.projection.taskKind === 'courseware' ? 1 : snapshot.projection.presentation.outputCount,
        }));
        host.execute(runRef, { id: `${runRef}:complete-generation`, type: 'complete_generation' });
        return;
      }
      replaceRuntime(runRef, (current) => ({
        ...current,
        progress: { status: 'running', activeIndex: completedCount, completedCount, totalCount },
      }));
      scheduleProgress(runRef);
    });
    scheduled.set(runRef, cancel);
  };
  const scheduleActionExecution = (runRef: string, command: ConversationRunCommand) => {
    cancelScheduled(runRef);
    replaceRuntime(runRef, (current) => ({ ...current, executingAction: true, pendingActionCommand: command }));
    const cancel = scheduler.schedule(360, () => {
      scheduled.delete(runRef);
      const result = host.execute(runRef, command);
      replaceRuntime(runRef, (current) => ({
        ...current,
        executingAction: false,
        pendingActionCommand: null,
        localEvents: result.status === 'rejected'
          ? [...current.localEvents, localEvent(runRef, `${command.id}:rejected`, current.localEvents.length + 1, 'system', '执行未开始', result.reason, 'failed')]
          : current.localEvents,
      }));
    });
    scheduled.set(runRef, cancel);
  };

  const resetRun = (runRef: string) => {
    cancelScheduled(runRef);
    runtimes.delete(runRef);
    for (const commandId of processedCommands.keys()) if (commandId.startsWith(`${runRef}\u0000`)) processedCommands.delete(commandId);
    persist();
  };

  const ephemeralCommands = new Set<ConversationRunCommandType>(['set_inspector', 'set_context_inspector_state', 'set_artifact_inspector_state', 'set_composer_draft', 'set_scenario', 'select_package_artifact', 'set_package_configuration']);
  const alwaysAllowed = new Set<ConversationRunCommandType>([...ephemeralCommands, 'reset']);
  const isAllowed = (projection: ConversationRunProjection, runtime: RuntimeState, command: ConversationRunCommand) => alwaysAllowed.has(command.type)
    || projection.allowedCommands.includes(command.type)
    || (runtime.replanPending && (command.type === 'confirm_replan' || command.type === 'dismiss_replan'));

  host.subscribe?.(() => {
    for (const runRef of listeners.keys()) notify(runRef);
  });

  return Object.freeze({
    open: project,
    nextCommandId: (runRef: string) => {
      const snapshot = host.open(runRef);
      if (!snapshot) return `${runRef}:teacher-command:unavailable`;
      const current = ensureRuntime(runRef, snapshot);
      const commandSequence = current.commandSequence + 1;
      runtimes.set(runRef, freezeRuntime({ ...current, commandSequence }));
      persist();
      return `${runRef}:teacher-command:${String(commandSequence).padStart(4, '0')}`;
    },
    dispatch: (runRef: string, command: ConversationRunCommand): ConversationRunCommandReceipt => {
      const processedKey = `${runRef}\u0000${command.id}`;
      const rememberCommand = !ephemeralCommands.has(command.type);
      const duplicate = rememberCommand ? processedCommands.get(processedKey) : undefined;
      if (duplicate) return Object.freeze({ ...duplicate, status: 'duplicate' });
      if (command.type === 'reset') {
        resetRun(runRef);
        const receipt = Object.freeze({ commandId: command.id, status: 'accepted' as const, cursor: '0' });
        return receipt;
      }
      const snapshot = host.open(runRef);
      const projection = project(runRef);
      if (!snapshot || !projection) {
        const rejected = Object.freeze({ commandId: command.id, status: 'rejected' as const, cursor: '0', reason: 'run-not-found' });
        if (rememberCommand) processedCommands.set(processedKey, rejected);
        persist();
        return rejected;
      }
      const runtime = ensureRuntime(runRef, snapshot);
      if (!isAllowed(projection, runtime, command)) {
        const rejected = Object.freeze({ commandId: command.id, status: 'rejected' as const, cursor: projection.cursor, reason: 'command-not-allowed' });
        if (rememberCommand) processedCommands.set(processedKey, rejected);
        persist();
        return rejected;
      }
      let resultRef: string | null | void = undefined;
      if (command.type === 'set_inspector') {
        replaceRuntime(runRef, (current) => ({
          ...current,
          inspectorOpen: command.open ?? current.inspectorOpen,
          inspectorMode: command.mode ?? current.inspectorMode,
          unreadOutputCount: (command.mode ?? current.inspectorMode) === 'output' ? 0 : current.unreadOutputCount,
        }));
      } else if (command.type === 'set_composer_draft') {
        replaceRuntime(runRef, (current) => ({ ...current, composerDraft: command.text }));
      } else if (command.type === 'set_context_inspector_state') {
        replaceRuntime(runRef, (current) => ({
          ...current,
          contextExpandedIds: command.expandedIds ? Object.freeze([...command.expandedIds]) : current.contextExpandedIds,
          contextQuery: command.query ?? current.contextQuery,
          contextScrollTop: command.scrollTop ?? current.contextScrollTop,
        }));
      } else if (command.type === 'set_artifact_inspector_state') {
        replaceRuntime(runRef, (current) => ({
          ...current,
          artifactFocused: command.focused ?? current.artifactFocused,
          artifactEditing: command.editing ?? current.artifactEditing,
          artifactEditDraft: command.editDraft ?? current.artifactEditDraft,
          artifactSelectedBlock: command.selectedBlock ?? current.artifactSelectedBlock,
          artifactPreviewPage: command.previewPage ?? current.artifactPreviewPage,
          artifactScrollTop: command.scrollTop ?? current.artifactScrollTop,
          packageEditingArtifactId: command.packageEditingArtifactId === undefined ? current.packageEditingArtifactId : command.packageEditingArtifactId,
          packageEditDraft: command.packageEditDraft ?? current.packageEditDraft,
        }));
      } else if (command.type === 'set_package_configuration') {
        replaceRuntime(runRef, (current) => ({ ...current, packageConfiguration: normalizePackageConfiguration(command.configuration) }));
      } else if (command.type === 'start_plan' || command.type === 'begin_package') {
        const packageConfiguration = command.type === 'begin_package' ? normalizePackageConfiguration(command.configuration) : null;
        const packageConfigurationSummary = packageConfiguration
          ? `${packageConfiguration.lessonCount} 课时 · 作业 ${packageConfiguration.homeworkCount} 题 · 测验 ${packageConfiguration.quizMinutes} 分钟 · 录播 ${packageConfiguration.recordingMinutes} 分钟`
          : '';
        const hostResult = host.execute(runRef, command);
        if (hostResult.status === 'rejected') {
          const rejected = Object.freeze({ commandId: command.id, status: 'rejected' as const, cursor: projection.cursor, reason: hostResult.reason });
          if (rememberCommand) processedCommands.set(processedKey, rejected);
          persist();
          return rejected;
        }
        replaceRuntime(runRef, (current) => ({
          ...current,
          packageConfiguration: packageConfiguration ?? current.packageConfiguration,
          localEvents: command.type === 'begin_package'
            ? [...current.localEvents, localEvent(
              runRef,
              `${command.id}:configuration`,
              current.localEvents.length + 1,
              'system',
              '课程方案包范围已确认',
              packageConfigurationSummary,
            )]
            : current.localEvents,
          progress: { status: 'running', activeIndex: 0, completedCount: 0, totalCount: snapshot.progressStepCount },
        }));
        scheduleProgress(runRef);
      } else if (command.type === 'stop') {
        cancelScheduled(runRef);
        replaceRuntime(runRef, (current) => current.progress.status === 'running'
          ? {
            ...current,
            progress: { status: 'stopped', completedCount: current.progress.completedCount, totalCount: current.progress.totalCount },
            localEvents: [...current.localEvents, localEvent(
              runRef, command.id, current.localEvents.length + 1, 'system',
              snapshot.projection.taskKind === 'courseware' ? '任务执行已停止' : '课程方案包生成已停止',
              '已完成内容保持不变，当前和未开始步骤没有继续执行。', 'stopped', ['resume'],
            )],
          }
          : current);
      } else if (command.type === 'resume') {
        replaceRuntime(runRef, (current) => current.progress.status === 'stopped'
          ? {
            ...current,
            progress: { status: 'running', activeIndex: current.progress.completedCount, completedCount: current.progress.completedCount, totalCount: current.progress.totalCount },
            localEvents: [
              ...current.localEvents.map((event) => event.state === 'stopped' && event.allowedCommands.includes('resume')
                ? Object.freeze({ ...event, state: 'completed' as const, allowedCommands: Object.freeze([]) })
                : event),
              localEvent(
                runRef, command.id, current.localEvents.length + 1, 'system',
                snapshot.projection.taskKind === 'courseware' ? '任务已从停止位置继续' : '课程方案包已继续生成',
                '已完成内容不会重复执行。',
              ),
            ],
          }
          : current);
        scheduleProgress(runRef);
      } else if (command.type === 'cancel') {
        cancelScheduled(runRef);
        replaceRuntime(runRef, (current) => ({
          ...current,
          progress: { status: 'cancelled', completedCount: 0, totalCount: snapshot.progressStepCount },
          localEvents: [...current.localEvents, localEvent(runRef, command.id, current.localEvents.length + 1, 'system', '任务已取消', '当前任务没有继续执行，可重新开始一个任务。', 'cancelled')],
        }));
      } else if (command.type === 'execute_action') {
        scheduleActionExecution(runRef, command);
      } else {
        const hostResult = host.execute(runRef, command);
        if (hostResult.status === 'rejected') {
          const rejected = Object.freeze({ commandId: command.id, status: 'rejected' as const, cursor: projection.cursor, reason: hostResult.reason });
          if (rememberCommand) processedCommands.set(processedKey, rejected);
          persist();
          return rejected;
        }
        const nextLocalEvents = commandEvents(runRef, command, ensureRuntime(runRef, snapshot).localEvents.length + 1);
        if (nextLocalEvents.length) replaceRuntime(runRef, (current) => ({
          ...current,
          composerDraft: '',
          localEvents: [...current.localEvents, ...nextLocalEvents],
          replanPending: command.type === 'supplement' && Boolean(command.materialScopeChange) ? true : current.replanPending,
        }));
        resultRef = hostResult.resultRef;
        if (command.type === 'confirm_replan' || command.type === 'dismiss_replan') replaceRuntime(runRef, (current) => ({
          ...current,
          progress: command.type === 'confirm_replan' ? { status: 'idle' } : current.progress,
          replanPending: false,
          localEvents: current.localEvents.map((event) => event.allowedCommands.includes('confirm_replan') || event.allowedCommands.includes('dismiss_replan')
            ? Object.freeze({ ...event, state: 'completed' as const, allowedCommands: Object.freeze([]) })
            : event),
        }));
      }
      const next = project(runRef);
      const receipt = Object.freeze({ commandId: command.id, status: 'accepted' as const, cursor: next?.cursor ?? projection.cursor, resultRef: resultRef ?? undefined });
      if (rememberCommand) processedCommands.set(processedKey, receipt);
      persist();
      return receipt;
    },
    subscribe: (runRef: string, cursor: string | null, listener: ConversationRunListener) => {
      const set = listeners.get(runRef) ?? new Map<ConversationRunListener, string | null>();
      set.set(listener, cursor);
      listeners.set(runRef, set);
      const projection = project(runRef);
      if (projection) {
        const replay = replayFromCursor(projection, cursor);
        if (replay.length) listener(replay, projection);
        set.set(listener, projection.cursor);
        const progress = projection.presentation.progress;
        const runtime = runtimes.get(runRef);
        if (runtime?.pendingActionCommand) scheduleActionExecution(runRef, runtime.pendingActionCommand);
        else if (progress.status === 'organizing' || progress.status === 'running') scheduleProgress(runRef);
      }
      return () => {
        set.delete(listener);
        if (!set.size) listeners.delete(runRef);
      };
    },
  });
}
