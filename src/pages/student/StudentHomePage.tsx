import {
  ChevronRight,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  SwitchCamera,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '@app/shell/usePageHeader';
import { TeachingObjectIcon } from '@design-system/TeachingObjectIcon';
import { TeachingActionButton } from '@design-system/TeachingActionButton';
import type { TeachingObjectKind } from '@domain/teaching-object/teaching-object';
import {
  buildStudentHomeModel,
  type StudentHomeLearningItem,
} from '@domain/home/home';
import { resolveProductTarget, type ProductTarget } from '@domain/navigation/product-target';
import { getTaskTeachingObjectKind } from '@domain/teaching-object/teaching-object';
import type { TeachingQuickAction } from '@domain/teaching-action/teaching-action';
import { useMessageThreads } from '@features/message-workspace';
import { HomeActivityDialog, type HomeActivityDialogItem, HomeTimelineDate } from '@features/home-workspace';
import { useRoleSession } from '@features/role-switch';
import { GROWTH_OVERVIEW } from '@mocks/scenarios/growth';
import { SCHEDULE_EVENTS } from '@mocks/scenarios/schedule';
import { TASK_ITEMS, TASK_NOW } from '@mocks/scenarios/tasks';
import styles from './StudentHomePage.module.css';

const HOME_RETURN_ANCHOR_KEY = 'student-home-return-anchor';

const STUDENT_ITEM_LABELS: Record<StudentHomeLearningItem['kind'], string> = {
  lesson: '课堂',
  'open-course': '公开课',
  homework: '作业',
  quiz: '测验',
  recording: '录播课',
  task: '学习资料',
};

function getItemObjectKind(item: StudentHomeLearningItem): TeachingObjectKind {
  if (item.kind === 'task') return getTaskTeachingObjectKind('material');
  return item.kind;
}

function getItemContext(item: StudentHomeLearningItem): string {
  return [item.className, item.unitName ?? item.courseName].filter(Boolean).join(' · ');
}

function getItemObjectLabel(item: StudentHomeLearningItem): string {
  return STUDENT_ITEM_LABELS[item.kind];
}

function getStateLabel(item: StudentHomeLearningItem, primary: boolean): string {
  if (primary) return item.state === 'current' ? '当前学习' : '下一项学习';
  const labels: Record<StudentHomeLearningItem['state'], string> = {
    current: '进行中',
    upcoming: '待开始',
    overdue: '已逾期',
    completed: '已完成',
    'in-progress': '进行中',
    unavailable: '暂不可用',
  };
  return labels[item.state];
}

function getStateTone(item: StudentHomeLearningItem, primary: boolean): 'primary' | 'warning' | 'success' | 'neutral' {
  if (primary || item.state === 'current') return 'primary';
  if (item.state === 'overdue') return 'warning';
  if (item.state === 'completed') return 'success';
  return 'neutral';
}

function EventKindLabel({ item }: { item: StudentHomeLearningItem }) {
  const kind = getItemObjectKind(item);
  return (
    <span className={styles.eventKind} data-event-kind={kind}>
      <TeachingObjectIcon kind={kind} size={14} />
      <span>{getItemObjectLabel(item)}</span>
    </span>
  );
}

function toDialogItem(item: StudentHomeLearningItem, primary: boolean, action: TeachingQuickAction = item.action.actions.primary): HomeActivityDialogItem {
  const kind = getItemObjectKind(item);
  return {
    id: item.id,
    title: item.title,
    kind,
    kindLabel: getItemObjectLabel(item),
    stateLabel: getStateLabel(item, primary),
    timeLabel: item.timeLabel,
    className: item.className,
    courseName: item.courseName,
    unitName: item.unitName,
    actionLabel: action.label,
    actionPlaceholder: action.feedback,
  };
}

export function StudentHomePage() {
  const navigate = useNavigate();
  const { switchRole } = useRoleSession();
  const threads = useMessageThreads();
  const [attentionOpen, setAttentionOpen] = useState(true);
  const [teacherReminderVisible, setTeacherReminderVisible] = useState(true);
  const [activityDialog, setActivityDialog] = useState<{ item: StudentHomeLearningItem; action: TeachingQuickAction; view: 'detail' | 'operation' } | null>(null);
  const pageHeader = useMemo(() => ({ title: '首页' }), []);
  usePageHeader(pageHeader);
  const model = useMemo(() => buildStudentHomeModel({
    tasks: TASK_ITEMS,
    scheduleEvents: SCHEDULE_EVENTS,
    messageThreads: threads,
    growth: GROWTH_OVERVIEW,
  }, TASK_NOW), [threads]);

  useEffect(() => {
    const anchor = window.sessionStorage.getItem(HOME_RETURN_ANCHOR_KEY);
    if (!anchor) return;
    window.sessionStorage.removeItem(HOME_RETURN_ANCHOR_KEY);
    requestAnimationFrame(() => {
      Array.from(document.querySelectorAll<HTMLElement>('[data-home-anchor]'))
        .find((element) => element.dataset.homeAnchor === anchor)
        ?.focus();
    });
  }, []);

  const rememberHomeAnchor = (anchor: string) => {
    window.sessionStorage.setItem(HOME_RETURN_ANCHOR_KEY, anchor);
  };

  const navigateToTarget = (target: ProductTarget | null, anchor: string) => {
    if (!target) return;
    const destination = resolveProductTarget('student-family', target);
    if (!destination) return;
    rememberHomeAnchor(anchor);
    navigate(destination);
  };

  const openItemDialog = (item: StudentHomeLearningItem, view: 'detail' | 'operation', action = item.action.actions.primary) => {
    setActivityDialog({ item, action, view });
  };

  const openItemDetails = (item: StudentHomeLearningItem) => {
    if (item.kind === 'lesson' || item.kind === 'open-course') {
      navigateToTarget(item.action.target, item.id);
      return;
    }
    openItemDialog(item, 'detail');
  };

  const openItemAction = (item: StudentHomeLearningItem, action = item.action.actions.primary) => {
    if (item.kind === 'open-course') {
      navigateToTarget(item.action.target, item.id);
      return;
    }
    openItemDialog(item, 'operation', action);
  };
  const primary = model.schedule.primary;
  const recentCount = model.schedule.recentDays.reduce((total, day) => total + day.events.length, 0);
  const topTask = model.tasks.status === 'ready' ? model.tasks.top : null;
  const latestClassMessage = model.classMessages.status === 'ready' ? model.classMessages.latest : null;

  return (
    <div className={styles.page}>
      <div className={styles.workbench} data-attention-open={attentionOpen}>
        <section className={styles.scheduleColumn} aria-labelledby="student-home-schedule">
          <header className={styles.sectionHeading}>
            <h2 id="student-home-schedule">学习安排</h2>
            <button type="button" className={styles.textAction} onClick={() => navigate('/student/schedule')}>
              查看课程表<ChevronRight aria-hidden="true" size={15} />
            </button>
          </header>

          {model.schedule.status !== 'ready' && model.schedule.status !== 'empty' ? (
            <div className={styles.emptyState}>
              <strong>{model.schedule.status === 'loading' ? '学习安排正在加载' : model.schedule.status === 'error' ? '学习安排暂时无法加载' : '学习安排暂不可用'}</strong>
              <span>请进入课程表查看或重试。</span>
              <button type="button" onClick={() => navigate('/student/schedule')}>进入课程表</button>
            </div>
          ) : primary ? (
            <article className={styles.primaryEvent} aria-labelledby="student-home-primary-event">
              <button className={styles.primaryDetails} type="button" aria-label={`查看${primary.title}详情`} data-home-anchor={primary.id} onClick={() => openItemDetails(primary)}>
                <span className={styles.primaryMeta}>
                  <EventKindLabel item={primary} />
                  <span className={styles.primaryState}>{getStateLabel(primary, true)} · {primary.timeLabel}</span>
                </span>
                <h3 id="student-home-primary-event">{primary.title}</h3>
                <p>{getItemContext(primary)}</p>
              </button>
              <div className={styles.primaryActions} aria-label={`${primary.title}快捷操作`}>
                {primary.action.actions.secondary ? <TeachingActionButton action={primary.action.actions.secondary} type="button" aria-label={`${primary.title}：${primary.action.actions.secondary.label}`} onClick={() => openItemAction(primary, primary.action.actions.secondary)} /> : null}
                <TeachingActionButton action={primary.action.actions.primary} type="button" aria-label={`${primary.title}：${primary.action.actions.primary.label}`} onClick={() => openItemAction(primary)} />
              </div>
            </article>
          ) : (
            <div className={styles.emptyState}>
              <strong>暂无需要立即处理的学习安排</strong>
              <span>可以前往课程表查看后续计划。</span>
            </div>
          )}

          <div className={styles.timeline}>
            <section className={styles.scheduleGroup} aria-labelledby="student-home-three-days">
              <header>
                <h3 id="student-home-three-days">最近三天</h3>
                <span>{recentCount} 项</span>
              </header>
              <div className={styles.futureDays}>
                {model.schedule.recentDays.map((day) => (
                  <div className={styles.futureDay} key={day.date}>
                    <HomeTimelineDate date={day.date} relative={day.label} count={day.events.length} />
                    <div className={styles.eventList}>
                      {day.events.map((item) => {
                        const isPrimary = item.id === primary?.id;
                        const tone = getStateTone(item, isPrimary);
                        const isToday = day.label === '今天';
                        return (
                          <article className={styles.eventRow} key={item.id} data-completed={item.state === 'completed'}>
                            <button className={styles.eventContent} type="button" data-home-anchor={item.id} onClick={() => openItemDetails(item)}>
                              <time>{item.timeLabel}</time>
                              <span className={styles.timelineNode} data-timeline-node="event" data-tone={tone} aria-hidden="true" />
                              <span className={styles.rowCopy}>
                                <strong>{item.title}</strong>
                                <span className={styles.rowMeta}><EventKindLabel item={item} />{!isPrimary ? <span>{getItemContext(item)}</span> : null}</span>
                              </span>
                              {isToday ? <span className={styles.stateLabel} data-tone={tone}>{getStateLabel(item, isPrimary)}</span> : null}
                            </button>
                            <div className={styles.rowActions} aria-label={`${item.title}快捷操作`}>
                              {item.action.actions.secondary ? <TeachingActionButton action={item.action.actions.secondary} type="button" aria-label={`${item.title}：${item.action.actions.secondary.label}`} onClick={() => openItemAction(item, item.action.actions.secondary)} /> : null}
                              <TeachingActionButton action={item.action.actions.primary} type="button" aria-label={`${item.title}：${item.action.actions.primary.label}`} onClick={() => openItemAction(item)} />
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    {day.events.length === 0 ? <p className={styles.inlineEmpty}>暂无学习安排</p> : null}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <aside className={styles.attentionRail} aria-label="关注摘要" data-collapsed={!attentionOpen}>
          {!attentionOpen ? (
            <button className={styles.collapsedRailButton} type="button" aria-label="展开关注摘要" aria-expanded="false" title="展开关注摘要" onClick={() => setAttentionOpen(true)}>
              <PanelRightOpen aria-hidden="true" size={17} />
            </button>
          ) : (
            <div className={styles.attentionSections}>
              <section className={styles.attentionSection} aria-labelledby="student-home-tasks">
                <header className={styles.attentionHeading}>
                  <div><h2 id="student-home-tasks">待办</h2>{model.tasks.status === 'ready' ? <span>{Object.values(model.tasks.counts).reduce((total, count) => total + count, 0)} 项</span> : null}</div>
                  <div><button type="button" onClick={() => navigate('/student/todos')}>查看全部</button><button className={styles.railToggle} type="button" aria-label="收起关注摘要" aria-expanded="true" title="收起关注摘要" onClick={() => setAttentionOpen(false)}><PanelRightClose aria-hidden="true" size={17} /></button></div>
                </header>
                {model.tasks.status === 'ready' ? (
                  <dl className={styles.taskCounts}>
                    <div><dt>已过截止</dt><dd data-tone="danger">{model.tasks.counts.overdue}</dd></div>
                    <div><dt>今天</dt><dd>{model.tasks.counts.today}</dd></div>
                    <div><dt>后续</dt><dd>{model.tasks.counts.later}</dd></div>
                  </dl>
                ) : null}
                {model.tasks.status !== 'ready' ? <p className={styles.sectionEmpty}>{model.tasks.status === 'error' ? '待办加载失败，请进入待办重试。' : model.tasks.status === 'loading' ? '待办正在加载。' : '待办暂不可用，请进入待办查看。'}</p> : topTask ? (
                  <button type="button" className={styles.summaryAction} data-home-anchor={topTask.id} onClick={() => openItemDialog(topTask, 'detail')}>
                    <span className={styles.summaryIcon}><TeachingObjectIcon kind={getItemObjectKind(topTask)} size={15} /></span>
                    <span className={styles.rowCopy}><strong>{topTask.title}</strong><span>{getItemContext(topTask)}</span></span>
                    <ChevronRight aria-hidden="true" size={15} />
                  </button>
                ) : <p className={styles.sectionEmpty}>暂无待处理事项</p>}
              </section>

              <section className={styles.attentionSection} aria-labelledby="student-home-messages">
                <header className={styles.attentionHeading}>
                  <div><h2 id="student-home-messages">班级消息</h2>{model.classMessages.unreadCount > 0 ? <span>{model.classMessages.unreadCount} 未读</span> : null}</div>
                  <button type="button" onClick={() => navigate('/student/messages')}>查看全部</button>
                </header>
                {model.classMessages.status !== 'ready' ? <p className={styles.sectionEmpty}>{model.classMessages.status === 'error' ? '班级消息加载失败，请进入消息重试。' : model.classMessages.status === 'loading' ? '班级消息正在加载。' : model.classMessages.status === 'unavailable' ? '班级消息暂不可用。' : '暂无班级消息'}</p> : latestClassMessage ? (
                  <button type="button" className={styles.messageAction} data-home-anchor={latestClassMessage.id} onClick={() => navigateToTarget(latestClassMessage.classId ? { kind: 'class-chat', classId: latestClassMessage.classId, source: 'home' } : null, latestClassMessage.id)}>
                    <span className={styles.messageIcon}><MessageCircle aria-hidden="true" size={15} /></span>
                    <span className={styles.rowCopy}><strong>{latestClassMessage.title}</strong><span>{latestClassMessage.preview}</span></span>
                    <span className={styles.messageMeta}><time>{latestClassMessage.timeLabel}</time>{latestClassMessage.unreadCount > 0 ? <b>{latestClassMessage.unreadCount}</b> : null}</span>
                  </button>
                ) : <p className={styles.sectionEmpty}>暂无班级消息</p>}
              </section>

              <section className={styles.attentionSection} aria-labelledby="student-home-growth">
                <header className={styles.attentionHeading}>
                  <div><h2 id="student-home-growth">学习进展</h2></div>
                  <button type="button" onClick={() => navigate('/student/growth')}>查看成长</button>
                </header>
                {model.growth.status !== 'ready' ? <p className={styles.sectionEmpty}>{model.growth.status === 'unavailable' ? '学习进展暂不可用。' : model.growth.status === 'loading' ? '学习进展正在加载。' : '学习进展加载失败，请重试。'}</p> : (
                  <div className={styles.growthMetrics}>
                    {model.growth.metrics.map((metric) => <div className={styles.growthMetric} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></div>)}
                  </div>
                )}
                {teacherReminderVisible && model.teacherReminder.urgentCount > 0 ? (
                  <div className={styles.roleReminder} role="complementary" aria-label="老师视角提醒">
                    <span><strong>老师视角有 {model.teacherReminder.urgentCount} 项紧急事项</strong></span>
                    <button type="button" onClick={() => { switchRole(); navigate('/teacher/home', { replace: true }); }}><SwitchCamera aria-hidden="true" size={14} />切换至老师视角</button>
                    <button className={styles.quietButton} type="button" onClick={() => setTeacherReminderVisible(false)} aria-label="关闭老师视角提醒" title="关闭提醒"><X aria-hidden="true" size={16} /></button>
                  </div>
                ) : null}
              </section>
            </div>
          )}
        </aside>
      </div>
      {activityDialog ? (
        <HomeActivityDialog
          item={toDialogItem(activityDialog.item, activityDialog.item.id === primary?.id, activityDialog.action)}
          initialView={activityDialog.view}
          onClose={() => setActivityDialog(null)}
        />
      ) : null}
    </div>
  );
}
