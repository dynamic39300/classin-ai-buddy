import type { ClassRecord, OpenCourseRecord } from '@domain/class/class';

export const CLASS_NOW = new Date('2026-08-08T14:15:00+08:00');

export const CLASS_RECORDS: ReadonlyArray<ClassRecord> = [
  {
    id: 'physics-3', name: '高二物理 3 班',
    visibleTo: ['teacher', 'student-family'], roleByAppRole: { teacher: 'headmaster', 'student-family': 'student-family' }, memberCount: 30,
    pendingCountByRole: { teacher: 4, 'student-family': 1 }, unreadCountByRole: { teacher: 1, 'student-family': 2 }, coverTone: 'green',
    nextActivity: { title: '动量守恒模型', startsAt: '2026-08-08T14:30:00+08:00', detail: '线上课堂' }, updatedAt: '2026-08-08T14:08:00+08:00',
    courses: [
      { id: 'course-momentum', name: '动量与碰撞', description: '建立动量守恒模型，完成课堂练习与订正。', status: 'active', units: [
        { id: 'unit-momentum-1', title: '第一单元 受力与动量', description: '从研究对象开始，统一正方向。', status: 'published', activities: [
          { id: 'activity-momentum-lesson', type: 'lesson', title: '动量守恒模型', status: 'active', scheduledAt: '2026-08-08T14:30:00+08:00', detail: '课堂 · 40 分钟 · 30 位成员' },
          { id: 'activity-momentum-homework', type: 'homework', homeworkId: 'homework-momentum-a', title: '动量守恒作业 A 组', status: 'upcoming', scheduledAt: '2026-08-08T18:00:00+08:00', detail: '作业 · 今天 18:00 截止' },
        ] },
        { id: 'unit-momentum-2', title: '第二单元 碰撞模型', description: '观察碰撞过程中的能量变化。', status: 'published', activities: [
          { id: 'activity-collision-reading', type: 'reading', title: '碰撞模型阅读材料', status: 'completed', detail: '资料 · 已完成' },
        ] },
      ] },
      { id: 'course-review', name: '错题订正与复习', description: '集中整理课堂错题，形成复习路径。', status: 'active', units: [
        { id: 'unit-review-1', title: '错题订正', description: '根据老师反馈完成订正。', status: 'draft', activities: [
          { id: 'activity-review-pending', type: 'homework', homeworkId: 'homework-correction', title: '机械波错题订正', status: 'pending', detail: '待开始 · 所属单元尚未发布' },
        ] },
      ] },
    ],
    announcements: [
      { id: 'announcement-physics-1', title: '课前练习单提醒', body: '请大家课前准备好课堂练习单，今天 18:00 前完成作业。', createdAt: '2026-08-08T13:48:00+08:00', authorName: '王老师', readByRole: { teacher: true, 'student-family': false }, confirmedMemberIds: ['member-wu'], unconfirmedMemberIds: ['member-li'] },
    ],
    members: [
      { id: 'member-wang', name: '王老师', role: 'headmaster', plan: 'pro', relationship: '班主任', joinedAt: '2026-06-01', leftAt: null, isCurrentUser: true },
      { id: 'member-zhang', name: '张老师', role: 'teacher', plan: 'trial', relationship: '协同教师', joinedAt: '2026-06-02', leftAt: null, hasBlockingLesson: true },
      { id: 'member-li', name: '李明', role: 'student-family', plan: 'free', relationship: '学生', joinedAt: '2026-06-10', leftAt: null, isCurrentUser: true },
      { id: 'member-wu', name: '吴晓', classNickname: '小吴', role: 'student-family', plan: 'free', relationship: '学生', joinedAt: '2026-06-10', leftAt: null },
    ],
    settings: { allowStudentInvite: false, allowViewAfterLeaveOrComplete: true, allowTeacherCreateLesson: true, allowStudentEditNickname: true, classIntro: '', coverColor: '#0FAD7C' },
  },
  {
    id: 'physics-1', name: '高二物理 1 班', visibleTo: ['teacher'],
    roleByAppRole: { teacher: 'teacher' }, memberCount: 32, pendingCountByRole: { teacher: 2 }, unreadCountByRole: { teacher: 0 }, coverTone: 'blue',
    nextActivity: { title: '周末学习提醒', startsAt: '2026-08-09T10:00:00+08:00', detail: '班级活动' }, updatedAt: '2026-08-07T12:20:00+08:00',
    courses: [{ id: 'course-physics-1', name: '机械波基础', description: '从波的形成到传播特征。', status: 'completed', units: [{ id: 'unit-wave-1', title: '第一单元 机械波', description: '波的图像与基本性质。', status: 'published', activities: [{ id: 'activity-wave-1', type: 'lesson', title: '机械波基础', status: 'completed', replayAvailability: 'unavailable', detail: '课堂 · 已结束' }] }] }],
    announcements: [],
    members: [{ id: 'member-wang-1', name: '王老师', role: 'teacher', plan: 'trial', relationship: '协同教师', joinedAt: '2026-05-01', leftAt: null, isCurrentUser: true }],
    settings: { allowStudentInvite: false, allowViewAfterLeaveOrComplete: false, allowTeacherCreateLesson: false, allowStudentEditNickname: false, classIntro: '', coverColor: '#2673DD' },
  },
  {
    id: 'english-2', name: '初三英语 2 班', visibleTo: ['student-family'],
    roleByAppRole: { 'student-family': 'student-family' }, memberCount: 28, pendingCountByRole: { 'student-family': 2 }, unreadCountByRole: { 'student-family': 0 }, coverTone: 'amber',
    nextActivity: { title: '阅读训练第 6 讲', startsAt: '2026-08-09T09:00:00+08:00', detail: '陈老师' }, updatedAt: '2026-08-08T09:45:00+08:00',
    courses: [{ id: 'course-english-2', name: '阅读训练', description: '从定位题开始，逐步建立阅读策略。', status: 'active', units: [{ id: 'unit-english-1', title: '第六讲 定位与主旨', description: '先找信息，再判断文章主旨。', status: 'published', activities: [{ id: 'activity-english-1', type: 'reading', title: '阅读训练第 6 讲', status: 'upcoming', scheduledAt: '2026-08-09T09:00:00+08:00', detail: '阅读 · 明天 09:00' }] }] }],
    announcements: [{ id: 'announcement-english-1', title: '阅读训练预习提醒', body: '有问题可以在班级消息中集中提出。', createdAt: '2026-08-08T09:45:00+08:00', authorName: '陈老师', readByRole: { 'student-family': true }, confirmedMemberIds: ['member-li-english'], unconfirmedMemberIds: [] }],
    members: [{ id: 'member-chen', name: '陈老师', role: 'headmaster', plan: 'pro', relationship: '班主任', joinedAt: '2026-05-12', leftAt: null }, { id: 'member-li-english', name: '李明', role: 'student-family', plan: 'free', relationship: '学生', joinedAt: '2026-05-12', leftAt: null, isCurrentUser: true }],
    settings: { allowStudentInvite: false, allowViewAfterLeaveOrComplete: true, allowTeacherCreateLesson: true, allowStudentEditNickname: false, classIntro: '', coverColor: '#D19328' },
  },
  {
    id: 'history-physics', name: '高一物理基础班', visibleTo: ['teacher', 'student-family'],
    roleByAppRole: { teacher: 'teacher', 'student-family': 'student-family' }, memberCount: 26, pendingCountByRole: { teacher: 0, 'student-family': 0 }, unreadCountByRole: { teacher: 0, 'student-family': 0 }, coverTone: 'ink', updatedAt: '2026-07-20T12:00:00+08:00',
    courses: [{ id: 'course-history-physics', name: '基础复习', description: '已结课内容可继续查看。', status: 'completed', units: [{ id: 'unit-history-1', title: '课程记录', description: '历史课堂与资料。', status: 'published', activities: [{ id: 'activity-history-1', type: 'lesson', title: '基础复习课', status: 'completed', replayAvailability: 'available', detail: '课堂 · 历史记录' }] }] }], announcements: [], members: [], settings: { allowStudentInvite: false, allowViewAfterLeaveOrComplete: true, allowTeacherCreateLesson: false, allowStudentEditNickname: false, classIntro: '', coverColor: '#30353F' }, lastLessonEndedAt: '2026-05-20T12:00:00+08:00',
  },
];

