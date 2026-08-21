import { beforeEach, describe, expect, it } from 'vitest';
import type { ConversationRunCommand, ConversationRunProjection } from '@contracts/workbuddy/conversation-run';
import {
  createConversationRunModule,
  type ConversationRunHost,
  type ConversationRunScheduler,
} from './conversation-run-module';

function baseProjection(): ConversationRunProjection {
  const event = (id: string, sequence: number, kind: 'teacher_message' | 'goal_understood') => Object.freeze({
    id,
    runRef: 'run-1',
    sequence,
    occurredAt: `deterministic:${sequence}`,
    updatedAt: `deterministic:${sequence}`,
    actor: kind === 'teacher_message' ? 'teacher' as const : 'agent' as const,
    kind,
    state: 'completed' as const,
    title: kind === 'teacher_message' ? '教学目标' : '已理解你的目标',
    summary: kind === 'teacher_message' ? '生成函数单调性智能课件' : '将生成可复查的智能课件',
    objectRefs: Object.freeze([]),
    allowedCommands: Object.freeze([]),
  });
  const events = Object.freeze([event('goal', 1, 'teacher_message'), event('understanding', 2, 'goal_understood')]);
  return Object.freeze({
    runRef: 'run-1', taskKind: 'courseware', title: '函数单调性智能课件', goal: '生成函数单调性智能课件',
    status: 'needs_information', events, cursor: '2', allowedCommands: Object.freeze(['start_plan', 'supplement'] as const),
    presentation: Object.freeze({
      inspectorOpen: true, inspectorMode: 'context', outputCount: 0, unreadOutputCount: 0,
      composerDraft: '', progress: Object.freeze({ status: 'idle' as const }), executingAction: false, replanPending: false,
      contextExpandedIds: null, contextQuery: '', contextScrollTop: 0,
      artifactFocused: false, artifactEditing: false, artifactEditDraft: '', artifactSelectedBlock: '', artifactPreviewPage: 1, artifactScrollTop: 0,
      packageEditingArtifactId: null, packageEditDraft: '',
      packageConfiguration: Object.freeze({ lessonCount: 2, homeworkCount: 12, quizMinutes: 15, recordingMinutes: 8 }),
    }),
  });
}

function manualScheduler() {
  const callbacks: Array<() => void> = [];
  const scheduler: ConversationRunScheduler = Object.freeze({
    schedule: (_delayMs, callback) => {
      callbacks.push(callback);
      return () => {
        const index = callbacks.indexOf(callback);
        if (index >= 0) callbacks.splice(index, 1);
      };
    },
  });
  return Object.freeze({
    scheduler,
    advance: () => callbacks.shift()?.(),
    pendingCount: () => callbacks.length,
  });
}

