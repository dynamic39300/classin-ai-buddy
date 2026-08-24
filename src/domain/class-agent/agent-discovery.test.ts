import { describe, expect, it } from 'vitest';
import {
  CLASS_AGENT_DEFINITIONS,
  HOMEWORK_CORRECTION_AGENT,
  PHYSICS_CLASS_AGENT,
  PUBLIC_CLASS_AGENT_BINDINGS,
} from '@mocks/scenarios/class-agent';
import { AgentDiscoveryModule } from './agent-discovery';

function project(query: string, role: 'teacher' | 'student-family' = 'teacher') {
  return AgentDiscoveryModule.project({
    role,
    classId: 'physics-3',
    channel: 'public-class',
    mode: 'agent-only',
    query,
    definitions: CLASS_AGENT_DEFINITIONS,
    bindings: PUBLIC_CLASS_AGENT_BINDINGS,
  });
}

describe('AgentDiscoveryModule', () => {
  it('projects the same authorized class Agents for teacher and student-family', () => {
    const teacher = project('', 'teacher');
    const student = project('', 'student-family');
    expect(teacher.totalAuthorized).toBe(4);
    expect(student.candidates.map(({ agent }) => agent.id)).toEqual(
      teacher.candidates.map(({ agent }) => agent.id),
    );
  });

  it('finds Agents by name, alias, subject context, and capability keywords', () => {
    expect(project('物理助手').candidates[0]?.agent.id).toBe(PHYSICS_CLASS_AGENT.id);
    expect(project('错题').candidates[0]?.agent.id).toBe(HOMEWORK_CORRECTION_AGENT.id);
    expect(project('高二物理').candidates).toHaveLength(4);
  });

  it('revalidates authorization version when selecting', () => {
    const projection = project('物理');
    const selected = AgentDiscoveryModule.select({
      projection,
      agentId: PHYSICS_CLASS_AGENT.id,
      currentBindings: PUBLIC_CLASS_AGENT_BINDINGS,
    });
    expect(selected.status).toBe('selected');
    if (selected.status === 'selected') {
      expect(selected.mention?.agentId).toBe(PHYSICS_CLASS_AGENT.id);
      expect(selected.mention?.displayNameSnapshot).toBe(PHYSICS_CLASS_AGENT.name);
    }

    const stale = AgentDiscoveryModule.select({
      projection,
      agentId: PHYSICS_CLASS_AGENT.id,
      currentBindings: PUBLIC_CLASS_AGENT_BINDINGS.map((binding) => binding.agentId === PHYSICS_CLASS_AGENT.id
        ? { ...binding, authorizationVersion: 'v2' }
        : binding),
    });
    expect(stale).toEqual({ status: 'stale' });
  });

  it('never leaks bindings from another class or private role', () => {
    const projection = AgentDiscoveryModule.project({
      role: 'student-family',
      classId: 'physics-3',
      channel: 'private-direct',
      mode: 'direct-agent',
      query: '',
      definitions: CLASS_AGENT_DEFINITIONS,
      bindings: [
        { ...PUBLIC_CLASS_AGENT_BINDINGS[0]!, channel: 'private-direct', participantRole: 'teacher' },
        { ...PUBLIC_CLASS_AGENT_BINDINGS[1]!, classId: 'another-class', channel: 'private-direct', participantRole: 'student-family' },
      ],
    });
    expect(projection.candidates).toHaveLength(0);
  });
});
