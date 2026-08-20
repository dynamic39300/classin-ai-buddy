import { ArrowUpDown, Pencil, Plus, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePageHeader } from '@app/shell/usePageHeader';
import { OPEN_COURSE_STATUS_LABELS, type OpenCourseStatus } from '@domain/class/class';
import {
  selectTeacherOpenCourses,
  toOpenCourseWorkspaceRecord,
  type OpenCourseCollectionSort,
} from '@domain/open-course/open-course';
import { useClassWorkspaceStore } from '@features/class-workspace/class-workspace-store';
import { TeacherOpenCourseDetailDialog } from './TeacherOpenCourseDetailDialog';
import { InviteDialog, TeacherOpenCourseFormWorkspace } from './TeacherOpenCourseWorkspace';
import { OpenCourseDialog } from './OpenCourseDialog';
import { getOpenCourseReturnPath, getOpenCourseSource } from './open-course-view';
import styles from './TeacherOpenCourseCollectionWorkspace.module.css';

function parseStatus(value: string | null): OpenCourseStatus | 'all' {
  return value === 'scheduled' || value === 'live' || value === 'ended' ? value : 'all';
}

function parseSort(value: string | null): OpenCourseCollectionSort {
  return value === 'starts-desc' || value === 'title-asc' ? value : 'starts-asc';
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

const STATUS_OPTIONS: ReadonlyArray<{ value: OpenCourseStatus | 'all'; label: string }> = [
  { value: 'scheduled', label: '待开始' },
  { value: 'live', label: '直播中' },
  { value: 'ended', label: '已结束' },
  { value: 'all', label: '全部' },
];

export function TeacherOpenCourseCollectionWorkspace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openCourses, setOpenCourses } = useClassWorkspaceStore();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [status, setStatus] = useState<OpenCourseStatus | 'all'>(() => parseStatus(searchParams.get('status')));
  const [sort, setSort] = useState<OpenCourseCollectionSort>(() => parseSort(searchParams.get('sort')));
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const pageHeader = useMemo(() => ({ title: '公开课' }), []);
  usePageHeader(pageHeader);

  const ownedCourses = useMemo(
    () => selectTeacherOpenCourses(openCourses),
    [openCourses],
  );
  const visibleCourses = useMemo(
    () => selectTeacherOpenCourses(openCourses, { query, status, sort }),
    [openCourses, query, sort, status],
  );

  const commitParams = (nextQuery: string, nextStatus: OpenCourseStatus | 'all', nextSort: OpenCourseCollectionSort) => {
    const next = new URLSearchParams();
    if (nextQuery) next.set('q', nextQuery);
    if (nextStatus !== 'all') next.set('status', nextStatus);
    if (nextSort !== 'starts-asc') next.set('sort', nextSort);
    setSearchParams(next, { replace: true });
  };

  const collectionSearch = () => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (status !== 'all') next.set('status', status);
    if (sort !== 'starts-asc') next.set('sort', sort);
    next.set('source', searchParams.get('source') ?? 'list');
    return next.toString();
  };

  const openDialog = (kind: 'create' | 'edit' | 'detail' | 'invite', trigger: HTMLElement, courseId?: string, returnToDetail = false) => {
    dialogTriggerRef.current = trigger;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('dialog', kind);
      if (courseId) next.set('course', courseId);
      else next.delete('course');
      if (kind === 'detail' && !next.get('source')) next.set('source', 'list');
      if (returnToDetail) next.set('returnTo', 'detail');
      else next.delete('returnTo');
      return next;
    }, { replace: false });
  };
  const closeDialog = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('dialog');
      next.delete('course');
      next.delete('returnTo');
      return next;
    }, { replace: true });
    requestAnimationFrame(() => dialogTriggerRef.current?.focus());
  };

  const emptyTitle = ownedCourses.length === 0 ? '还没有创建公开课' : '没有匹配的公开课';
  const emptyDescription = ownedCourses.length === 0
    ? '创建后可在这里管理开课参数、邀请与课堂入口。'
    : '调整搜索、状态筛选或排序后再试。';
  const editingCourseId = searchParams.get('course');
  const dialogCourse = editingCourseId
    ? openCourses.find(({ id, visibleTo }) => id === editingCourseId && visibleTo.includes('teacher'))
    : undefined;
  const detailCourse = dialogCourse ? toOpenCourseWorkspaceRecord(dialogCourse) : undefined;
  const closeDetailToCollection = () => {
    const source = getOpenCourseSource(searchParams);
    if (source === 'list') {
      closeDialog();
      return;
    }
    navigate(getOpenCourseReturnPath('teacher', source, searchParams));
  };
  const openDetail = (courseId: string, trigger: HTMLElement) => openDialog('detail', trigger, courseId);
  const openPreflight = (courseId: string) => {
    const params = new URLSearchParams(collectionSearch());
    params.set('dialog', 'detail');
    params.set('course', courseId);
    navigate(`/teacher/open-courses/${courseId}/preflight?${params.toString()}`);
  };

  return (
    <section className={styles.page} aria-labelledby="teacher-open-course-collection-title">
      <h1 className={styles.srOnly} id="teacher-open-course-collection-title">公开课</h1>
      <div className={styles.toolbar}>
        <div className={styles.count} aria-live="polite">
          <strong>{visibleCourses.length}</strong>
          <span>个公开课</span>
        </div>
        <label className={styles.searchBox}>
          <Search aria-hidden="true" size={15} />
          <span className={styles.srOnly}>搜索公开课</span>
          <input
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              commitParams(nextQuery, status, sort);
            }}
            placeholder="搜索名称、学科或老师"
          />
        </label>
        <div className={styles.segmented} role="group" aria-label="公开课状态">
          {STATUS_OPTIONS.map((option) => (
            <button
              type="button"
              aria-pressed={status === option.value}
              key={option.value}
              onClick={() => {
                setStatus(option.value);
                commitParams(query, option.value, sort);
              }}
            >{option.label}</button>
          ))}
        </div>
        <label className={styles.sortControl} title="排序">
          <ArrowUpDown aria-hidden="true" size={15} />
          <span className={styles.srOnly}>公开课排序</span>
          <select
            aria-label="公开课排序"
            value={sort}
            onChange={(event) => {
              const nextSort = parseSort(event.target.value);
              setSort(nextSort);
              commitParams(query, status, nextSort);
            }}
          >
            <option value="starts-asc">开始时间从近到远</option>
            <option value="starts-desc">开始时间从远到近</option>
            <option value="title-asc">名称</option>
          </select>
        </label>
        <button className={styles.primaryButton} type="button" onClick={(event) => openDialog('create', event.currentTarget)}>
          <Plus aria-hidden="true" size={16} />新建公开课
        </button>
      </div>

      {visibleCourses.length > 0 ? (
        <div className={styles.table} role="table" aria-label="我的公开课">
          <div className={styles.tableHeader} role="row">
            <span role="columnheader">公开课名称</span>
            <span role="columnheader">状态</span>
            <span role="columnheader">授课教师</span>
            <span role="columnheader">开始时间</span>
            <span role="columnheader">时长</span>
            <span role="columnheader">报名</span>
            <span role="columnheader">课堂位置</span>
            <span role="columnheader">操作</span>
          </div>
          {visibleCourses.map((course) => (
            <div
              className={styles.tableRow}
              role="row"
              tabIndex={0}
              aria-label={`查看公开课 ${course.title}`}
              key={course.id}
              onClick={(event) => openDetail(course.id, event.currentTarget)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
                event.preventDefault();
                openDetail(course.id, event.currentTarget);
              }}
            >
              <span className={styles.titleCell} role="cell"><strong>{course.title}</strong><small>{course.subject}</small></span>
              <span role="cell"><em className={styles.status} data-status={course.status}>{OPEN_COURSE_STATUS_LABELS[course.status]}</em></span>
              <span role="cell">{course.instructorName}</span>
              <span role="cell">{formatDateTime(course.startsAt)}</span>
              <span role="cell">{course.durationMinutes} 分钟</span>
              <span role="cell">{course.enrolledCount}/{course.maxSeats}</span>
              <span role="cell">{course.classroomSummary}</span>
              <span className={styles.operationCell} role="cell">
                {course.status === 'scheduled' ? (
                  <button
                    className={styles.iconButton}
                    type="button"
                    aria-label={`编辑${course.title}`}
                    title="编辑公开课"
                    onClick={(event) => {
                      event.stopPropagation();
                      openDialog('edit', event.currentTarget, course.id);
                    }}
                  ><Pencil aria-hidden="true" size={15} /></button>
                ) : <span aria-label="不可编辑">-</span>}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <strong>{emptyTitle}</strong>
          <span>{emptyDescription}</span>
          {ownedCourses.length === 0 ? (
            <button className={styles.primaryButton} type="button" onClick={(event) => openDialog('create', event.currentTarget)}>
              <Plus aria-hidden="true" size={16} />新建公开课
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setStatus('all');
                setSort('starts-asc');
                commitParams('', 'all', 'starts-asc');
              }}
            >清除筛选</button>
          )}
        </div>
      )}
      {searchParams.get('dialog') === 'create' ? (
        <TeacherOpenCourseFormWorkspace
          mode="create"
          onClose={closeDialog}
          onSaved={(courseId) => openDialog('detail', dialogTriggerRef.current ?? document.body, courseId)}
        />
      ) : null}
      {searchParams.get('dialog') === 'edit' && editingCourseId ? (
        <TeacherOpenCourseFormWorkspace
          mode="edit"
          courseId={editingCourseId}
          onClose={() => searchParams.get('returnTo') === 'detail'
            ? openDialog('detail', dialogTriggerRef.current ?? document.body, editingCourseId)
            : closeDialog()}
          onSaved={(courseId) => openDialog('detail', dialogTriggerRef.current ?? document.body, courseId)}
        />
      ) : null}
      {searchParams.get('dialog') === 'invite' && detailCourse ? (
        <InviteDialog course={detailCourse} onClose={() => openDialog('detail', dialogTriggerRef.current ?? document.body, detailCourse.id)} />
      ) : null}
      {searchParams.get('dialog') === 'detail' && detailCourse ? (
        <TeacherOpenCourseDetailDialog
          course={detailCourse}
          onClose={closeDetailToCollection}
          onEdit={() => openDialog('edit', dialogTriggerRef.current ?? document.body, detailCourse.id, true)}
          onInvite={() => openDialog('invite', dialogTriggerRef.current ?? document.body, detailCourse.id)}
          onDelete={() => {
            setOpenCourses((records) => records.filter(({ id }) => id !== detailCourse.id));
            closeDialog();
          }}
          onEnter={() => openPreflight(detailCourse.id)}
        />
      ) : null}
      {searchParams.get('dialog') === 'detail' && !detailCourse ? (
        <OpenCourseDialog title="未找到公开课" onClose={closeDetailToCollection}>
          <p>该公开课不存在、已删除或当前角色不可见。</p>
          <button className={styles.primaryButton} type="button" onClick={closeDetailToCollection}>返回公开课</button>
        </OpenCourseDialog>
      ) : null}
    </section>
  );
}
