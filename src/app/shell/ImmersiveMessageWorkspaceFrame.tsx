import { ArrowLeft, Minimize2, Sparkles, X } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useMessageWorkspaceShell } from './MessageWorkspaceShellContext';
import { TEACHBUDDY_BRAND } from '@contracts/workbuddy/product-brand';
import {
  readWorkBuddyExitGuidanceSuppressed,
  resetWorkBuddyExitGuidanceOnFullPageReload,
  writeWorkBuddyExitGuidanceSuppressed,
} from './workbuddy-exit-guidance-preference';
import styles from './ImmersiveMessageWorkspaceFrame.module.css';

type ImmersiveMessageWorkspaceFrameProps = {
  children: ReactNode;
  title?: string;
  exitLabel?: string;
  exitIcon?: 'back' | 'minimize';
  onExit?: () => void;
  showWorkBuddyExitGuidance?: boolean;
};

const ESCAPE_CONFIRMATION_WINDOW_MS = 800;
const EXIT_GUIDANCE_DURATION_MS = 6_000;

function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches('input, textarea, select, [contenteditable="true"]');
}

function hasLocalEscapeSurface(): boolean {
  return Boolean(document.querySelector(
    `dialog[open], [role="dialog"], [role="menu"], [aria-label="${TEACHBUDDY_BRAND.shortName} 私密协作窗口"][data-dismissible="true"]`,
  ));
}

function focusCurrentThread(): void {
  window.requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>('[data-thread-id][aria-current="true"]')
      ?? document.querySelector<HTMLElement>('[data-message-conversation]');
    target?.focus({ preventScroll: true });
  });
}

