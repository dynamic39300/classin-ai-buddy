import type { AgentDiscoveryProjection } from '@domain/class-agent/agent-discovery';

export type AgentPickerPerson = Readonly<{ id: string; name: string; description: string }>;

export type AgentPickerOption =
  | Readonly<{ key: string; kind: 'agent'; agentId: string }>
  | Readonly<{ key: string; kind: 'person'; person: AgentPickerPerson }>;

export function projectAgentPickerOptions(
  projection: AgentDiscoveryProjection,
  people: readonly AgentPickerPerson[],
): readonly AgentPickerOption[] {
  const visiblePeople = projection.mode === 'mixed-mention'
    ? people.filter(({ name, description }) => !projection.query
      || `${name} ${description}`.toLocaleLowerCase().includes(projection.query))
    : [];
  return [
    ...projection.candidates.map(({ agent }) => ({ key: `agent:${agent.id}`, kind: 'agent' as const, agentId: agent.id })),
    ...visiblePeople.map((person) => ({ key: `person:${person.id}`, kind: 'person' as const, person })),
  ];
}
