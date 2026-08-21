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
    status: 'needs_information', events, cursor: '2', allowedCommands: Object.freeze(['supplement'] as const),
    presentation: Object.freeze({
      inspectorOpen: true, inspectorMode: 'context', outputCount: 0, unreadOutputCount: 0,
      composerDraft: '', progress: Object.freeze({ status: 'idle' as const }), executingAction: false, replanPending: false,
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
      execute: (_runRef, command) => { executed.push(command); },
    });
    const module = createConversationRunModule(host, clock.scheduler);
    const updates: string[] = [];
    const unsubscribe = module.subscribe('run-1', null, (_events, projection) => updates.push(projection.presentation.progress.status));

    expect(module.open('run-1')?.events.map(({ id }) => id)).toEqual(['goal', 'run-1:organizing']);
    expect(module.open('run-1')).toMatchObject({ status: 'organizing' });
    expect(clock.pendingCount()).toBe(1);
    clock.advance();
    expect(module.open('run-1')?.events.map(({ id }) => id)).toEqual(['goal', 'understanding']);

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
      execute: () => undefined,
    });
    const first = createConversationRunModule(host, clock.scheduler);
    first.dispatch('run-1', { id: 'inspector-1', type: 'set_inspector', mode: 'output', open: false });
    first.dispatch('run-1', { id: 'draft-1', type: 'set_composer_draft', text: '增加课堂讨论' });
    first.dispatch('run-1', { id: 'supplement-1', type: 'supplement', text: '增加课堂讨论' });

    const restored = createConversationRunModule(host, clock.scheduler).open('run-1');
    expect(restored?.presentation).toMatchObject({ inspectorOpen: false, inspectorMode: 'output', composerDraft: '' });
    expect(restored?.events.map(({ id }) => id)).toContain('supplement-1');
    expect(restored?.events.every(({ actor, updatedAt, allowedCommands }) => Boolean(actor && updatedAt && allowedCommands))).toBe(true);
  });
});
