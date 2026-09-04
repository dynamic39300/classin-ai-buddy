import type {
  ClassInsight,
  ClassInsightScenario,
  CourseInsight,
  CourseInsightScenario,
  InsightMetric,
  LessonInsight,
  StudentInsight,
} from '@domain/insights/insights';

const STUDENT_NAMES = [
  '王小明', '李华', '张三', '赵英', '陈晨', '周然', '孙悦', '刘洋', '林晓', '吴桐',
  '徐宁', '何雨', '高远', '许安', '郑雪', '唐可', '罗嘉', '蒋欣', '冯越', '韩露',
  '曹阳', '袁静', '邓琪', '彭程', '曾颖', '萧然', '田野', '董佳', '叶青', '苏杭',
] as const;

const STUDENT_PATTERNS: readonly Omit<StudentInsight, 'id' | 'classId' | 'name'>[] = [
  { attendance: 100, homework: 90, accuracy: 85, lateCount: 0, absentDays: 0, interactionCount: 18, questionCount: 4, homeworkCompleted: true, onTimeRate: 96, makeupCount: 0, homeworkAccuracy: 88, needsAttention: false, hasReward: true },
  { attendance: 95, homework: 70, accuracy: 68, lateCount: 2, absentDays: 0, interactionCount: 9, questionCount: 1, homeworkCompleted: true, onTimeRate: 75, makeupCount: 1, homeworkAccuracy: 71, needsAttention: true, hasReward: false },
  { attendance: 80, homework: 60, accuracy: 55, lateCount: 3, absentDays: 2, interactionCount: 5, questionCount: 0, homeworkCompleted: false, onTimeRate: 58, makeupCount: 3, homeworkAccuracy: 59, needsAttention: true, hasReward: false },
  { attendance: 100, homework: 95, accuracy: 90, lateCount: 0, absentDays: 0, interactionCount: 21, questionCount: 5, homeworkCompleted: true, onTimeRate: 100, makeupCount: 0, homeworkAccuracy: 92, needsAttention: false, hasReward: true },
  { attendance: 98, homework: 88, accuracy: 82, lateCount: 1, absentDays: 0, interactionCount: 16, questionCount: 3, homeworkCompleted: true, onTimeRate: 92, makeupCount: 0, homeworkAccuracy: 84, needsAttention: false, hasReward: true },
  { attendance: 92, homework: 76, accuracy: 73, lateCount: 1, absentDays: 1, interactionCount: 11, questionCount: 2, homeworkCompleted: true, onTimeRate: 83, makeupCount: 1, homeworkAccuracy: 75, needsAttention: false, hasReward: false },
  { attendance: 88, homework: 64, accuracy: 61, lateCount: 2, absentDays: 1, interactionCount: 7, questionCount: 1, homeworkCompleted: false, onTimeRate: 67, makeupCount: 2, homeworkAccuracy: 63, needsAttention: true, hasReward: false },
  { attendance: 100, homework: 92, accuracy: 87, lateCount: 0, absentDays: 0, interactionCount: 19, questionCount: 4, homeworkCompleted: true, onTimeRate: 97, makeupCount: 0, homeworkAccuracy: 89, needsAttention: false, hasReward: true },
] as const;

function buildStudents(classId: string, count: number, idPrefix = classId): readonly StudentInsight[] {
  return STUDENT_NAMES.slice(0, count).map((name, index) => {
    const pattern = STUDENT_PATTERNS[index % STUDENT_PATTERNS.length]!;
    const repeatedPattern = index >= STUDENT_PATTERNS.length
      ? {
          ...pattern,
          attendance: Math.min(97, Math.max(84, pattern.attendance - 2)),
          accuracy: Math.min(86, Math.max(58, pattern.accuracy - 2)),
          interactionCount: Math.min(20, Math.max(6, pattern.interactionCount - 1)),
          homework: Math.min(93, Math.max(62, pattern.homework - 2)),
        }
      : pattern;

    return {
      ...repeatedPattern,
      id: idPrefix === 'student' ? `student-${String(index + 1).padStart(3, '0')}` : `${idPrefix}-student-${String(index + 1).padStart(3, '0')}`,
      classId,
      name,
    };
  });
}

