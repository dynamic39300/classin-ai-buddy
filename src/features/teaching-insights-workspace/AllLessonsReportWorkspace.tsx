import {
  BarChart3,
  ChevronRight,
  CircleAlert,
  CircleHelp,
} from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  buildHistoricalTrend,
  getInsightCourseScenario,
  getInsightScenario,
  type HistoricalTrendMetric,
  type HistoricalTrendSeries,
  type LessonInsight,
} from '@domain/insights/insights';
import { INSIGHT_SCENARIOS } from '@mocks/scenarios/insights';
import styles from './TeachingInsightsWorkspace.module.css';

const TREND_META: Record<HistoricalTrendMetric, { label: string; shortLabel: string; definition: string }> = {
  attendanceRate: { label: '出勤率趋势', shortLabel: '出勤率', definition: '实际到课人数占应到人数的比例。' },
  activeParticipation: { label: '主动参与趋势', shortLabel: '主动参与', definition: '主动发起或参与课堂互动的人数占比。' },
  passiveResponse: { label: '被动响应趋势', shortLabel: '被动响应', definition: '被点名或收到互动任务后作出响应的人数占比。' },
  homeworkAccuracy: { label: '作业正确率趋势', shortLabel: '作业正确率', definition: '已批改作业中，正确作答数量占已作答数量的比例。' },
};

const SUMMARY_DEFINITIONS = {
  progress: '已完成课堂数与计划课堂总数的比值。',
  attendance: TREND_META.attendanceRate.definition,
  homework: '按时完成作业人数占应完成人数的比例。',
} as const;

function formatRange(start: string, end: string): string {
  return `${start.replaceAll('-', '.')} - ${end.replaceAll('-', '.')}`;
}

function formatShortDate(date: string): string {
  return date.slice(5).replace('-', '/');
}

function MetricHelp({ label, definition, id }: { label: string; definition: string; id: string }) {
  return (
    <span className={styles.metricInfo}>
      <button type="button" aria-label={`${label}说明`} aria-describedby={id}>
        <CircleHelp aria-hidden="true" size={13} />
      </button>
      <span id={id} className={styles.metricTooltip} role="tooltip">{definition}</span>
    </span>
  );
}

