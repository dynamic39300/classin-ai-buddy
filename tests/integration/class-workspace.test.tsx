import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ClassWorkspace } from '@features/class-workspace/ClassWorkspace';
import { ClassWorkspaceProvider } from '@features/class-workspace/ClassWorkspaceProvider';

function renderWorkspace(
  role: 'teacher' | 'student-family',
  surface: 'classes' | 'open-courses' = 'classes',
  detailId?: string,
  initialEntry = '/',
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <ClassWorkspaceProvider>
        <ClassWorkspace role={role} surface={surface} detailId={detailId} />
      </ClassWorkspaceProvider>
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return <span aria-label="当前路径" role="none">{location.pathname}{location.search}</span>;
}

describe('class and open course workspace', () => {
  it('keeps class lists role-scoped and filters the visible collection', async () => {
    const user = userEvent.setup();
    renderWorkspace('student-family');

    expect(screen.getByText('初三英语 2 班')).toBeInTheDocument();
    expect(screen.queryByText('高二物理 1 班')).not.toBeInTheDocument();

    const classSearch = screen.getByPlaceholderText('搜索班级名称');
    await user.type(classSearch, '初三英语 2 班');
    expect(screen.getByText('初三英语 2 班')).toBeInTheDocument();
    expect(screen.queryByText('高二物理 3 班')).not.toBeInTheDocument();

    await user.clear(classSearch);
    expect(screen.getByText('高一物理基础班')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /进行中|已结课/ })).not.toBeInTheDocument();
  });

  it('lets a teacher create a class and restores focus after the editor closes', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');

    const trigger = screen.getByRole('button', { name: '新建班级' });
    await user.click(trigger);
    const panel = screen.getByRole('complementary', { name: '编辑工作面板' });
    await user.type(within(panel).getByRole('textbox', { name: '班级名称' }), '高三物理冲刺班');
    await user.click(within(panel).getByRole('button', { name: '保存' }));

    expect(screen.getByText('高三物理冲刺班')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('班级已创建');
    await waitFor(() => expect(trigger).toHaveFocus());

    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('complementary', { name: '编辑工作面板' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());

    await user.click(trigger);
    await user.type(screen.getByRole('textbox', { name: '班级名称' }), '未保存草稿');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('alert')).toHaveTextContent('尚未保存');
    await user.click(screen.getByRole('button', { name: '继续编辑' }));
    expect(screen.getByRole('textbox', { name: '班级名称' })).toHaveValue('未保存草稿');
    await user.click(screen.getByRole('button', { name: '取消' }));
    await user.click(screen.getByRole('button', { name: '放弃修改' }));
    expect(screen.queryByRole('complementary', { name: '编辑工作面板' })).not.toBeInTheDocument();
  });

  it('exposes teacher management and keeps student class details read-only', async () => {
    const user = userEvent.setup();
    const view = renderWorkspace('teacher', 'classes', 'physics-3');

    expect(screen.getByRole('button', { name: '编辑班级' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '邀请成员' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '去上课' }));
    expect(screen.getByRole('dialog', { name: '能力边界说明' })).toHaveTextContent('不连接真实课堂引擎');

    await user.click(screen.getByRole('button', { name: /公告/ }));
    expect(screen.getByRole('button', { name: '发布公告' })).toBeInTheDocument();
    expect(screen.getByText('课前练习单提醒')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '成员' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/teacher/classes/physics-3/members');

    view.unmount();
    renderWorkspace('student-family', 'classes', 'physics-3');
    expect(screen.queryByRole('button', { name: '编辑班级' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '邀请成员' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '新课程' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '学习计划' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('暂无学习计划')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '课程目录' }));
    expect(screen.getByRole('button', { name: '去做作业' })).toBeInTheDocument();
    expect(screen.queryByText('错题订正与复习')).not.toBeInTheDocument();
    expect(screen.queryByText('机械波错题订正')).not.toBeInTheDocument();
  });

  it('manages courses and confirms destructive deletion', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', 'classes', 'physics-3');

    await user.click(screen.getByRole('button', { name: '新课程' }));
    await user.type(screen.getByRole('textbox', { name: '课程名称' }), '实验探究');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByRole('tab', { name: /实验探究/ })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('课程已创建');

    await user.click(screen.getByRole('button', { name: '重命名' }));
    const name = screen.getByRole('textbox', { name: '课程名称' });
    await user.clear(name);
    await user.type(name, '实验探究与建模');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByRole('tab', { name: /实验探究与建模/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '删除' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('实验探究与建模');
    await user.click(within(dialog).getByRole('button', { name: '确认删除' }));
    expect(screen.queryByRole('tab', { name: /实验探究与建模/ })).not.toBeInTheDocument();
  });

  it('saves and publishes units, then creates a pending non-homework activity', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', 'classes', 'physics-3');

    await user.click(screen.getByRole('button', { name: '新建单元' }));
    await user.type(screen.getByRole('textbox', { name: '单元名称' }), '实验设计');
    await user.type(screen.getByRole('textbox', { name: '单元介绍' }), '围绕守恒定律设计验证实验。');
    await user.click(screen.getByRole('button', { name: '保存草稿' }));
    expect(screen.getByRole('status')).toHaveTextContent('单元草稿已保存');
    expect(screen.getByText('实验设计')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '编辑单元 实验设计' }));
    await user.click(screen.getByRole('button', { name: '发布' }));
    expect(screen.getByRole('status')).toHaveTextContent('单元已发布');

    await user.click(screen.getByRole('button', { name: '在 实验设计 中新建活动' }));
    await user.click(screen.getByRole('radio', { name: '练习' }));
    await user.type(screen.getByRole('textbox', { name: '活动标题' }), '动量实验练习');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('动量实验练习')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('练习已创建，状态为待开始');
  });

  it('hands homework creation to the homework module with class context', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', 'classes', 'physics-3');

    await user.click(screen.getByRole('button', { name: '在 第一单元 受力与动量 中新建活动' }));
    await user.click(screen.getByRole('radio', { name: '作业' }));
    await user.click(screen.getByRole('button', { name: '进入作业编辑器' }));

    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/teacher/homework/new?class=physics-3&course=course-momentum&source=class_unit&unit=unit-momentum-1');
  });

  it('lets a student join an open course without exposing teacher editing', async () => {
    const user = userEvent.setup();
    renderWorkspace('student-family', 'open-courses', 'open-reading');

    expect(screen.queryByRole('button', { name: '编辑公开课' })).not.toBeInTheDocument();
    const join = screen.getByRole('button', { name: '加入公开课' });
    await user.click(join);
    expect(screen.getByRole('status')).toHaveTextContent('已加入公开课');
    expect(screen.getByRole('button', { name: '查看公开课' })).toBeInTheDocument();
  });

  it('opens the focused class chat from class details', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', 'classes', 'physics-3');
    await user.click(screen.getByRole('button', { name: '班级消息' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/teacher/classes/physics-3/chat');
  });

  it('returns home only when the detail originated from home', async () => {
    const user = userEvent.setup();
    const view = renderWorkspace('teacher', 'classes', 'physics-3', '/teacher/classes/physics-3?from=home');
    await user.click(screen.getByRole('button', { name: '首页' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/teacher/home');

    view.unmount();
    renderWorkspace('teacher', 'classes', 'physics-3', '/teacher/classes/physics-3');
    await user.click(screen.getByRole('button', { name: '我的班级' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/teacher/classes');
  });

  it('blocks direct URLs for records outside the current role', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ClassWorkspaceProvider>
          <ClassWorkspace role="student-family" surface="classes" detailId="physics-1" />
        </ClassWorkspaceProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText('找不到这个内容')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ClassWorkspaceProvider>
          <ClassWorkspace role="student-family" surface="open-courses" detailId="open-history" />
        </ClassWorkspaceProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText('找不到这个内容')).toBeInTheDocument();
  });
});
