import { ChevronDown, ChevronRight } from 'lucide-react';
import { useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { AppRole } from '@domain/account/role';
import { ROLE_LABELS } from '@domain/account/role';
import { countUnreadMessages } from '@domain/message/message';
import { useMessageThreads } from '@features/message-workspace';
import { AccountMenu, RoleSwitcher } from '@features/role-switch';
import { getNavigation, isNavigationGroupActive, type NavigationGroup, type NavigationNode } from './navigation';
import teacherAvatar from '../../assets/avatars/teacher-wang.jpg';
import styles from './Sidebar.module.css';

type SidebarProps = {
  role: AppRole;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
};

const GROUP_LABELS: Record<NavigationGroup, string> = {
  business: '工作区',
  global: '沟通',
  'instant-tool': '即时工具',
};

export function Sidebar({ role, onOpenSettings, onOpenHelp }: SidebarProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [classManagementManualOpen, setClassManagementManualOpen] = useState(false);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const threads = useMessageThreads();
  const messageUnreadCount = countUnreadMessages(role, threads);
  const navigation = getNavigation(role).map((node) => (
    node.kind === 'item' && node.group === 'global'
      ? { ...node, badge: messageUnreadCount > 0 ? (messageUnreadCount > 99 ? '99+' : String(messageUnreadCount)) : undefined }
      : node
  ));
  const collapsibleGroups = navigation.filter((node): node is Extract<NavigationNode, { kind: 'collapsible' }> => node.kind === 'collapsible');
  const activeCollapsibleGroup = collapsibleGroups.find((node) => isNavigationGroupActive(role, node.id, location.pathname));
  const classManagementGroup = collapsibleGroups.find(({ id }) => id.endsWith('class-management'));
  const classManagementRouteActive = activeCollapsibleGroup?.id === classManagementGroup?.id;
  const classManagementOpen = classManagementRouteActive || classManagementManualOpen;
  const groups = (['business', 'global', 'instant-tool'] as const).filter((group) =>
    navigation.some((item) => item.group === group),
  );

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">C</span>
        <span className={styles.wordmark}>ClassIn</span>
      </div>

      <div className={styles.identityArea}>
        {accountOpen ? (
          <button
            className={styles.scrim}
            type="button"
            aria-label="关闭账户菜单"
            onClick={() => setAccountOpen(false)}
          />
        ) : null}
        <button
          className={styles.accountButton}
          type="button"
          aria-haspopup="menu"
          aria-expanded={accountOpen}
          aria-label="王老师，ClassIn 教研中心"
          onClick={() => setAccountOpen((current) => !current)}
          ref={accountButtonRef}
          title="账户菜单"
        >
          <img className={styles.avatar} src={teacherAvatar} alt="" />
          <span className={styles.accountCopy}>
            <span className={styles.accountPrimary}>
              <strong>王老师</strong>
            </span>
            <span className={styles.organizationLabel}>ClassIn 教研中心</span>
          </span>
          <ChevronDown
            className={`${styles.accountChevron} ${accountOpen ? styles.accountChevronExpanded : ''}`}
            aria-hidden="true"
            size={16}
          />
        </button>
        <RoleSwitcher role={role} />
        <AccountMenu
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          triggerRef={accountButtonRef}
          onOpenSettings={() => {
            setAccountOpen(false);
            accountButtonRef.current?.focus();
            onOpenSettings();
          }}
          onOpenHelp={() => {
            setAccountOpen(false);
            accountButtonRef.current?.focus();
            onOpenHelp();
          }}
        />
      </div>

      <nav className={styles.navigation} aria-label={`${ROLE_LABELS[role]}主导航`}>
        {groups.map((group) => (
          <section className={styles.navGroup} key={group} aria-label={GROUP_LABELS[group]}>
            {navigation.filter((node) => node.group === group).map((node) => (
              <NavigationNodeView
                key={node.id}
                node={node}
                open={node.kind === 'collapsible' && node.id === classManagementGroup?.id ? classManagementOpen : false}
                disableCollapse={node.kind === 'collapsible' && node.id === classManagementGroup?.id && classManagementRouteActive}
                onNavigate={() => {
                  if (classManagementRouteActive) setClassManagementManualOpen(true);
                }}
                onToggle={() => setClassManagementManualOpen((current) => !current)}
              />
            ))}
          </section>
        ))}
      </nav>

    </aside>
  );
}

type NavigationNodeViewProps = {
  node: NavigationNode;
  open: boolean;
  disableCollapse: boolean;
  onNavigate: () => void;
  onToggle: () => void;
};

function NavigationNodeView({ node, open, disableCollapse, onNavigate, onToggle }: NavigationNodeViewProps) {
  if (node.kind === 'item') {
    const Icon = node.icon;
    return (
      <NavLink className={styles.navItem} to={node.to} title={node.label} aria-label={node.label} data-label={node.label} onClick={onNavigate}>
        <Icon aria-hidden="true" size={18} />
        <span className={styles.navLabel}>{node.label}</span>
        {node.badge ? <span className={styles.badge} aria-label={`${node.badge}条待处理`}>{node.badge}</span> : null}
      </NavLink>
    );
  }

  const Icon = node.icon;

  return (
    <div className={styles.collapsibleNode}>
      <button
        className={styles.navItem}
        type="button"
        aria-expanded={open}
        aria-controls={`${node.id}-children`}
        title={node.label}
        aria-label={node.label}
        data-label={node.label}
        disabled={disableCollapse}
        onClick={onToggle}
      >
        <Icon aria-hidden="true" size={18} />
        <span className={styles.navLabel}>{node.label}</span>
        <ChevronRight
          className={`${styles.chevron} ${open ? styles.chevronExpanded : ''}`}
          aria-hidden="true"
          size={16}
        />
      </button>
      {open ? (
        <div className={styles.childNavigation} id={`${node.id}-children`}>
          {node.children.map((child) => {
            const ChildIcon = child.icon;
            return (
              <NavLink className={`${styles.navItem} ${styles.childNavItem}`} key={child.id} to={child.to} title={child.label} aria-label={child.label} data-label={child.label}>
                <ChildIcon aria-hidden="true" size={16} />
                <span className={styles.navLabel}>{child.label}</span>
              </NavLink>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
