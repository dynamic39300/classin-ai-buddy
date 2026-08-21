import { Outlet } from 'react-router-dom';
import { WorkBuddyTaskBar } from './WorkBuddyTaskBar';
import styles from './AiAgentWorkspaceLayout.module.css';

export function AiAgentWorkspaceLayout() {
  return (
    <div className={styles.layout} data-testid="ai-agent-workspace-layout">
      <WorkBuddyTaskBar />
      <section className={styles.surface} aria-label="教师 WorkBuddy 工作区">
        <Outlet />
      </section>
    </div>
  );
}
