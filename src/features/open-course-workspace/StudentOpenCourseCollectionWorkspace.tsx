import { ArrowUpDown, Plus, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePageHeader } from '@app/shell/usePageHeader';
import { OPEN_COURSE_STATUS_LABELS, type OpenCourseStatus } from '@domain/class/class';
import { selectStudentOpenCourses, toOpenCourseWorkspaceRecord, type OpenCourseCollectionSort } from '@domain/open-course/open-course';
import { useClassWorkspaceStore } from '@features/class-workspace/class-workspace-store';
import { useOpenCourseSession } from './use-open-course-session';
import { StudentOpenCourseDetailDialog } from './StudentOpenCourseDetailDialog';
import { getOpenCourseReturnPath, getOpenCourseSource, withOpenCourseSource } from './open-course-view';
import styles from './TeacherOpenCourseCollectionWorkspace.module.css';

function parseStatus(value: string | null): OpenCourseStatus | 'all' {
  return value === 'scheduled' || value === 'live' || value === 'ended' ? value : 'all';
}

function parseSort(value: string | null): OpenCourseCollectionSort {
  return value === 'starts-desc' || value === 'title-asc' ? value : 'starts-asc';
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}

const STATUS_OPTIONS: ReadonlyArray<{ value: OpenCourseStatus | 'all'; label: string }> = [
  { value: 'scheduled', label: '待开始' },
  { value: 'live', label: '直播中' },
  { value: 'ended', label: '已结束' },
  { value: 'all', label: '全部' },
];

