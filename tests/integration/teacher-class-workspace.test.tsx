import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { OperationGuardProvider } from '@app/shell/operation-guard';
import { PageHeaderProvider } from '@app/shell/PageHeaderContext';
import { ClassWorkspaceProvider } from '@features/class-workspace/ClassWorkspaceProvider';
import { TeacherClassWorkspace } from '@features/class-workspace/TeacherClassWorkspace';
import { MessageWorkspace, MessageWorkspaceProvider } from '@features/message-workspace';
import { MESSAGE_THREADS } from '@mocks/scenarios/messages';

function LocationProbe() {
  const location = useLocation();
  return <span aria-label="当前路径" role="none">{location.pathname}{location.search}</span>;
}

function renderWorkspace(detailId?: string, initialEntry = detailId ? `/teacher/classes/${detailId}` : '/teacher/classes') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <PageHeaderProvider fallback={{ title: '班课管理' }}>
        <OperationGuardProvider>
          <MessageWorkspaceProvider>
            <ClassWorkspaceProvider>
              <TeacherClassWorkspace
                detailId={detailId}
                messageThreads={MESSAGE_THREADS}
                renderClassChat={({ classId, readOnly }) => (
                  <MessageWorkspace role="teacher" fixedClassId={classId} readOnly={readOnly} embedded />
                )}
              />
            </ClassWorkspaceProvider>
          </MessageWorkspaceProvider>
        </OperationGuardProvider>
      </PageHeaderProvider>
    </MemoryRouter>,
  );
}

