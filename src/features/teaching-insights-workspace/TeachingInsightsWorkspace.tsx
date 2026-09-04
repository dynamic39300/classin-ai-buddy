import {
  Activity,
  ArrowUpDown,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Info,
  Search,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  filterAndSortStudents,
  getInsightCourseScenario,
  getInsightScenario,
  getRecentLessons,
  getStudentStatus,
  resolveInsightTarget,
  type InsightMetric,
  type InsightMetricGroup,
  type InsightSortKey,
  type StudentInsight,
  type StudentStatus,
} from '@domain/insights/insights';
import { INSIGHT_CLASSES, INSIGHT_SCENARIOS } from '@mocks/scenarios/insights';
import styles from './TeachingInsightsWorkspace.module.css';

const STATUS_LABELS: Record<StudentStatus, string> = { attention: '需关注', reward: '可奖励', stable: '稳定' };
const STATUS_ICONS: Record<StudentStatus, typeof CircleAlert> = { attention: CircleAlert, reward: Trophy, stable: CheckCircle2 };
const METRIC_GROUP_LABELS: Record<InsightMetricGroup, string> = { attendance: '出勤', interaction: '课堂互动与氛围', homework: '作业提交质量' };
const METRIC_GROUP_META: Record<InsightMetricGroup, { icon: typeof Activity; finding: string; action: string }> = {
  attendance: {
    icon: CalendarCheck2,
    finding: '先用班级出勤率判断到课覆盖，再回到学生名单确认缺勤发生在哪些课堂。',
    action: '连续缺勤再单独跟进，避免只凭班级百分比判断学生状态。',
  },
  interaction: {
    icon: Activity,
    finding: '主动参与反映自发表达，被动响应反映教师发起互动后的完成情况，两项需要分开看。',
    action: '下一节课先做全员响应，再安排自愿说明理由，分别观察响应与主动表达。',
  },
  homework: {
    icon: ClipboardCheck,
    finding: '提交率说明是否完成任务，正确率说明已批改内容的掌握情况，不能相互替代。',
    action: '未提交学生优先催交；已提交但错误较多的学生进入错题讲评。',
  },
};
const DEFAULT_INSIGHT_CLASS_ID = INSIGHT_CLASSES[0]?.id ?? '';

type TeachingInsightsWorkspaceProps = { viewState?: 'ready' | 'loading' | 'error' | 'empty-lessons' | 'empty-students' | 'forbidden' };

function formatMetric(metric: InsightMetric): string {
  if (metric.value === null) return '暂无';
  if (metric.unit === '%') return `${metric.value}%`;
  if (metric.unit === 'count') return `${metric.value} 次`;
  return String(metric.value);
}

function homeworkStatus(student: StudentInsight): string {
  return student.homeworkCompleted ? '已完成' : '未提交';
}

