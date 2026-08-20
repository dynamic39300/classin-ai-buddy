import {
  ChevronRight,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '@app/shell/usePageHeader';
import { TeachingObjectIcon } from '@design-system/TeachingObjectIcon';
import { TeachingActionButton } from '@design-system/TeachingActionButton';
import { buildTeacherHomeModel, getTeacherHomeEventContext } from '@domain/home/home';
import { resolveProductTarget } from '@domain/navigation/product-target';
import { resolveScheduleActions, type ScheduleEvent } from '@domain/schedule/schedule';
import { formatTaskTime, resolveTaskActions, type TaskItem } from '@domain/task/task';
import type { TeachingQuickAction, TeachingQuickActionSet } from '@domain/teaching-action/teaching-action';
import { getScheduleTeachingObjectKind, getTaskTeachingObjectKind, TEACHING_OBJECT_LABELS } from '@domain/teaching-object/teaching-object';
import { HomeActivityDialog, type HomeActivityDialogItem, HomeTimelineDate } from '@features/home-workspace';
import { useMessageThreads } from '@features/message-workspace';
import { INSIGHT_CLASSES } from '@mocks/scenarios/insights';
import { SCHEDULE_EVENTS } from '@mocks/scenarios/schedule';
import { TASK_ITEMS, TASK_NOW } from '@mocks/scenarios/tasks';
import styles from './TeacherHomePage.module.css';

function getEventState(event: ScheduleEvent, primaryId: string | undefined): string {
  if (event.id === primaryId) return event.kind === 'lesson' && event.phase === 'live' ? '当前课堂' : '下一课堂';
  if (event.kind === 'assignment') return '截止';
  return event.phase === 'completed' ? '已结束' : event.phase === 'live' ? '进行中' : '待开始';
}

function isCompletedEvent(event: ScheduleEvent): boolean {
  return event.kind !== 'assignment' && event.phase === 'completed';
}

function EventKindLabel({ event }: { event: ScheduleEvent }) {
  const kind = getScheduleTeachingObjectKind(event);
  return (
    <span className={styles.eventKind} data-event-kind={kind}>
      <TeachingObjectIcon kind={kind} size={14} />
      <span>{TEACHING_OBJECT_LABELS[kind]}</span>
    </span>
  );
}

function formatCalendarDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

const HOME_RETURN_ANCHOR_KEY = 'teacher-home-return-anchor';

function getEventActions(event: ScheduleEvent): TeachingQuickActionSet {
  if (event.kind === 'assignment') {
    const task = TASK_ITEMS.find((item) => item.link.homeworkId === event.homeworkId);
    if (task) return resolveTaskActions('teacher', task, TASK_NOW);
  }
  return resolveScheduleActions('teacher', event, TASK_NOW);
}

function toEventDialogItem(event: ScheduleEvent, primaryId: string | undefined, action: TeachingQuickAction = getEventActions(event).primary): HomeActivityDialogItem {
  const kind = getScheduleTeachingObjectKind(event);
  return {
    id: event.id,
    title: event.title,
    kind,
    kindLabel: TEACHING_OBJECT_LABELS[kind],
    stateLabel: getEventState(event, primaryId),
    timeLabel: event.startTime,
    className: event.context,
    courseName: event.course,
    unitName: event.unitName,
    actionLabel: action.label,
    actionPlaceholder: action.feedback,
  };
}

function toTaskDialogItem(task: TaskItem): HomeActivityDialogItem {
  const kind = getTaskTeachingObjectKind(task.kind);
  const action = resolveTaskActions('teacher', task, TASK_NOW).primary;
  return {
    id: task.id,
    title: task.title,
    kind,
    kindLabel: TEACHING_OBJECT_LABELS[kind],
    stateLabel: formatTaskTime('teacher', task, TASK_NOW),
    timeLabel: formatTaskTime('teacher', task, TASK_NOW),
    className: task.className,
    courseName: task.course,
    unitName: task.unitName,
    actionLabel: action.label,
    actionPlaceholder: `${action.label}为 Demo Placeholder，未连接真实作业、批改或教学服务。`,
  };
}

export function TeacherHomePage() {
  const navigate = useNavigate();
  const threads = useMessageThreads();
  const [attentionOpen, setAttentionOpen] = useState(true);
  const [activityDialog, setActivityDialog] = useState<{ item: HomeActivityDialogItem; view: 'detail' | 'operation' } | null>(null);
  const model = useMemo(() => buildTeacherHomeModel({
    tasks: TASK_ITEMS,
    scheduleEvents: SCHEDULE_EVENTS,
    messageThreads: threads,
    insights: INSIGHT_CLASSES,
  }, TASK_NOW, '王老师'), [threads]);
  const pageHeader = useMemo(() => ({
    title: '首页',
    meta: { label: model.dateLabel, dateTime: TASK_NOW.toISOString().slice(0, 10) },
  }), [model.dateLabel]);
  usePageHeader(pageHeader);
  const currentEvent = model.currentOrNextEvent;
  const topTask = model.topTask;
  const todayDate = formatCalendarDate(TASK_NOW);

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

  const navigateToTarget = (target: Parameters<typeof resolveProductTarget>[1]) => {
    const destination = resolveProductTarget('teacher', target);
    if (destination) navigate(destination);
  };

  const openEventDialog = (event: ScheduleEvent, view: 'detail' | 'operation', action = getEventActions(event).primary) => {
    setActivityDialog({ item: toEventDialogItem(event, currentEvent?.id, action), view });
  };

  const openEventDetails = (event: ScheduleEvent) => {
    if (event.kind === 'lesson') {
      const destination = resolveProductTarget('teacher', {
        kind: 'class',
        classId: event.classId,
        courseId: event.courseId,
        unitId: event.unitId,
        activityId: event.activityId,
        source: 'home',
      });
      rememberHomeAnchor(event.id);
      if (destination) navigate(destination);
      return;
    }
    if (event.kind === 'open-course') {
      const destination = resolveProductTarget('teacher', { kind: 'open-course', openCourseId: event.openCourseId, source: 'home' });
      if (destination) navigate(destination);
      return;
    }
    openEventDialog(event, 'detail');
  };

  const openEventAction = (event: ScheduleEvent, action = getEventActions(event).primary) => {
    if (event.kind === 'open-course') {
      const destination = resolveProductTarget('teacher', { kind: 'open-course', openCourseId: event.openCourseId, source: 'home' });
      if (destination) navigate(destination);
      return;
    }
    openEventDialog(event, 'operation', action);
  };

  const openTaskDialog = (taskId: string) => {
    const task = model.openTasks.find((item) => item.id === taskId);
    if (task) setActivityDialog({ item: toTaskDialogItem(task), view: 'detail' });
  };

  return (
    <div className={styles.page}>
      <div className={styles.workbench} data-attention-open={attentionOpen}>
        <section className={styles.scheduleColumn} aria-labelledby="teacher-home-schedule">
          <header className={styles.sectionHeading}>
            <div>
              <h2 id="teacher-home-schedule">教学日程</h2>
            </div>
            <button type="button" className={styles.textAction} onClick={() => navigate('/teacher/schedule')}>
              完整课程表<ChevronRight aria-hidden="true" size={15} />
            </button>
          </header>

          {model.scheduleStatus !== 'ready' && model.scheduleStatus !== 'empty' ? (
            <div className={styles.emptyState}>
              <strong>{model.scheduleStatus === 'loading' ? '教学日程正在加载' : model.scheduleStatus === 'error' ? '教学日程暂时无法加载' : '教学日程暂不可用'}</strong>
              <span>请进入完整课程表查看或重试。</span>
              <button type="button" onClick={() => navigate('/teacher/schedule')}>进入完整课程表</button>
            </div>
          ) : currentEvent ? (
            <article className={styles.primaryEvent} aria-labelledby="teacher-home-primary-event">
              <button className={styles.primaryDetails} type="button" aria-label={`查看${currentEvent.title}详情`} data-home-anchor={currentEvent.id} onClick={() => openEventDetails(currentEvent)}>
                <span className={styles.primaryMeta}>
                  <EventKindLabel event={currentEvent} />
                  <span className={styles.primaryState}>{getEventState(currentEvent, currentEvent.id)} · {currentEvent.startTime}</span>
                </span>
                <h3 id="teacher-home-primary-event">{currentEvent.title}</h3>
                <p>{getTeacherHomeEventContext(currentEvent)}</p>
              </button>
              <div className={styles.primaryActions} aria-label={`${currentEvent.title}快捷操作`}>
                {getEventActions(currentEvent).secondary ? <TeachingActionButton action={getEventActions(currentEvent).secondary!} type="button" aria-label={`${currentEvent.title}：${getEventActions(currentEvent).secondary?.label}`} onClick={() => openEventAction(currentEvent, getEventActions(currentEvent).secondary)} /> : null}
                <TeachingActionButton action={getEventActions(currentEvent).primary} type="button" aria-label={`${currentEvent.title}：${getEventActions(currentEvent).primary.label}`} onClick={() => openEventAction(currentEvent)} />
              </div>
            </article>
          ) : (
            <div className={styles.emptyState}>
              <strong>今天暂无课堂安排</strong>
              <span>可以前往完整课程表查看后续计划。</span>
            </div>
          )}

          <div className={styles.timeline}>
            <section className={styles.scheduleGroup} aria-labelledby="teacher-home-three-days">
              <header>
                <h3 id="teacher-home-three-days">最近三天</h3>
                <span>{model.todayEvents.length + model.futureEvents.length} 项</span>
              </header>
              <div className={styles.futureDays}>
                <div className={styles.futureDay}>
                  <HomeTimelineDate date={todayDate} relative="今天" count={model.todayEvents.length} />
                  <div className={styles.eventList}>
                    {model.todayEvents.map((event) => {
                      const isPrimary = event.id === currentEvent?.id;
                      const stateTone = isPrimary ? 'primary' : event.kind === 'assignment' ? 'warning' : 'neutral';
                      return (
                        <article className={styles.eventRow} key={event.id} data-completed={isCompletedEvent(event)} data-timeline-primary={isPrimary}>
                          <button className={styles.eventContent} type="button" data-home-anchor={event.id} onClick={() => openEventDetails(event)}>
                            <time>{event.startTime}</time>
                            <span className={styles.timelineNode} data-timeline-node="event" data-tone={stateTone} aria-hidden="true" />
                            <span className={styles.rowCopy}>
                              <strong>{event.title}</strong>
                              <span className={styles.rowMeta}>
                                <EventKindLabel event={event} />
                                {!isPrimary ? <span>{getTeacherHomeEventContext(event)}</span> : null}
                              </span>
                            </span>
                            <span className={styles.stateLabel} data-tone={stateTone}>{getEventState(event, currentEvent?.id)}</span>
                          </button>
                          <div className={styles.rowActions} aria-label={`${event.title}快捷操作`}>
                            {getEventActions(event).secondary ? <TeachingActionButton action={getEventActions(event).secondary!} type="button" aria-label={`${event.title}：${getEventActions(event).secondary?.label}`} onClick={() => openEventAction(event, getEventActions(event).secondary)} /> : null}
                            <TeachingActionButton action={getEventActions(event).primary} type="button" aria-label={`${event.title}：${getEventActions(event).primary.label}`} onClick={() => openEventAction(event)} />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {model.todayEvents.length === 0 ? <p className={styles.inlineEmpty}>暂无课程或截止安排</p> : null}
                </div>
                {model.futureDays.map((day, index) => (
                  <div className={styles.futureDay} key={day.date}>
                    <HomeTimelineDate date={day.date} relative={index === 0 ? '明天' : '后天'} count={day.events.length + day.overflowCount} />
                    <div className={styles.eventList}>
                      {day.events.map((event) => (
                        <article className={styles.eventRow} key={event.id} data-completed={isCompletedEvent(event)}>
                          <button className={styles.eventContent} type="button" data-home-anchor={event.id} onClick={() => openEventDetails(event)}>
                            <time>{event.startTime}</time>
                            <span className={styles.timelineNode} data-timeline-node="event" data-tone="neutral" aria-hidden="true" />
                            <span className={styles.rowCopy}>
                              <strong>{event.title}</strong>
                              <span className={styles.rowMeta}><EventKindLabel event={event} /><span>{getTeacherHomeEventContext(event)}</span></span>
                            </span>
                          </button>
                          <div className={styles.rowActions} aria-label={`${event.title}快捷操作`}>
                            {getEventActions(event).secondary ? <TeachingActionButton action={getEventActions(event).secondary!} type="button" aria-label={`${event.title}：${getEventActions(event).secondary?.label}`} onClick={() => openEventAction(event, getEventActions(event).secondary)} /> : null}
                            <TeachingActionButton action={getEventActions(event).primary} type="button" aria-label={`${event.title}：${getEventActions(event).primary.label}`} onClick={() => openEventAction(event)} />
                          </div>
                        </article>
                      ))}
                    </div>
                    {day.events.length === 0 ? <p className={styles.inlineEmpty}>暂无课程安排</p> : null}
                    {day.overflowCount > 0 ? <p className={styles.inlineEmpty}>还有 {day.overflowCount} 节</p> : null}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <aside className={styles.attentionRail} aria-label="关注摘要" data-surface="floating" data-collapsed={!attentionOpen}>
          {!attentionOpen ? (
            <button className={styles.collapsedRailButton} type="button" aria-label="展开关注摘要" aria-expanded="false" title="展开关注摘要" onClick={() => setAttentionOpen(true)}>
              <PanelRightOpen aria-hidden="true" size={17} />
            </button>
          ) : <div className={styles.attentionSections}>
          <section className={styles.attentionSection} aria-labelledby="teacher-home-tasks">
            <header className={styles.attentionHeading}>
              <div><h2 id="teacher-home-tasks">教学待办</h2><span>{model.openTasks.length} 项</span></div>
              <div className={styles.attentionHeadingActions}>
                <button type="button" onClick={() => navigate('/teacher/tasks')} aria-label="查看全部任务">查看全部</button>
                <button className={styles.railToggle} type="button" aria-label="收起关注摘要" aria-expanded="true" title="收起关注摘要" onClick={() => setAttentionOpen(false)}><PanelRightClose aria-hidden="true" size={17} /></button>
              </div>
            </header>
            {model.tasksStatus === 'ready' ? (
              <dl className={styles.taskCounts}>
                <div><dt>已过截止</dt><dd data-tone="danger">{model.taskCounts.overdue}</dd></div>
                <div><dt>今日</dt><dd>{model.taskCounts.today}</dd></div>
                <div><dt>后续</dt><dd>{model.taskCounts.later}</dd></div>
              </dl>
            ) : null}
            {model.tasksStatus !== 'ready' ? <p className={styles.sectionEmpty}>{model.tasksStatus === 'error' ? '教学待办加载失败，请进入待办重试。' : model.tasksStatus === 'loading' ? '教学待办正在加载。' : '教学待办暂不可用，请进入待办查看。'}</p> : topTask ? (
              <button type="button" className={styles.summaryAction} data-home-anchor={topTask.id} onClick={() => openTaskDialog(topTask.id)}>
                <span className={styles.summaryIcon} data-tone="warning"><TeachingObjectIcon kind={getTaskTeachingObjectKind(topTask.kind)} size={15} /></span>
                <span className={styles.rowCopy}><strong>{topTask.title}</strong><span>{[topTask.className, topTask.unitName, formatTaskTime('teacher', topTask, TASK_NOW)].filter(Boolean).join(' · ')}</span></span>
                <ChevronRight aria-hidden="true" size={15} />
              </button>
            ) : <p className={styles.sectionEmpty}>今天暂无待处理事项</p>}
          </section>

          <section className={styles.attentionSection} aria-labelledby="teacher-home-insight">
            <header className={styles.attentionHeading}>
              <div><h2 id="teacher-home-insight">教学洞察</h2>{model.insight.status === 'ready' ? <span>{model.insight.items.length} 个班级</span> : null}</div>
            </header>
            {model.insight.status === 'ready' ? (
              <div className={styles.insightList}>
                {model.insight.items.map((item) => (
                  <div className={styles.insightRow} key={item.classId}>
                    <span className={styles.summaryIcon} data-tone="warning"><TriangleAlert aria-hidden="true" size={15} /></span>
                    <div className={styles.insightCopy}><strong>{item.className}</strong><span>{item.headline}</span></div>
                    <button type="button" aria-label={`查看${item.className}作业洞察`} data-home-anchor={`insight-${item.classId}`} onClick={() => { rememberHomeAnchor(`insight-${item.classId}`); navigateToTarget({ kind: 'insight', classId: item.classId, section: 'homework', source: 'home' }); }}>查看<ChevronRight aria-hidden="true" size={14} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.unavailableState}>
                <p>{model.insight.reason}</p>
                <button type="button" onClick={() => navigate('/teacher/insights')}>进入教学洞察</button>
              </div>
            )}
          </section>

          <section className={styles.attentionSection} aria-labelledby="teacher-home-messages">
            <header className={styles.attentionHeading}>
              <div><h2 id="teacher-home-messages">消息</h2>{model.unreadMessageCount > 0 ? <span>{model.unreadMessageCount} 未读</span> : null}</div>
              <button type="button" onClick={() => navigate('/teacher/messages')}>查看全部</button>
            </header>
            <div className={styles.messageList}>
              {model.messagesStatus !== 'ready' && model.messagesStatus !== 'empty' ? <p className={styles.sectionEmpty}>{model.messagesStatus === 'loading' ? '消息正在加载。' : model.messagesStatus === 'error' ? '消息加载失败，请进入消息工作区重试。' : '消息暂不可用，请进入消息工作区查看。'}</p> : null}
              {model.messagesStatus === 'ready' ? model.messageSummaries.map((thread) => (
                <button type="button" key={thread.id} data-home-anchor={thread.id} onClick={() => { rememberHomeAnchor(thread.id); navigateToTarget({ kind: 'message', category: thread.category, threadId: thread.id, source: 'home' }); }}>
                  <span className={styles.messageIcon}><MessageCircle aria-hidden="true" size={15} /></span>
                  <span className={styles.rowCopy}><strong>{thread.title}</strong><span>{thread.preview}</span></span>
                  <span className={styles.messageMeta}><time>{thread.timeLabel}</time>{thread.unreadCount > 0 ? <b>{thread.unreadCount}</b> : null}</span>
                </button>
              )) : null}
              {model.messagesStatus === 'empty' ? <p className={styles.sectionEmpty}>暂无私聊或班级消息</p> : null}
            </div>
          </section>
          </div>}
        </aside>
      </div>
      {activityDialog ? <HomeActivityDialog item={activityDialog.item} initialView={activityDialog.view} onClose={() => setActivityDialog(null)} /> : null}
    </div>
  );
}
