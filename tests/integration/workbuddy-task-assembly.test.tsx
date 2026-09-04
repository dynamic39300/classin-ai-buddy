import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '@app/App';

async function openIdealNewTask() {
  const teacherButton = screen.queryByRole('button', { name: /老师视角/ });
  if (teacherButton) await userEvent.click(teacherButton);
  const primaryNavigation = within(screen.getByRole('navigation', { name: '老师视角主导航' }));
  await userEvent.click(primaryNavigation.getByRole('button', { name: 'TeacherIn' }));
  await userEvent.click(within(primaryNavigation.getByRole('group', { name: 'TeacherIn 二级导航' })).getByRole('link', { name: '我的任务' }));
}

describe('TeacherIn task assembly integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('assembles Skills, Agents and cloud files without losing edited teacher text', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openIdealNewTask();

    expect(screen.queryByText('告诉我您想完成的教学工作，我会结合已授权的教学上下文，生成可检查、可修改的结果。')).not.toBeInTheDocument();
    expect(screen.queryByText('常用 Agent 和 Skill')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /核心上下文/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '核心上下文摘要' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Skill 生成单个课件' }));
    const composer = screen.getByRole('textbox', { name: '描述教学任务' });
    expect(composer).toHaveValue('为高一（3）班生成一份函数单调性智能课件，包含概念讲解、例题和课堂练习');
    expect(screen.getByRole('button', { name: '移除 Skill 生成单个课件' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Agent 每日名言' }));
    expect(composer).toHaveValue('请结合当前课程主题，推荐一句适合学生的每日名言，并解释其含义与课堂使用方式。');
    expect((composer as HTMLTextAreaElement).value).not.toContain('函数单调性智能课件');
    await user.clear(composer);
    await user.type(composer, '请保留教师已经改写的每日名言课堂活动。');
    await user.click(screen.getByRole('button', { name: '移除 Agent 每日名言' }));
    expect(composer).toHaveValue('请保留教师已经改写的每日名言课堂活动。');

    await user.click(screen.getByRole('button', { name: '添加任务材料' }));
    await user.click(within(screen.getByRole('dialog', { name: '添加任务材料' })).getByRole('menuitem', { name: /添加文件/ }));
    await user.click(within(screen.getByRole('dialog', { name: '添加文件' })).getByRole('menuitem', { name: /我的文件/ }));
    const fileDialog = await screen.findByRole('dialog', { name: '从我的文件添加' });
    await user.click(within(fileDialog).getByRole('checkbox', { name: /函数单调性课堂笔记\.pdf/ }));
    await user.click(within(fileDialog).getByRole('button', { name: '添加到任务' }));
    expect(screen.getByRole('button', { name: '移除文件 函数单调性课堂笔记.pdf' })).toBeVisible();
  });

  it('uses a compact progressive material picker with a visible way back', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openIdealNewTask();

    await user.click(screen.getByRole('button', { name: '添加任务材料' }));
    const root = screen.getByRole('dialog', { name: '添加任务材料' });
    await user.click(within(root).getByRole('menuitem', { name: /Skill/ }));
    const nested = screen.getByRole('dialog', { name: '选择 Skill' });
    expect(within(nested).getByRole('button', { name: '返回添加任务材料' })).toBeVisible();
    expect(within(nested).getByRole('textbox', { name: '搜索 Skill' })).toBeVisible();

    await user.click(within(nested).getByRole('button', { name: '返回添加任务材料' }));
    expect(screen.getByRole('dialog', { name: '添加任务材料' })).toBeVisible();
  });

  it('freezes the assembly and links it to the created Run', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openIdealNewTask();

    await user.click(screen.getByRole('button', { name: 'Skill 生成单个课件' }));
    await user.click(screen.getByRole('button', { name: 'Agent 孔子' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '创建任务' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: '创建任务' }));

    await waitFor(() => {
      const raw = window.sessionStorage.getItem('workbuddy:workspace-session:v4');
      expect(raw).not.toBeNull();
      const session = JSON.parse(raw!);
      const snapshotId = session.coursewareRun?.taskAssemblySnapshotId;
      expect(snapshotId).toMatch(/^task-assembly-single-courseware-/);
      expect(session.taskAssemblySnapshotsById[snapshotId].materials.map((item: { kind: string }) => item.kind)).toEqual(['skill', 'agent']);
      expect(session.taskAssemblySnapshotsById[snapshotId].agentPromptProvenance[0]).toMatchObject({ agentId: 'confucius', editState: 'untouched' });
    });
  });
});
