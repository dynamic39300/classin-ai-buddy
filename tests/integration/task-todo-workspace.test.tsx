import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TaskTodoWorkspace } from '@features/task-todo-workspace/TaskTodoWorkspace';

function renderWorkspace(role: 'teacher' | 'student-family', initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <TaskTodoWorkspace role={role} />
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return <span aria-label="当前路径" role="none">{location.pathname}{location.search}</span>;
}

describe('task and todo workspace', () => {
  it('groups teacher tasks and opens a named detail dialog', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');

    expect(screen.getByRole('heading', { name: '已过截止' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '今日要处理' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '后续要处理' })).toBeInTheDocument();
    expect(document.querySelector('[data-teaching-object="homework"]')).toBeInTheDocument();
    expect(document.querySelector('[data-teaching-object="quiz"]')).toBeInTheDocument();
    const overdueRow = screen.getByText('机械波错题订正').closest('article')!;
    expect(within(overdueRow).getByRole('button', { name: '去批改' })).toBeInTheDocument();
    expect(within(overdueRow).getByRole('button', { name: '去催交' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: '任务工作面板' })).not.toBeInTheDocument();
    expect(screen.queryByText('5 项任务')).not.toBeInTheDocument();

    expect(overdueRow).toHaveAttribute('data-bucket', 'overdue');
    expect(overdueRow).toHaveAttribute('data-kind', 'homework');
    expect(within(overdueRow).getByText('收集中（26/30）')).toBeInTheDocument();
    expect(overdueRow.querySelector('small[data-kind="homework"]')).toHaveTextContent('作业');
    expect(screen.getByText('机械波错题订正').closest('button')?.querySelectorAll(':scope > span')).toHaveLength(2);

    await user.click(screen.getByText('机械波错题订正').closest('button')!);
    const dialog = screen.getByRole('dialog', { name: '机械波错题订正' });
    expect(within(dialog).getByText('已提交')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '去批改' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '去催交' })).toBeInTheDocument();
    expect(dialog.querySelector('[data-teaching-object="homework"]')).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '去批改' })).toHaveFocus());

    await user.click(within(dialog).getByRole('button', { name: '去批改' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/?task=task-wave-correction');
    expect(screen.getByRole('dialog', { name: '作业批改' })).toHaveTextContent('未连接批改服务');
    await user.click(screen.getByRole('button', { name: '返回任务详情' }));
    expect(screen.getByRole('dialog', { name: '机械波错题订正' })).toBeInTheDocument();
  });

  it('opens classroom actions as an in-place placeholder dialog', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');

    const classroomRow = screen.getByText('动量守恒模型').closest('article')!;
    const enterButton = within(classroomRow).getByRole('button', { name: '去上课' });
    await user.click(enterButton);

    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/?task=task-class-momentum');
    expect(screen.getByRole('dialog', { name: '去上课' })).toHaveTextContent('未连接课堂服务');
    await user.click(screen.getByRole('button', { name: '关闭' }));
    await waitFor(() => expect(enterButton).toHaveFocus());
  });

  it('opens classroom preparation instead of the homework reminder confirmation', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');

    const classroomRow = screen.getByText('动量守恒模型').closest('article')!;
    const prepareButton = within(classroomRow).getByRole('button', { name: '去备课' });
    await user.click(prepareButton);

    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/?task=task-class-momentum');
    expect(screen.getByRole('dialog', { name: '去备课' })).toHaveTextContent('未连接课堂服务');
    expect(screen.queryByRole('dialog', { name: '确认催交' })).not.toBeInTheDocument();
  });

  it('keeps learning material actions inside a type-specific placeholder dialog', async () => {
    const user = userEvent.setup();
    renderWorkspace('student-family');

    const materialRow = screen.getByText('复习动量模型知识图谱').closest('article')!;
    const learnButton = within(materialRow).getByRole('button', { name: '去学习' });
    await user.click(learnButton);

    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/?task=task-momentum-material');
    expect(screen.getByRole('dialog', { name: '去学习' })).toHaveTextContent('未连接资料服务');
    expect(screen.queryByText('资料入口已保留')).not.toBeInTheDocument();
  });

  it('derives student actions from submission state without teacher-only tasks', async () => {
    const user = userEvent.setup();
    renderWorkspace('student-family');

    expect(screen.queryByText('发布周末学习提醒')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '补交' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '继续作业' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '去订正' })).toBeInTheDocument();

    const continueButton = screen.getByRole('button', { name: '继续作业' });
    await user.click(continueButton);
    const operationDialog = screen.getByRole('dialog', { name: '继续作业' });
    expect(operationDialog).toHaveTextContent('未连接作答服务');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/?task=task-homework-momentum');
    await user.click(within(operationDialog).getByRole('button', { name: '返回任务详情' }));
    expect(screen.getByRole('dialog', { name: '动量守恒作业 A 组' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭任务详情' }));
    await waitFor(() => expect(continueButton).toHaveFocus());

    await user.click(screen.getByText('阅读笔记：人物描写').closest('button')!);
    const dialog = screen.getByRole('dialog', { name: '阅读笔记：人物描写' });
    expect(within(dialog).getByText('已提交 · 等待老师批改')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '查看提交' })).toBeInTheDocument();
  });

  it('filters results and restores focus after closing details', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');

    const search = screen.getByRole('searchbox', { name: '搜索任务' });
    await user.type(search, '不存在的任务');
    expect(screen.getByText('没有符合条件的内容')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '清除全部筛选' }));

    const taskButton = screen.getByText('动量守恒作业 A 组').closest('button')!;
    await user.click(taskButton);
    await user.click(screen.getByRole('button', { name: '关闭任务详情' }));
    await waitFor(() => expect(taskButton).toHaveFocus());
  });

  it('archives only a manually manageable reminder and can restore it', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');

    await user.click(screen.getByText('发布周末学习提醒').closest('button')!);
    await user.click(screen.getByRole('button', { name: '忽略此提醒' }));
    expect(within(screen.getByRole('main', { name: '任务列表' })).getByText('发布周末学习提醒')).toBeInTheDocument();
    expect(within(screen.getByRole('main', { name: '任务列表' })).getByText('已忽略')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '恢复待处理' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '恢复待处理' }));
    expect(screen.getByRole('button', { name: '忽略此提醒' })).toBeInTheDocument();
  });

  it('restores a task from the URL and reports role-inaccessible targets', () => {
    const { unmount } = renderWorkspace('teacher', '/teacher/tasks?task=task-wave-correction');
    expect(screen.getByRole('dialog', { name: '机械波错题订正' })).toBeInTheDocument();

    unmount();
    renderWorkspace('student-family', '/student/todos?task=task-weekend-announcement');
    expect(screen.getByRole('status')).toHaveTextContent('目标任务在当前视角不可用');
  });

  it('filters by class and course from the compact filter popover and preserves URL state', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWorkspace('teacher', '/teacher/tasks?class=physics-3&course=%E9%AB%98%E4%BA%8C%E7%89%A9%E7%90%86');

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const filterTrigger = screen.getByRole('button', { name: '筛选任务' });
    await user.click(filterTrigger);
    expect(screen.getByRole('combobox', { name: '班级范围' })).toHaveValue('physics-3');
    expect(screen.getByRole('combobox', { name: '课程范围' })).toHaveValue('高二物理');
    expect(screen.getByRole('combobox', { name: '任务类型' })).toHaveValue('all');
    expect(screen.queryByText('初三英语阅读打卡')).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: '筛选任务选项' })).not.toBeInTheDocument();
    await waitFor(() => expect(filterTrigger).toHaveFocus());
    await user.click(screen.getByText('动量守恒作业 A 组').closest('button')!);
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('class=physics-3');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('course=');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('task=');

    unmount();
    renderWorkspace('teacher', '/teacher/tasks?class=missing-class');
    await user.click(screen.getByRole('button', { name: '筛选任务' }));
    expect(screen.getByRole('combobox', { name: '班级范围' })).toHaveValue('all');
    expect(screen.getByRole('status')).toHaveTextContent('当前班级筛选不可用');
  });

  it('restores lifecycle, search, type, class, course and task detail from the URL', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', '/teacher/tasks?lifecycle=done&q=%E7%89%9B%E9%A1%BF&kind=quiz&class=physics-1&course=%E9%AB%98%E4%BA%8C%E7%89%A9%E7%90%86&task=task-newton-review-done');

    expect(screen.getByRole('button', { name: '已处理' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('searchbox', { name: '搜索任务' })).toHaveValue('牛顿');
    expect(screen.getByRole('dialog', { name: '牛顿定律周测讲评' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭任务详情' }));
    await user.click(screen.getByRole('button', { name: '筛选任务' }));
    expect(screen.getByRole('combobox', { name: '班级范围' })).toHaveValue('physics-1');
    expect(screen.getByRole('combobox', { name: '课程范围' })).toHaveValue('高二物理');
    expect(screen.getByRole('combobox', { name: '任务类型' })).toHaveValue('quiz');
  });

  it('does not invent a class messaging action in task details', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');
    await user.click(screen.getByText('动量守恒作业 A 组').closest('button')!);
    expect(screen.queryByRole('button', { name: '发群消息' })).not.toBeInTheDocument();
  });
});