describe('teacher class experience refresh', () => {
  it('renders the compact attribute list without collection tabs', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    expect(screen.queryByRole('tablist', { name: '班级与公开课' })).not.toBeInTheDocument();
    const table = screen.getByRole('table', { name: '班级列表' });
    for (const label of ['班级名称', '班主任', '课程数', '成员数', '班级待办', '最近更新']) {
      expect(within(table).getByRole('columnheader', { name: label })).toBeInTheDocument();
    }
    expect(within(table).getByText('王老师')).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: '操作' })).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: '编辑高二物理 3 班' })).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: '编辑高二物理 1 班' })).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: '编辑高一物理基础班' })).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: '搜索班级' }), '高二物理 3 班');
    expect(screen.getByText('高二物理 3 班')).toBeInTheDocument();
    expect(screen.queryByText('高二物理 1 班')).not.toBeInTheDocument();
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('q=');
  });

  it('keeps sorting behind the compact icon control', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    const sort = screen.getByRole('combobox', { name: '排序' });
    expect(sort).toBeInTheDocument();
    expect(sort.parentElement).toHaveAttribute('title', '排序');
    await user.selectOptions(sort, 'name-asc');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('sort=name-asc');
  });

  it('edits a class from the list in a dialog without inline name editing', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: '编辑高二物理 3 班' }));
    const dialog = screen.getByRole('dialog', { name: '班级属性' });
    const name = within(dialog).getByRole('textbox', { name: '班级名称' });
    expect(name).toHaveValue('高二物理 3 班');
    expect(within(dialog).getByRole('textbox', { name: '班级简介' })).toBeInTheDocument();
    expect(within(dialog).getByRole('switch', { name: '允许学生修改班级昵称' })).toBeInTheDocument();
    const headmaster = within(dialog).getByRole('combobox', { name: '班主任' });
    const afterClassSwitch = within(dialog).getByRole('switch', { name: '允许退出班级或课程结课后查看内容' });
    const teacherActivitySwitch = within(dialog).getByRole('switch', { name: '允许协同教师创建活动' });
    expect(headmaster).toBeEnabled();
    expect(afterClassSwitch).toBeEnabled();
    expect(teacherActivitySwitch).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: '管理成员' })).toBeInTheDocument();
    for (const label of ['班级名称', '班级简介', '封面颜色', '班主任', '班级成员', '成员构成', '退出班级或课程结课后可查看内容', '协同教师可创建活动', '学生修改班级昵称']) {
      expect(within(dialog).getByRole('button', { name: `${label}说明` })).toBeInTheDocument();
    }
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('dialog=settings&class=physics-3');

    await user.clear(name);
    await user.type(name, '高二物理实验班');
    await user.selectOptions(headmaster, 'member-zhang');
    await user.click(afterClassSwitch);
    await user.click(teacherActivitySwitch);
    await user.click(within(dialog).getByRole('button', { name: '保存更改' }));
    expect(screen.queryByRole('dialog', { name: '班级属性' })).not.toBeInTheDocument();
    const updatedEdit = screen.getByRole('button', { name: '编辑高二物理实验班' });
    const updatedRow = updatedEdit.closest<HTMLElement>('[role="row"]');
    expect(updatedRow).not.toBeNull();
    expect(within(updatedRow!).getByText('张老师')).toBeInTheDocument();

    await user.click(updatedEdit);
    const reopenedDialog = screen.getByRole('dialog', { name: '班级属性' });
    expect(within(reopenedDialog).getByRole('switch', { name: '允许退出班级或课程结课后查看内容' })).not.toBeChecked();
    expect(within(reopenedDialog).getByRole('switch', { name: '允许协同教师创建活动' })).not.toBeChecked();
  });

  it('uses a single course axis and keeps existing content creation available', async () => {
    const user = userEvent.setup();
    renderWorkspace('physics-3');

    expect(screen.getByRole('combobox', { name: '当前课程' })).toBeInTheDocument();
    expect(screen.getByText('未结课')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '高二物理 3 班' })).not.toBeInTheDocument();
    expect(screen.getByText('第一单元 受力与动量')).toBeInTheDocument();
    expect(screen.queryByText('下一项安排')).not.toBeInTheDocument();
    expect(screen.queryByText('查看关联资源')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '编辑单元名称' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '编辑活动名称' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '新建内容' }));
    await user.click(screen.getByRole('menuitem', { name: '新建单元' }));
    await user.type(screen.getByRole('textbox', { name: '单元名称' }), '实验设计');
    await user.type(screen.getByRole('textbox', { name: '单元介绍' }), '围绕守恒定律设计验证实验。');
    await user.click(screen.getByRole('button', { name: '保存草稿' }));
    expect(screen.getByText('实验设计')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('单元草稿已保存');
  });

  it('keeps class collaboration active while a completed course is read-only', async () => {
    const user = userEvent.setup();
    renderWorkspace('physics-1');

    expect(screen.getByText('已结课')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '编辑班级' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '班级群聊' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '新建内容' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: '新建内容' }));
    expect(screen.getByRole('menuitem', { name: '新建课程' })).toBeEnabled();
    expect(screen.queryByRole('menuitem', { name: '新建单元' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /课程操作/ })).not.toBeInTheDocument();
  });

  it('edits the class in its property dialog and opens contextual dialogs without leaving the class', async () => {
    const user = userEvent.setup();
    renderWorkspace('physics-3');

    await user.click(screen.getByRole('button', { name: '编辑班级' }));
    const classDialog = screen.getByRole('dialog', { name: '班级属性' });
    const name = within(classDialog).getByRole('textbox', { name: '班级名称' });
    await user.clear(name);
    await user.type(name, '高二物理实验班');
    await user.click(within(classDialog).getByRole('button', { name: '保存更改' }));
    expect(screen.queryByRole('dialog', { name: '班级属性' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '班级群聊' }));
    expect(screen.getByRole('dialog', { name: '班级群聊' })).toBeInTheDocument();
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('dialog=chat');
    await user.click(screen.getByRole('button', { name: '关闭班级群聊' }));
    expect(screen.queryByRole('dialog', { name: '班级群聊' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '公告' }));
    expect(screen.getByRole('dialog', { name: '公告' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发布公告' })).toBeInTheDocument();
  });

  it('controls the auxiliary rail and deep-links class tasks', async () => {
    const user = userEvent.setup();
    renderWorkspace('physics-3');

    expect(screen.getByRole('complementary', { name: '班级辅助信息' })).toHaveAttribute('data-collapsed', 'false');
    expect(screen.getByText('这是共创页面!')).toBeInTheDocument();
    expect(screen.getByText('AI 助教')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '收起右侧栏' }));
    expect(screen.getByRole('complementary', { name: '班级辅助信息' })).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getByRole('button', { name: '展开右侧栏' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '班级待办' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/teacher/tasks?class=physics-3');
  });

  it('shows each activity type only once in activity metadata', () => {
    renderWorkspace('physics-3');

    expect(screen.getByText('课堂 · 40 分钟 · 30 位成员')).toBeInTheDocument();
    expect(screen.getByText('作业 · 今天 18:00 截止')).toBeInTheDocument();
    expect(screen.queryByText(/课堂 · 课堂/)).not.toBeInTheDocument();
    expect(screen.queryByText(/作业 · 作业/)).not.toBeInTheDocument();
  });

  it('shows compact role-aware text actions without replacing the detail entry', async () => {
    const user = userEvent.setup();
    renderWorkspace('physics-3');

    const lessonActions = screen.getByRole('group', { name: '动量守恒模型快捷操作' });
    const enterClassroom = within(lessonActions).getByRole('button', { name: '去上课' });
    expect(within(lessonActions).getByRole('button', { name: '去备课' })).toHaveAttribute('data-priority', 'secondary');
    expect(enterClassroom).toHaveTextContent('去上课');
    expect(enterClassroom).toHaveAttribute('data-priority', 'primary');
    expect(within(screen.getByRole('group', { name: '动量守恒作业 A 组快捷操作' })).getByRole('button', { name: '去批改' })).toBeInTheDocument();
    expect(screen.queryByText('查看详情')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看动量守恒模型详情' })).toBeInTheDocument();

    await user.click(enterClassroom);
    const operationDialog = screen.getByRole('dialog', { name: '动量守恒模型' });
    expect(operationDialog).toHaveTextContent('去上课');
    expect(operationDialog).toHaveTextContent('Demo Placeholder');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent(/^\/teacher\/classes\/physics-3$/);
  });

  it('keeps homework actions in the class activity dialog instead of navigating to homework details', async () => {
    const user = userEvent.setup();
    renderWorkspace('physics-3');

    const homeworkActions = screen.getByRole('group', { name: '动量守恒作业 A 组快捷操作' });
    await user.click(within(homeworkActions).getByRole('button', { name: '去批改' }));

    const dialog = screen.getByRole('dialog', { name: '动量守恒作业 A 组' });
    expect(dialog).toHaveTextContent('去批改');
    expect(dialog).toHaveTextContent('Demo Placeholder');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent(/^\/teacher\/classes\/physics-3$/);
  });

  it('shows report plus replay or record for completed teacher lessons', () => {
    const unavailable = renderWorkspace('physics-1');
    const unavailableActions = screen.getByRole('group', { name: '机械波基础快捷操作' });
    expect(within(unavailableActions).getByRole('button', { name: '课堂报告' })).toHaveAttribute('data-priority', 'primary');
    expect(within(unavailableActions).getByRole('button', { name: '课堂记录' })).toHaveAttribute('data-priority', 'secondary');
    expect(within(unavailableActions).queryByRole('button', { name: '看回放' })).not.toBeInTheDocument();
    unavailable.unmount();

    renderWorkspace('history-physics');
    const availableActions = screen.getByRole('group', { name: '基础复习课快捷操作' });
    expect(within(availableActions).getByRole('button', { name: '课堂报告' })).toBeInTheDocument();
    expect(within(availableActions).getByRole('button', { name: '看回放' })).toBeInTheDocument();
    expect(within(availableActions).queryByRole('button', { name: '课堂记录' })).not.toBeInTheDocument();
  });

  it('opens the exact completed-class shortcut in the shared operation dialog', async () => {
    const user = userEvent.setup();
    renderWorkspace('history-physics');

    const actions = screen.getByRole('group', { name: '基础复习课快捷操作' });
    await user.click(within(actions).getByRole('button', { name: '看回放' }));
    const dialog = screen.getByRole('dialog', { name: '基础复习课' });
    expect(dialog).toHaveTextContent('看回放');
    expect(dialog).not.toHaveTextContent('课堂报告为 Demo Placeholder');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/teacher/classes/history-physics');
  });

  it('opens an activity detail dialog without opening the auxiliary rail', async () => {
    const user = userEvent.setup();
    renderWorkspace('physics-3');

    await user.click(screen.getByRole('button', { name: '单元操作 第一单元 受力与动量' }));
    expect(screen.getByRole('menuitem', { name: '新建活动' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /在 .* 中新建活动/ })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: '查看动量守恒模型详情' }));
    const dialog = screen.getByRole('dialog', { name: '动量守恒模型' });
    expect(dialog).toHaveTextContent('所属课程');
    expect(dialog).toHaveTextContent('动量与碰撞');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent(/^\/teacher\/classes\/physics-3$/);
    expect(screen.getByRole('complementary', { name: '班级辅助信息' })).toHaveAttribute('data-collapsed', 'false');

    await user.click(within(dialog).getByRole('button', { name: '编辑名称' }));
    const editDialog = screen.getByRole('dialog', { name: '编辑活动' });
    const name = within(editDialog).getByRole('textbox', { name: '活动名称' });
    await user.clear(name);
    await user.type(name, '动量守恒演示课堂');
    await user.click(within(editDialog).getByRole('button', { name: '保存' }));
    expect(screen.getByText('动量守恒演示课堂')).toBeInTheDocument();
  });

  it('keeps class permission boundaries and protects unsaved settings', async () => {
    const user = userEvent.setup();
    renderWorkspace('physics-1');

    await user.click(screen.getByRole('button', { name: '编辑班级' }));
    const dialog = screen.getByRole('dialog', { name: '班级属性' });
    expect(within(dialog).getByText('退出班级或课程结课后可查看内容')).toBeInTheDocument();
    expect(within(dialog).getByText('协同教师可创建活动')).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: '班主任' })).toBeDisabled();
    expect(within(dialog).getByRole('switch', { name: '允许退出班级或课程结课后查看内容' })).toBeDisabled();
    expect(within(dialog).getByRole('switch', { name: '允许协同教师创建活动' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: '退出班级' })).toBeEnabled();

    const name = within(dialog).getByRole('textbox', { name: '班级名称' });
    await user.clear(name);
    await user.type(name, '高二物理协作班');
    await user.click(within(dialog).getByRole('button', { name: '关闭班级属性' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('班级属性尚未保存');
    expect(screen.getByRole('dialog', { name: '班级属性' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: '继续编辑' }));
    expect(within(dialog).queryByText('班级属性尚未保存')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '关闭班级属性' }));
    await user.click(within(dialog).getByRole('button', { name: '放弃修改' }));
    expect(screen.queryByRole('dialog', { name: '班级属性' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/teacher/classes/physics-1');
  });

  it('restores the settings dialog from a direct URL', () => {
    renderWorkspace('physics-1', '/teacher/classes/physics-1?dialog=settings');

    expect(screen.getByRole('dialog', { name: '班级属性' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '班级名称' })).toHaveValue('高二物理 1 班');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('dialog=settings');
  });

  it('confirms a collaborating teacher exit inside the settings dialog', async () => {
    const user = userEvent.setup();
    renderWorkspace('physics-1');

    await user.click(screen.getByRole('button', { name: '编辑班级' }));
    const dialog = screen.getByRole('dialog', { name: '班级属性' });
    await user.click(within(dialog).getByRole('button', { name: '退出班级' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('确认退出班级');
    await user.click(within(dialog).getByRole('button', { name: '确认退出' }));

    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/teacher/classes');
    expect(screen.queryByRole('dialog', { name: '班级属性' })).not.toBeInTheDocument();
  });

  it('protects an unpublished announcement draft', async () => {
    const user = userEvent.setup();
    renderWorkspace('physics-3');

    await user.click(screen.getByRole('button', { name: '公告' }));
    const dialog = screen.getByRole('dialog', { name: '公告' });
    await user.type(within(dialog).getByRole('textbox', { name: '公告标题' }), '尚未发布的公告');
    await user.click(within(dialog).getByRole('button', { name: '关闭公告' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('公告尚未发布');
    await user.click(within(dialog).getByRole('button', { name: '放弃修改' }));
    expect(screen.queryByRole('dialog', { name: '公告' })).not.toBeInTheDocument();
  });
});