export function ImmersiveMessageWorkspaceFrame({
  children,
  title = '消息',
  exitLabel = '退出沉浸模式',
  exitIcon = 'minimize',
  onExit,
  showWorkBuddyExitGuidance = false,
}: ImmersiveMessageWorkspaceFrameProps) {
  const shell = useMessageWorkspaceShell();
  const exitButtonRef = useRef<HTMLButtonElement>(null);
  const escapeTimerRef = useRef<number | null>(null);
  const exitGuidanceTimerRef = useRef<number | null>(null);
  const exitGuidanceDeadlineRef = useRef<number | null>(null);
  const exitGuidanceRemainingRef = useRef(EXIT_GUIDANCE_DURATION_MS);
  const exitGuidancePauseReasonsRef = useRef(new Set<'focus' | 'pointer'>());
  const exitGuidancePendingRef = useRef(false);
  const previousModeRef = useRef(shell.mode);
  const [escapeArmed, setEscapeArmed] = useState(false);
  const [exitGuidanceVisible, setExitGuidanceVisible] = useState(false);
  const [exitGuidancePaused, setExitGuidancePaused] = useState(false);
  const [exitGuidanceSuppressed, setExitGuidanceSuppressed] = useState(() => {
    resetWorkBuddyExitGuidanceOnFullPageReload();
    return readWorkBuddyExitGuidanceSuppressed();
  });
  const shellVisible = shell.mode !== 'standard';
  const requestExit = onExit ?? shell.exitImmersive;
  const ExitIcon = exitIcon === 'back' ? ArrowLeft : Minimize2;

  useEffect(() => {
    const previousMode = previousModeRef.current;
    if (shell.mode === 'immersive' && previousMode !== 'immersive') focusCurrentThread();
    if (shell.mode === 'standard' && previousMode === 'exiting') focusCurrentThread();
    previousModeRef.current = shell.mode;
  }, [shell.mode]);

  useEffect(() => () => {
    if (escapeTimerRef.current !== null) window.clearTimeout(escapeTimerRef.current);
    if (exitGuidanceTimerRef.current !== null) window.clearTimeout(exitGuidanceTimerRef.current);
  }, []);

  useEffect(() => {
    if (shell.mode !== 'standard' || !exitGuidancePendingRef.current) return;
    exitGuidancePendingRef.current = false;
    if (exitGuidanceTimerRef.current !== null) window.clearTimeout(exitGuidanceTimerRef.current);
    exitGuidancePauseReasonsRef.current.clear();
    exitGuidanceRemainingRef.current = EXIT_GUIDANCE_DURATION_MS;
    exitGuidanceDeadlineRef.current = Date.now() + EXIT_GUIDANCE_DURATION_MS;
    setExitGuidancePaused(false);
    setExitGuidanceVisible(true);
    exitGuidanceTimerRef.current = window.setTimeout(() => {
      exitGuidanceTimerRef.current = null;
      exitGuidanceDeadlineRef.current = null;
      exitGuidanceRemainingRef.current = EXIT_GUIDANCE_DURATION_MS;
      exitGuidancePauseReasonsRef.current.clear();
      setExitGuidancePaused(false);
      setExitGuidanceVisible(false);
    }, EXIT_GUIDANCE_DURATION_MS);
  }, [shell.mode]);

  const resetEscape = () => {
    setEscapeArmed(false);
    if (escapeTimerRef.current !== null) window.clearTimeout(escapeTimerRef.current);
    escapeTimerRef.current = null;
  };

  const clearExitGuidanceTimer = () => {
    if (exitGuidanceTimerRef.current !== null) window.clearTimeout(exitGuidanceTimerRef.current);
    exitGuidanceTimerRef.current = null;
    exitGuidanceDeadlineRef.current = null;
  };

  const dismissExitGuidance = (restoreFocus = false) => {
    exitGuidancePendingRef.current = false;
    clearExitGuidanceTimer();
    exitGuidancePauseReasonsRef.current.clear();
    exitGuidanceRemainingRef.current = EXIT_GUIDANCE_DURATION_MS;
    setExitGuidancePaused(false);
    setExitGuidanceVisible(false);
    if (restoreFocus) focusCurrentThread();
  };

  const scheduleExitGuidanceDismissal = (duration: number) => {
    clearExitGuidanceTimer();
    exitGuidanceRemainingRef.current = duration;
    exitGuidanceDeadlineRef.current = Date.now() + duration;
    exitGuidanceTimerRef.current = window.setTimeout(() => {
      dismissExitGuidance();
    }, duration);
  };

  const pauseExitGuidance = (reason: 'focus' | 'pointer') => {
    if (exitGuidancePauseReasonsRef.current.has(reason)) return;
    exitGuidancePauseReasonsRef.current.add(reason);
    if (exitGuidancePauseReasonsRef.current.size > 1) return;
    if (exitGuidanceDeadlineRef.current !== null) {
      exitGuidanceRemainingRef.current = Math.max(0, exitGuidanceDeadlineRef.current - Date.now());
    }
    clearExitGuidanceTimer();
    setExitGuidancePaused(true);
  };

  const resumeExitGuidance = (reason: 'focus' | 'pointer') => {
    exitGuidancePauseReasonsRef.current.delete(reason);
    if (exitGuidancePauseReasonsRef.current.size > 0 || !exitGuidanceVisible) return;
    setExitGuidancePaused(false);
    scheduleExitGuidanceDismissal(exitGuidanceRemainingRef.current);
  };

  const requestExitWithGuidance = () => {
    resetEscape();
    const workBuddyWasVisible = Boolean(document.querySelector(`[aria-label="${TEACHBUDDY_BRAND.shortName} 私密协作窗口"]`));
    if (showWorkBuddyExitGuidance && workBuddyWasVisible && !exitGuidanceSuppressed) {
      clearExitGuidanceTimer();
      exitGuidancePendingRef.current = true;
      exitGuidancePauseReasonsRef.current.clear();
      exitGuidanceRemainingRef.current = EXIT_GUIDANCE_DURATION_MS;
      setExitGuidancePaused(false);
      setExitGuidanceVisible(false);
    } else {
      dismissExitGuidance();
    }
    requestExit();
  };

  const reopenWorkBuddy = () => {
    dismissExitGuidance();
    shell.enterImmersive();
  };

  const updateExitGuidancePreference = (suppressed: boolean) => {
    setExitGuidanceSuppressed(suppressed);
    writeWorkBuddyExitGuidanceSuppressed(suppressed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || event.nativeEvent.isComposing || !shell.immersive) return;
    if (isEditingTarget(event.target) || hasLocalEscapeSurface()) {
      resetEscape();
      return;
    }
    event.preventDefault();
    if (escapeArmed) {
      requestExitWithGuidance();
      return;
    }
    setEscapeArmed(true);
    exitButtonRef.current?.focus();
    if (escapeTimerRef.current !== null) window.clearTimeout(escapeTimerRef.current);
    escapeTimerRef.current = window.setTimeout(resetEscape, ESCAPE_CONFIRMATION_WINDOW_MS);
  };

  return (
    <div
      className={styles.frame}
      data-message-immersive={shellVisible ? 'true' : 'false'}
      data-message-shell-mode={shell.mode}
      onKeyDown={handleKeyDown}
    >
      {shellVisible ? (
        <header className={styles.toolbar} aria-label={`${title}沉浸工作区导航`}>
          <div className={styles.location}>
            <span className={styles.brandMark} aria-hidden="true"><img alt="" src="/brand/classin-wing-mark.png" /></span>
            <h1>{title}</h1>
          </div>
          <div className={styles.exitArea}>
            {escapeArmed ? (
              <span aria-live="polite" className={styles.escapeHint} role="status">
                再按一次 Esc {exitLabel}
              </span>
            ) : null}
            <button
              className={styles.exitButton}
              disabled={shell.mode === 'exiting'}
              onClick={() => {
                requestExitWithGuidance();
              }}
              ref={exitButtonRef}
              type="button"
            >
              <ExitIcon aria-hidden="true" size={15} />
              {exitLabel}
            </button>
          </div>
        </header>
      ) : null}
      <div className={styles.content} data-message-shell-content>{children}</div>
      {exitGuidanceVisible ? (
        <section
          aria-label={`${TEACHBUDDY_BRAND.shortName} 退出引导`}
          className={styles.exitGuidance}
          data-paused={exitGuidancePaused || undefined}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) resumeExitGuidance('focus');
          }}
          onFocusCapture={() => pauseExitGuidance('focus')}
          onPointerEnter={() => pauseExitGuidance('pointer')}
          onPointerLeave={() => resumeExitGuidance('pointer')}
          role="region"
        >
          <span className={styles.exitGuidanceIcon} aria-hidden="true"><Sparkles size={19} /></span>
          <div className={styles.exitGuidanceContent}>
            <span className={styles.exitGuidanceCopy} role="status" aria-live="polite">
              <strong>已退出沉浸模式</strong>
              <small>会话和任务进度已保留。</small>
            </span>
            <div className={styles.exitGuidanceActions}>
              <button type="button" onClick={reopenWorkBuddy}><Sparkles aria-hidden="true" size={14} />重新打开 {TEACHBUDDY_BRAND.shortName}</button>
              <label className={styles.exitGuidancePreference}>
                <input
                  checked={exitGuidanceSuppressed}
                  onChange={(event) => updateExitGuidancePreference(event.target.checked)}
                  type="checkbox"
                />
                <span>不再提示</span>
              </label>
            </div>
          </div>
          <button className={styles.exitGuidanceClose} type="button" aria-label="关闭退出引导" onClick={() => dismissExitGuidance(true)}>
            <X aria-hidden="true" size={15} />
          </button>
        </section>
      ) : null}
    </div>
  );
}
