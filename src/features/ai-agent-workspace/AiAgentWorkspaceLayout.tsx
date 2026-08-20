import { Outlet } from 'react-router-dom';
import { AgentSecondaryNav } from './AgentSecondaryNav';
import styles from './AiAgentWorkspaceLayout.module.css';

export function AiAgentWorkspaceLayout() {
  return (
    <div className={styles.layout} data-testid="ai-agent-workspace-layout">
      <AgentSecondaryNav />
      <div className={styles.surface}>
        <Outlet />
      </div>
    </div>
  );
}
