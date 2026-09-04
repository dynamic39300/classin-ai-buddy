import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { RootRouter } from '@app/router/RootRouter';
import { OperationGuardProvider } from '@app/shell/operation-guard';
import { ClassWorkspaceProvider } from '@features/class-workspace/ClassWorkspaceProvider';
import { HomeworkWorkspaceProvider } from '@features/homework-workspace';
import { MessageWorkspaceProvider } from '@features/message-workspace';
import { ROLE_STORAGE_KEY, RoleSessionProvider } from '@features/role-switch';

function LocationProbe() {
  const location = useLocation();
  return <output hidden data-testid="route-location">{location.pathname}{location.search}</output>;
}

function renderApp(role: 'teacher' | 'student-family', initialPath: string) {
  window.sessionStorage.setItem(ROLE_STORAGE_KEY, role);
  return render(
    <RoleSessionProvider>
      <OperationGuardProvider>
        <ClassWorkspaceProvider>
          <HomeworkWorkspaceProvider>
            <MessageWorkspaceProvider>
              <MemoryRouter initialEntries={[initialPath]}>
                <RootRouter />
                <LocationProbe />
              </MemoryRouter>
            </MessageWorkspaceProvider>
          </HomeworkWorkspaceProvider>
        </ClassWorkspaceProvider>
      </OperationGuardProvider>
    </RoleSessionProvider>,
  );
}