function TrendChart({ series, label }: { series: HistoricalTrendSeries; label: string }) {
  const width = 760;
  const height = 250;
  const chartTop = 18;
  const chartBottom = 202;
  const chartLeft = 44;
  const chartRight = width - 20;
  const xStep = series.points.length > 1 ? (chartRight - chartLeft) / (series.points.length - 1) : 0;
  const pointCoordinates = series.points.map((point, index) => {
    const x = chartLeft + xStep * index;
    const y = chartBottom - ((chartBottom - chartTop) * point.value) / 100;
    return { ...point, x, y };
  });
  const polyline = pointCoordinates.map(({ x, y }) => `${x},${y}`).join(' ');

  return (
    <div className={styles.reportChartBlock}>
      <div className={styles.reportChartFrame}>
        <svg className={styles.reportChart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label}，${series.points.length} 个历史事实数据点`}>
          {[0, 25, 50, 75, 100].map((value) => {
            const y = chartBottom - ((chartBottom - chartTop) * value) / 100;
            return <g key={value}><line x1={chartLeft} x2={chartRight} y1={y} y2={y} className={styles.chartGridLine} /><text x={8} y={y + 4} className={styles.chartAxisLabel}>{value}%</text></g>;
          })}
          {pointCoordinates.length > 0 ? <polyline points={polyline} className={styles.chartLine} /> : null}
          {pointCoordinates.map((point) => <circle key={point.lessonId} cx={point.x} cy={point.y} r="4.5" className={styles.chartPoint}><title>{point.date} {point.value}%</title></circle>)}
          {pointCoordinates.map((point) => <text key={`${point.lessonId}-date`} x={point.x} y={232} textAnchor="middle" className={styles.chartDateLabel}>{formatShortDate(point.date)}</text>)}
        </svg>
      </div>
      <div className={styles.reportChartData} role="list" aria-label={`${label}数据列表`}>
        {series.points.map((point) => <div key={point.lessonId} role="listitem"><time dateTime={point.date}>{formatShortDate(point.date)}</time><strong>{point.value}%</strong></div>)}
      </div>
    </div>
  );
}

function LessonEvidence({ lesson, expanded, onToggle, onReport }: { lesson: LessonInsight; expanded: boolean; onToggle: () => void; onReport: () => void }) {
  return (
    <article className={styles.reportLessonRow}>
      <button className={styles.reportLessonMain} type="button" aria-expanded={expanded} onClick={onToggle}>
        <time className={styles.reportLessonDate} dateTime={lesson.date}>{formatShortDate(lesson.date)}</time>
        <span><strong>{lesson.unitName}</strong><small>{lesson.timeRange} · {lesson.durationMinutes} 分钟 · 已完成</small></span>
        <span className={styles.reportLessonScore}><strong>{lesson.homeworkAccuracy}%</strong><small>作业正确率</small></span>
        <ChevronRight aria-hidden="true" size={16} className={expanded ? styles.rotated : ''} />
      </button>
      {expanded ? <div className={styles.reportLessonDetail}><div><span>出勤</span><strong>{lesson.attendanceRate}%</strong></div><div><span>主动参与</span><strong>{lesson.activeParticipation}%</strong></div><div><span>被动响应</span><strong>{lesson.passiveResponse}%</strong></div><div><span>作业正确率</span><strong>{lesson.homeworkAccuracy}%</strong></div><button type="button" onClick={onReport}>查看课堂报告<ChevronRight aria-hidden="true" size={14} /></button></div> : null}
    </article>
  );
}

export function AllLessonsReportWorkspace() {
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('class') ?? INSIGHT_SCENARIOS[0]?.class.id ?? '';
  const courseId = searchParams.get('course');
  const scenario = getInsightScenario(classId, INSIGHT_SCENARIOS);
  const courseScenario = scenario ? getInsightCourseScenario(scenario, courseId) : null;
  const invalidCourseTarget = Boolean(courseId && !courseScenario);
  const insightScope = courseScenario ?? scenario;
  const currentOverview = courseScenario?.course ?? scenario?.class;
  const [trendMetric, setTrendMetric] = useState<HistoricalTrendMetric>('attendanceRate');
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const lessons = insightScope ? [...insightScope.lessons].sort((left, right) => right.date.localeCompare(left.date)) : [];
  const trend = buildHistoricalTrend(insightScope?.lessons ?? [], [trendMetric])[0];
  const currentTrendMeta = TREND_META[trendMetric];

  if (!scenario || !currentOverview) {
    return <section className={styles.page} aria-label="全部课堂"><div className={styles.emptyCopy} role="status">无法定位该班级，请返回教学洞察重新选择。</div></section>;
  }

  return (
    <section className={styles.page} aria-label="全部课堂">
      <header className={styles.reportPageToolbar}>
        <div className={styles.reportPageHeading}>
          <span>{scenario.class.name} · {courseScenario?.course.name ?? '全部课程'}</span><h1>全部课堂</h1><p>{currentOverview.studentCount} 位学生 · {lessons.length} 节课堂 · {formatRange(currentOverview.courseDateRange.start, currentOverview.courseDateRange.end)}</p>
        </div>
        <button type="button" className={styles.toolbarButton} onClick={() => setFeedback('导出入口已保留，本 Demo 不生成离线报表。')}><BarChart3 aria-hidden="true" size={15} />导出报告</button>
      </header>
      {invalidCourseTarget ? <div className={styles.emptyCopy} role="status">该课程不属于当前班级，已显示班级全部课程汇总。</div> : null}
      <main className={styles.allLessonsContent}>
        <section className={styles.reportSummary} aria-label="课堂报告摘要">
          <div><span className={styles.reportMetricLabel}>课程进度<MetricHelp label="课程进度" definition={SUMMARY_DEFINITIONS.progress} id="report-summary-progress-help" /></span><strong>{currentOverview.totalLessons}/{currentOverview.plannedLessons}</strong></div>
          <div><span className={styles.reportMetricLabel}>出勤率<MetricHelp label="出勤率" definition={SUMMARY_DEFINITIONS.attendance} id="report-summary-attendance-help" /></span><strong>{currentOverview.attendanceRate}%</strong></div>
          <div><span className={styles.reportMetricLabel}>作业完成<MetricHelp label="作业完成" definition={SUMMARY_DEFINITIONS.homework} id="report-summary-homework-help" /></span><strong>{currentOverview.homeworkRate}%</strong></div>
          <div><span>报告结论</span><strong>{currentOverview.diagnosis.headline}</strong></div>
        </section>

        <section className={styles.reportSection} aria-label="历史趋势">
          <header className={styles.reportSectionHeader}><span className={styles.reportSectionTitle}><h2 id="trend-title">课堂表现趋势</h2><MetricHelp label={currentTrendMeta.shortLabel} definition={currentTrendMeta.definition} id={`report-trend-${trendMetric}-help`} /></span><button type="button" className={styles.backLink} onClick={() => setFeedback('下一讲参考为 Placeholder，本 Demo 不生成预测结果。')}><CircleAlert aria-hidden="true" size={15} />下一讲参考</button></header>
          <div className={styles.reportTrendTabs} aria-label="选择趋势指标">{(Object.keys(TREND_META) as HistoricalTrendMetric[]).map((metricId) => <button key={metricId} type="button" aria-pressed={trendMetric === metricId} aria-label={TREND_META[metricId].label} onClick={() => setTrendMetric(metricId)}>{TREND_META[metricId].shortLabel}</button>)}</div>
          {trend ? <TrendChart series={trend} label={currentTrendMeta.label} /> : <div className={styles.emptyCopy}>暂无趋势数据。</div>}
        </section>

        <section className={styles.reportSection} aria-labelledby="all-lessons-title">
          <header className={styles.reportSectionHeader}><h2 id="all-lessons-title">全部课堂记录</h2><span className={styles.reportFactLabel}>{lessons.length} 节课堂</span></header>
          <div className={styles.reportLessonList}>{lessons.map((lesson) => <LessonEvidence key={lesson.id} lesson={lesson} expanded={expandedLesson === lesson.id} onToggle={() => setExpandedLesson((current) => current === lesson.id ? null : lesson.id)} onReport={() => setFeedback('课堂报告入口已保留，本 Demo 不连接真实报告服务。')} />)}</div>
        </section>
      </main>
      {feedback ? <div className={styles.globalFeedback} role="status">{feedback}</div> : null}
    </section>
  );
}
