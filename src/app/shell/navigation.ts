import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  ChartNoAxesCombined,
  CircleCheckBig,
  GraduationCap,
  Home,
  LibraryBig,
  MessageSquareText,
  MonitorUp,
  PenTool,
  Radio,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { AppRole } from '@domain/account/role';
import { getActionableTaskBadgeCount } from '@domain/task/task';
import { TASK_ITEMS, TASK_NOW } from '@mocks/scenarios/tasks';

export type NavigationGroup = 'business' | 'global' | 'instant-tool';

export type NavigationItem = {
  kind: 'item';
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  group: NavigationGroup;
  badge?: string;
};

export type NavigationNode =
  | NavigationItem
  | {
    kind: 'collapsible';
    id: string;
    label: string;
    icon: LucideIcon;
    group: NavigationGroup;
    children: readonly NavigationItem[];
  };

const item = (navigationItem: Omit<NavigationItem, 'kind'>): NavigationItem => ({ kind: 'item', ...navigationItem });

function taskBadge(role: AppRole): string | undefined {
  const count = getActionableTaskBadgeCount(role, TASK_ITEMS, TASK_NOW);
  if (count === 0) return undefined;
  return count > 99 ? '99+' : String(count);
}

const TEACHER_NAVIGATION: readonly NavigationNode[] = [
  item({ id: 'teacher-home', label: '首页', to: '/teacher/home', icon: Home, group: 'business' }),
  item({ id: 'teacher-ai-agent', label: '教师 WorkBuddy', to: '/teacher/ai-agent', icon: Sparkles, group: 'business' }),
  {
    kind: 'collapsible',
    id: 'teacher-class-management',
    label: '班课管理',
    icon: BookOpenCheck,
    group: 'business',
    children: [
      item({ id: 'teacher-classes', label: '我的班级', to: '/teacher/classes', icon: UsersRound, group: 'business' }),
      item({ id: 'teacher-open-courses', label: '公开课', to: '/teacher/open-courses', icon: Radio, group: 'business' }),
    ],
  },
  item({ id: 'teacher-schedule', label: '课程表', to: '/teacher/schedule', icon: CalendarDays, group: 'business' }),
  item({ id: 'teacher-tasks', label: '待办', to: '/teacher/tasks', icon: CircleCheckBig, group: 'business', badge: taskBadge('teacher') }),
  item({ id: 'teacher-insights', label: '教学洞察', to: '/teacher/insights', icon: BarChart3, group: 'business' }),
  item({ id: 'teacher-space', label: '空间', to: '/teacher/space', icon: LibraryBig, group: 'business' }),
  item({ id: 'teacher-messages', label: '消息', to: '/teacher/messages', icon: MessageSquareText, group: 'global' }),
  item({ id: 'teacher-blackboard', label: '黑板', to: '/teacher/blackboard', icon: PenTool, group: 'instant-tool' }),
  item({ id: 'teacher-casting', label: '投屏', to: '/teacher/casting', icon: MonitorUp, group: 'instant-tool' }),
];

const STUDENT_NAVIGATION: readonly NavigationNode[] = [
  item({ id: 'student-home', label: '首页', to: '/student/home', icon: Home, group: 'business' }),
  {
    kind: 'collapsible',
    id: 'student-class-management',
    label: '班课管理',
    icon: BookOpenCheck,
    group: 'business',
    children: [
      item({ id: 'student-classes', label: '我的班级', to: '/student/classes', icon: UsersRound, group: 'business' }),
      item({ id: 'student-open-courses', label: '公开课', to: '/student/open-courses', icon: Radio, group: 'business' }),
    ],
  },
  item({ id: 'student-schedule', label: '课程表', to: '/student/schedule', icon: CalendarDays, group: 'business' }),
  item({ id: 'student-todos', label: '待办', to: '/student/todos', icon: CircleCheckBig, group: 'business', badge: taskBadge('student-family') }),
  item({ id: 'student-growth', label: '成长', to: '/student/growth', icon: ChartNoAxesCombined, group: 'business' }),
  item({ id: 'student-messages', label: '消息', to: '/student/messages', icon: MessageSquareText, group: 'global' }),
  item({ id: 'student-blackboard', label: '黑板', to: '/student/blackboard', icon: PenTool, group: 'instant-tool' }),
  item({ id: 'student-casting', label: '投屏', to: '/student/casting', icon: MonitorUp, group: 'instant-tool' }),
];

export function getNavigation(role: AppRole): readonly NavigationNode[] {
  return role === 'teacher' ? TEACHER_NAVIGATION : STUDENT_NAVIGATION;
}

function getItems(navigation: readonly NavigationNode[]): readonly NavigationItem[] {
  return navigation.flatMap((node) => node.kind === 'item' ? [node] : node.children);
}

function routeMatches(pathname: string, target: string): boolean {
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function findActiveNavigationItem(role: AppRole, pathname: string): NavigationItem | undefined {
  return getItems(getNavigation(role))
    .filter(({ to }) => routeMatches(pathname, to))
    .sort((left, right) => right.to.length - left.to.length)[0];
}

export function isNavigationGroupActive(role: AppRole, groupId: string, pathname: string): boolean {
  const group = getNavigation(role).find((node) => node.kind === 'collapsible' && node.id === groupId);
  return group?.kind === 'collapsible' && group.children.some(({ to }) => routeMatches(pathname, to));
}

export function getPageTitle(role: AppRole, pathname: string): string {
  if (role === 'teacher' && pathname.endsWith('/home')) return '首页';
  if (pathname.includes('/settings')) return '账号与设置';
  if (pathname.includes('/homework')) return '作业';
  if (pathname.endsWith('/join')) return '加入班课';
  if (pathname.endsWith('/chat') && pathname.includes('/classes/')) return '班级群聊';
  if (/\/(tasks|todos)\/[^/]+$/.test(pathname)) return role === 'teacher' ? '任务详情' : '待办详情';
  if (pathname.includes('/classes/') && pathname.endsWith('/resources')) return '关联资源';
  if (pathname.includes('/open-courses')) return '公开课';
  if (pathname.includes('/classes')) return '我的班级';
  return findActiveNavigationItem(role, pathname)?.label ?? (role === 'teacher' ? '老师工作台' : '学习工作台');
}

export const ROLE_HOME_ICON: Record<AppRole, LucideIcon> = {
  teacher: GraduationCap,
  'student-family': BookOpenCheck,
};
