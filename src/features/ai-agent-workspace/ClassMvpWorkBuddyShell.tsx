import { ArrowLeft, ClipboardList, LockKeyhole, Sparkles } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { WORKBUDDY_VISIBLE_CAPABILITIES } from './capability-registry';
import {
  workBuddyCapabilityPath,
  workBuddyNewTaskPath,
  type WorkBuddyExperienceProfile,
} from './workbuddy-experience-profile';
import styles from './ClassMvpWorkBuddyShell.module.css';

type ClassMvpWorkBuddyShellProps = Readonly<{
  children: ReactNode;
  profile: WorkBuddyExperienceProfile;
}>;

export function ClassMvpWorkBuddyShell({ children, profile }: ClassMvpWorkBuddyShellProps) {
  const location = useLocation();
  const pageRef = useRef<HTMLElement>(null);
  const visibleCapabilities = WORKBUDDY_VISIBLE_CAPABILITIES.filter(({ id }) => (
    profile.visibleCapabilityIds.includes(id)
  ));
  const resourceCapabilities = visibleCapabilities.filter(({ placement }) => placement === 'resource');
  const systemCapabilities = visibleCapabilities.filter(({ placement }) => placement === 'system');
  const taskWorkspaceActive = location.pathname === profile.basePath
    || location.pathname.startsWith(`${profile.basePath}/new`)
    || location.pathname.startsWith(`${profile.basePath}/runs/`);

  useEffect(() => {
    pageRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={styles.shell} data-testid="class-mvp-workbuddy-shell">
      <aside className={styles.sidebar} aria-label="WorkBuddy 页面导航">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true"><Sparkles size={18} /></span>
          <span className={styles.brandCopy}>
            <strong>WorkBuddy</strong>
            <span>教师工作空间</span>
          </span>
        </div>

        <nav className={styles.navigation} aria-label="WorkBuddy 导航">
          <section className={styles.navSection} aria-label="任务">
            <Link
              aria-current={taskWorkspaceActive ? 'page' : undefined}
              className={styles.navItem}
              to={workBuddyNewTaskPath(profile)}
            >
              <ClipboardList aria-hidden="true" size={17} />
              <span>我的任务</span>
            </Link>
          </section>

          <CapabilityLinks label="资源与能力" capabilities={resourceCapabilities} profile={profile} />
          <CapabilityLinks label="自动化与设置" capabilities={systemCapabilities} profile={profile} />
        </nav>

        <section className={styles.launchContext} aria-label="入口上下文">
          <span className={styles.contextLabel}><LockKeyhole aria-hidden="true" size={14} />仅你可见</span>
          {profile.launchContext ? (
            <span className={styles.contextCopy} title={profile.launchContext.className}>
              从 {profile.launchContext.className} 进入
            </span>
          ) : null}
          {profile.returnTarget ? (
            <Link className={styles.returnLink} to={profile.returnTarget.to}>
              <ArrowLeft aria-hidden="true" size={15} />
              <span>{profile.returnTarget.label}</span>
            </Link>
          ) : null}
        </section>
      </aside>

      <main
        ref={pageRef}
        className={styles.workspace}
        aria-label="WorkBuddy"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}

type VisibleCapability = (typeof WORKBUDDY_VISIBLE_CAPABILITIES)[number];

function CapabilityLinks({ capabilities, label, profile }: Readonly<{
  capabilities: readonly VisibleCapability[];
  label: string;
  profile: WorkBuddyExperienceProfile;
}>) {
  if (capabilities.length === 0) return null;
  return (
    <section className={styles.navSection} aria-label={label}>
      {capabilities.map(({ id, icon: Icon, label: capabilityLabel }) => (
        <NavLink className={styles.navItem} key={id} to={workBuddyCapabilityPath(profile, id)}>
          <Icon aria-hidden="true" size={17} />
          <span>{capabilityLabel}</span>
        </NavLink>
      ))}
    </section>
  );
}
