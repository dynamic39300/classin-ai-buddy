import { Outlet } from 'react-router-dom';
import styles from './AiAgentWorkspaceLayout.module.css';

export function AiAgentWorkspaceLayout() {
  return (
    <div className={styles.layout} data-testid="ai-agent-workspace-layout">
      <section className={styles.surface} aria-label="AI Agent 工作区">
        <Outlet />
      </section>
    </div>
  );
}
