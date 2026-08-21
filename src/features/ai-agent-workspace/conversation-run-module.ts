import type {
  ConversationRunCommand,
  ConversationRunCommandReceipt,
  ConversationRunEvent,
  ConversationRunListener,
  ConversationRunModule,
  ConversationRunProgress,
  ConversationRunProjection,
} from '@contracts/workbuddy/conversation-run';

export type ConversationRunHostSnapshot = Readonly<{
  projection: ConversationRunProjection;
  progressStepCount: number;
}>;

export type ConversationRunHost = Readonly<{
  open: (runRef: string) => ConversationRunHostSnapshot | null;
  execute: (runRef: string, command: ConversationRunCommand) => string | null | void;
}>;

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
  inspectorOpen: boolean;
  inspectorMode: 'context' | 'output';
  unreadOutputCount: number;
  composerDraft: string;
  executingAction: boolean;
  replanPending: boolean;
}>;

type StoredRuntime = Readonly<Record<string, RuntimeState>>;
const STORAGE_KEY = 'workbuddy:conversation-run:v2';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isProgress(value: unknown): value is ConversationRunProgress {
  if (!isRecord(value) || typeof value.status !== 'string') return false;
  if (value.status === 'organizing' || value.status === 'idle') return true;
  if (value.status === 'completed' || value.status === 'stopped') {
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
    && typeof value.actor === 'string'
    && typeof value.kind === 'string'
    && typeof value.state === 'string'
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
    && typeof value.inspectorOpen === 'boolean'
    && (value.inspectorMode === 'context' || value.inspectorMode === 'output')
    && typeof value.unreadOutputCount === 'number'
    && typeof value.composerDraft === 'string'
    && typeof value.executingAction === 'boolean'
    && typeof value.replanPending === 'boolean';
}

function loadStoredRuntime(): StoredRuntime {
  if (typeof window === 'undefined') return Object.freeze({});
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!isRecord(parsed) || parsed.version !== 2 || !isRecord(parsed.runs)) return Object.freeze({});
    return Object.freeze(Object.fromEntries(Object.entries(parsed.runs).filter((entry): entry is [string, RuntimeState] => isRuntimeState(entry[1]))));
  } catch {
    return Object.freeze({});
  }
}

function actorForCommand(command: ConversationRunCommand): ConversationRunEvent['actor'] {
  return command.type === 'supplement' ? 'teacher' : 'system';
}

function localEvent(runRef: string, id: string, sequence: number, actor: ConversationRunEvent['actor'], title: string, summary: string, state: ConversationRunEvent['state'] = 'completed'): LocalEvent {
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
    allowedCommands: Object.freeze([]),
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
  if (command.materialScopeChange) return Object.freeze([teacherEvent]);
  return Object.freeze([
    teacherEvent,
    localEvent(runRef, `${command.id}:applied`, sequence + 1, 'agent', '已应用到尚未开始的步骤', '已完成步骤和既有产物不会被静默覆盖。'),
  ]);
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
  return Object.freeze({ ...runtime, localEvents: Object.freeze([...runtime.localEvents]), progress: Object.freeze({ ...runtime.progress }) });
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
  return Object.freeze({
    host: Object.freeze({
      open: (runRef: string) => current?.open(runRef) ?? null,
      execute: (runRef: string, command: ConversationRunCommand) => current?.execute(runRef, command),
    }),
    bind: (host) => { current = host; },
  });
}

