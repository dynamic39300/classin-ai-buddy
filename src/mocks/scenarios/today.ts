export const teacherTodayScenario = {
  dateLabel: '8月8日 星期六',
  greeting: '下午好，王老师',
  nextClass: {
    time: '14:30',
    duration: '60分钟',
    title: '动量守恒模型',
    className: '高二物理 · 3班',
    location: '在线教室 02',
  },
  timeline: [
    { time: '09:00', title: '牛顿定律周测讲评', meta: '高二物理 · 1班', state: '已结束' },
    { time: '11:10', title: '阅读理解专题', meta: '初三英语 · 2班', state: '已结束' },
    { time: '14:30', title: '动量守恒模型', meta: '高二物理 · 3班', state: '下一节' },
    { time: '19:00', title: '家长会说明会', meta: '公开课', state: '待开始' },
  ],
  attention: [
    { title: '动量守恒作业 A 组', meta: '12份待批改 · 今天 18:00 截止', tone: 'danger' },
    { title: '阅读训练第 6 讲', meta: '7名学生未提交', tone: 'warning' },
    { title: '高二物理 · 3班', meta: '2条家长消息待回复', tone: 'info' },
  ],
} as const;

export const studentTodayScenario = {
  dateLabel: '8月8日 星期六',
  greeting: '下午好，李明',
  primaryAction: {
    label: '今天先完成',
    title: '动量守恒作业 A 组',
    meta: '高二物理 · 3班 · 今天 18:00 截止',
    progress: '已完成 4 / 10 题',
  },
  schedule: [
    { time: '14:30', title: '动量守恒模型', meta: '王老师 · 在线教室 02', state: '下一节' },
    { time: '19:00', title: '家长会说明会', meta: '公开课 · 线上', state: '待开始' },
  ],
  feedback: [
    { title: '牛顿定律周测', meta: '老师已批改 · 需要订正 2 题', tone: 'warning' },
    { title: '英文阅读训练', meta: '老师评语已更新', tone: 'success' },
  ],
} as const;
