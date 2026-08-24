import type { AppRole } from '@domain/account/role';

export type ClassAgentChannel = 'public-class' | 'private-direct';
export type ClassAgentTruthLabel = 'SIMULATED';

export type ClassAgentDefinition = Readonly<{
  id: string;
  name: string;
  shortName: string;
  avatarLabel: string;
  classId: string;
  classLabel: string;
  mentionAliases: readonly string[];
  capabilityIds: readonly string[];
  capabilitySummary: string;
  searchKeywords: readonly string[];
  displayOrder: number;
  contextScopeLabel: string;
  truthLabel: ClassAgentTruthLabel;
}>;

export type ClassAgentThreadBinding = Readonly<{
  authorizationId: string;
  authorizationVersion: string;
  agentId: string;
  channel: ClassAgentChannel;
  classId: string;
  participantRole?: AppRole;
}>;

export type AgentMentionEntity = Readonly<{
  type: 'class-agent';
  agentId: string;
  classId: string;
  authorizationId: string;
  authorizationVersion: string;
  displayNameSnapshot: string;
  channel: 'public-class';
}>;

export type ClassAgentRecentMessage = Readonly<{
  authorName: string;
  body: string;
}>;

export type ClassAgentReplyRequest = Readonly<{
  id: string;
  threadId: string;
  agentId: string;
  channel: ClassAgentChannel;
  requesterRole: AppRole;
  requesterName: string;
  body: string;
  recentMessages: readonly ClassAgentRecentMessage[];
  visibilityLabel: string;
  truthLabel: ClassAgentTruthLabel;
}>;

export type ClassAgentReply = Readonly<{
  id: string;
  requestId: string;
  threadId: string;
  agentId: string;
  agentName: string;
  channel: ClassAgentChannel;
  recipientRole: AppRole;
  body: string;
  sentAt: string;
  visibilityLabel: string;
  truthLabel: ClassAgentTruthLabel;
}>;

export type PrepareClassAgentRequestResult =
  | Readonly<{ status: 'ready'; request: ClassAgentReplyRequest }>
  | Readonly<{ status: 'ignored'; reason: 'missing-mention' | 'not-authorized' | 'stale-authorization' | 'empty-message' }>;

function normalizeMention(value: string): string {
  return value.trim().replace(/^@/, '').toLocaleLowerCase();
}

export function getClassAgentVisibilityLabel(channel: ClassAgentChannel): string {
  return channel === 'public-class' ? '当前班级群成员可见' : '仅你与班级 Agent 可见';
}

export function hasClassAgentMention(body: string, definition: ClassAgentDefinition): boolean {
  const normalizedBody = body.toLocaleLowerCase();
  return definition.mentionAliases.some((alias) => normalizedBody.includes(`@${normalizeMention(alias)}`));
}

export function getPrimaryClassAgentMention(definition: ClassAgentDefinition): string {
  return `@${definition.shortName}`;
}

export function prepareClassAgentRequest(options: Readonly<{
  requestId: string;
  threadId: string;
  definition: ClassAgentDefinition;
  binding: ClassAgentThreadBinding;
  requesterRole: AppRole;
  requesterName: string;
  body: string;
  recentMessages: readonly ClassAgentRecentMessage[];
  agentMention?: AgentMentionEntity;
}>): PrepareClassAgentRequestResult {
  const body = options.body.trim();
  if (!body) return { status: 'ignored', reason: 'empty-message' };

  const bindingMatchesDefinition = options.binding.agentId === options.definition.id
    && options.binding.classId === options.definition.classId;
  if (!bindingMatchesDefinition) return { status: 'ignored', reason: 'not-authorized' };

  if (options.binding.channel === 'public-class') {
    if (!options.agentMention) {
      return { status: 'ignored', reason: 'missing-mention' };
    }
    const mentionMatches = options.agentMention.agentId === options.definition.id
      && options.agentMention.classId === options.definition.classId
      && options.agentMention.authorizationId === options.binding.authorizationId;
    if (!mentionMatches) return { status: 'ignored', reason: 'not-authorized' };
    if (options.agentMention.authorizationVersion !== options.binding.authorizationVersion) {
      return { status: 'ignored', reason: 'stale-authorization' };
    }
  } else if (options.binding.participantRole !== options.requesterRole) {
    return { status: 'ignored', reason: 'not-authorized' };
  }

  return {
    status: 'ready',
    request: {
      id: options.requestId,
      threadId: options.threadId,
      agentId: options.definition.id,
      channel: options.binding.channel,
      requesterRole: options.requesterRole,
      requesterName: options.requesterName,
      body,
      recentMessages: options.recentMessages,
      visibilityLabel: getClassAgentVisibilityLabel(options.binding.channel),
      truthLabel: options.definition.truthLabel,
    },
  };
}
