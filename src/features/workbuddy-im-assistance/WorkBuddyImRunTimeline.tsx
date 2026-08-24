import {
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleAlert,
  CircleEllipsis,
  FileText,
  ListChecks,
  LoaderCircle,
  Sparkles,
  UserRound,
  Wrench,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ConversationRunEvent } from '@contracts/workbuddy/conversation-run';
import type { WorkBuddyImRunProjection } from '@contracts/workbuddy/im-conversation-run';
import { useDeadlineCountdown } from '@features/ai-agent-workspace';
import { WORKBUDDY_IM_RUN_TIMING } from './workbuddy-im-experience';
import styles from './WorkBuddyImSidecar.module.css';

function eventStatus(event: ConversationRunEvent): string {
  if (event.state === 'running') return '进行中';
  if (event.state === 'queued') return '等待';
  if (event.state === 'failed') return '需要处理';
  return '已完成';
}

function EventIcon({ event }: { event: ConversationRunEvent }) {
  if (event.state === 'running') return <LoaderCircle className={styles.spinner} aria-hidden="true" size={14} />;
  if (event.state === 'failed') return <CircleAlert aria-hidden="true" size={14} />;
  if (event.state === 'queued') return <CircleEllipsis aria-hidden="true" size={14} />;
  if (event.kind === 'teacher_message') return <UserRound aria-hidden="true" size={14} />;
  if (event.kind === 'plan') return <ListChecks aria-hidden="true" size={14} />;
  if (event.kind === 'artifact') return <FileText aria-hidden="true" size={14} />;
  return <CheckCircle2 aria-hidden="true" size={14} />;
}

function CapabilityEvent({ event, remainingSeconds }: Readonly<{ event: ConversationRunEvent; remainingSeconds: number | null }>) {
  const [expanded, setExpanded] = useState(false);
  const open = event.state === 'running' || expanded;
  return (
    <article className={styles.runEvent} data-kind="capability_call" data-state={event.state} aria-label={`${event.title} · ${eventStatus(event)}`}>
      <span className={styles.runEventMark}><EventIcon event={event} /></span>
      <div className={styles.runEventBody}>
        <div className={styles.capabilityHeading}>
          <div><strong>{event.title}</strong><small><Wrench aria-hidden="true" size={11} />{event.detail?.capabilityLabel}</small></div>
          <span>{eventStatus(event)}{event.state === 'running' && remainingSeconds !== null ? <small aria-hidden="true">约 {Math.max(1, remainingSeconds)} 秒</small> : null}</span>
        </div>
        <p>{event.state === 'queued' ? event.detail?.purpose : event.summary}</p>
        <button className={styles.runEvidenceToggle} type="button" aria-expanded={open} onClick={() => setExpanded((current) => !current)}>
          {open ? '收起执行信息' : '查看执行信息'}<ChevronDown aria-hidden="true" size={13} />
        </button>
        {open ? (
          <dl className={styles.runEvidence}>
            <div><dt>目的</dt><dd>{event.detail?.purpose}</dd></div>
            <div><dt>读取</dt><dd>{event.detail?.inputSummary}</dd></div>
            <div><dt>上下文</dt><dd>{event.detail?.contextLabels.join(' · ')}</dd></div>
            <div><dt>{event.state === 'running' ? '预期' : '结果'}</dt><dd>{event.detail?.outputSummary}</dd></div>
          </dl>
        ) : null}
      </div>
    </article>
  );
}

function stepState(run: WorkBuddyImRunProjection, stepId: string): ConversationRunEvent['state'] {
  return run.events.find((event) => event.stepRef === stepId)?.state ?? 'queued';
}

function useRunElapsedSeconds(run: WorkBuddyImRunProjection): number {
  const active = run.progress.status === 'organizing' || run.progress.status === 'running';
  const [elapsedSeconds, setElapsedSeconds] = useState(() => Math.max(0, Math.floor((Date.now() - run.startedAt) / 1_000)));

  useEffect(() => {
    const update = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - run.startedAt) / 1_000)));
    update();
    if (!active) return undefined;
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [active, run.startedAt]);

  return elapsedSeconds;
}

