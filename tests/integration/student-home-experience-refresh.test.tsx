import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PageHeaderProvider } from '@app/shell/PageHeaderContext';
import { MessageWorkspaceProvider } from '@features/message-workspace';
import { RoleSessionProvider } from '@features/role-switch';
import { StudentHomePage } from '@pages/student/StudentHomePage';

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="当前路径">{location.pathname}{location.search}</output>;
}

function renderStudentHome() {
  return render(
    <RoleSessionProvider>
      <MemoryRouter initialEntries={['/student/home']}>
        <LocationProbe />
        <PageHeaderProvider fallback={{ title: '首页' }}>
          <MessageWorkspaceProvider>
            <StudentHomePage />
          </MessageWorkspaceProvider>
        </PageHeaderProvider>
      </MemoryRouter>
    </RoleSessionProvider>,
  );
}

describe('student home experience refresh', () => {
  it('renders the A2 learning rhythm workbench without duplicated collections', () => {
    renderStudentHome();

    expect(screen.getByRole('heading', { name: '学习安排' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '最近三天' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '待办' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '班级消息' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '学习进展' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '关注摘要' })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-timeline-day]').length).toBe(3);
    expect(document.querySelector('[data-timeline-day="今天"]')).toBeInTheDocument();
    expect(document.querySelector('[data-timeline-day="明天"]')).toBeInTheDocument();
    expect(document.querySelector('[data-timeline-day="后天"]')).toBeInTheDocument();
    expect(screen.queryByText('我的班级', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('我的公开课', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('下午好，李明', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /未读消息/ })).not.toBeInTheDocument();

    const timeline = screen.getByRole('region', { name: '最近三天' });
    const times = Array.from(timeline.querySelectorAll('time:not([datetime])')).map((time) => time.textContent);
    expect(times).toContain('09:00');
    expect(times).toContain('14:30');
    expect(times.every((time) => /^\d{2}:\d{2}$/.test(time ?? ''))).toBe(true);
    expect(within(timeline).queryByText('09:00-10:00', { exact: true })).not.toBeInTheDocument();
    expect(within(timeline).queryByText('14:30-15:30', { exact: true })).not.toBeInTheDocument();
  });

  it('routes classroom details to the class workspace and keeps task actions in the home dialog', async () => {
    const user = userEvent.setup();
    const homeView = renderStudentHome();

    await user.click(screen.getByRole('button', { name: '查看动量守恒模型详情' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/student/classes/physics-3?course=course-momentum&unit=unit-momentum-1&activity=activity-momentum-lesson&from=home');

    homeView.unmount();
    renderStudentHome();
    const mainCardActions = within(screen.getByRole('article', { name: '动量守恒模型' })).getByLabelText('动量守恒模型快捷操作');
    await user.click(within(mainCardActions).getByRole('button', { name: '动量守恒模型：去上课' }));
    const actionDialog = screen.getByRole('dialog', { name: '动量守恒模型' });
    expect(actionDialog).toHaveTextContent('去上课');
    expect(actionDialog).toHaveTextContent('Demo Placeholder');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/student/home');
  });
});
