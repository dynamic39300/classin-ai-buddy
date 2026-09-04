import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PageHeaderProvider } from '@app/shell/PageHeaderContext';
import { ClassWorkspaceProvider } from '@features/class-workspace/ClassWorkspaceProvider';
import { StudentClassWorkspace } from '@features/class-workspace/StudentClassWorkspace';
import { MessageWorkspaceProvider } from '@features/message-workspace';
import { MESSAGE_THREADS } from '@mocks/scenarios/messages';
import { OpenCourseWorkspaceProvider, createOpenCourseSessionStore } from '@features/open-course-workspace';
import { StudentOpenCourseCollectionWorkspace } from '@features/open-course-workspace/StudentOpenCourseCollectionWorkspace';
import { StudentBlackboardPage } from '@pages/student/StudentBlackboardPage';
import { StudentCastingPage } from '@pages/student/StudentCastingPage';

function LocationProbe() {
  const location = useLocation();
  return <span aria-label="当前路径" role="none">{location.pathname}{location.search}</span>;
}

function renderClassWorkspace(detailId?: string, search = '') {
  return render(
    <MemoryRouter initialEntries={[detailId ? `/student/classes/${detailId}${search}` : '/student/classes']}>
      <LocationProbe />
      <PageHeaderProvider fallback={{ title: '班课管理' }}>
        <MessageWorkspaceProvider>
          <ClassWorkspaceProvider>
            <StudentClassWorkspace detailId={detailId} messageThreads={MESSAGE_THREADS} />
          </ClassWorkspaceProvider>
        </MessageWorkspaceProvider>
      </PageHeaderProvider>
    </MemoryRouter>,
  );
}

function renderOpenCourses() {
  return render(
    <MemoryRouter initialEntries={['/student/open-courses']}>
      <LocationProbe />
      <PageHeaderProvider fallback={{ title: '公开课' }}>
        <ClassWorkspaceProvider>
          <OpenCourseWorkspaceProvider store={createOpenCourseSessionStore(['open-reading'])}>
            <StudentOpenCourseCollectionWorkspace />
          </OpenCourseWorkspaceProvider>
        </ClassWorkspaceProvider>
      </PageHeaderProvider>
    </MemoryRouter>,
  );
}

