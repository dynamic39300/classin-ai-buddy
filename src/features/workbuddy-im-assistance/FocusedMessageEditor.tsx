import { Maximize2, Minimize2 } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import styles from './FocusedMessageEditor.module.css';

export function FocusedMessageEditor({
  id,
  label,
  value,
  onChange,
  onBlur,
  onFocus,
  onComplete,
  invalid = false,
  rows = 4,
  status,
  description,
  error,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  onComplete?: () => void;
  invalid?: boolean;
  rows?: number;
  status?: ReactNode;
  description?: string;
  error?: string;
}>) {
  const [expanded, setExpanded] = useState(false);
  const editorRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const textareaDescription = [description ? `${id}-description` : '', error ? `${id}-error` : '']
    .filter(Boolean)
    .join(' ') || undefined;

  useEffect(() => {
    if (!expanded) return;
    const frame = window.requestAnimationFrame(() => {
      const selectionEnd = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(selectionEnd, selectionEnd);
      if (typeof editorRef.current?.scrollIntoView === 'function') {
        editorRef.current.scrollIntoView({ block: 'start', behavior: 'auto' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [expanded]);

  const toggleExpanded = () => {
    if (expanded) {
      setExpanded(false);
      onComplete?.();
      window.requestAnimationFrame(() => triggerRef.current?.focus());
      return;
    }
    setExpanded(true);
  };

  return (
    <section
      className={styles.editor}
      data-expanded={expanded ? 'true' : 'false'}
      data-focused-message-editor="true"
      ref={editorRef}
    >
      <div className={styles.heading}>
        <label htmlFor={id}>{label}</label>
        <div className={styles.headingTools}>
          {status}
          <button
            aria-controls={`${id}-editor-surface`}
            aria-expanded={expanded}
            aria-label={expanded ? `收起${label}` : `展开编辑${label}`}
            className={styles.trigger}
            ref={triggerRef}
            type="button"
            onClick={toggleExpanded}
          >
            {expanded ? <Minimize2 aria-hidden="true" size={13} /> : <Maximize2 aria-hidden="true" size={13} />}
            <span>{expanded ? '收起编辑' : '展开编辑'}</span>
          </button>
        </div>
      </div>
      {description ? <p className={styles.description} id={`${id}-description`}>{description}</p> : null}
      <div className={styles.surface} id={`${id}-editor-surface`}>
        <textarea
          aria-describedby={textareaDescription}
          aria-invalid={invalid}
          id={id}
          ref={textareaRef}
          rows={rows}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
        />
        {error || expanded ? (
          <div className={styles.footer}>
            {error ? <strong id={`${id}-error`}>{error}</strong> : <span />}
            {expanded ? <small aria-live="polite">{value.length.toLocaleString('zh-CN')} 字</small> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