describe('ConversationRun Deep Module', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('owns organizing and step timing behind open, dispatch and subscribe', () => {
    const clock = manualScheduler();
    const executed: ConversationRunCommand[] = [];
    const host: ConversationRunHost = Object.freeze({
      open: () => Object.freeze({ projection: baseProjection(), progressStepCount: 2 }),
      execute: (_runRef, command) => { executed.push(command); return Object.freeze({ status: 'accepted' as const }); },
    });
    const module = createConversationRunModule(host, clock.scheduler);
    const updates: string[] = [];
    const unsubscribe = module.subscribe('run-1', null, (_events, projection) => updates.push(projection.presentation.progress.status));

    expect(module.open('run-1')?.events.map(({ id }) => id)).toEqual(['goal', 'run-1:organizing']);
    expect(module.open('run-1')).toMatchObject({ status: 'organizing' });
    expect(clock.pendingCount()).toBe(1);
    clock.advance();
    expect(module.open('run-1')?.events.map(({ id }) => id)).toEqual(['goal', 'run-1:organizing', 'understanding']);

    module.dispatch('run-1', { id: 'start-1', type: 'start_plan' });
    expect(module.open('run-1')).toMatchObject({
      status: 'running',
      allowedCommands: ['supplement', 'stop'],
      presentation: { progress: { status: 'running', activeIndex: 0 } },
    });
    clock.advance();
    expect(module.open('run-1')?.presentation.progress).toMatchObject({ status: 'running', activeIndex: 1 });
    clock.advance();
    expect(module.open('run-1')?.presentation.progress).toMatchObject({ status: 'completed', completedCount: 2 });
    expect(executed.map(({ type }) => type)).toEqual(['start_plan', 'complete_generation']);
    expect(updates).toContain('organizing');
    expect(updates).toContain('completed');
    unsubscribe();
  });

  it('persists inspector, composer and supplemental event state by stable Run ID', () => {
    const clock = manualScheduler();
    const host: ConversationRunHost = Object.freeze({
      open: () => Object.freeze({ projection: baseProjection(), progressStepCount: 2 }),
      execute: () => Object.freeze({ status: 'accepted' as const }),
    });
    const first = createConversationRunModule(host, clock.scheduler);
    first.dispatch('run-1', { id: 'inspector-1', type: 'set_inspector', mode: 'output', open: false });
    first.dispatch('run-1', { id: 'context-inspector-1', type: 'set_context_inspector_state', expandedIds: ['class-1'], query: '函数', scrollTop: 72 });
    first.dispatch('run-1', { id: 'artifact-inspector-1', type: 'set_artifact_inspector_state', editing: true, editDraft: '保留未提交修改', selectedBlock: '第 6 页', previewPage: 6, scrollTop: 128, packageEditingArtifactId: 'artifact-homework', packageEditDraft: '增加探究题' });
    first.dispatch('run-1', { id: 'draft-1', type: 'set_composer_draft', text: '增加课堂讨论' });
    first.dispatch('run-1', { id: 'supplement-1', type: 'supplement', text: '增加课堂讨论' });

    const restored = createConversationRunModule(host, clock.scheduler).open('run-1');
    expect(restored?.presentation).toMatchObject({
      inspectorOpen: false, inspectorMode: 'output', composerDraft: '',
      contextExpandedIds: ['class-1'], contextQuery: '函数', contextScrollTop: 72,
      artifactEditing: true, artifactEditDraft: '保留未提交修改', artifactSelectedBlock: '第 6 页', artifactPreviewPage: 6, artifactScrollTop: 128,
      packageEditingArtifactId: 'artifact-homework', packageEditDraft: '增加探究题',
    });
    expect(restored?.events.map(({ id }) => id)).toContain('supplement-1');
    expect(restored?.events.every(({ actor, updatedAt, allowedCommands }) => Boolean(actor && updatedAt && allowedCommands))).toBe(true);
  });

  it('persists package configuration and publishes the confirmed values into the Run journal', () => {
    const clock = manualScheduler();
    const packageProjection = Object.freeze({
      ...baseProjection(), taskKind: 'course_package' as const,
      allowedCommands: Object.freeze(['begin_package'] as const),
    });
    const host: ConversationRunHost = Object.freeze({
      open: () => Object.freeze({ projection: packageProjection, progressStepCount: 3 }),
      execute: () => Object.freeze({ status: 'accepted' as const }),
    });
    const configuration = Object.freeze({ lessonCount: 3, homeworkCount: 16, quizMinutes: 20, recordingMinutes: 12 });
    const first = createConversationRunModule(host, clock.scheduler);
    first.dispatch('run-1', { id: 'package-config-draft', type: 'set_package_configuration', configuration });
    expect(createConversationRunModule(host, clock.scheduler).open('run-1')?.presentation.packageConfiguration).toEqual(configuration);

    first.dispatch('run-1', { id: 'package-begin-1', type: 'begin_package', configuration });
    const projection = first.open('run-1');
    expect(projection?.presentation.packageConfiguration).toEqual(configuration);
    expect(projection?.events.find(({ id }) => id === 'package-begin-1:configuration')?.summary)
      .toBe('3 课时 · 作业 16 题 · 测验 20 分钟 · 录播 12 分钟');
  });

  it('rejects forbidden commands and persists duplicate command receipts', () => {
    const clock = manualScheduler();
    const host: ConversationRunHost = Object.freeze({
      open: () => Object.freeze({ projection: baseProjection(), progressStepCount: 2 }),
      execute: () => Object.freeze({ status: 'accepted' as const }),
    });
    const first = createConversationRunModule(host, clock.scheduler);
    expect(first.dispatch('run-1', { id: 'forbidden-1', type: 'approve_action' })).toMatchObject({ status: 'rejected', reason: 'command-not-allowed' });
    expect(first.dispatch('run-1', { id: 'supplement-stable-1', type: 'supplement', text: '增加课堂讨论' })).toMatchObject({ status: 'accepted' });

    const restored = createConversationRunModule(host, manualScheduler().scheduler);
    expect(restored.dispatch('run-1', { id: 'supplement-stable-1', type: 'supplement', text: '增加课堂讨论' })).toMatchObject({ status: 'duplicate' });
  });

  it('keeps published event sequence stable when later domain events arrive', () => {
    const clock = manualScheduler();
    let projection = baseProjection();
    const host: ConversationRunHost = Object.freeze({
      open: () => Object.freeze({ projection, progressStepCount: 2 }),
      execute: () => Object.freeze({ status: 'accepted' as const }),
    });
    const module = createConversationRunModule(host, clock.scheduler);
    module.subscribe('run-1', null, () => undefined);
    module.dispatch('run-1', { id: 'supplement-order-1', type: 'supplement', text: '增加课堂讨论' });
    const originalSequence = module.open('run-1')?.events.find(({ id }) => id === 'supplement-order-1')?.sequence;
    const artifact = Object.freeze({
      ...projection.events[1]!, id: 'artifact-1', kind: 'artifact' as const, title: '课件已生成', summary: 'v1',
    });
    projection = Object.freeze({ ...projection, events: Object.freeze([...projection.events, artifact]), cursor: '3' });
    clock.advance();

    expect(module.open('run-1')?.events.find(({ id }) => id === 'supplement-order-1')?.sequence).toBe(originalSequence);
    expect(module.open('run-1')?.events.at(-1)?.id).toBe('artifact-1');
  });

  it('replays an in-place event update when the event count does not change', () => {
    const clock = manualScheduler();
    let projection = baseProjection();
    let publishHostUpdate: () => void = () => undefined;
    const host: ConversationRunHost = Object.freeze({
      open: () => Object.freeze({ projection, progressStepCount: 2 }),
      execute: () => Object.freeze({ status: 'accepted' as const }),
      subscribe: (listener) => { publishHostUpdate = listener; return () => undefined; },
    });
    const module = createConversationRunModule(host, clock.scheduler);
    const releaseOrganizer = module.subscribe('run-1', null, () => undefined);
    clock.advance();
    releaseOrganizer();
    const initial = module.open('run-1')!;
    const batches: string[][] = [];
    const unsubscribe = module.subscribe('run-1', initial.cursor, (events) => batches.push(events.map(({ summary }) => summary)));

    projection = Object.freeze({
      ...projection,
      events: Object.freeze(projection.events.map((event) => event.id === 'understanding'
        ? Object.freeze({ ...event, summary: '将生成经过质量检查的智能课件', updatedAt: 'deterministic:003' })
        : event)),
    });
    publishHostUpdate();

    expect(batches).toHaveLength(1);
    expect(batches[0]).toContain('将生成经过质量检查的智能课件');
    unsubscribe();
  });

  it('resumes an in-flight action after reload and reset clears all Run runtime', () => {
    const firstClock = manualScheduler();
    const executed: string[] = [];
    const executableProjection = Object.freeze({ ...baseProjection(), allowedCommands: Object.freeze(['execute_action', 'supplement'] as const) });
    const host: ConversationRunHost = Object.freeze({
      open: () => Object.freeze({ projection: executableProjection, progressStepCount: 2 }),
      execute: (_runRef, command) => { executed.push(command.type); return Object.freeze({ status: 'accepted' as const }); },
    });
    const first = createConversationRunModule(host, firstClock.scheduler);
    first.dispatch('run-1', { id: 'run-1:execute-action-1', type: 'execute_action' });
    expect(first.open('run-1')?.presentation.executingAction).toBe(true);

    const restoredClock = manualScheduler();
    const restored = createConversationRunModule(host, restoredClock.scheduler);
    expect(restored.open('run-1')?.presentation.executingAction).toBe(true);
    restored.subscribe('run-1', null, () => undefined);
    expect(restoredClock.pendingCount()).toBe(1);
    restoredClock.advance();
    expect(executed).toEqual(['execute_action']);
    expect(restored.open('run-1')?.presentation.executingAction).toBe(false);

    restored.dispatch('run-1', { id: 'run-1:reset', type: 'reset' });
    const afterReset = restored.open('run-1');
    expect(afterReset?.status).toBe('organizing');
    expect(afterReset?.events.map(({ id }) => id)).not.toContain('supplement-order-1');
    expect(restored.dispatch('run-1', { id: 'run-1:execute-action-1', type: 'execute_action' })).toMatchObject({ status: 'accepted' });
  });

  it('cancels a pre-execution Run and publishes a recoverable terminal event', () => {
    const clock = manualScheduler();
    const cancellable = Object.freeze({ ...baseProjection(), allowedCommands: Object.freeze(['start_plan', 'supplement', 'cancel'] as const) });
    const host: ConversationRunHost = Object.freeze({
      open: () => Object.freeze({ projection: cancellable, progressStepCount: 2 }),
      execute: () => Object.freeze({ status: 'accepted' as const }),
    });
    const module = createConversationRunModule(host, clock.scheduler);
    expect(module.dispatch('run-1', { id: 'cancel-1', type: 'cancel' })).toMatchObject({ status: 'accepted' });
    expect(module.open('run-1')).toMatchObject({ status: 'stopped', presentation: { progress: { status: 'stopped' } } });
    expect(module.open('run-1')?.events.at(-1)).toMatchObject({ id: 'cancel-1', state: 'cancelled', title: '任务已取消' });
  });
});
