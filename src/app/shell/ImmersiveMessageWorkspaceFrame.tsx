import { ArrowLeft, Minimize2, Sparkles } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useMessageWorkspaceShell } from './MessageWorkspaceShellContext';
import styles from './ImmersiveMessageWorkspaceFrame.module.css';

type ImmersiveMessageWorkspaceFrameProps = {
  children: ReactNode;
  title?: string;
  modeLabel?: string;
  exitLabel?: string;
  exitHint?: string;
  exitIcon?: 'back' | 'minimize';
  onExit?: () => void;
};

const ESCAPE_CONFIRMATION_WINDOW_MS = 800;
const EXIT_GUIDANCE_DURATION_MS = 3_600;

function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches('input, textarea, select, [contenteditable="true"]');
}

function hasLocalEscapeSurface(): boolean {
  return Boolean(document.querySelector(
    'dialog[open], [role="dialog"], [role="menu"], [aria-label="WorkBuddy 私密协作窗口"][data-dismissible="true"]',
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
  modeLabel = '沉浸工作区',
  exitLabel = '退出沉浸模式',
  exitHint = '退出后仍停留在当前会话',
  exitIcon = 'minimize',
  onExit,
}: ImmersiveMessageWorkspaceFrameProps) {
  const shell = useMessageWorkspaceShell();
  const exitButtonRef = useRef<HTMLButtonElement>(null);
  const escapeTimerRef = useRef<number | null>(null);
  const exitGuidanceTimerRef = useRef<number | null>(null);
  const previousModeRef = useRef(shell.mode);
  const [escapeArmed, setEscapeArmed] = useState(false);
  const [exitGuidanceVisible, setExitGuidanceVisible] = useState(false);
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

  const resetEscape = () => {
    setEscapeArmed(false);
    if (escapeTimerRef.current !== null) window.clearTimeout(escapeTimerRef.current);
    escapeTimerRef.current = null;
  };

  const requestExitWithGuidance = () => {
    resetEscape();
    setExitGuidanceVisible(true);
    if (exitGuidanceTimerRef.current !== null) window.clearTimeout(exitGuidanceTimerRef.current);
    exitGuidanceTimerRef.current = window.setTimeout(() => {
      setExitGuidanceVisible(false);
      exitGuidanceTimerRef.current = null;
    }, EXIT_GUIDANCE_DURATION_MS);
    requestExit();
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
            <span className={styles.brandMark} aria-hidden="true">C</span>
            <h1>{title}</h1>
            <span className={styles.modeLabel}>{modeLabel}</span>
          </div>
          <div className={styles.exitArea}>
            <span
              aria-live={escapeArmed ? 'polite' : undefined}
              className={styles.escapeHint}
              role={escapeArmed ? 'status' : undefined}
            >
              {escapeArmed ? `再按一次 Esc ${exitLabel}` : exitHint}
            </span>
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
      <div className={styles.content}>{children}</div>
      {exitGuidanceVisible ? (
        <div className={styles.exitGuidance} role="status" aria-live="polite">
          <span className={styles.exitGuidanceIcon} aria-hidden="true"><Sparkles size={16} /></span>
          <span>
            <strong>已退出沉浸模式，WorkBuddy 已收起</strong>
            <small>再次打开 WorkBuddy 会重新进入沉浸工作区。</small>
          </span>
        </div>
      ) : null}
    </div>
  );
}
