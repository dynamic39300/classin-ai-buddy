import { ClipboardList } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { TEACHERIN_BRAND } from '@contracts/workbuddy/product-brand';
import { getVisibleWorkBuddyCapability } from './capability-registry';
import {
  workBuddyCapabilityPath,
  workBuddyNewTaskPath,
  type WorkBuddyExperienceProfile,
} from './workbuddy-experience-profile';
import styles from './AgentSecondaryNav.module.css';

export function AgentSecondaryNav({ profile }: Readonly<{ profile: WorkBuddyExperienceProfile }>) {
  const location = useLocation();
  const visibleCapabilities = profile.navigationCapabilityIds
    .map(getVisibleWorkBuddyCapability)
    .filter((capability) => capability !== undefined);
  const resourceCapabilities = visibleCapabilities.filter(({ placement }) => placement === 'resource');
  const systemCapabilities = visibleCapabilities.filter(({ placement }) => placement === 'system');
  const taskWorkspaceActive = location.pathname === profile.basePath
    || location.pathname.startsWith(`${profile.basePath}/new`)
    || location.pathname.startsWith(`${profile.basePath}/runs/`);

  return (
    <div className={styles.panel} role="group" aria-label={`${TEACHERIN_BRAND.shortName} 二级导航`}>
      <nav className={styles.links} aria-label={`${TEACHERIN_BRAND.shortName} 能力目录`}>
        <Link aria-current={taskWorkspaceActive ? 'page' : undefined} to={workBuddyNewTaskPath(profile)}>
          <ClipboardList aria-hidden="true" size={16} />
          <span>我的任务</span>
        </Link>
        {resourceCapabilities.map(({ id, label, icon: Icon }) => (
          <NavLink key={id} to={workBuddyCapabilityPath(profile, id)}>
            <Icon aria-hidden="true" size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <nav className={`${styles.links} ${styles.systemLinks}`} aria-label={`${TEACHERIN_BRAND.shortName} 自动化与设置`}>
        {systemCapabilities.map(({ id, label, icon: Icon }) => (
          <NavLink key={id} to={workBuddyCapabilityPath(profile, id)}>
            <Icon aria-hidden="true" size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
