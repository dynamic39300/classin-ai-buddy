import { CheckCircle2, Circle, CircleEllipsis, LoaderCircle } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { ConversationRunProgress } from '@contracts/workbuddy/conversation-run';
import styles from './ConversationRunSurface.module.css';

export type RunProgressStep = Readonly<{
  id: string;
  title: string;
}>;

type VisibleProgress = Extract<ConversationRunProgress, { status: 'running' | 'stopped' }>;
type StepState = 'completed' | 'running' | 'stopped' | 'queued';

function stepState(progress: VisibleProgress, index: number): StepState {
  if (index < progress.completedCount) return 'completed';
  if (progress.status === 'running' && index === progress.activeIndex) return 'running';
  if (progress.status === 'stopped' && index === Math.min(progress.completedCount, progress.totalCount - 1)) return 'stopped';
  return 'queued';
}

const STATE_LABELS: Readonly<Record<StepState, string>> = Object.freeze({
  completed: '已完成',
  running: '进行中',
  stopped: '已暂停',
  queued: '等待',
});

export function RunProgressDock({ progress, steps }: Readonly<{
  progress: ConversationRunProgress;
  steps: readonly RunProgressStep[];
}>) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  if (progress.status !== 'running' && progress.status !== 'stopped') return null;

  const visibleSteps = steps.slice(0, progress.totalCount);
  const currentIndex = progress.status === 'running'
    ? progress.activeIndex
    : Math.min(progress.completedCount, progress.totalCount - 1);
  const summary = `${progress.status === 'stopped' ? '已暂停，' : ''}第 ${currentIndex + 1}/${progress.totalCount} 步`;
  const currentStepTitle = visibleSteps[currentIndex]?.title ?? '当前任务步骤';
  const open = !dismissed && (hovered || focused || pinned);

  return (
    <div
      className={styles.progressDock}
      ref={rootRef}
      onPointerEnter={() => { setHovered(true); setDismissed(false); }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => { setFocused(true); setDismissed(false); }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
          setPinned(false);
          setDismissed(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setPinned(false);
          setDismissed(true);
          rootRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
        }
      }}
    >
      <section className={styles.progressPopover} id={popoverId} role="region" aria-label="任务执行步骤" hidden={!open}>
        <header><strong>任务执行步骤</strong><span>{progress.completedCount}/{progress.totalCount} 完成</span></header>
        <ol>
          {visibleSteps.map((step, index) => {
            const state = stepState(progress, index);
            return (
              <li data-state={state} aria-current={state === 'running' || state === 'stopped' ? 'step' : undefined} key={step.id}>
                {state === 'completed' ? <CheckCircle2 aria-hidden="true" size={15} />
                  : state === 'running' ? <LoaderCircle className={styles.spinner} aria-hidden="true" size={15} />
                    : state === 'stopped' ? <CircleEllipsis aria-hidden="true" size={15} />
                      : <Circle aria-hidden="true" size={15} />}
                <span>{step.title}</span>
                <small>{STATE_LABELS[state]}</small>
              </li>
            );
          })}
        </ol>
      </section>
      <button
        className={styles.progressTrigger}
        type="button"
        aria-controls={popoverId}
        aria-expanded={open}
        aria-label={`查看任务执行步骤，${summary}：${currentStepTitle}`}
        onClick={() => {
          if (pinned) {
            setPinned(false);
            setDismissed(true);
          } else {
            setPinned(true);
            setDismissed(false);
          }
        }}
      >
        {progress.status === 'running'
          ? <LoaderCircle className={styles.spinner} aria-hidden="true" size={15} />
          : <CircleEllipsis aria-hidden="true" size={15} />}
        <span>{summary}</span>
      </button>
    </div>
  );
}
