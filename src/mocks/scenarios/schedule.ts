import type { ScheduleEvent } from '@domain/schedule/schedule';

export const CURRENT_WEEK_DAYS = [
  { date: '2026-08-03', day: '03', weekday: '周一' },
  { date: '2026-08-04', day: '04', weekday: '周二' },
  { date: '2026-08-05', day: '05', weekday: '周三' },
  { date: '2026-08-06', day: '06', weekday: '周四' },
  { date: '2026-08-07', day: '07', weekday: '周五' },
  { date: '2026-08-08', day: '08', weekday: '周六' },
  { date: '2026-08-09', day: '09', weekday: '周日' },
] as const;

export const SCHEDULE_EVENTS: ReadonlyArray<ScheduleEvent> = [
  {
    id: 'class-newton-review', organizationId: 'org-classin-demo', kind: 'lesson', classId: 'physics-1', lessonId: 'lesson-newton-review', audience: 'both', date: '2026-08-04',
    courseId: 'course-mechanics', unitId: 'unit-newton', unitName: '牛顿定律', startTime: '10:00', endTime: '11:00', title: '牛顿定律周测讲评', course: '力学基础',
    context: '高二物理 1班', instructor: '王老师', location: '在线教室 01', phase: 'completed',
  },
  {
    id: 'class-experiment', organizationId: 'org-classin-demo', kind: 'lesson', classId: 'physics-1', lessonId: 'lesson-experiment', audience: 'both', date: '2026-08-05',
    courseId: 'course-momentum-lab', unitId: 'unit-experiment', unitName: '实验探究', startTime: '14:00', endTime: '15:30', title: '动量实验探究', course: '动量实验',
    context: '高二物理 1班', instructor: '王老师', location: '实验教室', phase: 'completed',
  },
  {
    id: 'open-reading', organizationId: 'org-classin-demo', kind: 'open-course', openCourseId: 'open-reading', audience: 'both', date: '2026-08-06',
    startTime: '16:00', endTime: '17:00', title: '高效阅读公开课', course: '初三英语',
    context: '公开课', instructor: '陈老师', location: '线上直播间', phase: 'completed',
  },
  {
    id: 'class-wave', organizationId: 'org-classin-demo', kind: 'lesson', classId: 'physics-3', lessonId: 'lesson-wave', audience: 'both', date: '2026-08-07',
    courseId: 'course-wave', unitId: 'unit-wave-1', unitName: '机械波', startTime: '09:00', endTime: '10:00', title: '机械波基础', course: '机械振动与波',
    context: '高二物理 3班', instructor: '王老师', location: '在线教室 02', phase: 'completed',
  },
  {
    id: 'class-reading', organizationId: 'org-classin-demo', kind: 'lesson', classId: 'english-2', lessonId: 'lesson-reading', audience: 'both', date: '2026-08-08',
    courseId: 'course-reading', unitId: 'unit-reading-6', unitName: '阅读训练第 6 讲', startTime: '09:00', endTime: '10:00', title: '阅读理解专题', course: '阅读理解',
    context: '初三英语 2班', instructor: '陈老师', location: '在线教室 04', phase: 'completed',
  },
  {
    id: 'class-momentum', organizationId: 'org-classin-demo', kind: 'lesson', classId: 'physics-3', courseId: 'course-momentum', unitId: 'unit-momentum-1', lessonId: 'lesson-momentum', activityId: 'activity-momentum-lesson', audience: 'both', date: '2026-08-08',
    unitName: '动量守恒', startTime: '14:30', endTime: '15:30', title: '动量守恒模型', course: '动量与碰撞',
    context: '高二物理 3班', instructor: '王老师', location: '在线教室 02', phase: 'upcoming',
  },
  {
    id: 'assignment-momentum', organizationId: 'org-classin-demo', kind: 'assignment', classId: 'physics-3', courseId: 'course-momentum', unitId: 'unit-momentum-1', unitName: '动量守恒', relatedLessonId: 'class-momentum', homeworkId: 'homework-momentum-a', activityType: 'homework',
    audience: 'both', availableDate: '2026-08-03', date: '2026-08-08',
    startTime: '18:00', title: '动量守恒作业 A 组', course: '动量与碰撞',
    context: '高二物理 3班', instructor: '王老师', studentState: 'in-progress', teacherState: 'collecting',
  },
  {
    id: 'recording-momentum', organizationId: 'org-classin-demo', kind: 'recording', classId: 'physics-3', courseId: 'course-momentum', unitId: 'unit-momentum-1', unitName: '动量守恒', relatedLessonId: 'class-momentum', recordingId: 'recording-momentum',
    audience: 'both', date: '2026-08-10', startTime: '09:00', title: '课堂录播', course: '动量与碰撞', context: '高二物理 3班', instructor: '王老师', phase: 'completed', studentState: 'not-started', teacherState: 'published',
  },
  {
    id: 'open-family', organizationId: 'org-classin-demo', kind: 'open-course', openCourseId: 'open-family', audience: 'both', date: '2026-08-08',
    startTime: '19:00', endTime: '20:00', title: '家长会说明会', course: '家校沟通',
    context: '公开课', instructor: '王老师', location: '线上直播间', phase: 'upcoming',
  },
  {
    id: 'assignment-reading', organizationId: 'org-classin-demo', kind: 'assignment', classId: 'english-2', courseId: 'course-reading', unitId: 'unit-reading-6', unitName: '阅读训练第 6 讲', relatedLessonId: 'class-reading-next', homeworkId: 'homework-reading', activityType: 'quiz',
    audience: 'both', availableDate: '2026-08-05', date: '2026-08-09', startTime: '20:00',
    title: '阅读训练第 6 讲测验', course: '阅读理解', context: '初三英语 2班', instructor: '陈老师',
    studentState: 'not-started', teacherState: 'collecting',
  },
  {
    id: 'class-collision-next', organizationId: 'org-classin-demo', kind: 'lesson', classId: 'physics-3', courseId: 'course-momentum', unitId: 'unit-momentum-2', unitName: '碰撞模型', lessonId: 'lesson-collision-next', audience: 'teacher', date: '2026-08-09',
    startTime: '10:30', endTime: '11:30', title: '碰撞模型应用', course: '动量与碰撞',
    context: '高二物理 3班', instructor: '王老师', location: '在线教室 02', phase: 'upcoming',
  },
  {
    id: 'class-reading-next', organizationId: 'org-classin-demo', kind: 'lesson', classId: 'english-2', courseId: 'course-reading', unitId: 'unit-reading-6', unitName: '阅读训练第 6 讲', lessonId: 'lesson-reading-next', activityId: 'activity-english-1', audience: 'student-family', date: '2026-08-09',
    startTime: '09:00', endTime: '10:00', title: '阅读训练第 6 讲', course: '阅读理解',
    context: '初三英语 2班', instructor: '陈老师', location: '在线教室 04', phase: 'upcoming',
  },
];

