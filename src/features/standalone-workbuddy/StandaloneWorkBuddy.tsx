import { ClipboardList, Coins, LockKeyhole, LogOut, Sparkles, UserRound, WalletCards } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { STANDALONE_TEACHERIN_ROUTES, TEACHERIN_BRAND } from '@contracts/workbuddy/product-brand';
import {
  AiAgentWorkSurface,
  AiAgentWorkspaceLayout,
  WorkBuddyTaskAdmissionProvider,
  createStandaloneTeacherWorkBuddyExperience,
  workBuddyCapabilityPath,
  workBuddyNewTaskPath,
  type WorkBuddyExperienceProfile,
  WORKBUDDY_CAPABILITIES,
} from '@features/ai-agent-workspace';
import { StandaloneCreditsPage, StandaloneMembershipPage } from './StandaloneCommercePages';
import { StandaloneClassInPage } from './StandaloneClassInPage';
import { StandaloneAuthPage, StandaloneLandingPage } from './StandalonePublicPages';
import { useStandaloneTeacher } from './standalone-teacher-context';
import styles from './StandaloneWorkBuddy.module.css';

export function StandaloneWorkBuddyRoutes() {
  const { identity } = useStandaloneTeacher();
  const profile = useMemo(
    () => createStandaloneTeacherWorkBuddyExperience(identity.status === 'signed_in' ? identity.teacher.id : undefined),
    [identity],
  );
  return (
    <Routes>
      <Route path={STANDALONE_TEACHERIN_ROUTES.root} element={<StandaloneLandingPage />} />
      <Route path={STANDALONE_TEACHERIN_ROUTES.login} element={<StandaloneAuthPage mode="login" />} />
      <Route path={STANDALONE_TEACHERIN_ROUTES.register} element={<StandaloneAuthPage mode="register" />} />
      <Route path={STANDALONE_TEACHERIN_ROUTES.app} element={<StandaloneProtectedShell profile={profile} />}>
        <Route index element={<Navigate to="new" replace />} />
        <Route path="credits" element={<StandaloneCreditsPage />} />
        <Route path="membership" element={<StandaloneMembershipPage />} />
        <Route path="classin" element={<StandaloneClassInPage />} />
        <Route element={<AiAgentWorkspaceLayout profile={profile} showTaskBarReturn={false} />}>
          <Route path="new" element={<AiAgentWorkSurface />} />
          <Route path="runs/:runId" element={<AiAgentWorkSurface />} />
          <Route path=":section" element={<AiAgentWorkSurface />} />
        </Route>
      </Route>
      <Route path={STANDALONE_TEACHERIN_ROUTES.legacyRoot} element={<LegacyStandalonePathRedirect />} />
      <Route path={`${STANDALONE_TEACHERIN_ROUTES.legacyRoot}/*`} element={<LegacyStandalonePathRedirect />} />
      <Route path={`${STANDALONE_TEACHERIN_ROUTES.root}/*`} element={<Navigate to={STANDALONE_TEACHERIN_ROUTES.root} replace />} />
    </Routes>
  );
}

function StandaloneProtectedShell({ profile }: Readonly<{ profile: WorkBuddyExperienceProfile }>) {
  const { identity, taskAdmission } = useStandaloneTeacher();
  const location = useLocation();
  if (identity.status !== 'signed_in') return <Navigate to={`${STANDALONE_TEACHERIN_ROUTES.login}?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <WorkBuddyTaskAdmissionProvider admission={taskAdmission}><StandaloneWorkBuddyShell profile={profile}><Outlet /></StandaloneWorkBuddyShell></WorkBuddyTaskAdmissionProvider>;
}

function StandaloneWorkBuddyShell({ profile, children }: Readonly<{ profile: WorkBuddyExperienceProfile; children: ReactNode }>) {
  const { identity, creditView, logout } = useStandaloneTeacher();
  const navigate = useNavigate();
  const location = useLocation();
  if (identity.status !== 'signed_in') return null;
  const taskActive = location.pathname === profile.basePath || location.pathname.startsWith(`${profile.basePath}/new`) || location.pathname.startsWith(`${profile.basePath}/runs/`);
  return (
    <div className={styles.appShell} data-testid="standalone-workbuddy-shell">
      <aside className={styles.appSidebar} aria-label={`${TEACHERIN_BRAND.officialName} 独立产品导航`}>
        <Link className={styles.appBrand} to={STANDALONE_TEACHERIN_ROUTES.newTask}><span><Sparkles size={18} /></span><div><strong>{TEACHERIN_BRAND.officialName}</strong><small>{TEACHERIN_BRAND.descriptor}</small></div></Link>
        <nav aria-label={`${TEACHERIN_BRAND.shortName} 导航`}>
          <Link aria-current={taskActive ? 'page' : undefined} to={workBuddyNewTaskPath(profile)}><ClipboardList size={17} /><span>我的任务</span></Link>
          {WORKBUDDY_CAPABILITIES.filter(({ id }) => profile.navigationCapabilityIds.includes(id)).map(({ id, icon: Icon, label }) => <NavLink key={id} to={workBuddyCapabilityPath(profile, id)}><Icon size={17} /><span>{label}</span></NavLink>)}
          <NavLink to={STANDALONE_TEACHERIN_ROUTES.credits}><Coins size={17} /><span>AI 点数</span><em>{creditView?.availableBalance ?? 0}</em></NavLink>
          <NavLink to={STANDALONE_TEACHERIN_ROUTES.membership}><WalletCards size={17} /><span>会员方案</span></NavLink>
        </nav>
        <section className={styles.sidebarAccount}>
          <div><span><UserRound size={15} /></span><p><strong>{identity.teacher.name}</strong><small>{identity.teacher.email}</small></p></div>
          <button type="button" onClick={() => { logout(); navigate(STANDALONE_TEACHERIN_ROUTES.root); }}><LogOut size={15} />退出登录</button>
        </section>
      </aside>
      <main className={styles.appWorkspace} aria-label={TEACHERIN_BRAND.shortName}>
        <section className={styles.connectionBanner} aria-label="ClassIn 连接状态"><span><LockKeyhole size={14} />未连接 ClassIn</span><p>当前仅使用你的任务描述和上传资料；连接后可自动带入班级、课程、作业与学情。</p><Link to={STANDALONE_TEACHERIN_ROUTES.classIn}>了解连接价值</Link></section>
        <div className={styles.appSurface}>{children}</div>
      </main>
    </div>
  );
}

function LegacyStandalonePathRedirect() {
  const { pathname, search, hash } = useLocation();
  const suffix = pathname.slice(STANDALONE_TEACHERIN_ROUTES.legacyRoot.length);
  return <Navigate to={`${STANDALONE_TEACHERIN_ROUTES.root}${suffix}${search}${hash}`} replace />;
}