export function WorkBuddyImRunTimeline({ run }: Readonly<{ run: WorkBuddyImRunProjection }>) {
  const elapsedSeconds = useRunElapsedSeconds(run);
  const deadline = run.progress.status === 'organizing' || run.progress.status === 'running' ? run.progress.stepEndsAt : null;
  const remainingSeconds = useDeadlineCountdown(deadline);
  const overallRemainingSeconds = run.progress.status === 'running' && remainingSeconds !== null
    ? remainingSeconds + Math.max(0, run.progress.totalCount - run.progress.activeIndex - 1) * (WORKBUDDY_IM_RUN_TIMING.capabilityMs / 1_000)
    : remainingSeconds;
  const progressLabel = run.progress.status === 'organizing'
    ? '正在理解任务'
    : run.progress.status === 'running'
      ? `第 ${run.progress.activeIndex + 1}/${run.progress.totalCount} 步`
      : run.progress.status === 'completed' ? '执行完成' : run.status === 'failed' ? '执行中断' : null;
  const visibleEvents = useMemo(() => run.events.filter((event) => (
    event.kind !== 'capability_call' || event.state !== 'queued'
  )), [run.events]);

  return (
    <section className={styles.runSurface} aria-label="WorkBuddy Agent Run">
      <header className={styles.runHeader}>
        <div><span>Agent Run</span><strong>{run.title}</strong></div>
        <div className={styles.runProgress} data-status={run.progress.status} role="status">
          {run.progress.status === 'organizing' || run.progress.status === 'running'
            ? <LoaderCircle className={styles.spinner} aria-hidden="true" size={13} />
            : run.status === 'failed' ? <CircleAlert aria-hidden="true" size={13} /> : <CheckCircle2 aria-hidden="true" size={13} />}
          <span>{progressLabel}</span>
          {(run.progress.status === 'organizing' || run.progress.status === 'running') && overallRemainingSeconds !== null
            ? <small aria-label={`已进行 ${elapsedSeconds} 秒，预计还需 ${Math.max(1, overallRemainingSeconds)} 秒`}>
              已进行 {elapsedSeconds} 秒 · 预计还需 {Math.max(1, overallRemainingSeconds)} 秒
            </small> : null}
        </div>
      </header>

      <div className={styles.runTimeline} role="feed" aria-label="Agent 任务时间线">
        {visibleEvents.map((event) => {
          if (event.kind === 'capability_call') {
            return <CapabilityEvent key={event.id} event={event} remainingSeconds={event.state === 'running' ? remainingSeconds : null} />;
          }
          if (event.kind === 'plan') {
            return (
              <article className={styles.runEvent} data-kind={event.kind} data-state={event.state} key={event.id}>
                <span className={styles.runEventMark}><EventIcon event={event} /></span>
                <div className={styles.runEventBody}>
                  <div className={styles.runEventHeading}><strong>{event.title}</strong><span>{eventStatus(event)}</span></div>
                  <p>{event.summary}</p>
                  <ol className={styles.runPlan}>
                    {run.plan.map((step, index) => {
                      const state = stepState(run, step.id);
                      return (
                        <li data-state={state} key={step.id}>
                          {state === 'completed' ? <CheckCircle2 aria-hidden="true" size={13} />
                            : state === 'running' ? <LoaderCircle className={styles.spinner} aria-hidden="true" size={13} />
                              : state === 'failed' ? <CircleAlert aria-hidden="true" size={13} /> : <Circle aria-hidden="true" size={13} />}
                          <span><strong>{index + 1}. {step.title}</strong><small>{step.capabilityLabel}</small></span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </article>
            );
          }
          return (
            <article className={styles.runEvent} data-actor={event.actor} data-kind={event.kind} data-state={event.state} key={event.id}>
              <span className={styles.runEventMark}><EventIcon event={event} /></span>
              <div className={styles.runEventBody}>
                <div className={styles.runEventHeading}><strong>{event.title}</strong><span>{eventStatus(event)}</span></div>
                <p>{event.summary}</p>
                {event.kind === 'artifact' ? <div className={styles.artifactReady}><Sparkles aria-hidden="true" size={13} />结果已进入下方审阅区</div> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