export type ScheduleEventDetailScenario = {
  teacherMetrics?: ReadonlyArray<{ label: string; value: string }>;
  teacherEvaluation?: string;
  studentEvaluation?: string;
};

export const SCHEDULE_EVENT_DETAILS: Readonly<Record<string, ScheduleEventDetailScenario>> = {
  'class-wave': {
    teacherMetrics: [
      { label: '出勤', value: '20 / 22' },
      { label: '课堂参与', value: '18 / 22' },
      { label: '互动完成', value: '86%' },
    ],
    teacherEvaluation: '18 人已评价 · 综合 4.8 / 5',
    studentEvaluation: '已提交 · 内容仅本人可见',
  },
  'class-reading': {
    teacherMetrics: [
      { label: '出勤', value: '24 / 24' },
      { label: '课堂参与', value: '21 / 24' },
      { label: '互动完成', value: '91%' },
    ],
    teacherEvaluation: '20 人已评价 · 综合 4.7 / 5',
    studentEvaluation: '已提交 · 内容仅本人可见',
  },
  'assignment-momentum': {
    teacherMetrics: [
      { label: '已提交', value: '17 / 22' },
      { label: '待批改', value: '17 份' },
      { label: '未提交', value: '5 人' },
    ],
  },
  'recording-momentum': {
    teacherMetrics: [
      { label: '已观看', value: '14 / 22' },
      { label: '已完成', value: '11 / 22' },
      { label: '平均进度', value: '72%' },
    ],
  },
};
