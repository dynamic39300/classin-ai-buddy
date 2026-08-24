import { describe, expect, it } from 'vitest';
import { CLASS_AGENT_DEFINITIONS, DIRECT_CLASS_AGENT_BINDINGS } from '@mocks/scenarios/class-agent';
import { MESSAGE_THREADS } from '@mocks/scenarios/messages';
import { DirectConversationDirectoryModule } from './direct-conversation-directory';

describe('DirectConversationDirectoryModule', () => {
  it.each(['teacher', 'student-family'] as const)('projects only %s authorized Agent threads', (role) => {
    const projection = DirectConversationDirectoryModule.project({
      role,
      classId: 'physics-3',
      query: '',
      scope: 'agents',
      threads: MESSAGE_THREADS,
      definitions: CLASS_AGENT_DEFINITIONS,
      authoritativeBindings: DIRECT_CLASS_AGENT_BINDINGS,
    });

    expect(projection.totalAuthorizedAgents).toBe(4);
    expect(projection.sections).toHaveLength(1);
    expect(projection.sections[0]?.rows).toHaveLength(4);
    expect(projection.sections[0]?.rows.every(({ thread }) => thread.visibleTo.includes(role))).toBe(true);
  });

  it('finds an Agent by capability keyword before showing people results', () => {
    const projection = DirectConversationDirectoryModule.project({
      role: 'teacher',
      classId: 'physics-3',
      query: '变量',
      scope: 'all',
      threads: MESSAGE_THREADS,
      definitions: CLASS_AGENT_DEFINITIONS,
      authoritativeBindings: DIRECT_CLASS_AGENT_BINDINGS,
    });

    expect(projection.sections[0]?.id).toBe('agents');
    expect(projection.sections[0]?.rows.map(({ agent }) => agent?.name)).toEqual(['实验探究助手']);
  });

  it('projects people separately without leaking Agent rows', () => {
    const projection = DirectConversationDirectoryModule.project({
      role: 'teacher',
      classId: 'physics-3',
      query: '',
      scope: 'people',
      threads: MESSAGE_THREADS,
      definitions: CLASS_AGENT_DEFINITIONS,
      authoritativeBindings: DIRECT_CLASS_AGENT_BINDINGS,
    });

    expect(projection.totalPeople).toBeGreaterThan(0);
    expect(projection.sections.every(({ id }) => id === 'people')).toBe(true);
    expect(projection.sections.flatMap(({ rows }) => rows).every(({ kind }) => kind === 'person')).toBe(true);
  });

  it('does not expose an Agent thread whose role binding is absent', () => {
    const teacherAgentThreads = MESSAGE_THREADS.filter((thread) => (
      thread.classAgentBinding?.channel !== 'private-direct'
      || thread.classAgentBinding.participantRole !== 'teacher'
    ));
    const projection = DirectConversationDirectoryModule.project({
      role: 'teacher',
      classId: 'physics-3',
      query: '',
      scope: 'agents',
      threads: teacherAgentThreads,
      definitions: CLASS_AGENT_DEFINITIONS,
      authoritativeBindings: DIRECT_CLASS_AGENT_BINDINGS,
    });

    expect(projection.totalAuthorizedAgents).toBe(0);
    expect(projection.sections).toEqual([]);
  });

  it('fails closed when a Thread carries a stale authorization version', () => {
    const staleThreads = MESSAGE_THREADS.map((thread) => thread.id === 'direct-class-agent-physics-3-teacher'
      ? {
        ...thread,
        classAgentBinding: thread.classAgentBinding
          ? { ...thread.classAgentBinding, authorizationVersion: 'stale-v0' }
          : undefined,
      }
      : thread);
    const projection = DirectConversationDirectoryModule.project({
      role: 'teacher',
      classId: 'physics-3',
      query: '',
      scope: 'agents',
      threads: staleThreads,
      definitions: CLASS_AGENT_DEFINITIONS,
      authoritativeBindings: DIRECT_CLASS_AGENT_BINDINGS,
    });

    expect(projection.totalAuthorizedAgents).toBe(3);
    expect(projection.sections.flatMap(({ rows }) => rows).some(({ thread }) => (
      thread.id === 'direct-class-agent-physics-3-teacher'
    ))).toBe(false);
  });
});
