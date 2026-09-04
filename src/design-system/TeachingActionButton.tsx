import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { TeachingQuickAction } from '@domain/teaching-action/teaching-action';
import styles from './TeachingActionButton.module.css';

type TeachingActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  action: Pick<TeachingQuickAction, 'label' | 'priority'>;
};

export const TeachingActionButton = forwardRef<HTMLButtonElement, TeachingActionButtonProps>(
  function TeachingActionButton({ action, className, ...props }, ref) {
    const classes = className ? `${styles.button} ${className}` : styles.button;
    return (
      <button {...props} className={classes} data-priority={action.priority} ref={ref}>
        {action.label}
      </button>
    );
  },
);
