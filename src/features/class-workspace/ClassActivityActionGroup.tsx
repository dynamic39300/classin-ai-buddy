import { TeachingActionButton } from '@design-system/TeachingActionButton';
import type { ClassActivityAction } from '@domain/class/class';
import styles from './TeacherClassWorkspace.module.css';

export function ClassActivityActionGroup({
  activityTitle,
  actions,
  onAction,
}: {
  activityTitle: string;
  actions: ReadonlyArray<ClassActivityAction>;
  onAction: (action: ClassActivityAction) => void;
}) {
  return (
    <div className={styles.activityActions} role="group" aria-label={`${activityTitle}快捷操作`}>
      {actions.map((action) => (
        <TeachingActionButton
          action={action}
          type="button"
          aria-label={action.label}
          key={action.id}
          onClick={(event) => {
            event.stopPropagation();
            onAction(action);
          }}
        />
      ))}
    </div>
  );
}
