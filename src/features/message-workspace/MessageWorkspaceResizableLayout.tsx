import {
  useCallback,
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  clampWorkBuddyWidth,
  getDefaultWorkBuddyWidth,
  getWorkBuddyWidthLimits,
  readWorkBuddyWidthPreference,
  writeWorkBuddyWidthPreference,
  type MessageWorkspaceLayoutScope,
} from './message-workspace-layout';
import styles from './MessageWorkspaceResizableLayout.module.css';

type MessageWorkspaceResizableLayoutProps = {
  assistant: ReactNode | null;
  children: ReactNode;
  scope: MessageWorkspaceLayoutScope;
  wideNavigation?: boolean;
};

type DragSession = {
  pointerId: number;
  startClientX: number;
  startWidth: number;
};

type LayoutStyle = CSSProperties & {
  '--workbuddy-layout-width': string;
};

function getDefaultWidth(containerWidth: number): number {
  const viewportWidth = typeof window === 'undefined' ? containerWidth : window.innerWidth;
  return getDefaultWorkBuddyWidth(viewportWidth);
}

export function MessageWorkspaceResizableLayout({
  assistant,
  children,
  scope,
  wideNavigation = false,
}: MessageWorkspaceResizableLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const separatorRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const [initialPreference] = useState(() => readWorkBuddyWidthPreference(scope));
  const preferredWidthRef = useRef(initialPreference);
  const [committedWidth, setCommittedWidth] = useState(initialPreference ?? 520);
  const [limits, setLimits] = useState(() => getWorkBuddyWidthLimits(1440, scope));
  const [dragging, setDragging] = useState(false);

  const applyWidth = useCallback((nextWidth: number) => {
    const container = containerRef.current;
    const separator = separatorRef.current;
    if (!container) return;
    container.style.setProperty('--workbuddy-layout-width', `${nextWidth}px`);
    if (separator) {
      separator.setAttribute('aria-valuenow', String(Math.round(nextWidth)));
      separator.setAttribute('aria-valuetext', `WorkBuddy 宽度 ${Math.round(nextWidth)} 像素`);
    }
  }, []);

  const commitWidth = useCallback((nextWidth: number) => {
    const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 1440;
    const nextLimits = getWorkBuddyWidthLimits(containerWidth, scope);
    const clampedWidth = clampWorkBuddyWidth(nextWidth, nextLimits);
    preferredWidthRef.current = clampedWidth;
    setCommittedWidth(clampedWidth);
    setLimits(nextLimits);
    applyWidth(clampedWidth);
    writeWorkBuddyWidthPreference(scope, clampedWidth);
  }, [applyWidth, scope]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateForContainer = () => {
      const containerWidth = container.getBoundingClientRect().width;
      const nextLimits = getWorkBuddyWidthLimits(containerWidth, scope);
      const preferredWidth = preferredWidthRef.current ?? getDefaultWidth(containerWidth);
      const visibleWidth = clampWorkBuddyWidth(preferredWidth, nextLimits);
      setLimits(nextLimits);
      setCommittedWidth(visibleWidth);
      applyWidth(visibleWidth);
    };

    updateForContainer();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateForContainer);
    observer.observe(container);
    return () => observer.disconnect();
  }, [applyWidth, scope]);

  useLayoutEffect(() => {
    preferredWidthRef.current = readWorkBuddyWidthPreference(scope);
    const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 1440;
    const nextWidth = preferredWidthRef.current ?? getDefaultWidth(containerWidth);
    const nextLimits = getWorkBuddyWidthLimits(containerWidth, scope);
    const visibleWidth = clampWorkBuddyWidth(nextWidth, nextLimits);
    setLimits(nextLimits);
    setCommittedWidth(visibleWidth);
    applyWidth(visibleWidth);
  }, [applyWidth, scope]);

  useLayoutEffect(() => () => {
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  }, []);

  const finishDrag = useCallback((pointerId: number) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== pointerId) return;
    dragSessionRef.current = null;
    setDragging(false);
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
    const value = Number.parseFloat(containerRef.current?.style.getPropertyValue('--workbuddy-layout-width') ?? '');
    commitWidth(Number.isFinite(value) ? value : committedWidth);
  }, [commitWidth, committedWidth]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragSessionRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startWidth: Number.parseFloat(containerRef.current?.style.getPropertyValue('--workbuddy-layout-width') ?? '') || committedWidth,
    };
    setDragging(true);
    document.body.style.setProperty('cursor', 'col-resize');
    document.body.style.setProperty('user-select', 'none');
  };

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      event.preventDefault();
      const nextWidth = session.startWidth + session.startClientX - event.clientX;
      applyWidth(clampWorkBuddyWidth(nextWidth, limits));
    };

    const handlePointerEnd = (event: globalThis.PointerEvent) => {
      finishDrag(event.pointerId);
    };

    document.addEventListener('pointermove', handlePointerMove, { capture: true });
    document.addEventListener('pointerup', handlePointerEnd, { capture: true });
    document.addEventListener('pointercancel', handlePointerEnd, { capture: true });
    return () => {
      document.removeEventListener('pointermove', handlePointerMove, { capture: true });
      document.removeEventListener('pointerup', handlePointerEnd, { capture: true });
      document.removeEventListener('pointercancel', handlePointerEnd, { capture: true });
    };
  }, [applyWidth, dragging, finishDrag, limits]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 32 : 8;
    let nextWidth: number | null = null;
    if (event.key === 'ArrowLeft') nextWidth = committedWidth + step;
    if (event.key === 'ArrowRight') nextWidth = committedWidth - step;
    if (event.key === 'Home') nextWidth = limits.min;
    if (event.key === 'End') nextWidth = limits.max;
    if (nextWidth === null) return;
    event.preventDefault();
    commitWidth(nextWidth);
  };

  const resetWidth = () => {
    const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 1440;
    commitWidth(getDefaultWidth(containerWidth));
  };

  const style: LayoutStyle = { '--workbuddy-layout-width': `${committedWidth}px` };

  return (
    <div
      className={styles.layout}
      data-assistant-open={assistant ? 'true' : 'false'}
      data-dragging={dragging ? 'true' : 'false'}
      data-layout-scope={scope}
      data-wide-navigation={wideNavigation ? 'true' : 'false'}
      ref={containerRef}
      style={style}
    >
      <section className={styles.communicationSurface} aria-label="消息通信主工作台">
        {children}
      </section>
      {assistant ? (
        <>
          <div
            aria-controls="workbuddy-im-sidecar"
            aria-label="调整 WorkBuddy 宽度"
            aria-orientation="vertical"
            aria-valuemax={Math.round(limits.max)}
            aria-valuemin={Math.round(limits.min)}
            aria-valuenow={Math.round(committedWidth)}
            aria-valuetext={`WorkBuddy 宽度 ${Math.round(committedWidth)} 像素`}
            className={styles.separator}
            onDoubleClick={resetWidth}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            ref={separatorRef}
            role="separator"
            tabIndex={0}
            title="拖动调整宽度，双击恢复默认"
          />
          <div className={styles.assistantTray} data-layout-region="workbuddy-assistant">
            {assistant}
          </div>
        </>
      ) : null}
    </div>
  );
}
