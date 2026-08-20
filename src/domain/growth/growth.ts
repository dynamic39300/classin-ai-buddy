export type GrowthFilter = 'all' | string;
export type GrowthRecordStatus = 'upcoming' | 'finished';
export type GrowthReportStatus = null | 'generating' | 'reviewing' | 'published';

export type GrowthOverview = {
  attendanceDays: number;
  homeworkCompletion: number;
  consecutiveDays: number;
  totalHours: number;
  accuracy: number;
  rewards: number;
  accuracyTrend: 'up' | 'down';
};

export type GrowthCourseProgress = {
  id: string;
  classId: string;
  className: string;
  courseName: string;
  completedUnits: number;
  totalUnits: number;
  currentUnit: string;
  currentActivitiesDone: number;
  currentActivitiesTotal: number;
};

export type GrowthLearningRecord = {
  id: string;
  classId: string;
  courseId: string;
  homeworkId?: string;
  date: string;
  sortKey: number;
  unitName: string;
  score: number | null;
  rewards: number;
  attended: boolean;
  status: GrowthRecordStatus;
  reportStatus: GrowthReportStatus;
};

export function clampProgress(value: number): number { return Math.min(1, Math.max(0, value)); }

export function getCourseProgress(course: GrowthCourseProgress): number {
  return course.totalUnits <= 0 ? 0 : clampProgress(course.completedUnits / course.totalUnits);
}

export function groupGrowthRecords(records: readonly GrowthLearningRecord[]): Map<string, GrowthLearningRecord[]> {
  const groups = new Map<string, GrowthLearningRecord[]>();
  for (const record of records) groups.set(record.classId, [...(groups.get(record.classId) ?? []), record]);
  for (const [classId, group] of groups) groups.set(classId, [...group].sort((a, b) => b.sortKey - a.sortKey));
  return new Map([...groups.entries()].sort(([, left], [, right]) => (right[0]?.sortKey ?? 0) - (left[0]?.sortKey ?? 0)));
}

export function canOpenGrowthRecord(record: GrowthLearningRecord): boolean {
  return record.status === 'finished' && record.reportStatus === 'published';
}
