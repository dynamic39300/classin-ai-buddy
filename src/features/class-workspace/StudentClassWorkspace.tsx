import {
  ArrowUpDown,
  Bot,
  CheckCircle2,
  ChevronDown,
  FolderArchive,
  FolderOpen,
  Megaphone,
  MessageSquareText,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { useLayoutEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BoundaryDialog } from '@app/shell/BoundaryDialog';
import { usePageHeader } from '@app/shell/usePageHeader';
import { TeachingObjectIcon } from '@design-system/TeachingObjectIcon';
import {
  CLASS_COURSE_LIFECYCLE_LABELS,
  CLASS_MEMBER_ROLE_LABELS,
  filterClassRecords,
  getActiveClassMembers,
  getClassActivityActions,
  getClassMemberCounts,
  getClassMemberDisplayName,
  getVisibleClassCourses,
  type ClassActivity,
  type ClassActivityAction,
  type ClassCourse,
  type ClassRecord,
} from '@domain/class/class';
import type { MessageThread } from '@domain/message/message';
import { getClassActivityTeachingObjectKind } from '@domain/teaching-object/teaching-object';
import { CLASS_NOW } from '@mocks/scenarios/classes';
import { ClassActivityActionGroup } from './ClassActivityActionGroup';
import { HomeActivityDialog, type HomeActivityDialogItem } from '@features/home-workspace';
import { useClassWorkspaceStore } from './class-workspace-store';
import styles from './TeacherClassWorkspace.module.css';

type SortKey = 'updated-desc' | 'name-asc';
type RailSection = 'members' | 'cocreation' | 'ai';

function countCourseActivities(course: ClassCourse): number {
  return (course.activities?.length ?? 0) + course.units.reduce((sum, unit) => sum + unit.activities.length, 0);
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function getHeadmaster(record: ClassRecord): string {
  const member = getActiveClassMembers(record.members).find(({ role }) => role === 'headmaster');
  return member ? getClassMemberDisplayName(member) : '未设置';
}

export function StudentClassWorkspace({
  detailId,
  messageThreads,
}: {
  detailId?: string;
  messageThreads: ReadonlyArray<MessageThread>;
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { classes } = useClassWorkspaceStore();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [sortKey, setSortKey] = useState<SortKey>(() => searchParams.get('sort') === 'name-asc' ? 'name-asc' : 'updated-desc');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(() => searchParams.get('course'));
  const [activityFilter, setActivityFilter] = useState<'all' | 'lesson'>('all');
  const [railOpen, setRailOpen] = useState(true);
  const [railSections, setRailSections] = useState<Record<RailSection, boolean>>({ members: true, cocreation: true, ai: true });
  const [collapsedUnitIds, setCollapsedUnitIds] = useState<ReadonlySet<string>>(new Set());
  const [boundary, setBoundary] = useState<string | null>(null);
  const [activityDialog, setActivityDialog] = useState<{ item: HomeActivityDialogItem; view: 'detail' | 'operation' } | null>(null);

  const selectedClass = detailId
    ? classes.find(({ id, visibleTo }) => id === detailId && visibleTo.includes('student-family')) ?? null
    : null;
  const visibleClasses = useMemo(() => {
    const filtered = filterClassRecords('student-family', classes, query);
    return sortKey === 'name-asc'
      ? [...filtered].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
      : [...filtered].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [classes, query, sortKey]);
  const visibleCourses = selectedClass ? getVisibleClassCourses('student-family', selectedClass.courses) : [];
  const activeCourse = visibleCourses.find(({ id }) => id === (searchParams.get('course') ?? selectedCourseId)) ?? visibleCourses[0] ?? null;
  const requestedUnitId = searchParams.get('unit');
  const requestedActivityId = searchParams.get('activity');
  const fromHome = searchParams.get('from') === 'home';
  const selectedClassName = String(selectedClass?.name ?? '');
  const pageHeader = useMemo(() => detailId && selectedClassName
    ? {
        title: selectedClassName,
        breadcrumbs: [
          ...(fromHome ? [{ label: '首页', to: '/student/home' }] : []),
          { label: '我的班级', to: '/student/classes' },
          { label: selectedClassName },
        ],
      }
    : { title: '我的班级' }, [detailId, fromHome, selectedClassName]);
  usePageHeader(pageHeader);

  useLayoutEffect(() => {
    if (!selectedClass || !requestedActivityId) return;
    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-activity-id]'))
      .find((element) => element.dataset.activityId === requestedActivityId);
    target?.scrollIntoView?.({ block: 'center' });
    target?.focus({ preventScroll: true });
  }, [activeCourse, collapsedUnitIds, requestedActivityId, selectedClass]);

  const commitListParams = (nextQuery: string, nextSort: SortKey) => {
    const next = new URLSearchParams();
    if (nextQuery) next.set('q', nextQuery);
    if (nextSort !== 'updated-desc') next.set('sort', nextSort);
    setSearchParams(next, { replace: true });
  };

  const toActivityDialogItem = (activity: ClassActivity, courseId: string, action: ClassActivityAction): HomeActivityDialogItem => {
    const course = selectedClass?.courses.find(({ id }) => id === courseId);
    const unit = course?.units.find(({ activities }) => activities.some(({ id }) => id === activity.id));
    return {
      id: activity.id,
      title: activity.title,
      kind: getClassActivityTeachingObjectKind(activity.type),
      kindLabel: activity.type === 'lesson' ? '课堂' : activity.type === 'homework' ? '作业' : '教学活动',
      stateLabel: activity.status === 'completed' ? '已完成' : activity.status === 'active' ? '进行中' : activity.status === 'pending' ? '待处理' : '待开始',
      timeLabel: activity.detail,
      className: selectedClass?.name,
      courseName: course?.name,
      unitName: unit?.title,
      actionLabel: action.label,
      actionPlaceholder: action.feedback || `${action.label}为 Demo Placeholder，未连接真实教学服务。`,
    };
  };

  const openActivity = (activity: ClassActivity, courseId: string, action: ClassActivityAction) => {
    setActivityDialog({ item: toActivityDialogItem(activity, courseId, action), view: 'operation' });
  };

  const renderActivities = (activities: ReadonlyArray<ClassActivity>, courseId: string) => (
    activities
      .filter(({ type }) => activityFilter === 'all' || type === 'lesson')
      .map((activity) => {
        const actions = getClassActivityActions('student-family', activity, CLASS_NOW);
        return (
          <div className={styles.activityRow} data-activity-id={activity.id} data-highlighted={activity.id === requestedActivityId} tabIndex={activity.id === requestedActivityId ? -1 : undefined} key={activity.id} role="listitem">
            <span className={styles.activityIcon}><TeachingObjectIcon kind={getClassActivityTeachingObjectKind(activity.type)} size={16} /></span>
            <button type="button" className={styles.activityCopy} aria-label={`查看${activity.title}详情`} onClick={() => setActivityDialog({ item: toActivityDialogItem(activity, courseId, actions[0]!), view: 'detail' })}><strong>{activity.title}</strong><small>{activity.detail}</small></button>
            <ClassActivityActionGroup activityTitle={activity.title} actions={actions} onAction={(action) => openActivity(activity, courseId, action)} />
          </div>
        );
      })
  );

  if (!detailId) {
    return (
      <main className={styles.page} data-surface="list" aria-label="我的班级">
        <section className={styles.collection} aria-label="我的班级列表">
          <div className={styles.listToolbar}>
            <span className={styles.collectionCount}><strong>{visibleClasses.length}</strong> 个班级</span>
            <label className={styles.searchBox}><Search aria-hidden="true" size={15} /><span className={styles.srOnly}>搜索班级</span><input type="search" value={query} onChange={(event) => { const next = event.target.value; setQuery(next); commitListParams(next, sortKey); }} placeholder="搜索班级" /></label>
            <label className={styles.sortControl} title="排序"><ArrowUpDown aria-hidden="true" size={15} /><span className={styles.srOnly}>排序</span><select aria-label="排序" value={sortKey} onChange={(event) => { const next = event.target.value as SortKey; setSortKey(next); commitListParams(query, next); }}><option value="updated-desc">最近更新</option><option value="name-asc">班级名称</option></select></label>
          </div>
          <div className={styles.classTable} role="table" aria-label="班级列表">
            <div className={styles.tableHeader} role="row"><span role="columnheader">班级名称</span><span role="columnheader">班主任</span><span role="columnheader">课程数</span><span role="columnheader">成员数</span><span role="columnheader">班级待办</span><span role="columnheader">最近更新</span><span role="columnheader">操作</span></div>
            {visibleClasses.map((record) => (
              <div className={styles.tableRow} role="row" key={record.id}>
                <div role="cell"><button type="button" className={styles.classRowLink} onClick={() => navigate(`/student/classes/${record.id}`)}><span className={styles.classMark} data-tone={record.coverTone}>{record.name.slice(0, 1)}</span><span><strong>{record.name}</strong><small>进入班级</small></span></button></div>
                <span role="cell">{getHeadmaster(record)}</span>
                <span role="cell">{getVisibleClassCourses('student-family', record.courses).length}</span>
                <span role="cell">{record.memberCount}</span>
                <button role="cell" type="button" className={styles.pendingCell} onClick={() => navigate(`/student/todos?class=${encodeURIComponent(record.id)}`)}>{record.pendingCountByRole['student-family'] ?? 0}</button>
                <time role="cell" dateTime={record.updatedAt}>{formatUpdatedAt(record.updatedAt)}</time>
                <span role="cell" className={styles.operationCell} aria-label="只读">-</span>
              </div>
            ))}
            {visibleClasses.length === 0 ? <div className={styles.emptyState}><Users aria-hidden="true" size={22} /><strong>{query ? '没有匹配的班级' : '还没有加入班级'}</strong><span>{query ? '清除搜索关键词' : '加入班级后即可在这里查看课程内容'}</span>{query ? <button type="button" onClick={() => { setQuery(''); commitListParams('', sortKey); }}>清除搜索</button> : null}</div> : null}
          </div>
        </section>
      </main>
    );
  }

  if (!selectedClass) {
    return <main className={styles.safeState}><h1 tabIndex={-1}>找不到这个内容</h1><p>班级不存在，或当前学生视角无权访问。</p><button type="button" onClick={() => navigate('/student/classes')}>返回我的班级</button></main>;
  }

  const activeMembers = getActiveClassMembers(selectedClass.members);
  const memberCounts = getClassMemberCounts(selectedClass.members);
  const classMessageUnread = messageThreads.find(({ category, classId, visibleTo }) => category === 'class' && classId === selectedClass.id && visibleTo.includes('student-family'))?.unreadByRole['student-family'] ?? 0;
  const toggleRailSection = (section: RailSection) => setRailSections((current) => ({ ...current, [section]: !current[section] }));

  return (
    <main className={styles.page} data-surface="detail" aria-label="班级详情">
      <div className={styles.quickActions}>
        <label><TeachingObjectIcon kind="course" size={16} /><span>当前课程</span><select aria-label="当前课程" value={activeCourse?.id ?? ''} disabled={visibleCourses.length === 0} onChange={(event) => { const id = event.target.value; setSelectedCourseId(id); setSearchParams((current) => { const next = new URLSearchParams(current); next.set('course', id); return next; }, { replace: true }); }}>{visibleCourses.length === 0 ? <option value="">暂无已发布课程</option> : visibleCourses.map((course) => <option value={course.id} key={course.id}>{course.name}</option>)}</select></label>
        {activeCourse ? <span className={styles.statusTag} data-status={activeCourse.status}>{CLASS_COURSE_LIFECYCLE_LABELS[activeCourse.status]}</span> : null}
        <button type="button" aria-label="班级群聊" onClick={() => navigate(`/student/classes/${selectedClass.id}/chat`)}><MessageSquareText aria-hidden="true" size={16} /><span>班级群聊</span>{classMessageUnread > 0 ? <strong>{classMessageUnread}</strong> : null}</button>
        <button type="button" aria-label="公告" onClick={() => selectedClass.announcements[0] ? navigate(`/student/classes/${selectedClass.id}/announcements/${selectedClass.announcements[0].id}?source=class`) : setBoundary('当前班级还没有公告。')}><Megaphone aria-hidden="true" size={16} /><span>公告</span>{selectedClass.announcements.length > 0 ? <strong>{selectedClass.announcements.length}</strong> : null}</button>
        <button type="button" aria-label="查看关联资源" onClick={() => navigate(`/student/classes/${selectedClass.id}/resources`)}><FolderOpen aria-hidden="true" size={16} /><span>关联资源</span></button>
        <button type="button" aria-label="班级待办" onClick={() => navigate(`/student/todos?class=${encodeURIComponent(selectedClass.id)}`)}><CheckCircle2 aria-hidden="true" size={16} /><span>班级待办</span>{(selectedClass.pendingCountByRole['student-family'] ?? 0) > 0 ? <strong>{selectedClass.pendingCountByRole['student-family']}</strong> : null}</button>
      </div>

      <div className={styles.detailBody} data-rail-open={railOpen}>
        <section className={styles.courseMain} aria-labelledby="course-content-title">
          {activeCourse ? <>
            <header className={styles.courseHeader}><div><h2 id="course-content-title">课程目录</h2><small>{activeCourse.units.length} 个单元 · {countCourseActivities(activeCourse)} 项活动</small></div></header>
            <div className={styles.contentFilters}><button type="button" aria-pressed={activityFilter === 'all'} onClick={() => setActivityFilter('all')}>全部</button><button type="button" aria-pressed={activityFilter === 'lesson'} onClick={() => setActivityFilter('lesson')}>只看课堂</button></div>
            <div className={styles.unitList} role="list" aria-label={`${activeCourse.name}课程目录`}>
              {(activeCourse.activities?.length ?? 0) > 0 ? <section className={`${styles.unit} ${styles.unassignedUnit}`} role="listitem"><header><span className={styles.treeBranchIcon}><TeachingObjectIcon kind="unit" size={16} /></span><div className={styles.unitCopy}><strong>未归入单元</strong><p>直接归属于当前课程的活动</p></div></header><div className={styles.activityList} role="list">{renderActivities(activeCourse.activities ?? [], activeCourse.id)}</div></section> : null}
              {activeCourse.units.map((unit) => {
              const collapsed = unit.id === requestedUnitId ? false : collapsedUnitIds.has(unit.id);
              return <section className={styles.unit} key={unit.id} role="listitem"><header><button type="button" className={styles.unitToggle} aria-expanded={!collapsed} onClick={() => setCollapsedUnitIds((current) => { const next = new Set(current); if (next.has(unit.id)) next.delete(unit.id); else next.add(unit.id); return next; })}><ChevronDown aria-hidden="true" size={16} /><span className={styles.srOnly}>{collapsed ? '展开' : '收起'}{unit.title}</span></button><div className={styles.unitCopy}><span className={styles.editableName}><strong>{unit.title}</strong></span><p>{unit.description || '暂无单元描述'}</p></div></header>{!collapsed ? <div className={styles.activityList} role="list">{renderActivities(unit.activities, activeCourse.id)}{unit.activities.length === 0 ? <p className={styles.compactEmpty}>这个单元还没有活动。</p> : null}</div> : null}</section>;
            })}{activeCourse.units.length === 0 && (activeCourse.activities?.length ?? 0) === 0 ? <div className={styles.emptyCourse}><TeachingObjectIcon kind="unit" size={22} /><strong>暂无已发布内容</strong><span>老师发布课程内容后会在这里显示</span></div> : null}</div>
          </> : <div className={styles.emptyCourse}><TeachingObjectIcon kind="course" size={22} /><strong>暂无已发布课程</strong><span>老师发布课程后会在这里显示</span></div>}
        </section>

        <aside className={styles.contextRail} aria-label="班级辅助信息" data-collapsed={!railOpen}>
          {!railOpen ? (
            <button className={styles.collapsedRailButton} type="button" aria-label="展开右侧栏" aria-expanded="false" title="展开右侧栏" onClick={() => setRailOpen(true)}><PanelRightOpen aria-hidden="true" size={17} /></button>
          ) : <>
          <section><header className={styles.primaryRailHeader}><button type="button" aria-expanded={railSections.members} onClick={() => toggleRailSection('members')}><span>成员</span><strong>{memberCounts.total}</strong><ChevronDown aria-hidden="true" size={15} /></button><button className={styles.railToggle} type="button" aria-expanded="true" aria-label="收起右侧栏" onClick={() => setRailOpen(false)} title="收起右侧栏"><PanelRightClose aria-hidden="true" size={17} /></button></header>{railSections.members ? <div className={styles.railContent}><div className={styles.memberStack}>{activeMembers.slice(0, 4).map((member) => <span className={styles.memberAvatar} key={member.id} title={getClassMemberDisplayName(member)}>{getClassMemberDisplayName(member).slice(0, 1)}</span>)}</div>{activeMembers.slice(0, 4).map((member) => <div className={styles.memberLine} key={member.id}><span>{getClassMemberDisplayName(member)}</span><small>{CLASS_MEMBER_ROLE_LABELS[member.role]}</small></div>)}<div className={styles.railActions}><button type="button" onClick={() => navigate(`/student/classes/${selectedClass.id}/members`)}>查看全部成员</button></div></div> : null}</section>
          <section><header><button type="button" aria-expanded={railSections.cocreation} onClick={() => toggleRailSection('cocreation')}><span>共创</span><ChevronDown aria-hidden="true" size={15} /></button></header>{railSections.cocreation ? <div className={styles.railLinks}><button type="button" onClick={() => setBoundary('共创内容为 Placeholder，当前学生端未接入真实协作服务。')}><Sparkles aria-hidden="true" size={15} />这是共创页面!</button><button type="button" onClick={() => setBoundary('回收站为只读 Placeholder，当前学生端未接入真实内容服务。')}><FolderArchive aria-hidden="true" size={15} />回收站</button></div> : null}</section>
          <section><header><button type="button" aria-expanded={railSections.ai} onClick={() => toggleRailSection('ai')}><span>AI</span><ChevronDown aria-hidden="true" size={15} /></button></header>{railSections.ai ? <div className={styles.railLinks}><button type="button" onClick={() => setBoundary('AI 学习助手为 Placeholder，未生成真实学习建议。')}><Bot aria-hidden="true" size={15} />AI 学习助手</button><button type="button" onClick={() => setBoundary('AI 学情为 Placeholder，未生成真实学生分析。')}><Sparkles aria-hidden="true" size={15} />AI 学情</button></div> : null}</section>
          </>}
        </aside>
      </div>
      <BoundaryDialog description={boundary} onClose={() => setBoundary(null)} />
      {activityDialog ? <HomeActivityDialog item={activityDialog.item} initialView={activityDialog.view} onClose={() => setActivityDialog(null)} /> : null}
    </main>
  );
}