const ENGLISH_CLASS: ClassInsight = {
  id: 'english-2', name: '初三英语 2 班', studentCount: 20, courseStatus: 'active', courseDateRange: { start: '2026-03-01', end: '2026-09-30' }, dataUpdatedAt: '2026-08-11T14:08:00+08:00', totalLessons: 18, plannedLessons: 24,
  attendanceRate: 92, homeworkRate: 78, avgAccuracy: 71,
  diagnosis: { headline: '课堂响应较好，优先处理未交与错题。', strength: '出勤率 92%，最近课堂主动参与 76%、被动响应 91%。', improvement: '作业提交率 78%，已批改内容正确率 71%。', action: '先筛选需关注学生：未提交的发起催交，已提交但错误较多的安排错题复盘。' },
};

const PHYSICS_THREE_CLASS: ClassInsight = {
  id: 'physics-3', name: '高二物理 3 班', studentCount: 30, courseStatus: 'active', courseDateRange: { start: '2026-03-01', end: '2026-09-30' }, dataUpdatedAt: '2026-08-11T14:08:00+08:00', totalLessons: 18, plannedLessons: 24,
  attendanceRate: 94, homeworkRate: 86, avgAccuracy: 79,
  diagnosis: { headline: '课堂参与高于课后作业表现，下一步优先核对未提交与错题学生。', strength: '出勤率 94%，最近课堂主动参与 82%、被动响应 94%。', improvement: '作业提交率 86%，已批改内容正确率 79%。', action: '先筛选需关注学生，分别处理未提交和低正确率，再结合最近课堂报告安排讲评。' },
};

const PHYSICS_ONE_CLASS: ClassInsight = {
  id: 'physics-1', name: '高二物理 1 班', studentCount: 18, courseStatus: 'completed', courseDateRange: { start: '2026-02-20', end: '2026-07-31' }, dataUpdatedAt: '2026-08-11T14:08:00+08:00', totalLessons: 12, plannedLessons: 18,
  attendanceRate: 86, homeworkRate: 84, avgAccuracy: 75,
  diagnosis: { headline: '到课与主动参与是当前主要关注点，先定位缺勤和低参与学生。', strength: '作业提交率 84%，已批改内容正确率 75%。', improvement: '出勤率 86%，最近课堂主动参与 62%、被动响应 79%。', action: '先核对最近课堂的缺勤对象，再用低门槛全员响应带动主动表达。' },
};

const ENGLISH_LESSONS: readonly LessonInsight[] = [
  { id: 'lesson-001', classId: 'english-2', courseId: 'english-reading', date: '2026-08-06', unitName: 'Unit3精读（第1讲）', timeRange: '19:00-19:45', durationMinutes: 45, status: 'completed', attendance: '20/20', attendanceRate: 100, activeParticipation: 76, passiveResponse: 91, homeworkAccuracy: 84, avgScore: 82, reportId: 'report-001' },
  { id: 'lesson-002', classId: 'english-2', courseId: 'english-vocabulary', date: '2026-08-03', unitName: '词汇专项', timeRange: '19:00-19:45', durationMinutes: 45, status: 'completed', attendance: '18/20', attendanceRate: 90, activeParticipation: 68, passiveResponse: 84, homeworkAccuracy: 72, avgScore: 74, reportId: 'report-002' },
  { id: 'lesson-003', classId: 'english-2', courseId: 'english-reading', date: '2026-07-29', unitName: 'Unit2精读（第3讲）', timeRange: '19:00-19:45', durationMinutes: 45, status: 'completed', attendance: '20/20', attendanceRate: 100, activeParticipation: 72, passiveResponse: 88, homeworkAccuracy: 79, avgScore: 78, reportId: 'report-003' },
  { id: 'lesson-004', classId: 'english-2', courseId: 'english-reading', date: '2026-07-24', unitName: 'Unit2精读（第2讲）', timeRange: '19:00-19:45', durationMinutes: 45, status: 'completed', attendance: '19/20', attendanceRate: 95, activeParticipation: 70, passiveResponse: 86, homeworkAccuracy: 76, avgScore: 76, reportId: 'report-004' },
];

