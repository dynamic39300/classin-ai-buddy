import type { AppRole } from '@domain/account/role';
import { AgentDiscoveryModule } from '@domain/class-agent/agent-discovery';
import {
  hasCurrentClassAgentAuthorization,
  type ClassAgentDefinition,
  type ClassAgentThreadBinding,
} from '@domain/class-agent/class-agent';
import {
  getLastMessageEntry,
  getMessageThreadSubtitle,
  getMessageThreadTitle,
  type MessageThread,
} from './message';

export type DirectConversationScope = 'all' | 'agents' | 'people';

export type DirectConversationDirectoryRow = Readonly<{
  thread: MessageThread;
  kind: 'agent' | 'person';
  agent?: ClassAgentDefinition;
}>;

export type DirectConversationDirectorySection = Readonly<{
  id: 'agents' | 'people';
  label: string;
  rows: readonly DirectConversationDirectoryRow[];
}>;

export type DirectConversationDirectoryProjection = Readonly<{
  query: string;
  scope: DirectConversationScope;
  totalAuthorizedAgents: number;
  totalPeople: number;
  resultCount: number;
  sections: readonly DirectConversationDirectorySection[];
}>;

type DirectConversationDirectoryRequest = Readonly<{
  role: AppRole;
  classId: string;
  query: string;
  scope: DirectConversationScope;
  threads: readonly MessageThread[];
  definitions: readonly ClassAgentDefinition[];
  authoritativeBindings: readonly ClassAgentThreadBinding[];
}>;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function compareUpdatedAt(left: MessageThread, right: MessageThread): number {
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

function matchesPerson(role: AppRole, thread: MessageThread, query: string): boolean {
  if (!query) return true;
  return normalize([
    getMessageThreadTitle(role, thread),
    getMessageThreadSubtitle(role, thread),
    getLastMessageEntry(thread)?.body ?? '',
  ].join(' ')).includes(query);
}

function project(request: DirectConversationDirectoryRequest): DirectConversationDirectoryProjection {
  const query = normalize(request.query);
  const visibleDirectThreads = request.threads.filter((thread) => (
    thread.category === 'direct' && thread.visibleTo.includes(request.role)
  ));
  const threadBindings = visibleDirectThreads
    .map(({ classAgentBinding }) => classAgentBinding)
    .filter((binding): binding is ClassAgentThreadBinding => binding?.channel === 'private-direct');
  const bindings = threadBindings.filter((binding) => (
    hasCurrentClassAgentAuthorization(binding, request.authoritativeBindings)
  ));
  const discoveryBase = {
    role: request.role,
    classId: request.classId,
    channel: 'private-direct' as const,
    mode: 'direct-agent' as const,
    definitions: request.definitions,
    bindings,
  };
  const authorized = AgentDiscoveryModule.project({ ...discoveryBase, query: '' });
  const matches = AgentDiscoveryModule.project({ ...discoveryBase, query });
  const authorizedByAgentId = new Map(authorized.candidates.map(({ agent }) => [agent.id, agent]));
  const matchingOrder = new Map(matches.candidates.map(({ agent }, index) => [agent.id, index]));

  const agentRows = request.scope === 'people' ? [] : visibleDirectThreads
    .filter((thread) => thread.classAgentBinding?.channel === 'private-direct')
    .flatMap((thread): Array<DirectConversationDirectoryRow & { agent: ClassAgentDefinition }> => {
      const agentId = thread.classAgentBinding?.agentId;
      const agent = agentId ? authorizedByAgentId.get(agentId) : undefined;
      return agent ? [{ thread, kind: 'agent' as const, agent }] : [];
    })
    .filter(({ agent }) => matchingOrder.has(agent.id))
    .sort((left, right) => (
      (matchingOrder.get(left.agent.id) ?? Number.MAX_SAFE_INTEGER)
      - (matchingOrder.get(right.agent.id) ?? Number.MAX_SAFE_INTEGER)
    ));
  const peopleRows = request.scope === 'agents'
    ? []
    : visibleDirectThreads
      .filter((thread) => thread.classAgentBinding?.channel !== 'private-direct')
      .filter((thread) => matchesPerson(request.role, thread, query))
      .sort(compareUpdatedAt)
      .map((thread) => ({ thread, kind: 'person' as const }));

  const sections: DirectConversationDirectorySection[] = [];
  if (agentRows.length > 0) sections.push({ id: 'agents', label: `班级 Agent · ${agentRows.length}`, rows: agentRows });
  if (peopleRows.length > 0) sections.push({ id: 'people', label: `联系人 · ${peopleRows.length}`, rows: peopleRows });

  return {
    query,
    scope: request.scope,
    totalAuthorizedAgents: authorized.totalAuthorized,
    totalPeople: visibleDirectThreads.filter((thread) => thread.classAgentBinding?.channel !== 'private-direct').length,
    resultCount: agentRows.length + peopleRows.length,
    sections,
  };
}

export const DirectConversationDirectoryModule = Object.freeze({ project });
