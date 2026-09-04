import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ScheduleWorkspace } from '@features/schedule-workspace/ScheduleWorkspace';
import { ClassWorkspaceProvider } from '@features/class-workspace/ClassWorkspaceProvider';

describe('schedule workspace', () => {
  it('links the course-only month overview, main calendar and persistent day agenda', async () => {
    const user = userEvent.setup();
    render(<ScheduleWorkspace role="teacher" />, { wrapper: MemoryRouter });

    expect(screen.getByRole('button', { name: /8月8日，3节课/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('complementary', { name: '月历' })).toBeInTheDocument();
    const dayPanel = screen.getByRole('complementary', { name: '当日安排' });
    expect(dayPanel).toHaveTextContent('3 节课');
    expect(screen.queryByRole('button', { name: '关闭当日安排' })).not.toBeInTheDocument();

    const momentumGroup = within(dayPanel).getByRole('region', { name: '高二物理 3班 · 动量与碰撞' });
    expect(momentumGroup).toHaveTextContent('动量守恒模型');
    expect(momentumGroup).toHaveTextContent('动量守恒作业 A 组');
    expect(momentumGroup).toHaveTextContent('课堂录播');
    expect(momentumGroup.querySelector('[data-teaching-object="lesson"]')).toBeInTheDocument();
    expect(momentumGroup.querySelector('[data-teaching-object="homework"]')).toBeInTheDocument();
    expect(momentumGroup.querySelector('[data-teaching-object="recording"]')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /8月7日，1节课/ }));
    expect(dayPanel).toHaveTextContent('1 节课');
    expect(dayPanel).toHaveTextContent('机械波基础');
  });

  it('keeps the day panel visible behind details when opened from the panel', async () => {
    const user = userEvent.setup();
    render(<ScheduleWorkspace role="teacher" />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole('button', { name: /8月7日，1节课/ }));
    const eventButton = within(screen.getByRole('complementary', { name: '当日安排' })).getByRole('button', { name: '查看 09:00 机械波基础，课堂' });
    await user.click(eventButton);

    expect(screen.getByRole('dialog', { name: '机械波基础' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '当日安排' })).toHaveTextContent('机械波基础');
    expect(within(screen.getByRole('dialog', { name: '机械波基础' })).getByRole('button', { name: '课堂报告' })).toBeInTheDocument();
    expect(screen.getByText('全班数据')).toBeInTheDocument();
    expect(screen.getByText('课后评价')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '关闭机械波基础详情' }));
    expect(screen.queryByRole('dialog', { name: '机械波基础' })).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '当日安排' })).toHaveTextContent('机械波基础');
    await waitFor(() => expect(within(screen.getByRole('complementary', { name: '当日安排' })).getByRole('button', { name: '查看 09:00 机械波基础，课堂' })).toHaveFocus());
  });

  it('uses the canonical public course dialog while keeping schedule context visible', async () => {
    const user = userEvent.setup();
    render(
      <ClassWorkspaceProvider>
        <ScheduleWorkspace role="teacher" />
      </ClassWorkspaceProvider>,
      { wrapper: MemoryRouter },
    );

    const agenda = screen.getByRole('complementary', { name: '当日安排' });
    await user.click(within(agenda).getByRole('button', { name: '查看 19:00 家长会说明会，公开课' }));

    expect(screen.getByRole('dialog', { name: '公开课详情' })).toHaveTextContent('家长会说明会');
    expect(screen.getByRole('complementary', { name: '月历' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '当日安排' })).toBeInTheDocument();
  });

  it('isolates student actions and personal evaluation from teacher aggregate data', async () => {
    const user = userEvent.setup();
    render(<ScheduleWorkspace role="student-family" />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole('button', { name: '18:00 动量守恒作业 A 组，作业' }));
    expect(screen.getByRole('dialog', { name: '动量守恒作业 A 组' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '当日安排' })).toBeInTheDocument();
    expect(within(screen.getByRole('dialog', { name: '动量守恒作业 A 组' })).getByRole('button', { name: '继续作业' })).toBeInTheDocument();
    expect(screen.queryByText('全班数据')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '关闭动量守恒作业 A 组详情' }));
    await user.click(screen.getByRole('button', { name: '09:00 阅读理解专题，课堂' }));
    expect(screen.getByText('我的课后评价')).toBeInTheDocument();
    expect(screen.queryByText('全班数据')).not.toBeInTheDocument();
  });

  it('shows exactly one compact primary action for each item in the day agenda', () => {
    render(<ScheduleWorkspace role="teacher" now={new Date('2026-08-08T14:05:00+08:00')} />, { wrapper: MemoryRouter });

    const agenda = screen.getByRole('complementary', { name: '当日安排' });
    const lessonRow = agenda.querySelector('[data-event-id="class-momentum"]');
    expect(lessonRow).not.toBeNull();
    expect(within(lessonRow as HTMLElement).getByRole('button', { name: '动量守恒模型：去上课' })).toBeInTheDocument();
    expect(within(lessonRow as HTMLElement).queryByRole('button', { name: '动量守恒模型：去备课' })).not.toBeInTheDocument();
    expect(within(lessonRow as HTMLElement).getAllByRole('button')).toHaveLength(2);
  });

  it('switches between week and day views while preserving the auxiliary modules', async () => {
    const user = userEvent.setup();
    render(<ScheduleWorkspace role="teacher" />, { wrapper: MemoryRouter });

    expect(screen.getByRole('region', { name: '完整周视图' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '日视图' }));
    expect(screen.getByRole('region', { name: '单日视图' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '月历' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '当日安排' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '日视图' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders a continuous 24-hour timeline with minute-level current time marker', async () => {
    const user = userEvent.setup();
    render(<ScheduleWorkspace role="teacher" now={new Date('2026-08-08T14:30:00+08:00')} />, { wrapper: MemoryRouter });

    const timeline = screen.getByRole('region', { name: '课程表时间网格' });
    expect(timeline).toHaveTextContent('00:00');
    expect(timeline).toHaveTextContent('08:00');
    expect(timeline).toHaveTextContent('24:00');
    expect(screen.getByTestId('current-time-line')).toHaveAttribute('aria-label', '当前时间 14:30');
    expect(screen.getByRole('region', { name: '当日课程列表' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '日视图' }));
    await user.click(screen.getByRole('button', { name: /8月10日，0节课/ }));
    expect(screen.queryByTestId('current-time-line')).not.toBeInTheDocument();
  });

  it('filters the grid, month course count and day agenda from one control', async () => {
    const user = userEvent.setup();
    render(<ScheduleWorkspace role="teacher" />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole('button', { name: '筛选日程' }));
    await user.selectOptions(screen.getByRole('combobox', { name: '事项类型' }), 'open-course');
    expect(screen.getByRole('button', { name: /8月8日，1节课/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('complementary', { name: '当日安排' })).toHaveTextContent('家长会说明会');
    expect(screen.getByRole('complementary', { name: '当日安排' })).not.toHaveTextContent('动量守恒模型');

    await user.click(screen.getByRole('button', { name: '清除筛选' }));
    expect(screen.getByRole('button', { name: /8月8日，3节课/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('returns focus to the filter trigger when its popover closes with Escape', async () => {
    const user = userEvent.setup();
    render(<ScheduleWorkspace role="teacher" />, { wrapper: MemoryRouter });

    const trigger = screen.getByRole('button', { name: '筛选日程' });
    await user.click(trigger);
    await user.click(screen.getByRole('combobox', { name: '事项类型' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('group', { name: '筛选日程选项' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('restores date and event context from the URL and reports an unavailable target', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/teacher/schedule?date=2026-08-07&view=day&event=class-wave']}>
        <ScheduleWorkspace role="teacher" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('region', { name: '单日视图' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '日视图' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('dialog', { name: '机械波基础' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '月历' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '当日安排' })).toBeInTheDocument();

    unmount();
    render(
      <MemoryRouter initialEntries={['/teacher/schedule?date=2026-08-08&event=missing-event']}>
        <ScheduleWorkspace role="teacher" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('目标日程在当前视角不可用');
  });
});
