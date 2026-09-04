import type { AppRole } from '@domain/account/role';
import type {
  AgentMentionEntity,
  ClassAgentChannel,
  ClassAgentDefinition,
  ClassAgentThreadBinding,
} from './class-agent';

export type AgentDiscoveryMode = 'mixed-mention' | 'agent-only' | 'direct-agent';

export type AgentDiscoveryRequest = Readonly<{
  role: AppRole;
  classId: string;
  channel: ClassAgentChannel;
  mode: AgentDiscoveryMode;
  query: string;
  definitions: readonly ClassAgentDefinition[];
  bindings: readonly ClassAgentThreadBinding[];
  recentAgentIds?: readonly string[];
}>;

export type AgentDiscoveryCandidate = Readonly<{
  agent: ClassAgentDefinition;
  binding: ClassAgentThreadBinding;
  matchRank: number;
}>;

export type AgentDiscoveryProjection = Readonly<{
  mode: AgentDiscoveryMode;
  query: string;
  candidates: readonly AgentDiscoveryCandidate[];
  totalAuthorized: number;
}>;

export type AgentDiscoverySelection =
  | Readonly<{
    status: 'selected';
    candidate: AgentDiscoveryCandidate;
    mention?: AgentMentionEntity;
  }>
  | Readonly<{ status: 'stale' | 'not-found' }>;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function matchRank(agent: ClassAgentDefinition, query: string): number | null {
  if (!query) return 5;
  const name = normalize(agent.name);
  const shortName = normalize(agent.shortName);
  const aliases = agent.mentionAliases.map(normalize);
  const scope = normalize(`${agent.classLabel} ${agent.contextScopeLabel}`);
  const capabilities = normalize(`${agent.capabilitySummary} ${agent.searchKeywords.join(' ')}`);
  if (name === query || shortName === query || aliases.includes(query)) return 0;
  if (name.startsWith(query) || shortName.startsWith(query) || aliases.some((alias) => alias.startsWith(query))) return 1;
  if (name.includes(query) || shortName.includes(query) || aliases.some((alias) => alias.includes(query))) return 2;
  if (scope.includes(query)) return 3;
  if (capabilities.includes(query)) return 4;
  return null;
}

function bindingVisibleToRole(binding: ClassAgentThreadBinding, role: AppRole): boolean {
  return binding.channel === 'public-class' || binding.participantRole === role;
}

function project(request: AgentDiscoveryRequest): AgentDiscoveryProjection {
  const query = normalize(request.query);
  const recentOrder = new Map((request.recentAgentIds ?? []).map((id, index) => [id, index]));
  const definitions = new Map(request.definitions.map((definition) => [definition.id, definition]));
  const authorized = request.bindings
    .filter((binding) => binding.classId === request.classId
      && binding.channel === request.channel
      && bindingVisibleToRole(binding, request.role))
    .map((binding) => ({ binding, agent: definitions.get(binding.agentId) }))
    .filter((item): item is { binding: ClassAgentThreadBinding; agent: ClassAgentDefinition } => item.agent !== undefined);

  const candidates = authorized
    .map(({ binding, agent }) => ({ binding, agent, matchRank: matchRank(agent, query) }))
    .filter((item): item is AgentDiscoveryCandidate => item.matchRank !== null)
    .sort((left, right) => {
      if (left.matchRank !== right.matchRank) return left.matchRank - right.matchRank;
      const leftRecent = recentOrder.get(left.agent.id) ?? Number.MAX_SAFE_INTEGER;
      const rightRecent = recentOrder.get(right.agent.id) ?? Number.MAX_SAFE_INTEGER;
      if (leftRecent !== rightRecent) return leftRecent - rightRecent;
      if (left.agent.displayOrder !== right.agent.displayOrder) return left.agent.displayOrder - right.agent.displayOrder;
      return left.agent.name.localeCompare(right.agent.name, 'zh-CN');
    });

  return {
    mode: request.mode,
    query,
    candidates,
    totalAuthorized: authorized.length,
  };
}

function select(options: Readonly<{
  projection: AgentDiscoveryProjection;
  agentId: string;
  currentBindings: readonly ClassAgentThreadBinding[];
}>): AgentDiscoverySelection {
  const candidate = options.projection.candidates.find(({ agent }) => agent.id === options.agentId);
  if (!candidate) return { status: 'not-found' };
  const current = options.currentBindings.find((binding) => binding.agentId === candidate.agent.id
    && binding.classId === candidate.binding.classId
    && binding.channel === candidate.binding.channel
    && binding.authorizationId === candidate.binding.authorizationId);
  if (!current || current.authorizationVersion !== candidate.binding.authorizationVersion) return { status: 'stale' };
  return {
    status: 'selected',
    candidate,
    mention: current.channel === 'public-class' ? {
      type: 'class-agent',
      agentId: candidate.agent.id,
      classId: candidate.agent.classId,
      authorizationId: current.authorizationId,
      authorizationVersion: current.authorizationVersion,
      displayNameSnapshot: candidate.agent.name,
      channel: 'public-class',
    } : undefined,
  };
}

export const AgentDiscoveryModule = Object.freeze({ project, select });
