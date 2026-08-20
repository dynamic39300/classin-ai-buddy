import type {
  Homework,
  HomeworkClassOption,
  HomeworkStudent,
  HomeworkSubmission,
} from '@domain/homework/homework';

export const HOMEWORK_NOW = new Date('2026-08-09T10:00:00+08:00');
export const CURRENT_STUDENT_ID = 'student-001';

export const HOMEWORK_CONTEXT_OPTIONS: readonly HomeworkClassOption[] = [
  {
    id: 'physics-3',
    name: '高二物理 3 班',
    courses: [
      {
        id: 'course-momentum',
        name: '动量守恒与机械波',
        units: [
          { id: 'unit-momentum-1', name: '第一单元 受力与动量' },
          { id: 'unit-review-1', name: '错题订正' },
        ],
      },
    ],
  },
  {
    id: 'english-2',
    name: '初三英语 2 班',
    courses: [
      {
        id: 'course-reading',
        name: '英语精读',
        units: [{ id: 'unit-reading', name: 'Unit 3 精读' }],
      },
    ],
  },
];

export const HOMEWORK_STUDENTS: readonly HomeworkStudent[] = [
  { id: 'student-001', name: '李明', avatarInitial: '李', classIds: ['physics-3', 'english-2'] },
  { id: 'student-002', name: '王小明', avatarInitial: '王', classIds: ['physics-3'] },
  { id: 'student-003', name: '张然', avatarInitial: '张', classIds: ['physics-3'] },
  { id: 'student-004', name: '赵英', avatarInitial: '赵', classIds: ['physics-3'] },
  { id: 'student-005', name: '周悦', avatarInitial: '周', classIds: ['physics-3'] },
];

const PUBLISHED_BASE = {
  teacherId: 'teacher-001',
  classId: 'physics-3',
  courseId: 'course-momentum',
  unitId: 'unit-momentum-1',
  recipientStudentIds: HOMEWORK_STUDENTS.filter(({ classIds }) => classIds.includes('physics-3')).map(({ id }) => id),
  maxScore: 100 as const,
  endedAt: null,
  createdAt: '2026-08-05T09:00:00+08:00',
  updatedAt: '2026-08-05T09:00:00+08:00',
  publication: { kind: 'published' as const, publishedAt: '2026-08-05T09:00:00+08:00' },
};

export const HOMEWORK_RECORDS: readonly Homework[] = [
  {
    ...PUBLISHED_BASE,
    id: 'homework-momentum-a',
    activityId: 'activity-momentum-homework',
    title: '动量守恒作业 A 组',
    instructions: '完成动量守恒模型练习，写出第 3、5 题的受力与动量变化过程。',
    allowLateSubmission: true,
    startsAt: '2026-08-08T08:00:00+08:00',
    dueAt: '2026-08-10T18:00:00+08:00',
  },
  {
    ...PUBLISHED_BASE,
    id: 'homework-correction',
    activityId: 'activity-correction-homework',
    unitId: 'unit-review-1',
    title: '机械波错题订正',
    instructions: '订正第 2、4 题，并说明波速、频率与波长之间的关系。',
    allowLateSubmission: true,
    startsAt: '2026-08-07T08:00:00+08:00',
    dueAt: '2026-08-12T18:00:00+08:00',
  },
  {
    ...PUBLISHED_BASE,
    id: 'homework-result',
    activityId: 'activity-result-homework',
    title: '碰撞模型单元总结',
    instructions: '用三句话总结弹性碰撞与非弹性碰撞的判断方法。',
    allowLateSubmission: false,
    startsAt: '2026-08-01T08:00:00+08:00',
    dueAt: '2026-08-06T18:00:00+08:00',
  },
  {
    ...PUBLISHED_BASE,
    id: 'homework-late',
    activityId: 'activity-late-homework',
    title: '冲量定理练习',
    instructions: '完成练习册第 18 页，并写出冲量方向的判断依据。',
    allowLateSubmission: true,
    startsAt: '2026-08-01T08:00:00+08:00',
    dueAt: '2026-08-08T18:00:00+08:00',
  },
  {
    id: 'homework-draft',
    activityId: 'activity-homework-draft',
    teacherId: 'teacher-001',
    title: '周末拓展',
    instructions: '',
    allowLateSubmission: true,
    maxScore: 100,
    endedAt: null,
    createdAt: '2026-08-08T15:00:00+08:00',
    updatedAt: '2026-08-08T15:00:00+08:00',
    publication: { kind: 'draft' },
    classId: 'physics-3',
    courseId: 'course-momentum',
    unitId: 'unit-momentum-1',
    recipientStudentIds: [],
    startsAt: null,
    dueAt: null,
  },
];

