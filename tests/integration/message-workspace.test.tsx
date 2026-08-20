import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  MessageWorkspace,
  MessageWorkspaceProvider,
  type MessageWorkspaceScenario,
} from '@features/message-workspace';
import { MESSAGE_THREADS } from '@mocks/scenarios/messages';

function renderWorkspace(
  role: 'teacher' | 'student-family',
  initialEntry = '/',
  scenario?: MessageWorkspaceScenario,
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MessageWorkspaceProvider scenario={scenario}>
        <MessageWorkspace role={role} />
        <LocationProbe />
      </MessageWorkspaceProvider>
    </MemoryRouter>,
  );
}

function renderFocusedWorkspace(
  role: 'teacher' | 'student-family',
  fixedClassId: string,
  readOnly = false,
) {
  return render(
    <MemoryRouter>
      <MessageWorkspaceProvider>
        <MessageWorkspace role={role} fixedClassId={fixedClassId} readOnly={readOnly} />
      </MessageWorkspaceProvider>
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

describe('message workspace', () => {
  it('renders a focused class chat without message categories or other threads', () => {
    renderFocusedWorkspace('teacher', 'physics-3');
    expect(screen.getByText('班级群聊')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '高二物理 3 班' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '消息分类' })).not.toBeInTheDocument();
    expect(screen.queryByText('高二物理 1 班')).not.toBeInTheDocument();
  });

  it('makes a completed class chat fully read-only', () => {
    renderFocusedWorkspace('teacher', 'physics-3', true);
    expect(screen.getByRole('status')).toHaveTextContent('当前群聊仅供查看');
    expect(screen.queryByRole('textbox', { name: '输入消息' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '发送表情' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '添加附件' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /置顶|撤回|全体禁言/ })).not.toBeInTheDocument();
  });

  it('disables every student send path in a muted class scenario', () => {
    renderFocusedWorkspace('student-family', 'english-2');
    expect(screen.getByRole('status')).toHaveTextContent('当前群聊已开启全体禁言');
    expect(screen.queryByRole('textbox', { name: '输入消息' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '发送表情' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '添加附件' })).not.toBeInTheDocument();
  });

  it('keeps the preloaded class invitation as an informational notice without join actions or a class deep link', async () => {
    const user = userEvent.setup();
    renderWorkspace('student-family');
    await user.click(screen.getByRole('button', { name: /系统通知/ }));
    const notice = screen.getByRole('article', { name: '王老师邀请你加入班级' });
    expect(notice).toBeInTheDocument();
    expect(within(notice).queryByRole('button', { name: /加入班级|接受邀请/ })).not.toBeInTheDocument();
    await user.click(within(notice).getByRole('button', { name: '查看邀请说明' }));
    expect(screen.getByRole('status')).toHaveTextContent('没有加入动作或班级深链');
    expect(screen.getByTestId('location')).toHaveTextContent('category=system&thread=system-student-class-invite');
  });

  it('lets a teacher chat and manage one concrete class group', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');

    expect(screen.getByRole('heading', { name: '高二物理 3 班' })).toBeInTheDocument();
    expect(screen.getAllByText('请大家课前准备好课堂练习单，作业仍在今天 18:00 截止。')).toHaveLength(2);

    await user.type(screen.getByRole('textbox', { name: '输入消息' }), '课前见');
    await user.click(screen.getByRole('button', { name: '发送' }));
    expect(screen.getAllByText('课前见')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('本地 Demo 中发送');

    await user.click(screen.getByRole('button', { name: '取消置顶' }));
    expect(screen.getByRole('status')).toHaveTextContent('已取消置顶消息');
    const contextTrigger = screen.getByRole('button', { name: '班级会话操作' });
    await user.click(contextTrigger);
    expect(within(screen.getByRole('menu', { name: '班级会话操作' })).getByRole('menuitem', { name: '群文件' })).toHaveFocus();
    await user.click(within(screen.getByRole('menu', { name: '班级会话操作' })).getByRole('menuitem', { name: '全体禁言' }));
    await waitFor(() => expect(contextTrigger).toHaveFocus());
    await user.click(contextTrigger);
    expect(within(screen.getByRole('menu', { name: '班级会话操作' })).getByRole('menuitem', { name: '解除禁言' })).toBeInTheDocument();
  });

  it('keeps the global class header concise and direct chats free of empty menus', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');
    await user.click(screen.getByRole('button', { name: '进入班级' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/teacher/classes/physics-3?from=messages');
    expect(screen.getByRole('button', { name: '班级会话操作' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '私聊' }));
    expect(screen.queryByRole('button', { name: '进入班级' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '班级会话操作' })).not.toBeInTheDocument();
  });

  it('keeps teacher management out of the student view and exposes task-safe notice actions', async () => {
    const user = userEvent.setup();
    renderWorkspace('student-family');

    expect(screen.queryByRole('button', { name: /置顶/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /全体禁言/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /系统通知/ }));
    await user.click(screen.getByRole('button', { name: /机械波错题订正被退回/ }));
    expect(screen.getByRole('heading', { name: '机械波错题订正被退回' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '去订正' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/student/homework/homework-correction/edit?source=notification&notification=system-student-returned&mode=correction');
  });

  it('reuses a unique direct thread from contacts and restores dialog focus', async () => {
    const user = userEvent.setup();
    renderWorkspace('student-family');

    await user.click(screen.getByRole('button', { name: /私聊/ }));
    const contactTrigger = screen.getByRole('button', { name: '发起私聊' });
    await user.click(contactTrigger);
    expect(screen.getByRole('dialog', { name: '发起私聊' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(contactTrigger).toHaveFocus());

    await user.click(contactTrigger);
    const dialog = screen.getByRole('dialog', { name: '发起私聊' });
    await user.type(within(dialog).getByRole('textbox', { name: '搜索联系人' }), '王老师');
    await user.click(within(dialog).getByRole('button', { name: /王老师/ }));

    expect(screen.queryByRole('dialog', { name: '发起私聊' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '王老师' })).toBeInTheDocument();
    await waitFor(() => expect(contactTrigger).toHaveFocus());
  });

  it('searches only the current category and marks that category read', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');

    await user.click(screen.getByRole('button', { name: /私聊/ }));
    await user.type(screen.getByRole('textbox', { name: '搜索当前分类' }), '不存在');
    expect(screen.getByText('没有匹配的消息')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '清除搜索' }));
    expect(screen.getByRole('textbox', { name: '搜索当前分类' })).toHaveValue('');
    const menuTrigger = screen.getByRole('button', { name: '私聊列表操作' });
    await user.click(menuTrigger);
    const menu = screen.getByRole('menu', { name: '私聊列表操作' });
    expect(within(menu).getByRole('menuitem', { name: '加入与添加' })).toBeInTheDocument();
    await user.click(within(menu).getByRole('menuitem', { name: '全部标为已读' }));
    await waitFor(() => expect(menuTrigger).toHaveFocus());
    expect(screen.getByRole('button', { name: '私聊' })).toBeInTheDocument();
  });

  it('contains menu focus and restores the trigger on Escape', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');
    const trigger = screen.getByRole('button', { name: '班级消息列表操作' });

    await user.click(trigger);
    expect(screen.getByRole('menuitem', { name: '全部标为已读' })).toHaveFocus();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu', { name: '班级消息列表操作' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('renders loading, error, category-empty and capped unread states', async () => {
    renderWorkspace('teacher', '/', { status: 'loading' });
    expect(screen.getByLabelText('消息正在加载')).toHaveAttribute('aria-busy', 'true');

    cleanup();
    renderWorkspace('teacher', '/', { status: 'error', message: '请稍后重试' });
    expect(screen.getByRole('alert')).toHaveTextContent('消息暂时无法加载请稍后重试');

    cleanup();
    renderWorkspace('teacher', '/', { status: 'ready', threads: [] });
    expect(screen.getAllByText('暂无班级消息')).toHaveLength(2);

    cleanup();
    const threads = MESSAGE_THREADS.map((thread) => thread.id === 'direct-teacher-zhang'
      ? { ...thread, unreadByRole: { ...thread.unreadByRole, teacher: 120 } }
      : thread);
    renderWorkspace('teacher', '/teacher/messages?category=direct', { status: 'ready', threads });
    expect(screen.getAllByText('99+')).toHaveLength(2);
  });

  it('groups consecutive messages from one sender and keeps task-state copy out of official announcements', async () => {
    const user = userEvent.setup();
    const threads = MESSAGE_THREADS.map((thread) => thread.id === 'class-physics-3'
      ? {
        ...thread,
        entries: [
          ...thread.entries,
          {
            id: 'cp3-4',
            authorRole: 'student-family' as const,
            authorName: '李明',
            body: '我会提前进入教室。',
            sentAt: '2026-08-08T14:09:00+08:00',
            kind: 'text' as const,
          },
        ],
      }
      : thread);
    renderWorkspace('teacher', '/', { status: 'ready', threads });

    expect(screen.getAllByText(/李明 ·/)).toHaveLength(1);
    expect(screen.getAllByText('我会提前进入教室。')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: '官方公告' }));
    expect(screen.getByRole('heading', { name: 'ClassIn PC 体验更新说明' })).toBeInTheDocument();
    expect(screen.queryByText('阅读消息不会改变待办的处理状态')).not.toBeInTheDocument();
  });

  it('keeps all four categories in the compact list panel without a standalone category spine', () => {
    renderWorkspace('teacher');
    expect(screen.queryByRole('navigation', { name: '消息分类' })).not.toBeInTheDocument();
    const categories = screen.getByRole('group', { name: '消息分类' });
    for (const label of ['私聊', '班级消息', '系统通知', '官方公告']) {
      expect(within(categories).getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('restores category and thread targets from the URL and reports unavailable targets', () => {
    const { unmount } = renderWorkspace('teacher', '/teacher/messages?category=direct&thread=direct-teacher-zhang');
    expect(screen.getByRole('heading', { name: '张老师' })).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: '消息分类' })).getByRole('button', { name: '私聊' })).toHaveAttribute('aria-pressed', 'true');

    unmount();
    renderWorkspace('student-family', '/student/messages?category=class&thread=missing-thread');
    expect(screen.getByRole('status')).toHaveTextContent('目标消息在当前视角不可用');
  });
});