export function TeachingInsightsWorkspace({ viewState = 'ready' }: TeachingInsightsWorkspaceProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStudentId = searchParams.get('student');
  const requestedCourseId = searchParams.get('course');
  const target = resolveInsightTarget(searchParams, INSIGHT_SCENARIOS);
  const classId = target.classId || DEFAULT_INSIGHT_CLASS_ID;
  const scenario = getInsightScenario(classId, INSIGHT_SCENARIOS);
  const [statusFilter, setStatusFilter] = useState<'all' | StudentStatus>('all');
  const [studentQuery, setStudentQuery] = useState('');
  const [sortKey, setSortKey] = useState<InsightSortKey>('status');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isClassPickerOpen, setIsClassPickerOpen] = useState(false);
  const studentTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const allLessonsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const classPickerRef = useRef<HTMLDivElement | null>(null);
  const classPickerTriggerRef = useRef<HTMLButtonElement | null>(null);

  const currentClass = scenario?.class;
  const courseScenario = scenario ? getInsightCourseScenario(scenario, requestedCourseId) : null;
  const invalidCourseTarget = Boolean(requestedCourseId && !courseScenario);
  const insightScope = courseScenario ?? scenario;
  const currentOverview = courseScenario?.course ?? currentClass;
  const currentCourseName = courseScenario?.course.name ?? '全部课程';
  const selectedStudent = insightScope?.students.find(({ id }) => id === requestedStudentId) ?? null;
  const requestedSection = searchParams.get('section');
  const invalidClassTarget = target.status === 'invalid-class';
  const invalidStudentTarget = target.status === 'invalid-student';
  const lessons = insightScope ? getRecentLessons(insightScope.lessons, classId, courseScenario?.course.id) : [];
  const students = filterAndSortStudents(insightScope?.students ?? [], {
    courseId: courseScenario?.course.id,
    text: studentQuery,
    status: statusFilter,
    sortKey,
    direction: sortDirection,
  });
  const attentionCount = (insightScope?.students ?? []).filter((student) => getStudentStatus(student) === 'attention').length;
  const rewardCount = (insightScope?.students ?? []).filter((student) => getStudentStatus(student) === 'reward').length;

  useLayoutEffect(() => {
    const anchor = requestedStudentId ? 'student-detail' : requestedSection;
    if (!anchor) return;
    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-insight-anchor]'))
      .find((element) => element.dataset.insightAnchor === anchor);
    target?.scrollIntoView?.({ block: 'center' });
    target?.focus({ preventScroll: true });
  }, [requestedSection, requestedStudentId, selectedStudent]);

  useLayoutEffect(() => {
    const state = location.state;
    if (!state || typeof state !== 'object' || !('restoreInsightsFocus' in state)) return;
    allLessonsTriggerRef.current?.focus();
  }, [location.state]);

  useEffect(() => {
    if (!isClassPickerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsClassPickerOpen(false);
      classPickerTriggerRef.current?.focus();
    };
    const closeOnPointerDown = (event: PointerEvent) => {
      if (classPickerRef.current?.contains(event.target as Node)) return;
      setIsClassPickerOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnPointerDown);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnPointerDown);
    };
  }, [isClassPickerOpen]);

  const openPlaceholder = (message: string) => setFeedback(message);

  const selectInsightClass = (nextClassId: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('class', nextClassId);
      next.delete('course');
      next.delete('student');
      return next;
    }, { replace: true });
  };

  const selectInsightCourse = (nextCourseId: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('class', classId);
      if (nextCourseId === 'all') next.delete('course');
      else next.set('course', nextCourseId);
      next.delete('student');
      return next;
    }, { replace: true });
  };

  const clearInsightScope = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('class', DEFAULT_INSIGHT_CLASS_ID);
      next.delete('course');
      next.delete('student');
      return next;
    }, { replace: true });
  };

  const updateSort = (key: InsightSortKey) => {
    if (key === sortKey) setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const selectStudent = (student: StudentInsight) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('class', classId);
      next.set('student', student.id);
      return next;
    }, { replace: true });
  };

  const closeStudent = () => {
    const previousStudentId = selectedStudent?.id;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('student');
      return next;
    }, { replace: true });
    if (previousStudentId) studentTriggerRefs.current[previousStudentId]?.focus();
  };

  if (viewState === 'forbidden') {
    return <section className={styles.page} aria-label="教学洞察"><header className={styles.toolbar}><div className={styles.toolbarMeta}><span>教学洞察</span></div></header><div className={styles.emptyCopy} role="alert">当前账号没有查看教师教学洞察的权限。</div></section>;
  }
  if (viewState === 'loading') {
    return <section className={styles.page} aria-label="教学洞察"><header className={styles.toolbar}><div className={styles.toolbarMeta}><span>正在加载教学洞察</span></div></header><div className={styles.emptyCopy} role="status" aria-live="polite">正在加载班级、课堂和学生数据...</div></section>;
  }
  if (viewState === 'error') {
    return <section className={styles.page} aria-label="教学洞察"><header className={styles.toolbar}><div className={styles.toolbarMeta}><span>教学洞察加载失败</span></div></header><div className={styles.emptyCopy} role="alert">班级洞察数据暂时无法读取。<button type="button" className={styles.backLink} onClick={() => openPlaceholder('重试入口已保留，本 Demo 使用本地确定性数据。')}>重试</button></div></section>;
  }
  if (invalidClassTarget) {
    return <section className={styles.page} aria-label="教学洞察"><header className={styles.toolbar}><div className={styles.toolbarMeta}><span>无法定位班级</span></div></header><div className={styles.emptyCopy} role="status">无法定位该班级，请从班级列表重新选择。</div></section>;
  }

  if (!currentClass || !currentOverview || !scenario || !insightScope) {
    return (
      <section className={styles.page} aria-label="教学洞察">
        <header className={styles.toolbar}><div className={styles.toolbarMeta}><span>当前暂无可用班级数据</span></div></header>
        <div className={styles.emptyCopy}>当前暂无可用班级数据。</div>
      </section>
    );
  }

  if (viewState === 'empty-lessons') {
    return <section className={styles.page} aria-label="教学洞察"><header className={styles.toolbar}><div className={styles.toolbarMeta}><span>{currentClass.name}</span></div></header><div className={styles.emptyCopy} role="status">完成课堂后才会产生课堂洞察记录。</div></section>;
  }
  if (viewState === 'empty-students') {
    return <section className={styles.page} aria-label="教学洞察"><header className={styles.toolbar}><div className={styles.toolbarMeta}><span>{currentClass.name}</span></div></header><div className={styles.emptyCopy} role="status">当前班级暂无学生数据。</div></section>;
  }

  const statusTag = (student: StudentInsight) => {
    const status = getStudentStatus(student);
    const Icon = STATUS_ICONS[status];
    return <span className={styles.statusTag} data-status={status}><Icon aria-hidden="true" size={13} />{STATUS_LABELS[status]}</span>;
  };

  const sortHeader = (label: string, key: InsightSortKey) => (
    <button type="button" onClick={() => updateSort(key)}>{label}<ArrowUpDown aria-hidden="true" size={13} /></button>
  );

  const columns: readonly { label: string; key: InsightSortKey; render: (student: StudentInsight) => string }[] = [
    { label: '学生', key: 'name', render: (student) => student.name },
    { label: '状态', key: 'status', render: (student) => STATUS_LABELS[getStudentStatus(student)] },
    { label: '出勤', key: 'attendance', render: (student) => `${student.attendance}%` },
    { label: '迟到', key: 'lateCount', render: (student) => `${student.lateCount} 次` },
    { label: '缺勤', key: 'absentDays', render: (student) => `${student.absentDays} 天` },
    { label: '互动', key: 'interactionCount', render: (student) => `${student.interactionCount} 次` },
    { label: '提问', key: 'questionCount', render: (student) => `${student.questionCount} 次` },
    { label: '答题', key: 'accuracy', render: (student) => `${student.accuracy}%` },
    { label: '作业状态', key: 'homeworkCompleted', render: homeworkStatus },
    { label: '按时率', key: 'onTimeRate', render: (student) => `${student.onTimeRate}%` },
    { label: '补交', key: 'makeupCount', render: (student) => `${student.makeupCount} 次` },
    { label: '作业正确率', key: 'homeworkAccuracy', render: (student) => `${student.homeworkAccuracy}%` },
  ];

  return (
    <section className={styles.page} aria-label="教学洞察">
      <header className={styles.toolbar}>
        <div className={styles.classContext} ref={classPickerRef}>
          <button
            ref={classPickerTriggerRef}
            type="button"
            className={styles.classContextButton}
            aria-expanded={isClassPickerOpen}
            aria-controls="insight-scope-filter-panel"
            onClick={() => setIsClassPickerOpen((current) => !current)}
          >
            <span className={styles.classMark} aria-hidden="true">{currentClass.name.slice(0, 1)}</span>
            <span className={styles.classContextCopy}>
              <strong>{currentClass.name}</strong>
              <small>{currentOverview.studentCount} 位学生 · {currentCourseName} · {currentOverview.courseStatus === 'active' ? '进行中' : '已结课'}</small>
            </span>
            <ChevronDown aria-hidden="true" size={16} />
          </button>
          {isClassPickerOpen ? (
            <div className={styles.classPicker} id="insight-scope-filter-panel" role="group" aria-label="教学洞察范围筛选选项">
              <label>班级范围<select aria-label="班级范围" value={classId} onChange={(event) => selectInsightClass(event.target.value)}>{INSIGHT_CLASSES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>课程范围<select aria-label="课程范围" value={courseScenario?.course.id ?? 'all'} onChange={(event) => selectInsightCourse(event.target.value)}><option value="all">全部课程</option>{scenario.courses.map(({ course }) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
              <button type="button" disabled={classId === DEFAULT_INSIGHT_CLASS_ID && !courseScenario} onClick={clearInsightScope}>清除筛选</button>
            </div>
          ) : null}
        </div>
        <div className={styles.toolbarMeta}>
          <span>更新于今天 14:08</span>
          <button type="button" className={styles.toolbarButton} onClick={() => openPlaceholder('导出入口已保留，本 Demo 不生成离线报表。')}><BarChart3 aria-hidden="true" size={15} />导出报告</button>
        </div>
      </header>
      {invalidCourseTarget ? <div className={styles.emptyCopy} role="status">该课程不属于当前班级，已显示班级全部课程汇总。</div> : null}
      {invalidStudentTarget ? <div className={styles.emptyCopy} role="status">该学生不属于当前班级，无法打开学生洞察详情。</div> : null}
      <div className={styles.layout}>
        <main className={styles.analysis}>
          <section className={styles.diagnosis} aria-labelledby="diagnosis-title" data-highlighted={requestedSection === 'diagnosis'} data-insight-anchor="diagnosis" tabIndex={requestedSection === 'diagnosis' ? -1 : undefined}>
            <span className={styles.diagnosisEyebrow}>本周教学结论</span>
            <span className={styles.diagnosisIcon}><Sparkles aria-hidden="true" size={19} /></span>
            <div className={styles.diagnosisCopy}>
              <h2 id="diagnosis-title">{currentOverview.diagnosis.headline}</h2>
              <p className={styles.diagnosisFacts}>
                <span>出勤 {currentOverview.attendanceRate}%</span>
                <span>最近课堂主动参与 {insightScope.metrics.find((metric) => metric.id === 'active-participation')?.value}%</span>
                <span>作业提交 {currentOverview.homeworkRate}%</span>
              </p>
            </div>
            <div className={styles.diagnosisSignal}><span>课程进度</span><strong>{currentOverview.totalLessons}/{currentOverview.plannedLessons}</strong><small>{Math.round(currentOverview.totalLessons / currentOverview.plannedLessons * 100)}% · 剩余 {currentOverview.plannedLessons - currentOverview.totalLessons} 节</small></div>
            <div className={styles.diagnosisAction}><CircleAlert aria-hidden="true" size={16} /><strong>下一步</strong><span>{currentOverview.diagnosis.action}</span></div>
          </section>

          <section className={styles.metricGroups} aria-label="班级关键指标">
            {(['attendance', 'interaction', 'homework'] as const).map((group) => {
              const meta = METRIC_GROUP_META[group];
              const GroupIcon = meta.icon;
              return (
                <section className={styles.metricGroup} key={group} aria-labelledby={`metric-group-${group}`} data-highlighted={requestedSection === group} data-insight-anchor={group} tabIndex={requestedSection === group ? -1 : undefined}>
                  <div className={styles.metricGroupIntro}>
                    <span className={styles.metricGroupIcon}><GroupIcon aria-hidden="true" size={18} /></span>
                    <div><h3 id={`metric-group-${group}`}>{METRIC_GROUP_LABELS[group]}</h3><p>{meta.finding}</p></div>
                    <p className={styles.metricAction}><strong>建议动作</strong>{meta.action}</p>
                  </div>
                  <div className={styles.metricFacts}>
                    {insightScope.metrics.filter((metric) => metric.group === group).map((metric) => {
                      const tooltipId = `metric-definition-${metric.id}`;
                      return (
                        <div key={metric.id} className={styles.metricFact}>
                          <span className={styles.metricLabel}>
                            {metric.label}
                            <span className={styles.metricInfo}>
                              <button type="button" aria-label={`${metric.label}说明`} aria-describedby={tooltipId}>
                                <Info aria-hidden="true" size={14} />
                              </button>
                              <span id={tooltipId} className={styles.metricTooltip} role="tooltip">{metric.definition}</span>
                            </span>
                          </span>
                          <strong>{formatMetric(metric)}</strong>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </section>

          <section className={styles.section} aria-labelledby="lesson-title">
            <header className={styles.sectionHeader}><div><h2 id="lesson-title">近期课堂</h2><p>最近三节课堂的到课、互动和作业证据。</p></div></header>
            <div className={styles.lessonTableWrap}>
              <table className={styles.lessonTable}>
                <thead><tr><th scope="col">课堂</th><th scope="col">出勤</th><th scope="col">主动参与</th><th scope="col">被动响应</th><th scope="col">作业正确率</th><th scope="col"><span className={styles.visuallyHidden}>操作</span></th></tr></thead>
                <tbody>
                  {lessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <th scope="row">
                        <span className={styles.lessonIdentity}>
                          <time dateTime={lesson.date}>{lesson.date.slice(5).replace('-', '/')}</time>
                          <span><strong>{lesson.unitName}</strong><small>{lesson.timeRange} · {lesson.durationMinutes} 分钟 · {lesson.status === 'completed' ? '已完成' : lesson.status}</small></span>
                        </span>
                      </th>
                      <td>{lesson.attendanceRate}%</td>
                      <td>{lesson.activeParticipation}%</td>
                      <td>{lesson.passiveResponse}%</td>
                      <td>{lesson.homeworkAccuracy}%</td>
                      <td><button className={styles.lessonReportLink} type="button" aria-label={`查看${lesson.unitName}报告`} onClick={() => openPlaceholder('课堂报告入口已保留，本 Demo 不连接真实报告服务。')}>查看报告<ChevronRight aria-hidden="true" size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.lessonTableFooter}><button ref={allLessonsTriggerRef} className={styles.allLessonsLink} type="button" onClick={() => navigate({ pathname: '/teacher/insights/lessons', search: `?class=${encodeURIComponent(classId)}${courseScenario ? `&course=${encodeURIComponent(courseScenario.course.id)}` : ''}` })}>查看全部课堂<ChevronRight aria-hidden="true" size={15} /></button></div>
          </section>

          <section className={styles.section} aria-labelledby="student-title">
            <header className={styles.sectionHeader}><div><h2 id="student-title">学生表现</h2><p>横向查看考勤、互动、答题与作业质量指标。</p></div><div className={styles.studentCounts}><button type="button" aria-pressed={statusFilter === 'attention'} onClick={() => setStatusFilter(statusFilter === 'attention' ? 'all' : 'attention')}><CircleAlert aria-hidden="true" size={14} />需关注 {attentionCount}</button><button type="button" aria-pressed={statusFilter === 'reward'} onClick={() => setStatusFilter(statusFilter === 'reward' ? 'all' : 'reward')}><Trophy aria-hidden="true" size={14} />可奖励 {rewardCount}</button></div></header>
            <div className={styles.tableToolbar}><label className={styles.searchBox}><Search aria-hidden="true" size={15} /><input aria-label="搜索学生" value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="搜索学生" /></label><span>{students.length}/{insightScope.students.length} 位学生</span></div>
            <div className={styles.tableWrap}><table><thead><tr>{columns.map((column) => <th key={column.key} aria-sort={column.key === sortKey ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>{sortHeader(column.label, column.key)}</th>)}</tr></thead><tbody>{students.map((student) => <tr key={student.id} data-selected={selectedStudent?.id === student.id}>{columns.map((column, index) => <td key={column.key}>{index === 0 ? <button ref={(element) => { studentTriggerRefs.current[student.id] = element; }} className={styles.studentButton} type="button" onClick={() => selectStudent(student)} aria-label={student.name}><span className={styles.avatar} aria-hidden="true">{student.name.slice(0, 1)}</span><strong>{student.name}</strong></button> : column.key === 'status' ? statusTag(student) : column.render(student)}</td>)}</tr>)}</tbody></table>{students.length === 0 ? <div className={styles.emptyTable}><Search aria-hidden="true" size={20} /><strong>没有匹配学生</strong><span>清除搜索或状态筛选后再试。</span></div> : null}</div>
          </section>
        </main>

        {selectedStudent ? <aside className={styles.detailPanel} aria-label="学生洞察详情" data-highlighted={Boolean(requestedStudentId)} data-insight-anchor="student-detail" tabIndex={requestedStudentId ? -1 : undefined}><header><h2>{selectedStudent.name}</h2><button type="button" aria-label="关闭学生详情" onClick={closeStudent}><X aria-hidden="true" size={17} /></button></header><div className={styles.detailStatus}>{statusTag(selectedStudent)}<span>本班观察记录</span></div><div className={styles.detailMetrics}><div><span>出勤</span><strong>{selectedStudent.attendance}%</strong></div><div><span>迟到 / 缺勤</span><strong>{selectedStudent.lateCount} / {selectedStudent.absentDays}</strong></div><div><span>互动 / 提问</span><strong>{selectedStudent.interactionCount} / {selectedStudent.questionCount}</strong></div><div><span>答题准确率</span><strong>{selectedStudent.accuracy}%</strong></div><div><span>作业状态</span><strong>{homeworkStatus(selectedStudent)}</strong></div><div><span>按时率 / 补交</span><strong>{selectedStudent.onTimeRate}% / {selectedStudent.makeupCount}</strong></div><div><span>作业正确率</span><strong>{selectedStudent.homeworkAccuracy}%</strong></div></div><div className={styles.detailNotes}><div><Sparkles aria-hidden="true" size={15} /><div><strong>表现亮点</strong><p>{selectedStudent.accuracy >= 80 ? '答题准确且互动积极，可以作为课堂示范。' : '仍有稳定出勤记录，具备继续跟进的基础。'}</p></div></div><div><CircleAlert aria-hidden="true" size={15} /><div><strong>下一步关注</strong><p>{selectedStudent.needsAttention ? '建议查看最近作业结果，确认未提交或错题原因。' : '保持当前学习节奏，继续观察课堂互动。'}</p></div></div></div><div className={styles.detailActions}><button className={styles.primaryButton} type="button" onClick={() => openPlaceholder('奖励入口已保留，本 Demo 不直接发放真实奖励。')}><Trophy aria-hidden="true" size={15} />奖励</button></div></aside> : null}
      </div>
      {feedback ? <div className={styles.globalFeedback} role="status">{feedback}</div> : null}
    </section>
  );
}