export const HOMEWORK_SUBMISSIONS: readonly HomeworkSubmission[] = [
  {
    id: 'submission-momentum-002', homeworkId: 'homework-momentum-a', studentId: 'student-002',
    answerText: '系统总动量在碰撞前后保持不变，先确定正方向再列式。', status: 'submitted',
    submittedAt: '2026-08-09T08:30:00+08:00', draftSavedAt: null, isLate: false, revision: 1,
    feedback: null, updatedAt: '2026-08-09T08:30:00+08:00',
  },
  {
    id: 'submission-momentum-003', homeworkId: 'homework-momentum-a', studentId: 'student-003',
    answerText: '我按动量变化量列出了方程。', status: 'returned',
    submittedAt: '2026-08-08T20:00:00+08:00', draftSavedAt: null, isLate: false, revision: 1,
    feedback: { decision: 'returned', score: null, comment: '请补充正方向和单位。', reviewedAt: '2026-08-09T08:00:00+08:00' },
    updatedAt: '2026-08-09T08:00:00+08:00',
  },
  {
    id: 'submission-momentum-004', homeworkId: 'homework-momentum-a', studentId: 'student-004',
    answerText: '碰撞前后总动量相等，并完成了三道计算题。', status: 'graded',
    submittedAt: '2026-08-08T19:00:00+08:00', draftSavedAt: null, isLate: false, revision: 1,
    feedback: { decision: 'graded', score: 95, comment: '过程完整，符号使用准确。', reviewedAt: '2026-08-09T09:00:00+08:00' },
    updatedAt: '2026-08-09T09:00:00+08:00',
  },
  {
    id: 'submission-correction-001', homeworkId: 'homework-correction', studentId: 'student-001',
    answerText: '波速等于频率乘波长。', status: 'returned',
    submittedAt: '2026-08-08T18:00:00+08:00', draftSavedAt: null, isLate: false, revision: 1,
    feedback: { decision: 'returned', score: null, comment: '请补充介质不变时三个量如何变化。', reviewedAt: '2026-08-09T09:20:00+08:00' },
    updatedAt: '2026-08-09T09:20:00+08:00',
  },
  {
    id: 'submission-result-001', homeworkId: 'homework-result', studentId: 'student-001',
    answerText: '弹性碰撞机械能守恒，非弹性碰撞机械能不守恒。', status: 'graded',
    submittedAt: '2026-08-06T16:00:00+08:00', draftSavedAt: null, isLate: false, revision: 1,
    feedback: { decision: 'graded', score: 92, comment: '判断准确，再补充完全非弹性碰撞的共同速度。', reviewedAt: '2026-08-07T09:00:00+08:00' },
    updatedAt: '2026-08-07T09:00:00+08:00',
  },
];

export type HomeworkScenario = {
  homeworks: readonly Homework[];
  submissions: readonly HomeworkSubmission[];
  students: readonly HomeworkStudent[];
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createHomeworkScenario(): HomeworkScenario {
  return clone({
    homeworks: HOMEWORK_RECORDS,
    submissions: HOMEWORK_SUBMISSIONS,
    students: HOMEWORK_STUDENTS,
  });
}
