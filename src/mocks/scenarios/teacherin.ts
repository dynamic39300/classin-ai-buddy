import type { TeacherInResource } from '@domain/workbuddy/teacherin';

export const TEACHERIN_RESOURCES: readonly TeacherInResource[] = Object.freeze([
  Object.freeze({
    id: 'teacherin-resource-monotonicity', version: 'v3', title: '函数单调性概念与例题课件',
    stage: '高中', subject: '数学', author: 'TeacherIn 数学教研组', licenseLabel: '机构内可改编',
    permission: 'read', sensitivity: 'organization',
  }),
  Object.freeze({
    id: 'teacherin-resource-inquiry', version: 'v2', title: '函数图像探究学习单',
    stage: '高中', subject: '数学', author: '林老师', licenseLabel: '可用于本机构班级',
    permission: 'read', sensitivity: 'organization',
  }),
  Object.freeze({
    id: 'teacherin-resource-writing', version: 'v1', title: '说明性文章写作训练',
    stage: '初中', subject: '语文', author: 'TeacherIn 语文教研组', licenseLabel: '公开教学使用',
    permission: 'read', sensitivity: 'public',
  }),
]);

