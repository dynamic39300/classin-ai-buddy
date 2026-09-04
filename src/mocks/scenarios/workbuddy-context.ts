import type { CoreContextItem } from '@domain/workbuddy/core-context';

export const WORKBUDDY_CONTEXT_ITEMS: readonly CoreContextItem[] = [
  { id: 'teacher-wang', section: 'actor_organization', kind: 'teacher', label: '王老师', source: 'classin', sourceVersion: 'actor-2026-08-08', permission: 'read', sensitivity: 'organization', selection: 'locked' },
  { id: 'org-classin-demo', section: 'actor_organization', kind: 'organization', label: 'ClassIn 教研中心', source: 'classin', sourceVersion: 'org-2026-08-08', permission: 'read', sensitivity: 'organization', selection: 'locked' },
  { id: 'physics-3', section: 'teaching_scope', kind: 'class', label: '高一（3）班', source: 'classin', sourceVersion: '2026-08-08T14:08:00+08:00', permission: 'read', sensitivity: 'class', selection: 'suggested' },
  { id: 'course-momentum', parentId: 'physics-3', section: 'teaching_scope', kind: 'course', label: '高中数学 · 必修一', source: 'classin', sourceVersion: 'course-momentum-v1', permission: 'read', sensitivity: 'class', selection: 'suggested' },
  { id: 'unit-momentum-1', parentId: 'course-momentum', section: 'teaching_scope', kind: 'unit', label: '第三单元 函数的性质', source: 'classin', sourceVersion: 'unit-momentum-1-v1', permission: 'read', sensitivity: 'class', selection: 'suggested' },
  { id: 'activity-momentum-lesson', parentId: 'unit-momentum-1', section: 'time_schedule', kind: 'activity', label: '函数单调性 · 8 月 8 日 14:30', source: 'classin', sourceVersion: 'activity-2026-08-08T14:30:00+08:00', permission: 'read', sensitivity: 'class', selection: 'suggested' },
  { id: 'physics-3-all', parentId: 'physics-3', section: 'learner_scope', kind: 'learner_scope', label: '全班 30 人', source: 'classin', sourceVersion: 'physics-3-members-v1', permission: 'read', sensitivity: 'class', selection: 'suggested' },
  { id: 'my-root-pdf', section: 'resources_input', kind: 'resource', label: '函数单调性教学设计.pdf', source: 'teacher-input', sourceVersion: '2026-08-08T12:20:00+08:00', permission: 'read', sensitivity: 'personal', selection: 'suggested' },
  { id: 'physics-3-evidence', parentId: 'physics-3', section: 'teaching_evidence', kind: 'aggregate_evidence', label: '班级聚合学习证据', source: 'classin', sourceVersion: 'aggregate-2026-08-08', permission: 'read', sensitivity: 'class', selection: 'suggested' },
  { id: 'physics-standard-v2', section: 'domain_knowledge', kind: 'curriculum_standard', label: '普通高中数学课程标准 v2', source: 'domain-knowledge', sourceVersion: 'v2', permission: 'read', sensitivity: 'public', selection: 'suggested' },
  { id: 'physics-1', section: 'teaching_scope', kind: 'class', label: '高一（2）班', source: 'classin', sourceVersion: '2026-08-07T12:20:00+08:00', permission: 'read', sensitivity: 'class', selection: 'suggested' },
  { id: 'course-physics-1', parentId: 'physics-1', section: 'teaching_scope', kind: 'course', label: '高中数学 · 必修一', source: 'classin', sourceVersion: 'course-physics-1-v1', permission: 'read', sensitivity: 'class', selection: 'suggested' },
  { id: 'unit-wave-1', parentId: 'course-physics-1', section: 'teaching_scope', kind: 'unit', label: '第四单元 二次函数', source: 'classin', sourceVersion: 'unit-wave-1-v1', permission: 'read', sensitivity: 'class', selection: 'suggested' },
];

export const WORKBUDDY_MOMENTUM_RECOMMENDATION = [
  'physics-3',
  'course-momentum',
  'unit-momentum-1',
  'activity-momentum-lesson',
  'physics-3-all',
  'my-root-pdf',
  'physics-3-evidence',
  'physics-standard-v2',
] as const;
