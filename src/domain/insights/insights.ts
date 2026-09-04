export type StudentStatus = 'attention' | 'reward' | 'stable';
export type InsightMetricSource = 'fact' | 'placeholder';
export type InsightMetricGroup = 'attendance' | 'interaction' | 'homework';
export type InsightMetricUnit = '%' | 'count' | 'score' | 'text';
export type InsightSortKey =
  | 'name'
  | 'status'
  | 'attendance'
  | 'lateCount'
  | 'absentDays'
  | 'interactionCount'
  | 'questionCount'
  | 'accuracy'
  | 'homeworkCompleted'
  | 'onTimeRate'
  | 'makeupCount'
  | 'homeworkAccuracy';

export type InsightOverview = {
  studentCount: number;
  courseStatus: 'active' | 'completed';
  courseDateRange: { start: string; end: string };
  dataUpdatedAt: string;
  totalLessons: number;
  plannedLessons: number;
  attendanceRate: number;
  homeworkRate: number;
  avgAccuracy: number;
  diagnosis: { headline: string; strength: string; improvement: string; action: string };
};

export type ClassInsight = InsightOverview & {
  id: string;
  name: string;
};

export type CourseInsight = InsightOverview & {
  id: string;
  classId: string;
  name: string;
};

export type LessonInsight = {
  id: string;
  classId: string;
  courseId: string;
  date: string;
  unitName: string;
  timeRange: string;
  durationMinutes: number;
  status: 'completed';
  attendance: string;
  attendanceRate: number;
  activeParticipation: number;
  passiveResponse: number;
  homeworkAccuracy: number;
  avgScore: number;
  reportId: string;
};

export type HistoricalTrendMetric =
  | 'attendanceRate'
  | 'activeParticipation'
  | 'passiveResponse'
  | 'homeworkAccuracy';

export type HistoricalTrendSeries = {
  metricId: HistoricalTrendMetric;
  points: readonly { lessonId: string; date: string; value: number; source: 'fact' }[];
};

export type StudentInsight = {
  id: string;
  classId: string;
  courseId?: string;
  name: string;
  attendance: number;
  homework: number;
  accuracy: number;
  interactionCount: number;
  questionCount: number;
  lateCount: number;
  absentDays: number;
  homeworkCompleted: boolean;
  onTimeRate: number;
  makeupCount: number;
  homeworkAccuracy: number;
  needsAttention: boolean;
  hasReward: boolean;
};

export type ClassInsightScenario = {
  class: ClassInsight;
  metrics: readonly InsightMetric[];
  lessons: readonly LessonInsight[];
  students: readonly StudentInsight[];
  courses: readonly CourseInsightScenario[];
};

export type CourseInsightScenario = {
  course: CourseInsight;
  metrics: readonly InsightMetric[];
  lessons: readonly LessonInsight[];
  students: readonly StudentInsight[];
};

export type StudentInsightQuery = {
  classId?: string;
  courseId?: string;
  text?: string;
  status?: 'all' | StudentStatus;
  sortKey?: InsightSortKey;
  direction?: 'asc' | 'desc';
};

export type InsightTarget =
  | { status: 'ready'; classId: string; studentId?: string; section?: string }
  | { status: 'invalid-class'; classId: string }
  | { status: 'invalid-student'; classId: string; studentId: string };

type SearchParamsReader = { get(name: string): string | null };

export type InsightMetric = {
  id: string;
  group: InsightMetricGroup;
  label: string;
  value: number | string | null;
  unit: InsightMetricUnit;
  source: InsightMetricSource;
  definition: string;
  formula?: string;
};

export function getStudentStatus(student: StudentInsight): StudentStatus {
  if (student.needsAttention) return 'attention';
  if (student.hasReward) return 'reward';
  return 'stable';
}

export function getInsightScenario(
  classId: string,
  scenarios: readonly ClassInsightScenario[],
): ClassInsightScenario | null {
  return scenarios.find((scenario) => scenario.class.id === classId) ?? null;
}

export function getInsightCourseScenario(
  scenario: ClassInsightScenario,
  courseId: string | null,
): CourseInsightScenario | null {
  if (!courseId || courseId === 'all') return null;
  return scenario.courses.find(({ course }) => course.id === courseId) ?? null;
}

export function resolveInsightTarget(
  searchParams: SearchParamsReader,
  scenarios: readonly ClassInsightScenario[],
): InsightTarget {
  const requestedClassId = searchParams.get('class');
  const classId = requestedClassId ?? scenarios[0]?.class.id ?? '';
  const scenario = getInsightScenario(classId, scenarios);
  if (!scenario) return { status: 'invalid-class', classId };

  const studentId = searchParams.get('student');
  if (studentId && !scenario.students.some((student) => student.id === studentId)) {
    return { status: 'invalid-student', classId, studentId };
  }

  const section = searchParams.get('section');
  if (studentId) return { status: 'ready', classId, studentId };
  if (section) return { status: 'ready', classId, section };
  return { status: 'ready', classId };
}

export function getStudentRiskRank(student: StudentInsight): number {
  const status = getStudentStatus(student);
  if (status === 'attention') return 3;
  if (status === 'reward') return 2;
  return 1;
}

export function getRecentLessons(lessons: readonly LessonInsight[], classId: string, courseId?: string): LessonInsight[] {
  return [...lessons]
    .filter((lesson) => lesson.classId === classId && (!courseId || courseId === 'all' || lesson.courseId === courseId))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
}

export function buildHistoricalTrend(
  lessons: readonly LessonInsight[],
  metricIds: readonly HistoricalTrendMetric[],
): HistoricalTrendSeries[] {
  const chronologicalLessons = [...lessons].sort((left, right) => left.date.localeCompare(right.date));
  return metricIds.map((metricId) => ({
    metricId,
    points: chronologicalLessons.map((lesson) => ({
      lessonId: lesson.id,
      date: lesson.date,
      value: lesson[metricId],
      source: 'fact' as const,
    })),
  }));
}

function getStudentSortValue(student: StudentInsight, key: InsightSortKey): string | number {
  switch (key) {
    case 'name': return student.name;
    case 'status': return getStudentRiskRank(student);
    case 'attendance': return student.attendance;
    case 'lateCount': return student.lateCount;
    case 'absentDays': return student.absentDays;
    case 'interactionCount': return student.interactionCount;
    case 'questionCount': return student.questionCount;
    case 'accuracy': return student.accuracy;
    case 'homeworkCompleted': return Number(student.homeworkCompleted);
    case 'onTimeRate': return student.onTimeRate;
    case 'makeupCount': return student.makeupCount;
    case 'homeworkAccuracy': return student.homeworkAccuracy;
  }
}

export function sortStudents(students: readonly StudentInsight[], key: InsightSortKey, direction: 'asc' | 'desc'): StudentInsight[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...students].sort((left, right) => {
    const leftValue = getStudentSortValue(left, key);
    const rightValue = getStudentSortValue(right, key);
    if (leftValue === rightValue) return left.name.localeCompare(right.name, 'zh-CN');
    return (leftValue > rightValue ? 1 : -1) * factor;
  });
}

export function filterAndSortStudents(
  students: readonly StudentInsight[],
  query: StudentInsightQuery = {},
): StudentInsight[] {
  const filtered = students.filter((student) => (
    (!query.classId || student.classId === query.classId)
    && (!query.courseId || student.courseId === query.courseId)
    && (!query.text || student.name.includes(query.text.trim()))
    && (!query.status || query.status === 'all' || getStudentStatus(student) === query.status)
  ));
  return sortStudents(filtered, query.sortKey ?? 'status', query.direction ?? 'desc');
}
