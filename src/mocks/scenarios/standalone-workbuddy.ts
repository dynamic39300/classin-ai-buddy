import type { CoreContextItem } from '@domain/workbuddy/core-context';

export const STANDALONE_WORKBUDDY_CONTEXT_ITEMS: readonly CoreContextItem[] = Object.freeze([
  Object.freeze({ id: 'teacher-standalone', section: 'actor_organization', kind: 'teacher', label: '当前教师', source: 'teacher-input', sourceVersion: 'standalone-v1', permission: 'read', sensitivity: 'personal', selection: 'locked' }),
  Object.freeze({ id: 'org-standalone', section: 'actor_organization', kind: 'organization', label: '个人工作区（未连接 ClassIn）', source: 'teacher-input', sourceVersion: 'standalone-v1', permission: 'read', sensitivity: 'personal', selection: 'locked' }),
  Object.freeze({ id: 'physics-3', section: 'teaching_scope', kind: 'class', label: '示例教学范围 · 高二物理', source: 'teacher-input', sourceVersion: 'manual-scope-v1', permission: 'read', sensitivity: 'personal', selection: 'suggested' }),
  Object.freeze({ id: 'course-momentum', parentId: 'physics-3', section: 'teaching_scope', kind: 'course', label: '动量与碰撞', source: 'teacher-input', sourceVersion: 'manual-course-v1', permission: 'read', sensitivity: 'personal', selection: 'suggested' }),
  Object.freeze({ id: 'unit-momentum-1', parentId: 'course-momentum', section: 'teaching_scope', kind: 'unit', label: '第一单元 受力与动量', source: 'teacher-input', sourceVersion: 'unit-momentum-1-v1', permission: 'read', sensitivity: 'personal', selection: 'suggested' }),
  Object.freeze({ id: 'my-root-pdf', section: 'resources_input', kind: 'resource', label: '教师本次上传资料（示例）', source: 'teacher-input', sourceVersion: 'manual-resource-v1', permission: 'read', sensitivity: 'personal', selection: 'suggested' }),
  Object.freeze({ id: 'physics-standard-v2', section: 'domain_knowledge', kind: 'curriculum_standard', label: '普通高中物理课程标准', source: 'domain-knowledge', sourceVersion: 'public-v1', permission: 'read', sensitivity: 'public', selection: 'suggested' }),
]);

export const STANDALONE_WORKBUDDY_RECOMMENDATION = Object.freeze([
  'physics-3',
  'course-momentum',
  'unit-momentum-1',
  'my-root-pdf',
  'physics-standard-v2',
]);
