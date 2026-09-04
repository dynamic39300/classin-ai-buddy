import {
  Award,
  BookOpenCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flame,
  GraduationCap,
  ListFilter,
  NotebookPen,
  PenTool,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TeachingObjectIcon } from '@design-system/TeachingObjectIcon';
import { canOpenGrowthRecord, getCourseProgress, groupGrowthRecords, type GrowthLearningRecord, type GrowthOverview } from '@domain/growth/growth';
import { GROWTH_CLASSES, GROWTH_COURSES, GROWTH_OVERVIEWS_BY_SCOPE, GROWTH_OVERVIEW, GROWTH_RECORDS, GROWTH_REWARDS } from '@mocks/scenarios/growth';
import styles from './StudentGrowthWorkspace.module.css';

const METRICS = [
  {
    id: 'attendance-days',
    label: '上课天数',
    valueKey: 'attendanceDays',
    helper: '出勤记录',
    calculation: '一天里只要上过一节课，就记作 1 天；同一天上多节课也只算 1 天。',
    meaning: '天数越稳定，说明你最近保持了比较规律的上课节奏。',
    Icon: CalendarDays,
  },
  {
    id: 'homework-completion',
    label: '作业完成',
    valueKey: 'homeworkCompletion',
    helper: '提交节奏',
    calculation: '用已提交的作业数除以需要提交的作业数。例如 10 份作业交了 9 份，就是 90%。',
    meaning: '帮助你看看作业是否按计划完成，但不代表作业得分。',
    Icon: BookOpenCheck,
  },
  {
    id: 'consecutive-days',
    label: '连续学习',
    valueKey: 'consecutiveDays',
    helper: '保持稳定',
    calculation: '每天只要有上课、交作业或完成学习活动，就算学习 1 天；中断后会重新计算。',
    meaning: '连续天数越长，说明你最近的学习习惯保持得越稳定。',
    Icon: Flame,
  },
  {
    id: 'total-hours',
    label: '累计时长',
    valueKey: 'totalHours',
    helper: '本学期',
    calculation: '把本学期上课和完成学习活动的有效时长加在一起。',
    meaning: '帮助你了解本学期投入了多少时间，还要结合完成情况和准确率一起看。',
    Icon: Clock3,
  },
  {
    id: 'accuracy',
    label: '准确率',
    valueKey: 'accuracy',
    helper: 'accuracyTrend',
    calculation: '用答对的已批改客观题数除以已作答并批改的客观题数。例如 100 题答对 76 题，就是 76%。',
    meaning: '帮助你发现哪些内容已经掌握、哪些还需要复习，不代表课程总成绩。',
    Icon: Target,
  },
  {
    id: 'rewards',
    label: '获得奖励',
    valueKey: 'rewards',
    helper: '课堂正反馈',
    calculation: '把本学期老师和课堂活动发给你的奖励加在一起。',
    meaning: '记录学习中的积极表现，帮助你回顾进步，不用于成绩排名。',
    Icon: Award,
  },
] as const;

function formatMetricValue(key: (typeof METRICS)[number]['valueKey'], overview: GrowthOverview): string {
  if (key === 'attendanceDays' || key === 'consecutiveDays') return `${overview[key]} 天`;
  if (key === 'totalHours') return `${overview[key]} 小时`;
  if (key === 'rewards') return `${overview[key]} 枚`;
  return `${overview[key]}%`;
}

type RecordAction = '作业结果' | '课堂报告' | '看回放' | '我的笔记' | '已发布板书';
const RECORD_ACTIONS: ReadonlyArray<RecordAction> = ['作业结果', '课堂报告', '看回放', '我的笔记', '已发布板书'];

function RecordActionIcon({ action, size }: { action: RecordAction; size: number }) {
  if (action === '作业结果') return <TeachingObjectIcon kind="homework" size={size} />;
  if (action === '看回放') return <TeachingObjectIcon kind="recording" size={size} />;
  if (action === '课堂报告') return <GraduationCap aria-hidden="true" size={size} />;
  if (action === '我的笔记') return <NotebookPen aria-hidden="true" size={size} />;
  return <PenTool aria-hidden="true" size={size} />;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className={styles.emptyState}><strong>{title}</strong><span>{detail}</span></div>;
}