describe('student/family navigation parity workspaces', () => {
  it('uses the teacher collection columns without exposing teacher class commands', () => {
    renderClassWorkspace();

    const table = screen.getByRole('table', { name: '班级列表' });
    for (const label of ['班级名称', '班主任', '课程数', '成员数', '班级待办', '最近更新', '操作']) {
      expect(within(table).getByRole('columnheader', { name: label })).toBeInTheDocument();
    }
    expect(within(table).getByText('高二物理 3 班')).toBeInTheDocument();
    expect(within(table).getByText('初三英语 2 班')).toBeInTheDocument();
    expect(within(table).queryByText('高二物理 1 班')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /新建班级|编辑高二物理|邀请成员/ })).not.toBeInTheDocument();
  });

  it('keeps the teacher detail shell while limiting content and commands to student permissions', async () => {
    const user = userEvent.setup();
    renderClassWorkspace('physics-3');

    expect(screen.getByRole('combobox', { name: '当前课程' })).toBeInTheDocument();
    expect(screen.getByText('未结课')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: '动量与碰撞课程目录' })).toBeInTheDocument();
    expect(screen.getByText('第一单元 受力与动量')).toBeInTheDocument();
    expect(screen.queryByText('已发布')).not.toBeInTheDocument();
    expect(screen.queryByText('错题订正')).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '班级辅助信息' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /编辑属性|新建课程|新建单元|新建活动|邀请成员|删除/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '班级待办' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/student/todos?class=physics-3');
  });

  it('shows compact student text actions', async () => {
    const user = userEvent.setup();
    renderClassWorkspace('physics-3');

    const lessonActions = screen.getByRole('group', { name: '动量守恒模型快捷操作' });
    const enterClassroom = within(lessonActions).getByRole('button', { name: '去上课' });
    expect(enterClassroom).toHaveTextContent('去上课');
    expect(enterClassroom).toHaveAttribute('data-priority', 'primary');
    await user.tab();
    await user.click(enterClassroom);
    const lessonDialog = screen.getByRole('dialog', { name: '动量守恒模型' });
    expect(lessonDialog).toHaveTextContent('去上课');
    expect(lessonDialog).toHaveTextContent('Demo Placeholder');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent(/^\/student\/classes\/physics-3$/);
    await user.click(screen.getByRole('button', { name: '关闭动量守恒模型弹窗' }));

    const homeworkActions = screen.getByRole('group', { name: '动量守恒作业 A 组快捷操作' });
    const homeworkAction = within(homeworkActions).getByRole('button', { name: '去做作业' });
    await user.click(homeworkAction);
    const homeworkDialog = screen.getByRole('dialog', { name: '动量守恒作业 A 组' });
    expect(homeworkDialog).toHaveTextContent('去做作业');
    expect(homeworkDialog).toHaveTextContent('Demo Placeholder');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent(/^\/student\/classes\/physics-3$/);
  });

  it('shows replay without the teacher report action for completed student lessons', async () => {
    const user = userEvent.setup();
    renderClassWorkspace('history-physics');

    const actions = screen.getByRole('group', { name: '基础复习课快捷操作' });
    const replay = within(actions).getByRole('button', { name: '看回放' });
    expect(within(actions).queryByRole('button', { name: '课堂报告' })).not.toBeInTheDocument();
    replay.focus();
    expect(replay).toHaveFocus();
    await user.click(replay);
    const replayDialog = screen.getByRole('dialog', { name: '基础复习课' });
    expect(replayDialog).toHaveTextContent('看回放');
    expect(replayDialog).toHaveTextContent('Demo Placeholder');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent(/^\/student\/classes\/history-physics$/);
  });

  it('opens student activity details in place without changing the class URL', async () => {
    const user = userEvent.setup();
    renderClassWorkspace('physics-3');

    await user.click(screen.getByRole('button', { name: '查看动量守恒作业 A 组详情' }));
    const dialog = screen.getByRole('dialog', { name: '动量守恒作业 A 组' });
    expect(dialog).toHaveTextContent('动量与碰撞');
    expect(dialog).toHaveTextContent('第一单元 受力与动量');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent(/^\/student\/classes\/physics-3$/);
  });

  it('expands, focuses, and highlights an activity targeted from student Home', async () => {
    renderClassWorkspace('physics-3', '?course=course-momentum&unit=unit-momentum-1&activity=activity-momentum-lesson&from=home');

    const target = document.querySelector<HTMLElement>('[data-activity-id="activity-momentum-lesson"]');
    expect(target).toHaveAttribute('data-highlighted', 'true');
    await waitFor(() => expect(target).toHaveFocus());
    expect(screen.getByRole('combobox', { name: '当前课程' })).toHaveValue('course-momentum');
  });

  it('uses the teacher public-course table and detail dialog without management actions', async () => {
    const user = userEvent.setup();
    renderOpenCourses();

    const table = screen.getByRole('table', { name: '我的公开课' });
    expect(within(table).getByText('高效阅读公开课')).toBeInTheDocument();
    expect(within(table).queryByText('家长会说明会')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '加入公开课' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /新建公开课|编辑|邀请学生|删除公开课/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('row', { name: '查看公开课 高效阅读公开课' }));
    const dialog = screen.getByRole('dialog', { name: '公开课详情' });
    expect(dialog).toHaveTextContent('学生权限');
    expect(within(dialog).queryByRole('button', { name: /编辑|邀请学生|删除公开课/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('dialog=detail&course=open-reading');
  });

  it('keeps blackboard and casting passive in the student role', () => {
    const blackboard = render(<StudentBlackboardPage />);
    expect(screen.getByRole('heading', { name: '课堂黑板暂未接入' })).toBeInTheDocument();
    expect(screen.getByText(/只展示已获授权/)).toBeInTheDocument();
    blackboard.unmount();

    render(<StudentCastingPage />);
    expect(screen.getByRole('heading', { name: '等待老师投屏' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /投屏|结束投屏|重新连接|设备/ })).not.toBeInTheDocument();
  });
});
