import type { GrowthCourseProgress, GrowthLearningRecord, GrowthOverview } from '@domain/growth/growth';

export const GROWTH_OVERVIEW: GrowthOverview = { attendanceDays: 12, homeworkCompletion: 89, consecutiveDays: 7, totalHours: 18, accuracy: 76, rewards: 24, accuracyTrend: 'up' };

export const GROWTH_OVERVIEWS_BY_SCOPE: Readonly<Record<string, GrowthOverview>> = {
  'growth-class-001': { attendanceDays: 6, homeworkCompletion: 92, consecutiveDays: 5, totalHours: 8, accuracy: 81, rewards: 12, accuracyTrend: 'up' },
  'growth-class-002': { attendanceDays: 4, homeworkCompletion: 86, consecutiveDays: 4, totalHours: 6, accuracy: 72, rewards: 7, accuracyTrend: 'down' },
  'physics-3': { attendanceDays: 3, homeworkCompletion: 88, consecutiveDays: 3, totalHours: 4, accuracy: 79, rewards: 5, accuracyTrend: 'up' },
  'growth-course-001': { attendanceDays: 6, homeworkCompletion: 92, consecutiveDays: 5, totalHours: 8, accuracy: 81, rewards: 12, accuracyTrend: 'up' },
  'growth-course-writing': { attendanceDays: 3, homeworkCompletion: 90, consecutiveDays: 4, totalHours: 3, accuracy: 78, rewards: 4, accuracyTrend: 'up' },
  'growth-course-002': { attendanceDays: 4, homeworkCompletion: 86, consecutiveDays: 4, totalHours: 6, accuracy: 72, rewards: 7, accuracyTrend: 'down' },
  'growth-course-physics': { attendanceDays: 3, homeworkCompletion: 88, consecutiveDays: 3, totalHours: 4, accuracy: 79, rewards: 5, accuracyTrend: 'up' },
};

export const GROWTH_COURSES: readonly GrowthCourseProgress[] = [
  { id: 'growth-course-001', classId: 'growth-class-001', className: '初三英语A班', courseName: '精读课', completedUnits: 6, totalUnits: 10, currentUnit: 'Unit 3', currentActivitiesDone: 2, currentActivitiesTotal: 4 },
  { id: 'growth-course-writing', classId: 'growth-class-001', className: '初三英语A班', courseName: '写作课', completedUnits: 4, totalUnits: 8, currentUnit: '议论文结构', currentActivitiesDone: 2, currentActivitiesTotal: 3 },
  { id: 'growth-course-002', classId: 'growth-class-002', className: '初二数学提高班', courseName: '函数专题', completedUnits: 3, totalUnits: 9, currentUnit: '第5单元', currentActivitiesDone: 1, currentActivitiesTotal: 3 },
  { id: 'growth-course-physics', classId: 'physics-3', className: '高二物理 3 班', courseName: '动量与碰撞', completedUnits: 2, totalUnits: 4, currentUnit: '碰撞模型', currentActivitiesDone: 3, currentActivitiesTotal: 5 },
];

export const GROWTH_RECORDS: readonly GrowthLearningRecord[] = [
  { id: 'growth-record-001', classId: 'growth-class-001', courseId: 'growth-course-001', date: '今天', sortKey: 3, unitName: 'Unit3精读 第2讲', score: null, rewards: 0, attended: false, status: 'upcoming', reportStatus: null },
  { id: 'growth-record-002', classId: 'growth-class-001', courseId: 'growth-course-001', date: '8月6日', sortKey: 2, unitName: 'Unit3精读 第1讲', score: 88, rewards: 3, attended: true, status: 'finished', reportStatus: 'published' },
  { id: 'growth-record-writing', classId: 'growth-class-001', courseId: 'growth-course-writing', date: '8月5日', sortKey: 1.5, unitName: '议论文开篇练习', score: 85, rewards: 1, attended: true, status: 'finished', reportStatus: 'published' },
  { id: 'growth-record-003', classId: 'growth-class-002', courseId: 'growth-course-002', date: '8月4日', sortKey: 1, unitName: '词汇专项', score: 82, rewards: 2, attended: true, status: 'finished', reportStatus: 'published' },
  { id: 'growth-record-physics-result', classId: 'physics-3', courseId: 'growth-course-physics', homeworkId: 'homework-result', date: '8月7日', sortKey: 0, unitName: '碰撞模型单元总结', score: 92, rewards: 2, attended: true, status: 'finished', reportStatus: 'published' },
];

export const GROWTH_CLASSES = [
  { id: 'growth-class-001', name: '初三英语A班', status: 'active' as const },
  { id: 'growth-class-002', name: '初二数学提高班', status: 'active' as const },
  { id: 'physics-3', name: '高二物理 3 班', status: 'active' as const },
];

export const GROWTH_REWARDS = [
  { id: 'growth-reward-reading', classId: 'growth-class-001', courseId: 'growth-course-001', label: '课堂表达清晰', date: '今天' },
  { id: 'growth-reward-writing', classId: 'growth-class-001', courseId: 'growth-course-writing', label: '写作思路完整', date: '8月5日' },
  { id: 'growth-reward-math', classId: 'growth-class-002', courseId: 'growth-course-002', label: '按时完成作业', date: '8月4日' },
  { id: 'growth-reward-physics', classId: 'physics-3', courseId: 'growth-course-physics', label: '碰撞模型掌握扎实', date: '8月2日' },
] as const;
