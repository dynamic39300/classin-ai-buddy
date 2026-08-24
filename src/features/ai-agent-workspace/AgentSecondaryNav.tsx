import { NavLink } from 'react-router-dom';
import { WORKBUDDY_VISIBLE_CAPABILITIES } from './capability-registry';
import { workBuddyCapabilityPath, type WorkBuddyExperienceProfile } from './workbuddy-experience-profile';
import styles from './AgentSecondaryNav.module.css';

export function AgentSecondaryNav({ profile }: Readonly<{ profile: WorkBuddyExperienceProfile }>) {
  const visibleCapabilities = WORKBUDDY_VISIBLE_CAPABILITIES.filter(({ id }) => profile.visibleCapabilityIds.includes(id));
  const resourceCapabilities = visibleCapabilities.filter(({ placement }) => placement === 'resource');
  const systemCapabilities = visibleCapabilities.filter(({ placement }) => placement === 'system');

  return (
    <div className={styles.panel} role="group" aria-label="Work Buddy 二级导航">
      <nav className={styles.links} aria-label="Work Buddy 能力目录">
        {resourceCapabilities.map(({ id, label, icon: Icon }) => (
          <NavLink key={id} to={workBuddyCapabilityPath(profile, id)}>
            <Icon aria-hidden="true" size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <nav className={`${styles.links} ${styles.systemLinks}`} aria-label="Work Buddy 自动化与设置">
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