const PHYSICS_THREE_LESSONS: readonly LessonInsight[] = [
  { id: 'physics-3-lesson-001', classId: 'physics-3', courseId: 'physics-momentum', date: '2026-08-08', unitName: '动量守恒模型', timeRange: '18:30-19:20', durationMinutes: 50, status: 'completed', attendance: '29/30', attendanceRate: 97, activeParticipation: 82, passiveResponse: 94, homeworkAccuracy: 86, avgScore: 84, reportId: 'physics-3-report-001' },
  { id: 'physics-3-lesson-002', classId: 'physics-3', courseId: 'physics-momentum', date: '2026-08-04', unitName: '碰撞问题讲评', timeRange: '18:30-19:20', durationMinutes: 50, status: 'completed', attendance: '28/30', attendanceRate: 93, activeParticipation: 76, passiveResponse: 89, homeworkAccuracy: 80, avgScore: 78, reportId: 'physics-3-report-002' },
  { id: 'physics-3-lesson-003', classId: 'physics-3', courseId: 'physics-momentum', date: '2026-07-31', unitName: '机械能综合', timeRange: '18:30-19:20', durationMinutes: 50, status: 'completed', attendance: '30/30', attendanceRate: 100, activeParticipation: 79, passiveResponse: 92, homeworkAccuracy: 83, avgScore: 81, reportId: 'physics-3-report-003' },
  { id: 'physics-3-lesson-004', classId: 'physics-3', courseId: 'physics-momentum', date: '2026-07-26', unitName: '功与能复习', timeRange: '18:30-19:20', durationMinutes: 50, status: 'completed', attendance: '29/30', attendanceRate: 97, activeParticipation: 74, passiveResponse: 88, homeworkAccuracy: 78, avgScore: 77, reportId: 'physics-3-report-004' },
];

const PHYSICS_ONE_LESSONS: readonly LessonInsight[] = [
  { id: 'physics-1-lesson-001', classId: 'physics-1', courseId: 'physics-foundation', date: '2026-08-05', unitName: '函数专题', timeRange: '20:00-20:45', durationMinutes: 45, status: 'completed', attendance: '15/18', attendanceRate: 83, activeParticipation: 62, passiveResponse: 79, homeworkAccuracy: 74, avgScore: 71, reportId: 'physics-1-report-001' },
  { id: 'physics-1-lesson-002', classId: 'physics-1', courseId: 'physics-foundation', date: '2026-08-01', unitName: '运动图像', timeRange: '20:00-20:45', durationMinutes: 45, status: 'completed', attendance: '17/18', attendanceRate: 94, activeParticipation: 66, passiveResponse: 82, homeworkAccuracy: 77, avgScore: 75, reportId: 'physics-1-report-002' },
  { id: 'physics-1-lesson-003', classId: 'physics-1', courseId: 'physics-foundation', date: '2026-07-27', unitName: '匀变速运动', timeRange: '20:00-20:45', durationMinutes: 45, status: 'completed', attendance: '16/18', attendanceRate: 89, activeParticipation: 64, passiveResponse: 80, homeworkAccuracy: 75, avgScore: 73, reportId: 'physics-1-report-003' },
  { id: 'physics-1-lesson-004', classId: 'physics-1', courseId: 'physics-foundation', date: '2026-07-22', unitName: '运动学复习', timeRange: '20:00-20:45', durationMinutes: 45, status: 'completed', attendance: '18/18', attendanceRate: 100, activeParticipation: 70, passiveResponse: 85, homeworkAccuracy: 81, avgScore: 79, reportId: 'physics-1-report-004' },
];

function buildMetrics(classInsight: ClassInsight, latestLesson: LessonInsight): readonly InsightMetric[] {
  return [
    { id: 'attendance-rate', group: 'attendance', label: '出勤率', value: classInsight.attendanceRate, unit: '%', source: 'fact', definition: '已完成课堂中，学生实际出勤人次占应出勤人次的比例。' },
    { id: 'active-participation', group: 'interaction', label: '最近课堂主动参与', value: latestLesson.activeParticipation, unit: '%', source: 'fact', definition: '最近一节课堂中，主动举手、发言或发起互动的学生比例。' },
    { id: 'passive-response', group: 'interaction', label: '最近课堂被动响应', value: latestLesson.passiveResponse, unit: '%', source: 'fact', definition: '最近一节课堂中，被点名或收到互动任务后完成响应的学生比例。' },
    { id: 'submission-rate', group: 'homework', label: '作业提交率', value: classInsight.homeworkRate, unit: '%', source: 'fact', definition: '已布置作业中收到提交的学生人次比例。' },
    { id: 'homework-accuracy', group: 'homework', label: '作业正确率', value: classInsight.avgAccuracy, unit: '%', source: 'fact', definition: '已批改客观题中，正确作答数量占已作答数量的比例。' },
  ];
}

function buildCourseScenario(
  course: CourseInsight,
  lessons: readonly LessonInsight[],
  students: readonly StudentInsight[],
): CourseInsightScenario {
  return {
    course,
    metrics: buildMetrics(course, lessons[0]!),
    lessons,
    students: students.map((student) => ({ ...student, courseId: course.id })),
  };
}

