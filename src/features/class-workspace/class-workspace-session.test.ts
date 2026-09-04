import { beforeEach, describe, expect, it } from 'vitest';
import { CLASS_RECORDS } from '@mocks/scenarios/classes';
import type { ClassRecord } from '@domain/class/class';
import { loadClassWorkspaceSession, saveClassWorkspaceSession } from './class-workspace-session';

describe('Class workspace session boundary', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('restores a fully valid Class workspace projection', () => {
    saveClassWorkspaceSession(CLASS_RECORDS);
    expect(loadClassWorkspaceSession([])).toEqual(CLASS_RECORDS);
  });

  it('fails closed to the fixture when a nested business field is invalid', () => {
    const malformed = structuredClone(CLASS_RECORDS) as unknown as Array<Record<string, unknown>>;
    malformed[0]!.roleByAppRole = { teacher: 'owner' };
    window.sessionStorage.setItem('classin:class-workspace:v1', JSON.stringify(malformed));
    expect(loadClassWorkspaceSession(CLASS_RECORDS)).toBe(CLASS_RECORDS);
  });

  it.each([
    ['invalid date', (records: Array<Record<string, unknown>>) => { records[0]!.updatedAt = 'not-a-date'; }],
    ['negative count', (records: Array<Record<string, unknown>>) => {
      records[0]!.memberCount = -1;
    }],
  ])('fails closed for %s', (_label, corrupt) => {
    const malformed = structuredClone(CLASS_RECORDS) as unknown as Array<Record<string, unknown>>;
    corrupt(malformed);
    window.sessionStorage.setItem('classin:class-workspace:v1', JSON.stringify(malformed));
    expect(loadClassWorkspaceSession(CLASS_RECORDS)).toBe(CLASS_RECORDS);
  });

  it.each([
    ['published without evidence', false],
    ['published with stale object version', true],
  ])('fails closed for %s', (_label, withEvidence) => {
    const records = structuredClone(CLASS_RECORDS) as ClassRecord[];
    records[0]!.courses[0]!.units[0]!.activities.push({
      id: 'quiz-session', type: 'quiz', title: '测验', status: 'pending', publication: 'published', detail: '测验 · 已发布',
      quiz: {
        version: 'v2', paperArtifactId: 'paper-1', paperArtifactVersion: 'v1', questionCount: 1, totalScore: 10,
        description: '', startAt: '2026-08-25T09:00:00+08:00', endAt: '2026-08-26T09:00:00+08:00', durationMinutes: 20, scoring: 'score',
        questions: [{ id: 'q1', type: 'short-answer', prompt: '题目', answer: '答案', explanation: '解析', difficulty: 'medium', score: 10 }],
        ...(withEvidence ? { publicationEvidence: {
          idempotencyKey: 'publish-quiz-session-v2', requestFingerprint: '{}',
          receipt: { id: 'receipt-1', actionId: 'action-1', approvalId: 'approval-1', idempotencyKey: 'publish-quiz-session-v2', activityId: 'quiz-session', actorId: 'teacher-1', objectVersion: 'v1', executedAt: '2026-08-24T18:00:00+08:00', truthLabel: '[模拟] ClassIn 测验发布回执', result: '已发布', status: 'success', publication: 'published' },
        } } : {}),
      },
    });
    window.sessionStorage.setItem('classin:class-workspace:v1', JSON.stringify(records));
    expect(loadClassWorkspaceSession(CLASS_RECORDS)).toBe(CLASS_RECORDS);
  });
});
