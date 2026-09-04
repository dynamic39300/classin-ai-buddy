import type { ClassAgentDefinition, ClassAgentThreadBinding } from '@domain/class-agent/class-agent';

export const PHYSICS_CLASS_AGENT: ClassAgentDefinition = Object.freeze({
  id: 'class-agent-physics-3',
  name: '物理学习助手',
  shortName: '物理助手',
  avatarLabel: '物',
  classId: 'physics-3',
  classLabel: '高二物理 3 班',
  mentionAliases: Object.freeze(['物理助手', '物理学习助手']),
  capabilityIds: Object.freeze(['explain-physics-reasoning']),
  capabilitySummary: '概念解释与解题思路',
  searchKeywords: Object.freeze(['动量', '方向判断', '答疑', '解题']),
  displayOrder: 1,
  contextScopeLabel: '高二物理 3 班 · 当前课程范围',
  truthLabel: 'SIMULATED',
});

export const HOMEWORK_CORRECTION_AGENT: ClassAgentDefinition = Object.freeze({
  id: 'class-agent-homework-correction-physics-3',
  name: '作业订正助手',
  shortName: '订正助手',
  avatarLabel: '订',
  classId: 'physics-3',
  classLabel: '高二物理 3 班',
  mentionAliases: Object.freeze(['订正助手', '作业订正助手']),
  capabilityIds: Object.freeze(['homework-correction-guidance']),
  capabilitySummary: '错题定位与订正建议',
  searchKeywords: Object.freeze(['作业', '错题', '订正', '反馈']),
  displayOrder: 2,
  contextScopeLabel: '高二物理 3 班 · 已授权作业范围',
  truthLabel: 'SIMULATED',
});

export const EXPERIMENT_INQUIRY_AGENT: ClassAgentDefinition = Object.freeze({
  id: 'class-agent-experiment-inquiry-physics-3',
  name: '实验探究助手',
  shortName: '实验助手',
  avatarLabel: '实',
  classId: 'physics-3',
  classLabel: '高二物理 3 班',
  mentionAliases: Object.freeze(['实验助手', '实验探究助手']),
  capabilityIds: Object.freeze(['experiment-inquiry-guidance']),
  capabilitySummary: '实验设计与变量分析',
  searchKeywords: Object.freeze(['实验', '变量', '探究', '数据']),
  displayOrder: 3,
  contextScopeLabel: '高二物理 3 班 · 实验课程范围',
  truthLabel: 'SIMULATED',
});

export const LEARNING_PLAN_AGENT: ClassAgentDefinition = Object.freeze({
  id: 'class-agent-learning-plan-physics-3',
  name: '学习规划助手',
  shortName: '规划助手',
  avatarLabel: '学',
  classId: 'physics-3',
  classLabel: '高二物理 3 班',
  mentionAliases: Object.freeze(['规划助手', '学习规划助手']),
  capabilityIds: Object.freeze(['learning-plan-guidance']),
  capabilitySummary: '学习计划与阶段复盘',
  searchKeywords: Object.freeze(['计划', '复习', '进度', '规划']),
  displayOrder: 4,
  contextScopeLabel: '高二物理 3 班 · 学习任务范围',
  truthLabel: 'SIMULATED',
});

export const CLASS_AGENT_DEFINITIONS: readonly ClassAgentDefinition[] = Object.freeze([
  PHYSICS_CLASS_AGENT,
  HOMEWORK_CORRECTION_AGENT,
  EXPERIMENT_INQUIRY_AGENT,
  LEARNING_PLAN_AGENT,
]);

export function createPublicClassAgentBinding(agent: ClassAgentDefinition): ClassAgentThreadBinding {
  return Object.freeze({
    authorizationId: `authorization-${agent.id}-public`,
    authorizationVersion: 'v1',
    agentId: agent.id,
    channel: 'public-class',
    classId: agent.classId,
  });
}

export function createDirectClassAgentBinding(
  agent: ClassAgentDefinition,
  participantRole: 'teacher' | 'student-family',
): ClassAgentThreadBinding {
  return Object.freeze({
    authorizationId: `authorization-${agent.id}-${participantRole}`,
    authorizationVersion: 'v1',
    agentId: agent.id,
    channel: 'private-direct',
    classId: agent.classId,
    participantRole,
  });
}

export const PUBLIC_CLASS_AGENT_BINDINGS: readonly ClassAgentThreadBinding[] = Object.freeze(
  CLASS_AGENT_DEFINITIONS.map(createPublicClassAgentBinding),
);

export const DIRECT_CLASS_AGENT_BINDINGS: readonly ClassAgentThreadBinding[] = Object.freeze(
  CLASS_AGENT_DEFINITIONS.flatMap((agent) => (
    (['teacher', 'student-family'] as const).map((role) => createDirectClassAgentBinding(agent, role))
  )),
);