const ENGLISH_STUDENTS = buildStudents('english-2', 20, 'student');
const PHYSICS_THREE_STUDENTS = buildStudents('physics-3', 30);
const PHYSICS_ONE_STUDENTS = buildStudents('physics-1', 18);

const ENGLISH_READING: CourseInsight = {
  id: 'english-reading', classId: 'english-2', name: '英语精读', studentCount: 20, courseStatus: 'active', courseDateRange: { start: '2026-03-01', end: '2026-09-30' }, dataUpdatedAt: '2026-08-11T14:08:00+08:00', totalLessons: 14, plannedLessons: 18,
  attendanceRate: 98, homeworkRate: 84, avgAccuracy: 80,
  diagnosis: { headline: '精读课到课稳定，下一步聚焦表达与错题复盘。', strength: '精读课出勤率 98%，最近课堂主动参与 76%、被动响应 91%。', improvement: '精读作业提交率 84%，已批改内容正确率 80%。', action: '结合最近一节精读课的错题，先安排全员作答，再请学生说明判断依据。' },
};

const ENGLISH_VOCABULARY: CourseInsight = {
  id: 'english-vocabulary', classId: 'english-2', name: '词汇专项', studentCount: 20, courseStatus: 'active', courseDateRange: { start: '2026-03-01', end: '2026-09-30' }, dataUpdatedAt: '2026-08-11T14:08:00+08:00', totalLessons: 4, plannedLessons: 6,
  attendanceRate: 90, homeworkRate: 70, avgAccuracy: 72,
  diagnosis: { headline: '词汇专项提交与正确率偏低，优先核对未完成学生。', strength: '最近一节词汇课被动响应为 84%，学生能够跟随课堂任务。', improvement: '词汇作业提交率 70%，已批改内容正确率 72%。', action: '先催交未完成词汇任务的学生，再按高频错词组织一次短时复习。' },
};

const PHYSICS_MOMENTUM: CourseInsight = {
  ...PHYSICS_THREE_CLASS,
  id: 'physics-momentum',
  classId: 'physics-3',
  name: '动量与能量',
};

const PHYSICS_FOUNDATION: CourseInsight = {
  ...PHYSICS_ONE_CLASS,
  id: 'physics-foundation',
  classId: 'physics-1',
  name: '物理基础',
};

const ENGLISH_COURSES = [
  buildCourseScenario(ENGLISH_READING, ENGLISH_LESSONS.filter(({ courseId }) => courseId === ENGLISH_READING.id), ENGLISH_STUDENTS),
  buildCourseScenario(ENGLISH_VOCABULARY, ENGLISH_LESSONS.filter(({ courseId }) => courseId === ENGLISH_VOCABULARY.id), ENGLISH_STUDENTS),
] as const;

const PHYSICS_THREE_COURSES = [buildCourseScenario(PHYSICS_MOMENTUM, PHYSICS_THREE_LESSONS, PHYSICS_THREE_STUDENTS)] as const;
const PHYSICS_ONE_COURSES = [buildCourseScenario(PHYSICS_FOUNDATION, PHYSICS_ONE_LESSONS, PHYSICS_ONE_STUDENTS)] as const;

export const INSIGHT_SCENARIOS: readonly ClassInsightScenario[] = [
  { class: ENGLISH_CLASS, metrics: buildMetrics(ENGLISH_CLASS, ENGLISH_LESSONS[0]!), lessons: ENGLISH_LESSONS, students: ENGLISH_STUDENTS, courses: ENGLISH_COURSES },
  { class: PHYSICS_THREE_CLASS, metrics: buildMetrics(PHYSICS_THREE_CLASS, PHYSICS_THREE_LESSONS[0]!), lessons: PHYSICS_THREE_LESSONS, students: PHYSICS_THREE_STUDENTS, courses: PHYSICS_THREE_COURSES },
  { class: PHYSICS_ONE_CLASS, metrics: buildMetrics(PHYSICS_ONE_CLASS, PHYSICS_ONE_LESSONS[0]!), lessons: PHYSICS_ONE_LESSONS, students: PHYSICS_ONE_STUDENTS, courses: PHYSICS_ONE_COURSES },
];

export const INSIGHT_CLASSES: readonly ClassInsight[] = INSIGHT_SCENARIOS.map((scenario) => scenario.class);
export const INSIGHT_LESSONS: readonly LessonInsight[] = INSIGHT_SCENARIOS.flatMap((scenario) => scenario.lessons);
export const INSIGHT_STUDENTS: readonly StudentInsight[] = INSIGHT_SCENARIOS[0]?.students ?? [];