export function StudentOpenCourseCollectionWorkspace({ detailId }: { detailId?: string }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openCourses } = useClassWorkspaceStore();
  const { joinedCourseIds } = useOpenCourseSession();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [status, setStatus] = useState<OpenCourseStatus | 'all'>(() => parseStatus(searchParams.get('status')));
  const [sort, setSort] = useState<OpenCourseCollectionSort>(() => parseSort(searchParams.get('sort')));
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  usePageHeader(useMemo(() => ({ title: '公开课' }), []));

  const joinedCourses = useMemo(() => selectStudentOpenCourses(openCourses, joinedCourseIds), [joinedCourseIds, openCourses]);
  const visibleCourses = useMemo(() => selectStudentOpenCourses(openCourses, joinedCourseIds, { query, status, sort }), [joinedCourseIds, openCourses, query, sort, status]);
  const selectedCourseId = detailId ?? searchParams.get('course');
  const source = getOpenCourseSource(searchParams);
  const selectedCourse = selectedCourseId
    ? selectStudentOpenCourses(openCourses, joinedCourseIds).find(({ id }) => id === selectedCourseId)
      ?? (source === 'home'
        ? openCourses.find(({ id, visibleTo }) => id === selectedCourseId && visibleTo.includes('student-family'))
          ? toOpenCourseWorkspaceRecord(openCourses.find(({ id }) => id === selectedCourseId)!)
          : undefined
        : undefined)
    : undefined;

  const commitParams = (nextQuery: string, nextStatus: OpenCourseStatus | 'all', nextSort: OpenCourseCollectionSort) => {
    const next = new URLSearchParams();
    if (nextQuery) next.set('q', nextQuery);
    if (nextStatus !== 'all') next.set('status', nextStatus);
    if (nextSort !== 'starts-asc') next.set('sort', nextSort);
    setSearchParams(next, { replace: true });
  };
  const openDetail = (courseId: string, trigger: HTMLElement) => {
    dialogTriggerRef.current = trigger;
    setSearchParams((current) => { const next = new URLSearchParams(current); next.set('dialog', 'detail'); next.set('course', courseId); return next; });
  };
  const closeDetail = () => {
    if (detailId) {
      navigate('/student/open-courses');
      return;
    }
    if (source === 'home') {
      navigate(getOpenCourseReturnPath('student-family', source, searchParams));
      return;
    }
    setSearchParams((current) => { const next = new URLSearchParams(current); next.delete('dialog'); next.delete('course'); return next; }, { replace: true });
    requestAnimationFrame(() => dialogTriggerRef.current?.focus());
  };

  return (
    <section className={styles.page} aria-labelledby="student-open-course-collection-title">
      <h1 className={styles.srOnly} id="student-open-course-collection-title">公开课</h1>
      <div className={styles.toolbar}>
        <div className={styles.count} aria-live="polite"><strong>{visibleCourses.length}</strong><span>个公开课</span></div>
        <label className={styles.searchBox}><Search aria-hidden="true" size={15} /><span className={styles.srOnly}>搜索公开课</span><input value={query} onChange={(event) => { const next = event.target.value; setQuery(next); commitParams(next, status, sort); }} placeholder="搜索名称、学科或老师" /></label>
        <div className={styles.segmented} role="group" aria-label="公开课状态">{STATUS_OPTIONS.map((option) => <button type="button" aria-pressed={status === option.value} key={option.value} onClick={() => { setStatus(option.value); commitParams(query, option.value, sort); }}>{option.label}</button>)}</div>
        <label className={styles.sortControl} title="排序"><ArrowUpDown aria-hidden="true" size={15} /><span className={styles.srOnly}>公开课排序</span><select aria-label="公开课排序" value={sort} onChange={(event) => { const next = parseSort(event.target.value); setSort(next); commitParams(query, status, next); }}><option value="starts-asc">开始时间从近到远</option><option value="starts-desc">开始时间从远到近</option><option value="title-asc">名称</option></select></label>
        <button className={styles.primaryButton} type="button" onClick={() => navigate('/student/open-courses/join')}><Plus aria-hidden="true" size={16} />加入公开课</button>
      </div>
      {visibleCourses.length > 0 ? <div className={styles.table} role="table" aria-label="我的公开课">
        <div className={styles.tableHeader} role="row"><span role="columnheader">公开课名称</span><span role="columnheader">状态</span><span role="columnheader">授课教师</span><span role="columnheader">开始时间</span><span role="columnheader">时长</span><span role="columnheader">报名</span><span role="columnheader">课堂位置</span><span role="columnheader">操作</span></div>
        {visibleCourses.map((course) => <div className={styles.tableRow} role="row" tabIndex={0} aria-label={`查看公开课 ${course.title}`} key={course.id} onClick={(event) => openDetail(course.id, event.currentTarget)} onKeyDown={(event) => { if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return; event.preventDefault(); openDetail(course.id, event.currentTarget); }}><span className={styles.titleCell} role="cell"><strong>{course.title}</strong><small>{course.subject}</small></span><span role="cell"><em className={styles.status} data-status={course.status}>{OPEN_COURSE_STATUS_LABELS[course.status]}</em></span><span role="cell">{course.instructorName}</span><span role="cell">{formatDateTime(course.startsAt)}</span><span role="cell">{course.durationMinutes} 分钟</span><span role="cell">{course.enrolledCount}/{course.maxSeats}</span><span role="cell">{course.classroomSummary}</span><span className={styles.operationCell} role="cell" aria-label="只读">-</span></div>)}
      </div> : <div className={styles.emptyState}><strong>{joinedCourses.length === 0 ? '还没有加入公开课' : '没有匹配的公开课'}</strong><span>{joinedCourses.length === 0 ? '通过公开课口令加入后，会在这里显示。' : '调整搜索、状态筛选或排序后再试。'}</span>{joinedCourses.length === 0 ? <button className={styles.primaryButton} type="button" onClick={() => navigate('/student/open-courses/join')}><Plus aria-hidden="true" size={16} />加入公开课</button> : <button type="button" onClick={() => { setQuery(''); setStatus('all'); setSort('starts-asc'); commitParams('', 'all', 'starts-asc'); }}>清除筛选</button>}</div>}
      {(detailId || searchParams.get('dialog') === 'detail') && selectedCourse ? <StudentOpenCourseDetailDialog course={selectedCourse} onClose={closeDetail} onEnter={() => navigate(withOpenCourseSource(`/student/open-courses/${selectedCourse.id}/preflight`, source))} /> : null}
    </section>
  );
}