export function StudentGrowthWorkspace() {
  const navigate = useNavigate();
  const [classFilter, setClassFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set(['growth-class-002', 'physics-3']));
  const [selectedRecord, setSelectedRecord] = useState<GrowthLearningRecord | null>(null);
  const [selectedAction, setSelectedAction] = useState<RecordAction | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const detailDialogRef = useRef<HTMLDialogElement>(null);
  const detailCloseRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const filterControlRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

  const availableCourses = useMemo(() => GROWTH_COURSES.filter((course) => classFilter !== 'all' && course.classId === classFilter), [classFilter]);
  const visibleCourses = useMemo(() => GROWTH_COURSES.filter((course) => (classFilter === 'all' || course.classId === classFilter) && (courseFilter === 'all' || course.id === courseFilter)), [classFilter, courseFilter]);
  const visibleRecords = useMemo(() => GROWTH_RECORDS.filter((record) => (classFilter === 'all' || record.classId === classFilter) && (courseFilter === 'all' || record.courseId === courseFilter)), [classFilter, courseFilter]);
  const visibleRewards = useMemo(() => GROWTH_REWARDS.filter((reward) => (classFilter === 'all' || reward.classId === classFilter) && (courseFilter === 'all' || reward.courseId === courseFilter)).slice(0, 3), [classFilter, courseFilter]);
  const groups = useMemo(() => groupGrowthRecords(visibleRecords), [visibleRecords]);
  const selectedClassName = classFilter === 'all' ? '全部班级' : GROWTH_CLASSES.find((item) => item.id === classFilter)?.name ?? '全部班级';
  const selectedCourseName = courseFilter === 'all' ? '全部课程' : GROWTH_COURSES.find((item) => item.id === courseFilter)?.courseName ?? '全部课程';
  const currentScopeName = courseFilter === 'all' ? selectedClassName : selectedCourseName;
  const currentOverview = courseFilter === 'all' && classFilter === 'all' ? GROWTH_OVERVIEW : GROWTH_OVERVIEWS_BY_SCOPE[courseFilter === 'all' ? classFilter : courseFilter] ?? GROWTH_OVERVIEW;
  const currentScore = classFilter === 'all' && courseFilter === 'all' ? 78 : Math.round((currentOverview.homeworkCompletion + currentOverview.accuracy) / 2);

  useEffect(() => {
    if (!selectedRecord) return;
    const dialog = detailDialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    window.requestAnimationFrame(() => detailCloseRef.current?.focus());
  }, [selectedRecord]);

  useEffect(() => {
    if (!filterOpen) return undefined;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !filterControlRef.current?.contains(event.target)) setFilterOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [filterOpen]);

  const closeDetails = () => {
    const trigger = triggerRef.current;
    detailDialogRef.current?.close();
    setSelectedRecord(null);
    setSelectedAction(null);
    trigger?.focus();
  };

  const toggleGroup = (id: string) => setCollapsed((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const selectClass = (id: string) => {
    setClassFilter(id);
    setCourseFilter('all');
    setSelectedRecord(null);
    setSelectedAction(null);
  };

  const selectCourse = (id: string) => {
    setCourseFilter(id);
    setSelectedRecord(null);
    setSelectedAction(null);
  };

  const clearScopeFilters = () => {
    setClassFilter('all');
    setCourseFilter('all');
    setSelectedRecord(null);
    setSelectedAction(null);
  };

  const openAction = (record: GrowthLearningRecord, action: RecordAction, event: MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = event.currentTarget;
    if (action === '作业结果' && record.homeworkId) {
      navigate(`/student/homework/${record.homeworkId}/result?source=growth`);
      return;
    }
    setSelectedRecord(record);
    setSelectedAction(action);
  };

  const renderRecord = (record: GrowthLearningRecord) => {
    const published = canOpenGrowthRecord(record);
    const recordClassName = GROWTH_CLASSES.find((item) => item.id === record.classId)?.name ?? record.classId;
    const recordCourseName = GROWTH_COURSES.find((item) => item.id === record.courseId)?.courseName ?? record.courseId;
    return (
      <article className={styles.recordRow} key={record.id} data-status={record.status}>
        <div className={styles.recordDate}><strong>{record.date}</strong><span>{record.status === 'upcoming' ? '即将开始' : '已完成'}</span></div>
        <div className={styles.recordBody}>
          <div className={styles.recordTitle}>
            <div><strong>{record.unitName}</strong><span>{recordClassName} · {recordCourseName}</span></div>
            <div className={styles.recordBadges}>
              {record.attended ? <span><Check aria-hidden="true" size={12} />出勤</span> : null}
              {record.score !== null ? <span>{record.score} 分</span> : null}
              {record.rewards > 0 ? <span><Award aria-hidden="true" size={12} />×{record.rewards}</span> : null}
            </div>
          </div>
          {published ? (
            <div className={styles.recordActions} aria-label={`${record.unitName}可用操作`}>
              {RECORD_ACTIONS.map((action) => <button key={action} type="button" onClick={(event) => openAction(record, action, event)}><RecordActionIcon action={action} size={14} />{action}</button>)}
            </div>
          ) : <p className={styles.recordPending}>{record.status === 'upcoming' ? '课节结束后会在这里沉淀学习记录。' : '课堂报告正在整理，发布后可查看结果。'}</p>}
        </div>
      </article>
    );
  };

  return (
    <section className={styles.page} aria-label="学生成长">
      <main className={styles.content}>
        <section className={styles.diagnosis} aria-labelledby="growth-diagnosis">
          <div className={styles.diagnosisMeta}>
            <span className={styles.eyebrow}>本周综合</span>
            <div className={styles.filterControl} ref={filterControlRef}>
              <button ref={filterTriggerRef} className={styles.filterTrigger} type="button" aria-expanded={filterOpen} aria-haspopup="dialog" onClick={() => setFilterOpen((open) => !open)}>
                <ListFilter aria-hidden="true" size={15} /><span>成长范围</span><strong>{currentScopeName}</strong>{classFilter !== 'all' || courseFilter !== 'all' ? <em>{Number(classFilter !== 'all') + Number(courseFilter !== 'all')}</em> : null}<ChevronDown aria-hidden="true" size={14} />
              </button>
              {filterOpen ? <div className={styles.filterPopover} role="group" aria-label="成长范围筛选选项" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); setFilterOpen(false); filterTriggerRef.current?.focus(); } }}>
                <label>班级范围<select aria-label="班级范围" value={classFilter} onChange={(event) => selectClass(event.target.value)}><option value="all">全部班级</option>{GROWTH_CLASSES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>课程范围<select aria-label="课程范围" value={courseFilter} disabled={classFilter === 'all'} onChange={(event) => selectCourse(event.target.value)}><option value="all">全部课程</option>{availableCourses.map((course) => <option key={course.id} value={course.id}>{course.courseName}</option>)}</select></label>
                <button type="button" disabled={classFilter === 'all' && courseFilter === 'all'} onClick={clearScopeFilters}>清除筛选</button>
              </div> : null}
            </div>
          </div>
          <div className={styles.diagnosisIcon}><Sparkles aria-hidden="true" size={19} /></div>
          <div>
            <h2 id="growth-diagnosis">学习节奏稳定，下一步建议复盘最近一次错题。</h2>
            <p className={styles.diagnosisFacts}><span>{currentScopeName}</span><span>作业完成 {currentOverview.homeworkCompletion}%</span><span>准确率 {currentOverview.accuracy}%</span></p>
          </div>
          <div className={styles.diagnosisScore}><strong>{currentScore}%</strong><span>综合掌握</span></div>
          <div className={styles.nextStep}><Target aria-hidden="true" size={16} /><span>建议从最近已发布课堂进入作业结果，确认薄弱题型。</span></div>
        </section>

        <section className={styles.metricSection} aria-labelledby="overview-title">
          <header className={styles.sectionHeader}><h2 id="overview-title">成长概览</h2><span>六项核心指标</span></header>
          <div className={styles.metricGrid}>{METRICS.map(({ id, label, valueKey, helper, calculation, meaning, Icon }) => {
            const tooltipId = `growth-metric-${id}-tooltip`;
            return (
              <div className={styles.metric} key={id}>
                <Icon aria-hidden="true" size={16} />
                <span className={styles.metricLabel}>
                  <span>{label}</span>
                  <span className={styles.metricInfo}>
                    <button type="button" aria-label={`${label}说明`} aria-describedby={tooltipId}>
                      <CircleHelp aria-hidden="true" size={13} />
                    </button>
                    <span id={tooltipId} className={styles.metricTooltip} role="tooltip">
                      <span><strong>怎么算</strong>{calculation}</span>
                      <span><strong>怎么看</strong>{meaning}</span>
                    </span>
                  </span>
                </span>
                <strong>{formatMetricValue(valueKey, currentOverview)}</strong><small>{helper === 'accuracyTrend' ? (currentOverview.accuracyTrend === 'down' ? '继续复盘' : '较上次提升') : helper}</small>
              </div>
            );
          })}</div>
        </section>

        <section className={styles.section} aria-labelledby="course-progress-title">
          <header className={styles.sectionHeader}><h2 id="course-progress-title">课程进度</h2><span>{visibleCourses.length} 门课程</span></header>
          {visibleCourses.length > 0 ? <div className={styles.courseList}>{visibleCourses.map((course) => { const progress = getCourseProgress(course); return <article className={styles.courseRow} key={course.id}><div className={styles.courseTitle}><span className={styles.courseMark}>{course.className.slice(0, 1)}</span><div><strong>{course.courseName}</strong><small>{course.className} · 当前 {course.currentUnit}</small></div></div><div className={styles.progressBlock}><div><span>{course.completedUnits}/{course.totalUnits} 个单元</span><strong>{Math.round(progress * 100)}%</strong></div><span className={styles.progressTrack}><i style={{ width: `${progress * 100}%` }} /></span><small>本单元已完成 {course.currentActivitiesDone}/{course.currentActivitiesTotal} 个活动</small></div></article>; })}</div> : <EmptyState title="暂无课程进度" detail="选择其他班级或等待课程内容更新。" />}
        </section>

        <section className={styles.section} aria-labelledby="reward-title">
          <header className={styles.sectionHeader}><h2 id="reward-title">最近奖励</h2><strong className={styles.rewardTotal}>{currentOverview.rewards}</strong></header>
          {visibleRewards.length > 0 ? <div className={styles.rewardTimeline} data-count={visibleRewards.length}>{visibleRewards.map((reward) => <div key={reward.id}><span><Award aria-hidden="true" size={14} /></span><div><strong>{reward.label}</strong><small>{reward.date}</small></div></div>)}</div> : <EmptyState title="暂无最近奖励" detail="当前成长范围内还没有奖励记录。" />}
          <button className={styles.rewardButton} type="button" onClick={() => setFeedback('奖励记录入口已保留，本 Demo 使用本地确定性记录。')}>查看奖励记录<ChevronRight aria-hidden="true" size={14} /></button>
        </section>

        <section className={styles.section} aria-labelledby="record-title">
          <header className={styles.sectionHeader}><div><h2 id="record-title">学习记录</h2><p>{classFilter === 'all' ? '全部班级按班聚类，最近活跃班默认展开。' : courseFilter === 'all' ? '当前班级记录按时间倒序。' : '当前课程记录按时间倒序。'}</p></div></header>
          {groups.size === 0 ? <EmptyState title="暂无学习记录" detail="完成课程或活动后，学习记录会显示在这里。" /> : classFilter === 'all' ? <div className={styles.recordGroups}>{[...groups.entries()].map(([id, records]) => { const isCollapsed = collapsed.has(id); const className = GROWTH_CLASSES.find((item) => item.id === id)?.name ?? id; return <section className={styles.recordGroup} key={id}><button type="button" className={styles.groupHeader} onClick={() => toggleGroup(id)} aria-expanded={!isCollapsed}><span className={styles.groupMark}>{className.slice(0, 1)}</span><span><strong>{className}</strong><small>{records.length} 条记录</small></span><ChevronDown aria-hidden="true" size={16} className={!isCollapsed ? styles.chevronOpen : ''} /></button>{!isCollapsed ? <div className={styles.groupRows}>{records.map(renderRecord)}</div> : null}</section>; })}</div> : <div className={styles.flatRecords}>{visibleRecords.map(renderRecord)}</div>}
        </section>
      </main>

      {selectedRecord && selectedAction ? <dialog ref={detailDialogRef} className={styles.detailDialog} aria-labelledby="growth-detail-title" onCancel={(event) => { event.preventDefault(); closeDetails(); }}>
        <header><div><span className={styles.eyebrow}>学习记录</span><h2 id="growth-detail-title">{selectedAction}</h2></div><button ref={detailCloseRef} type="button" aria-label="关闭学习记录详情" onClick={closeDetails}><X aria-hidden="true" size={17} /></button></header>
        <div className={styles.detailHero}><RecordActionIcon action={selectedAction} size={27} /><strong>{selectedRecord.unitName}</strong><span>{selectedRecord.date} · {selectedRecord.score !== null ? `${selectedRecord.score} 分` : '学习记录'}</span></div>
        <p>{selectedAction === '已发布板书' ? '老师发布的课堂板书入口已保留。本 Demo 不下载真实板书文件。' : `${selectedAction}已在当前课节上下文中打开，本 Demo 不连接真实服务。`}</p>
        <button className={styles.detailButton} type="button" onClick={() => setFeedback(`${selectedAction}操作已确认，当前仅为本地 Demo 反馈。`)}>知道了</button>
      </dialog> : null}
      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
    </section>
  );
}