export function createConversationRunModule(host: ConversationRunHost, scheduler: ConversationRunScheduler): ConversationRunModule {
  const restored = loadStoredRuntime();
  const runtimes = new Map<string, RuntimeState>(Object.entries(restored));
  const processedCommands = new Map<string, ConversationRunCommandReceipt>();
  const listeners = new Map<string, Set<ConversationRunListener>>();
  const scheduled = new Map<string, () => void>();

  const persist = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, runs: Object.fromEntries(runtimes) }));
  };
  const defaultRuntime = (snapshot: ConversationRunHostSnapshot): RuntimeState => {
    const completed = snapshot.projection.events.some(({ kind }) => kind === 'artifact' || kind === 'receipt');
    return freezeRuntime({
      progress: completed
        ? { status: 'completed', completedCount: snapshot.progressStepCount, totalCount: snapshot.progressStepCount }
        : { status: 'organizing' },
      localEvents: Object.freeze([]),
      inspectorOpen: true,
      inspectorMode: snapshot.projection.presentation.inspectorMode,
      unreadOutputCount: 0,
      composerDraft: '',
      executingAction: false,
      replanPending: false,
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
    const runtime = ensureRuntime(runRef, snapshot);
    const base = snapshot.projection;
    const baseEvents = runtime.progress.status === 'organizing'
      ? [base.events.find(({ kind }) => kind === 'teacher_message') ?? base.events[0], organizingEvent(runRef)].filter(Boolean) as ConversationRunEvent[]
      : [...base.events];
    const events = Object.freeze([...baseEvents, ...runtime.localEvents].map((event, index) => Object.freeze({ ...event, sequence: index + 1 })));
    const status = runtime.progress.status === 'organizing'
      ? 'organizing'
      : runtime.progress.status === 'running'
        ? 'running'
        : runtime.progress.status === 'stopped' ? 'stopped' : base.status;
    const allowedCommands = runtime.progress.status === 'running'
      ? Object.freeze(['supplement', 'stop'] as const)
      : runtime.progress.status === 'stopped'
        ? Object.freeze(['supplement', 'resume'] as const)
        : base.allowedCommands;
    return Object.freeze({
      ...base,
      status,
      events,
      cursor: String(events.length),
      allowedCommands,
      presentation: Object.freeze({
        inspectorOpen: runtime.inspectorOpen,
        inspectorMode: runtime.inspectorMode,
        outputCount: base.presentation.outputCount,
        unreadOutputCount: runtime.unreadOutputCount,
        composerDraft: runtime.composerDraft,
        progress: runtime.progress,
        executingAction: runtime.executingAction,
        replanPending: runtime.replanPending,
      }),
    });
  };
  const notify = (runRef: string, previousCursor: number) => {
    const projection = project(runRef);
    if (!projection) return;
    const delta = projection.events.slice(previousCursor);
    for (const listener of listeners.get(runRef) ?? []) listener(delta, projection);
  };
  const replaceRuntime = (runRef: string, update: (current: RuntimeState) => RuntimeState) => {
    const snapshot = host.open(runRef);
    if (!snapshot) return;
    const currentProjection = project(runRef);
    const previousCursor = currentProjection?.events.length ?? 0;
    const current = ensureRuntime(runRef, snapshot);
    runtimes.set(runRef, freezeRuntime(update(current)));
    persist();
    notify(runRef, previousCursor);
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
    replaceRuntime(runRef, (current) => ({ ...current, executingAction: true }));
    const cancel = scheduler.schedule(360, () => {
      scheduled.delete(runRef);
      host.execute(runRef, command);
      replaceRuntime(runRef, (current) => ({ ...current, executingAction: false }));
    });
    scheduled.set(runRef, cancel);
  };

  return Object.freeze({
    open: project,
    dispatch: (runRef: string, command: ConversationRunCommand): ConversationRunCommandReceipt => {
      const duplicate = processedCommands.get(command.id);
      if (duplicate) return Object.freeze({ ...duplicate, status: 'duplicate' });
      const snapshot = host.open(runRef);
      const projection = project(runRef);
      if (!snapshot || !projection) return Object.freeze({ commandId: command.id, status: 'rejected', cursor: '0', reason: 'run-not-found' });
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
      } else if (command.type === 'start_plan' || command.type === 'begin_package') {
        host.execute(runRef, command);
        replaceRuntime(runRef, (current) => ({
          ...current,
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
              '已完成内容保持不变，当前和未开始步骤没有继续执行。', 'cancelled',
            )],
          }
          : current);
      } else if (command.type === 'resume') {
        replaceRuntime(runRef, (current) => current.progress.status === 'stopped'
          ? {
            ...current,
            progress: { status: 'running', activeIndex: current.progress.completedCount, completedCount: current.progress.completedCount, totalCount: current.progress.totalCount },
            localEvents: [...current.localEvents, localEvent(
              runRef, command.id, current.localEvents.length + 1, 'system',
              snapshot.projection.taskKind === 'courseware' ? '任务已从停止位置继续' : '课程方案包已继续生成',
              '已完成内容不会重复执行。',
            )],
          }
          : current);
        scheduleProgress(runRef);
      } else if (command.type === 'execute_action') {
        scheduleActionExecution(runRef, command);
      } else {
        const nextLocalEvents = commandEvents(runRef, command, ensureRuntime(runRef, snapshot).localEvents.length + 1);
        if (nextLocalEvents.length) replaceRuntime(runRef, (current) => ({
          ...current,
          composerDraft: '',
          localEvents: [...current.localEvents, ...nextLocalEvents],
          replanPending: command.type === 'supplement' && Boolean(command.materialScopeChange) ? true : current.replanPending,
        }));
        resultRef = host.execute(runRef, command);
        if (command.type === 'confirm_replan') replaceRuntime(runRef, (current) => ({ ...current, progress: { status: 'idle' }, replanPending: false }));
        if (command.type === 'dismiss_replan') replaceRuntime(runRef, (current) => ({ ...current, replanPending: false }));
      }
      const next = project(runRef);
      const receipt = Object.freeze({ commandId: command.id, status: 'accepted' as const, cursor: next?.cursor ?? projection.cursor, resultRef: resultRef ?? undefined });
      processedCommands.set(command.id, receipt);
      return receipt;
    },
    subscribe: (runRef: string, cursor: string | null, listener: ConversationRunListener) => {
      const set = listeners.get(runRef) ?? new Set<ConversationRunListener>();
      set.add(listener);
      listeners.set(runRef, set);
      const projection = project(runRef);
      if (projection) {
        const index = cursor === null ? 0 : Math.max(0, Math.min(projection.events.length, Number.parseInt(cursor, 10) || 0));
        const replay = projection.events.slice(index);
        if (replay.length) listener(replay, projection);
        const progress = projection.presentation.progress;
        if (progress.status === 'organizing' || progress.status === 'running') scheduleProgress(runRef);
      }
      return () => {
        set.delete(listener);
        if (!set.size) listeners.delete(runRef);
      };
    },
  });
}
