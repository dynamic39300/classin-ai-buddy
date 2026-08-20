import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { RootRouter } from '@app/router/RootRouter';
import { OperationGuardProvider } from '@app/shell/operation-guard';
import { ClassWorkspaceProvider } from '@features/class-workspace/ClassWorkspaceProvider';
import { MessageWorkspaceProvider } from '@features/message-workspace';
import { ROLE_STORAGE_KEY, RoleSessionProvider } from '@features/role-switch';

function renderApp(initialPath = '/') {
  return render(
    <RoleSessionProvider>
      <OperationGuardProvider>
        <ClassWorkspaceProvider>
          <MessageWorkspaceProvider>
            <MemoryRouter initialEntries={[initialPath]}>
              <RootRouter />
            </MemoryRouter>
          </MessageWorkspaceProvider>
        </ClassWorkspaceProvider>
      </OperationGuardProvider>
    </RoleSessionProvider>,
  );
}

describe('app shell role journeys', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('selects teacher and renders the teacher-only navigation', async () => {
    const user = userEvent.setup();
    renderApp();

    expect(screen.getByRole('img', { name: 'EEO' })).toBeInTheDocument();
    expect(screen.getByText('Empower Education Online')).toBeInTheDocument();
    expect(screen.getByLabelText('ClassIn 桌面端')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '选择本次使用视角' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /老师视角/ }));

    expect(screen.getByRole('heading', { level: 1, name: '首页' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '待办' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '空间' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '黑板' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '投屏' })).toBeInTheDocument();

    const accountButton = screen.getByTitle('账户菜单');
    expect(accountButton).toHaveTextContent('王老师');
    expect(accountButton).toHaveTextContent('ClassIn 教研中心');
    expect(accountButton).not.toHaveTextContent('老师视角');
    const accountCopy = within(accountButton).getByText('ClassIn 教研中心').parentElement;
    expect(accountCopy?.children).toHaveLength(2);
    expect(accountCopy?.children[0]).toHaveTextContent('王老师');
    expect(accountCopy?.children[1]).toHaveTextContent('ClassIn 教研中心');
    expect(accountCopy?.children[1]).not.toHaveTextContent('老师视角');
    expect(accountButton.querySelector('img')).toBeInTheDocument();
    expect(accountButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('switches directly to the student home with isolated navigation', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /老师视角/ }));
    await user.click(within(screen.getByRole('group', { name: '角色切换' })).getByRole('button', { name: '切换至学生' }));

    expect(screen.getByRole('heading', { name: '学习安排' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /待办/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '成长' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '空间' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '黑板' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '投屏' })).toBeInTheDocument();
  });

  it('switches through the identity area quick control', async () => {
    window.sessionStorage.setItem(ROLE_STORAGE_KEY, 'teacher');
    const user = userEvent.setup();
    renderApp('/teacher/home');

    const quickControl = screen.getByRole('group', { name: '角色切换' });
    expect(within(quickControl).getByLabelText('当前为老师')).toHaveTextContent('当前：老师');
    await user.click(within(quickControl).getByRole('button', { name: '切换至学生' }));

    expect(screen.getByRole('heading', { name: '学习安排' })).toBeInTheDocument();
    const studentQuickControl = screen.getByRole('group', { name: '角色切换' });
    expect(within(studentQuickControl).getByLabelText('当前为学生')).toHaveTextContent('当前：学生');
    expect(within(studentQuickControl).getByRole('button', { name: '切换至老师' })).toBeInTheDocument();
  });

  it('restores a valid role and clears it on logout', async () => {
    window.sessionStorage.setItem(ROLE_STORAGE_KEY, 'student-family');
    const user = userEvent.setup();
    renderApp('/student/home');

    expect(screen.getByRole('heading', { name: '学习安排' })).toBeInTheDocument();
    await user.click(screen.getByTitle('账户菜单'));
    await user.click(screen.getByRole('menuitem', { name: '退出登录' }));

    expect(screen.getByRole('heading', { name: '选择本次使用视角' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(ROLE_STORAGE_KEY)).toBeNull();
  });

  it('redirects a stored teacher away from student routes', () => {
    window.sessionStorage.setItem(ROLE_STORAGE_KEY, 'teacher');
    renderApp('/student/growth');
    expect(screen.getByRole('heading', { level: 1, name: '首页' })).toBeInTheDocument();
  });

  it('keeps class edits on cancel and discards them before switching roles', async () => {
    window.sessionStorage.setItem(ROLE_STORAGE_KEY, 'teacher');
    const user = userEvent.setup();
    renderApp('/teacher/classes?create=class');

    await user.click(screen.getByRole('button', { name: '新建班级' }));
    await user.type(screen.getByRole('textbox', { name: '班级名称' }), '不应保存的班级');
    await user.click(within(screen.getByRole('group', { name: '角色切换' })).getByRole('button', { name: '切换至学生' }));
    expect(screen.getByRole('alert')).toHaveTextContent('未保存编辑');

    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: '取消' }));
    expect(screen.getByRole('textbox', { name: '班级名称' })).toHaveValue('不应保存的班级');
    await user.click(within(screen.getByRole('group', { name: '角色切换' })).getByRole('button', { name: '切换至学生' }));
    await user.click(screen.getByRole('button', { name: '放弃并切换' }));

    expect(screen.getByRole('heading', { name: '学习安排' })).toBeInTheDocument();
    expect(screen.queryByText('不应保存的班级')).not.toBeInTheDocument();
  });

  it('saves a class edit before switching and preserves it across role trees', async () => {
    window.sessionStorage.setItem(ROLE_STORAGE_KEY, 'teacher');
    const user = userEvent.setup();
    renderApp('/teacher/classes?create=class');

    await user.click(screen.getByRole('button', { name: '新建班级' }));
    await user.type(screen.getByRole('textbox', { name: '班级名称' }), '守卫保存班');
    await user.click(within(screen.getByRole('group', { name: '角色切换' })).getByRole('button', { name: '切换至学生' }));
    await user.click(screen.getByRole('button', { name: '保存后切换' }));
    expect(screen.getByRole('heading', { name: '学习安排' })).toBeInTheDocument();

    await user.click(within(screen.getByRole('group', { name: '角色切换' })).getByRole('button', { name: '切换至老师' }));
    expect(screen.getByRole('heading', { level: 1, name: '首页' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '班课管理' }));
    await user.click(screen.getByRole('link', { name: '我的班级' }));
    expect(screen.getByText('守卫保存班')).toBeInTheDocument();
  });
});