export const OPEN_COURSE_RECORDS: ReadonlyArray<OpenCourseRecord> = [
  { id: 'open-reading', title: '高效阅读公开课', subject: '英语', instructorName: '陈老师', startsAt: '2026-08-08T16:00:00+08:00', durationMinutes: 40, status: 'scheduled', visibleTo: ['teacher', 'student-family'], ownerRoles: [], enrolledCount: 18, maxSeats: 30, description: '从文章结构入手，练习阅读定位与主旨判断。', classroomSummary: '线上直播间' },
  { id: 'open-family', title: '家长会说明会', subject: '家庭教育', instructorName: '王老师', startsAt: '2026-08-08T19:00:00+08:00', durationMinutes: 40, status: 'scheduled', visibleTo: ['teacher', 'student-family'], ownerRoles: ['teacher'], enrolledCount: 22, maxSeats: 60, description: '介绍新学期的学习节奏与家校沟通方式。', classroomSummary: '线上直播间' },
  { id: 'open-history', title: '产品经理成长训练营', subject: '职业素养', instructorName: '张老师', startsAt: '2026-08-06T19:00:00+08:00', durationMinutes: 60, status: 'ended', visibleTo: ['teacher'], ownerRoles: ['teacher'], enrolledCount: 36, maxSeats: 60, description: '已结束的公开课记录。', classroomSummary: '课堂回放' },
];
