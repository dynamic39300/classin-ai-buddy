import { describe, expect, it } from 'vitest';
import {
  getPrimaryClassAgentMention,
  hasClassAgentMention,
  prepareClassAgentRequest,
} from './class-agent';
import { PHYSICS_CLASS_AGENT } from '@mocks/scenarios/class-agent';

const publicBinding = {
  authorizationId: `authorization-${PHYSICS_CLASS_AGENT.id}`,
  authorizationVersion: 'v1',
  agentId: PHYSICS_CLASS_AGENT.id,
  channel: 'public-class' as const,
  classId: PHYSICS_CLASS_AGENT.classId,
};

const publicMention = {
  type: 'class-agent' as const,
  agentId: PHYSICS_CLASS_AGENT.id,
  classId: PHYSICS_CLASS_AGENT.classId,
  authorizationId: publicBinding.authorizationId,
  authorizationVersion: publicBinding.authorizationVersion,
  displayNameSnapshot: PHYSICS_CLASS_AGENT.name,
  channel: 'public-class' as const,
};

describe('class agent channel policy', () => {
  it('requires an explicit mention in the public class channel', () => {
    expect(hasClassAgentMention('请 @物理助手 帮我判断方向', PHYSICS_CLASS_AGENT)).toBe(true);
    expect(getPrimaryClassAgentMention(PHYSICS_CLASS_AGENT)).toBe('@物理助手');

    const ignored = prepareClassAgentRequest({
      requestId: 'request-1',
      threadId: 'class-physics-3',
      definition: PHYSICS_CLASS_AGENT,
      binding: publicBinding,
      requesterRole: 'student-family',
      requesterName: '李明',
      body: '第 5 题的方向怎么判断？',
      recentMessages: [],
    });
    expect(ignored).toEqual({ status: 'ignored', reason: 'missing-mention' });
  });

  it('allows teacher and student public requests only with a structured Agent target', () => {
    for (const [requesterRole, requesterName] of [['teacher', '王老师'], ['student-family', '李明']] as const) {
      const result = prepareClassAgentRequest({
        requestId: `request-${requesterRole}`,
        threadId: 'class-physics-3',
        definition: PHYSICS_CLASS_AGENT,
        binding: publicBinding,
        requesterRole,
        requesterName,
        body: '@物理学习助手 第 5 题的方向怎么判断？',
        agentMention: publicMention,
        recentMessages: [],
      });
      expect(result.status).toBe('ready');
      if (result.status === 'ready') {
        expect(result.request.agentId).toBe(PHYSICS_CLASS_AGENT.id);
        expect(result.request.visibilityLabel).toBe('当前班级群成员可见');
      }
    }
  });

  it('does not treat literal @ text as a semantic Agent selection', () => {
    const result = prepareClassAgentRequest({
      requestId: 'request-literal-text',
      threadId: 'class-physics-3',
      definition: PHYSICS_CLASS_AGENT,
      binding: publicBinding,
      requesterRole: 'teacher',
      requesterName: '王老师',
      body: '@物理学习助手 第 5 题的方向怎么判断？',
      recentMessages: [],
    });
    expect(result).toEqual({ status: 'ignored', reason: 'missing-mention' });
  });

  it('requires reselection when the authorization version changes', () => {
    const result = prepareClassAgentRequest({
      requestId: 'request-stale-authorization',
      threadId: 'class-physics-3',
      definition: PHYSICS_CLASS_AGENT,
      binding: { ...publicBinding, authorizationVersion: 'v2' },
      requesterRole: 'teacher',
      requesterName: '王老师',
      body: '第 5 题的方向怎么判断？',
      recentMessages: [],
      agentMention: publicMention,
    });
    expect(result).toEqual({ status: 'ignored', reason: 'stale-authorization' });
  });

  it('keeps teacher and student private requests on role-bound threads', () => {
    const teacherResult = prepareClassAgentRequest({
      requestId: 'request-teacher',
      threadId: 'teacher-agent-thread',
      definition: PHYSICS_CLASS_AGENT,
      binding: {
        authorizationId: `authorization-${PHYSICS_CLASS_AGENT.id}-teacher`,
        authorizationVersion: 'v1',
        agentId: PHYSICS_CLASS_AGENT.id,
        channel: 'private-direct',
        classId: PHYSICS_CLASS_AGENT.classId,
        participantRole: 'teacher',
      },
      requesterRole: 'teacher',
      requesterName: '王老师',
      body: '第 5 题的方向怎么判断？',
      recentMessages: [],
    });
    expect(teacherResult.status).toBe('ready');

    const crossRoleResult = prepareClassAgentRequest({
      requestId: 'request-cross-role',
      threadId: 'teacher-agent-thread',
      definition: PHYSICS_CLASS_AGENT,
      binding: {
        authorizationId: `authorization-${PHYSICS_CLASS_AGENT.id}-teacher`,
        authorizationVersion: 'v1',
        agentId: PHYSICS_CLASS_AGENT.id,
        channel: 'private-direct',
        classId: PHYSICS_CLASS_AGENT.classId,
        participantRole: 'teacher',
      },
      requesterRole: 'student-family',
      requesterName: '李明',
      body: '第 5 题的方向怎么判断？',
      recentMessages: [],
    });
    expect(crossRoleResult).toEqual({ status: 'ignored', reason: 'not-authorized' });
  });
});
