import { describe, expect, it } from 'vitest';
import {
  confirmContext,
  createContextProposal,
  projectContext,
  selectContextItems,
  type CoreContextItem,
} from './core-context';

const ITEMS: readonly CoreContextItem[] = [
  { id: 'teacher', section: 'actor_organization', kind: 'teacher', label: '王老师', source: 'classin', sourceVersion: 'actor-v1', permission: 'read', sensitivity: 'organization', selection: 'locked' },
  { id: 'org', section: 'actor_organization', kind: 'organization', label: 'ClassIn 教研中心', source: 'classin', sourceVersion: 'org-v1', permission: 'read', sensitivity: 'organization', selection: 'locked' },
  { id: 'class-a', section: 'teaching_scope', kind: 'class', label: '高二物理 3 班', source: 'classin', sourceVersion: 'class-v1', permission: 'read', sensitivity: 'class', selection: 'suggested' },
  { id: 'course-a', parentId: 'class-a', section: 'teaching_scope', kind: 'course', label: '动量与碰撞', source: 'classin', sourceVersion: 'course-v1', permission: 'read', sensitivity: 'class', selection: 'suggested' },
  { id: 'unit-a', parentId: 'course-a', section: 'teaching_scope', kind: 'unit', label: '第一单元 受力与动量', source: 'classin', sourceVersion: 'unit-v1', permission: 'read', sensitivity: 'class', selection: 'suggested' },
  { id: 'class-b', section: 'teaching_scope', kind: 'class', label: '高一物理 1 班', source: 'classin', sourceVersion: 'class-v2', permission: 'read', sensitivity: 'class', selection: 'suggested' },
  { id: 'learners-a', parentId: 'class-a', section: 'learner_scope', kind: 'learner_scope', label: '全班 30 人', source: 'classin', sourceVersion: 'members-v1', permission: 'read', sensitivity: 'class', selection: 'suggested' },
  { id: 'student-a', parentId: 'class-a', section: 'teaching_evidence', kind: 'student_evidence', label: '李同学个体证据', source: 'classin', sourceVersion: 'evidence-v1', permission: 'restricted', sensitivity: 'student_sensitive', selection: 'suggested' },
];

describe('CoreContext Module', () => {
  it('starts with only actor and organization selected', () => {
    const proposal = createContextProposal(ITEMS, 'single-courseware');

    expect(proposal.status).toBe('needs_attention');
    expect(proposal.items.filter(({ included }) => included).map(({ id }) => id)).toEqual(['teacher', 'org']);
  });

  it('clears incompatible descendants when the selected class changes', () => {
    const first = selectContextItems(createContextProposal(ITEMS, 'single-courseware'), ['class-a', 'course-a', 'unit-a', 'learners-a']);
    const switched = selectContextItems(first, ['class-b']);

    expect(switched.items.filter(({ included }) => included).map(({ id }) => id)).toEqual(['teacher', 'org', 'class-b']);
  });

  it('freezes a stable snapshot and minimizes capability projections', () => {
    const selected = selectContextItems(createContextProposal(ITEMS, 'single-courseware'), ['class-a', 'course-a', 'unit-a', 'learners-a', 'student-a']);
    const result = confirmContext(selected, { snapshotId: 'snapshot-1', confirmedAt: '2026-08-20T10:00:00+08:00' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.version).toBe('workbuddy-m4-context-v1');
    expect(result.snapshot.items.map(({ id }) => id)).toContain('student-a');
    expect(projectContext(result.snapshot, ['actor_organization', 'teaching_scope', 'learner_scope', 'teaching_evidence']).items.map(({ id }) => id)).not.toContain('student-a');
    expect(Object.isFrozen(result.snapshot)).toBe(true);
    expect(Object.isFrozen(result.snapshot.items)).toBe(true);
  });
});
