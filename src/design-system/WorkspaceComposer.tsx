import { ArrowUp } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import styles from './WorkspaceComposer.module.css';

export type WorkspaceComposerProps = Readonly<{
  ariaLabel: string;
  value: string;
  placeholder: string;
  submitLabel: string;
  onValueChange: (value: string, caret: number) => void;
  onSubmit: () => void;
  mode?: 'conversation' | 'task';
  className?: string;
  groupLabel?: string;
  tools?: ReactNode;
  target?: ReactNode;
  materials?: ReactNode;
  hint?: ReactNode;
  secondaryActions?: ReactNode;
  disabled?: boolean;
  canSubmit?: boolean;
  maxLength?: number;
  countThreshold?: number;
  onTextareaKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}>;

function resizeComposer(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto';
  const maxHeight = Number.parseFloat(getComputedStyle(textarea).maxHeight);
  const nextHeight = Number.isFinite(maxHeight)
    ? Math.min(textarea.scrollHeight, maxHeight)
    : textarea.scrollHeight;
  const isOverflowing = Number.isFinite(maxHeight) && textarea.scrollHeight > maxHeight;
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = isOverflowing ? 'auto' : 'hidden';
  textarea.dataset.overflowing = String(isOverflowing);
}

export function WorkspaceComposer({
  ariaLabel,
  value,
  placeholder,
  submitLabel,
  onValueChange,
  onSubmit,
  mode = 'conversation',
  className,
  groupLabel,
  tools,
  target,
  materials,
  hint,
  secondaryActions,
  disabled = false,
  canSubmit = true,
  maxLength,
  countThreshold,
  onTextareaKeyDown,
}: WorkspaceComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const generatedId = useId();
  const helpId = `${generatedId}-help`;
  const countId = `${generatedId}-count`;
  const showCount = maxLength !== undefined
    && value.length >= (countThreshold ?? Math.max(0, maxLength - 800));
  const describedBy = [hint ? helpId : null, showCount ? countId : null].filter(Boolean).join(' ') || undefined;
  const submitDisabled = disabled || !canSubmit || !value.trim();

  useLayoutEffect(() => {
    if (textareaRef.current) resizeComposer(textareaRef.current);
  }, [value, mode]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || typeof ResizeObserver === 'undefined') return;
    let observedWidth = textarea.clientWidth;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width === observedWidth) return;
      observedWidth = entry.contentRect.width;
      resizeComposer(textarea);
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitDisabled) return;
    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onTextareaKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <form
      aria-label={groupLabel}
      className={[styles.composer, styles[mode], className].filter(Boolean).join(' ')}
      data-composer-mode={mode}
      data-workspace-composer="true"
      onSubmit={submit}
    >
      {target ? <div className={styles.targetSlot}>{target}</div> : null}
      {materials ? <div className={styles.materialSlot}>{materials}</div> : null}
      <textarea
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(event) => onValueChange(event.target.value, event.target.selectionStart)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={textareaRef}
        rows={1}
        value={value}
      />
      <div className={styles.footer}>
        {tools ? <div className={styles.tools}>{tools}</div> : null}
        {hint ? <span className={styles.hint} id={helpId}>{hint}</span> : null}
        <div className={styles.actions}>
          {secondaryActions ? <div className={styles.secondaryActions}>{secondaryActions}</div> : null}
          {showCount ? (
            <output className={styles.count} id={countId}>
              {value.length >= maxLength
                ? `已达 ${maxLength.toLocaleString('zh-CN')} 字上限`
                : `${value.length.toLocaleString('zh-CN')} / ${maxLength.toLocaleString('zh-CN')}`}
            </output>
          ) : null}
          <button className={styles.submit} aria-label={submitLabel} disabled={submitDisabled} type="submit">
            <ArrowUp aria-hidden="true" size={16} />
          </button>
        </div>
      </div>
    </form>
  );
}