describe('alignment foundation journeys', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('keeps teacher Home focused on work summaries', () => {
    renderApp('teacher', '/teacher/home');

    expect(screen.getByRole('heading', { level: 1, name: '首页' })).toBeInTheDocument();
    const date = screen.getByText('2026年8月8日 星期六', { exact: true });
    expect(date.tagName).toBe('TIME');
    expect(date).toHaveAttribute('datetime', '2026-08-08');
    expect(screen.queryByText('下午好，王老师', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '教学日程' })).toBeInTheDocument();
    expect(screen.queryByText('当前课堂、今日安排与近期准备')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '动量守恒模型' })).toBeInTheDocument();
    const timeline = screen.getByRole('region', { name: '最近三天' });
    const timelineTimes = Array.from(timeline.querySelectorAll('time:not([datetime])')).map((time) => time.textContent);
    expect(timelineTimes.every((time) => /^\d{2}:\d{2}$/.test(time ?? ''))).toBe(true);
    expect(timelineTimes.some((time) => time?.includes('-'))).toBe(false);
    expect(within(timeline).getByText('今天', { exact: true })).toBeInTheDocument();
    expect(within(timeline).getByText('8/8 周六', { exact: true })).toBeInTheDocument();
    expect(within(timeline).getByText('明天', { exact: true })).toBeInTheDocument();
    expect(within(timeline).getByText('后天', { exact: true })).toBeInTheDocument();
    expect(timeline.querySelectorAll('[data-timeline-node="day"]')).toHaveLength(3);
    expect(timeline.querySelectorAll('[data-timeline-node="event"]')).toHaveLength(5);
    expect(timeline.querySelectorAll('[data-completed="true"]')).toHaveLength(1);
    expect(timeline.querySelector('[data-completed="true"]')).toHaveTextContent('阅读理解专题');
    expect(timeline.querySelectorAll('[data-event-kind="lesson"]')).not.toHaveLength(0);
    expect(timeline.querySelectorAll('[data-event-kind="homework"]')).not.toHaveLength(0);
    expect(timeline.querySelectorAll('[data-teaching-object="lesson"]')).not.toHaveLength(0);
    expect(timeline.querySelectorAll('[data-teaching-object="homework"]')).not.toHaveLength(0);
    expect(within(timeline).getByText('作业', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText(/大后天/)).not.toBeInTheDocument();
    expect(screen.queryByText('紧凑引用')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '教学待办' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '关注摘要' }).querySelector('[data-teaching-object="homework"]')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '教学洞察' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '消息' })).toBeInTheDocument();
    expect(within(timeline).getByText('碰撞模型应用').closest('button')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '我的班级' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '我的公开课' })).not.toBeInTheDocument();
    expect(screen.queryByText('工作区', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('沟通', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('即时工具', { exact: true })).not.toBeInTheDocument();
  });

  it('keeps the teacher attention rail locally collapsible', async () => {
    const user = userEvent.setup();
    renderApp('teacher', '/teacher/home');

    const attention = screen.getByRole('complementary', { name: '关注摘要' });
    expect(attention).toHaveAttribute('data-surface', 'floating');
    const attentionToggle = within(attention).getByRole('button', { name: '收起关注摘要' });
    expect(attentionToggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(attentionToggle);
    expect(screen.queryByRole('heading', { name: '教学待办' })).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem('teacher-home-attention')).toBeNull();
    await user.click(screen.getByRole('button', { name: '展开关注摘要' }));
    expect(screen.getByRole('heading', { name: '教学待办' })).toBeInTheDocument();
  });

  it('opens teacher class management from the Sidebar', async () => {
    const user = userEvent.setup();
    renderApp('teacher', '/teacher/home');

    const disclosure = screen.getByRole('button', { name: '班课管理' });
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    disclosure.focus();
    await user.keyboard('{Enter}');
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard(' ');
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(disclosure);
    await user.keyboard('{Enter}');
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('link', { name: '我的班级' }));

    await user.click(screen.getByRole('button', { name: '新建班级' }));
    expect(screen.getByRole('dialog', { name: '新建班级' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '班级名称' })).toBeInTheDocument();
  });

  it('uses one context header for teacher collections and details', () => {
    const collection = renderApp('teacher', '/teacher/classes');

    expect(screen.getByRole('heading', { level: 1, name: '我的班级' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '面包屑' })).not.toBeInTheDocument();

    collection.unmount();
    renderApp('teacher', '/teacher/classes/physics-3');

    const breadcrumb = screen.getByRole('navigation', { name: '面包屑' });
    expect(breadcrumb).toHaveTextContent('我的班级');
    expect(breadcrumb).toHaveTextContent('高二物理 3 班');
    expect(breadcrumb).not.toHaveTextContent('班课管理');
  });

  it('locks class-management disclosure while a child route is active', () => {
    renderApp('teacher', '/teacher/open-courses/open-reading/edit');

    const disclosure = screen.getByRole('button', { name: '班课管理' });
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    expect(disclosure).toBeDisabled();
    expect(screen.getByRole('link', { name: '公开课' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '公开课' })).toBeVisible();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.getItem('teacher-class-management')).toBeNull();
  });

  it('keeps the class-management disclosure state stable across unrelated navigation', async () => {
    const user = userEvent.setup();
    renderApp('teacher', '/teacher/classes');

    const disclosure = screen.getByRole('button', { name: '班课管理' });
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    expect(disclosure).toBeDisabled();

    await user.click(screen.getByRole('link', { name: '首页' }));
    expect(screen.getByRole('heading', { level: 1, name: '首页' })).toBeInTheDocument();
    const disclosureAfterNavigation = screen.getByRole('button', { name: '班课管理' });
    expect(disclosureAfterNavigation).toBeEnabled();
    expect(disclosureAfterNavigation).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: '我的班级' })).toBeVisible();

    await user.click(disclosureAfterNavigation);
    expect(disclosureAfterNavigation).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('link', { name: '课程表' }));
    expect(screen.getByRole('button', { name: '班课管理' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: '我的班级' })).not.toBeInTheDocument();
  });

  it('opens teacher home teaching objects in the shared detail and operation dialog', async () => {
    const user = userEvent.setup();
    renderApp('teacher', '/teacher/home');

    const mainCardActions = within(screen.getByRole('article', { name: '动量守恒模型' })).getByLabelText('动量守恒模型快捷操作');
    await user.click(within(mainCardActions).getByRole('button', { name: '动量守恒模型：去备课' }));
    const operationDialog = screen.getByRole('dialog', { name: '动量守恒模型' });
    expect(operationDialog).toHaveTextContent('去备课');
    expect(operationDialog).toHaveTextContent('Demo Placeholder');

    await user.click(within(operationDialog).getByRole('button', { name: '关闭动量守恒模型弹窗' }));
    await user.click(screen.getByRole('button', { name: /机械波错题订正/ }));
    const detailDialog = screen.getByRole('dialog', { name: '机械波错题订正' });
    expect(detailDialog).toHaveTextContent('高二物理 3 班');
    expect(detailDialog).toHaveTextContent('机械波');
  });

  it('deep-links a teacher home classroom into its class activity context', async () => {
    const user = userEvent.setup();
    renderApp('teacher', '/teacher/home');

    await user.click(screen.getByRole('button', { name: '查看动量守恒模型详情' }));

    expect(screen.getByTestId('route-location')).toHaveTextContent('/teacher/classes/physics-3?course=course-momentum&unit=unit-momentum-1&activity=activity-momentum-lesson&from=home');
    expect(screen.getByRole('navigation', { name: '面包屑' })).toHaveTextContent('首页我的班级高二物理 3 班');
    expect(screen.getByText('第一单元 受力与动量')).toBeInTheDocument();
    const activity = document.querySelector<HTMLElement>('[data-activity-id="activity-momentum-lesson"]');
    expect(activity).toHaveAttribute('data-highlighted', 'true');
    expect(activity).toHaveAttribute('tabindex', '-1');
  });

  it('deep-links a student home classroom into its class activity context', async () => {
    const user = userEvent.setup();
    renderApp('student-family', '/student/home');

    await user.click(screen.getByRole('button', { name: '查看动量守恒模型详情' }));

    expect(screen.getByTestId('route-location')).toHaveTextContent('/student/classes/physics-3?course=course-momentum&unit=unit-momentum-1&activity=activity-momentum-lesson&from=home');
    expect(screen.getByRole('navigation', { name: '面包屑' })).toHaveTextContent('首页我的班级高二物理 3 班');
    expect(screen.getByText('第一单元 受力与动量')).toBeInTheDocument();
    expect(document.querySelector('[data-activity-id="activity-momentum-lesson"]')).toHaveAttribute('data-highlighted', 'true');
  });

  it('routes teacher attention summaries to the owning insight and message workspaces', async () => {
    const user = userEvent.setup();
    const view = renderApp('teacher', '/teacher/home');

    const insightSection = screen.getByRole('region', { name: '教学洞察' });
    expect(within(insightSection).getByText('3 个班级')).toBeInTheDocument();
    expect(within(insightSection).getByText('课堂参与高于课后作业表现，下一步优先核对未提交与错题学生。')).toBeInTheDocument();
    expect(within(insightSection).getByText('课堂响应较好，优先处理未交与错题。')).toBeInTheDocument();
    expect(within(insightSection).getByText('到课与主动参与是当前主要关注点，先定位缺勤和低参与学生。')).toBeInTheDocument();
    await user.click(within(insightSection).getByRole('button', { name: '查看高二物理 3 班作业洞察' }));
    expect(screen.getByRole('navigation', { name: '面包屑' })).toHaveTextContent('首页');
    expect(screen.getByRole('button', { name: /高二物理 3 班/ })).toBeInTheDocument();
    expect(document.querySelector('[data-insight-anchor="homework"]')).toHaveFocus();

    view.unmount();
    renderApp('teacher', '/teacher/home');
    const messageSection = screen.getByRole('region', { name: '消息' });
    await user.click(within(messageSection).getByRole('button', { name: /高二物理 3 班/ }));
    expect(screen.getByRole('heading', { name: '高二物理 3 班' })).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: '消息分类' })).getByRole('button', { name: '班级消息' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.querySelector('[data-thread-id="class-physics-3"]')).toHaveFocus();
  });

  it('keeps each teacher insight class action scoped to its own homework evidence', async () => {
    const user = userEvent.setup();
    for (const item of [
      ['高二物理 3 班', 'physics-3'],
      ['初三英语 2 班', 'english-2'],
      ['高二物理 1 班', 'physics-1'],
    ] as const) {
      const view = renderApp('teacher', '/teacher/home');
      const insightSection = screen.getByRole('region', { name: '教学洞察' });
      await user.click(within(insightSection).getByRole('button', { name: `查看${item[0]}作业洞察` }));
      expect(screen.getByTestId('route-location')).toHaveTextContent(`/teacher/insights?class=${item[1]}&section=homework&source=home`);
      expect(document.querySelector('[data-insight-anchor="homework"]')).toHaveFocus();
      view.unmount();
    }
  });

  it('matches the student A2 learning rhythm workbench', () => {
    renderApp('student-family', '/student/home');

    expect(screen.getByRole('heading', { name: '学习安排' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '最近三天' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '待办' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '班级消息' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '学习进展' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '关注摘要' })).toBeInTheDocument();
    expect(screen.queryByText('今日关注', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('未来 3 天课程', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '我的班级' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '我的公开课' })).not.toBeInTheDocument();
    expect(screen.queryByText('当前最重要')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '最近反馈' })).not.toBeInTheDocument();
  });

  it('restores student message context from a home deep link', () => {
    renderApp('student-family', '/student/messages?category=direct&thread=direct-wang-li&source=home');

    const breadcrumb = screen.getByRole('navigation', { name: '面包屑' });
    expect(breadcrumb).toHaveTextContent('首页');
    expect(breadcrumb).toHaveTextContent('王老师');
    expect(document.querySelector('[data-thread-id="direct-wang-li"]')).toHaveFocus();
  });

  it('keeps the cross-role reminder count-only, dismissible, and actionable', async () => {
    const user = userEvent.setup();
    renderApp('student-family', '/student/home');

    const reminder = screen.getByRole('complementary', { name: '老师视角提醒' });
    expect(reminder).toHaveTextContent(/老师视角有 \d+ 项紧急事项/);
    expect(reminder).not.toHaveTextContent('仅显示数量，不展示任务内容。');
    expect(reminder).not.toHaveTextContent('机械波错题订正');
    expect(reminder).not.toHaveTextContent('发布周末学习提醒');

    await user.click(within(reminder).getByRole('button', { name: '关闭老师视角提醒' }));
    expect(screen.queryByRole('complementary', { name: '老师视角提醒' })).not.toBeInTheDocument();
  });

  it('switches to the teacher home from the count-only reminder', async () => {
    const user = userEvent.setup();
    renderApp('student-family', '/student/home');
    await user.click(within(screen.getByRole('group', { name: '角色切换' })).getByRole('button', { name: '切换至老师' }));
    expect(screen.getByRole('heading', { level: 1, name: '首页' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(ROLE_STORAGE_KEY)).toBe('teacher');
  });

  it('keeps the compact topbar free of global tools and opens help from the account menu', async () => {
    const user = userEvent.setup();
    renderApp('teacher', '/teacher/home');

    await user.keyboard('{Control>}k{/Control}');
    expect(screen.queryByRole('dialog', { name: '全局搜索' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '打开全局搜索' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '打开通知' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '打开帮助' })).not.toBeInTheDocument();

    await user.click(screen.getByTitle('账户菜单'));
    await user.click(screen.getByRole('menuitem', { name: '帮助与反馈' }));
    expect(screen.getByRole('dialog', { name: '帮助与反馈' })).toBeInTheDocument();
  });
});
