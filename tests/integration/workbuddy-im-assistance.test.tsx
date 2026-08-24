import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMemo, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MessageWorkspace, MessageWorkspaceProvider, useMessageWorkspaceStore } from '@features/message-workspace';
import { WorkBuddyImProvider, createImmediateWorkBuddyImExperienceScheduler } from '@features/workbuddy-im-assistance';
import { createHomeworkScenario, HOMEWORK_NOW } from '@mocks/scenarios/homework';
import { MockWorkBuddyImHomeworkReminderAdapter } from '@mocks/adapters/workbuddy-im-homework-reminder';
import type { HomeworkReminderAdapterScenario } from '@contracts/workbuddy/im-homework-reminder';

function TestWorkBuddyBridge({ children, mode = 'success' }: { children: ReactNode; mode?: HomeworkReminderAdapterScenario | 'empty' }) {
  const { actions } = useMessageWorkspaceStore();
  const adapter = useMemo(() => {
    const scenario = createHomeworkScenario();
    const instance = new MockWorkBuddyImHomeworkReminderAdapter({
      readSnapshot: ({ classId, classLabel }) => ({
        ...scenario,
        classId,
        classLabel,
        homeworks: mode === 'empty' ? scenario.homeworks.filter(({ publication }) => publication.kind === 'draft') : scenario.homeworks,
      }),
      appendTeacherMessage: ({ id, threadId, authorName, body, sentAt }) => actions.appendMessage({
        role: 'teacher', authorName, threadId, body, sentAt, messageId: id,
      }),
    });
    if (mode !== 'empty') instance.setScenario(mode);
    return instance;
  }, [actions, mode]);
  const scheduler = useMemo(() => createImmediateWorkBuddyImExperienceScheduler(), []);
  return <WorkBuddyImProvider adapter={adapter} experienceScheduler={scheduler} teacher={{ id: 'teacher-001', name: '王老师' }} now={() => HOMEWORK_NOW}>{children}</WorkBuddyImProvider>;
}

function createWorkspaceTree(
  role: 'teacher' | 'student-family',
  mode?: HomeworkReminderAdapterScenario | 'empty',
  immersive = false,
) {
  return (
    <MemoryRouter>
      <MessageWorkspaceProvider>
        <TestWorkBuddyBridge mode={mode}>
          <MessageWorkspace immersive={immersive} role={role} />
        </TestWorkBuddyBridge>
      </MessageWorkspaceProvider>
    </MemoryRouter>
  );
}

function renderWorkspace(
  role: 'teacher' | 'student-family',
  mode?: HomeworkReminderAdapterScenario | 'empty',
  immersive = false,
) {
  return render(createWorkspaceTree(role, mode, immersive));
}

describe('WorkBuddy IM assistance', () => {
  it('keeps WorkBuddy private to teachers in class chat', () => {
    const { unmount } = renderWorkspace('teacher');
    expect(screen.getByRole('button', { name: 'WorkBuddy' })).toBeInTheDocument();

    unmount();
    renderWorkspace('student-family');
    expect(screen.queryByRole('button', { name: 'WorkBuddy' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('WorkBuddy 私密协作窗口')).not.toBeInTheDocument();
  });

  it('keeps WorkBuddy persistent across teacher immersive class and direct chats', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', undefined, true);

    const sidecar = await screen.findByLabelText('WorkBuddy 私密协作窗口');
    expect(sidecar).toHaveAttribute('data-dismissible', 'false');
    expect(within(sidecar).queryByRole('button', { name: '关闭 WorkBuddy' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'WorkBuddy' })).not.toBeInTheDocument();
    expect(within(sidecar).getByText('高二物理 3 班')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '私聊' }));
    await waitFor(() => expect(within(sidecar).getByText('李明')).toBeInTheDocument());
    expect(within(sidecar).getByText('告诉我你想如何回复当前私聊')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'WorkBuddy' })).not.toBeInTheDocument();
  });

  it('closes WorkBuddy after exiting immersive even when it was already open on entry', async () => {
    const user = userEvent.setup();
    const view = renderWorkspace('teacher');
    await user.click(screen.getByRole('button', { name: 'WorkBuddy' }));
    expect(screen.getByLabelText('WorkBuddy 私密协作窗口')).toHaveAttribute('data-dismissible', 'true');

    view.rerender(createWorkspaceTree('teacher', undefined, true));
    expect(screen.getByLabelText('WorkBuddy 私密协作窗口')).toHaveAttribute('data-dismissible', 'false');

    view.rerender(createWorkspaceTree('teacher'));
    await waitFor(() => expect(screen.queryByLabelText('WorkBuddy 私密协作窗口')).not.toBeInTheDocument());
  });

  it('uses the current teacher direct chat to prepare a reply without sending it', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');
    await user.click(screen.getByRole('button', { name: '私聊' }));

    const trigger = screen.getByRole('button', { name: 'WorkBuddy' });
    await user.click(trigger);
    expect(screen.getByText('告诉我你想如何回复当前私聊')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '生成回复建议' }));

    const suggestion = screen.getByRole('textbox', { name: '私聊回复建议正文' });
    expect((suggestion as HTMLTextAreaElement).value).toContain('我看到了你提到的');
    await user.click(screen.getByRole('button', { name: '插入回复框' }));
    expect(screen.queryByLabelText('WorkBuddy 私密协作窗口')).not.toBeInTheDocument();
    expect((screen.getByRole('textbox', { name: '输入消息' }) as HTMLTextAreaElement).value).toContain('我看到了你提到的');
    expect(screen.getByRole('status')).toHaveTextContent('请确认后发送');
    expect(within(screen.getByLabelText('消息记录')).queryByText(/我看到了你提到的/)).not.toBeInTheDocument();
  });

  it('closes the private sidecar with Escape and restores the WorkBuddy trigger', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');
    const trigger = screen.getByRole('button', { name: 'WorkBuddy' });
    await user.click(trigger);
    expect(screen.getByLabelText('WorkBuddy 私密协作窗口')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByLabelText('WorkBuddy 私密协作窗口')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('shows distinct empty and read-failure states without creating a group message', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWorkspace('teacher', 'empty');
    await user.click(screen.getByRole('button', { name: 'WorkBuddy' }));
    await user.click(screen.getByRole('button', { name: '生成消息草稿' }));
    await waitFor(() => expect(screen.getByText('当前没有未截止的作业')).toBeInTheDocument());
    expect(within(screen.getByLabelText('消息记录')).queryByText(/以下作业尚未截止/)).not.toBeInTheDocument();

    unmount();
    renderWorkspace('teacher', 'read_failure');
    await user.click(screen.getByRole('button', { name: 'WorkBuddy' }));
    await user.click(screen.getByRole('button', { name: '生成消息草稿' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('暂时无法读取作业与提交状态'));
    expect(within(screen.getByLabelText('消息记录')).queryByText(/以下作业尚未截止/)).not.toBeInTheDocument();
  });

  it('generates, revises, approves and sends one grouped reminder as the teacher', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');

    await user.click(screen.getByRole('button', { name: 'WorkBuddy' }));
    const sidecar = screen.getByLabelText('WorkBuddy 私密协作窗口');
    expect(within(sidecar).getByText('仅你可见')).toBeInTheDocument();
    expect(within(sidecar).getByText('高二物理 3 班')).toBeInTheDocument();

    expect(within(sidecar).getByRole('button', { name: '作业催交核对未截止作业并提醒未提交学员' })).toBeInTheDocument();
    expect(within(sidecar).getByRole('button', { name: '课前准备根据本周教学计划生成课前准备通知' })).toBeInTheDocument();
    await user.click(within(sidecar).getByRole('button', { name: '生成消息草稿' }));
    await waitFor(() => expect(within(sidecar).getByText('2 项作业', { exact: true })).toBeInTheDocument());
    expect(within(sidecar).getByText('已拆解为 4 个执行步骤')).toBeInTheDocument();
    expect(within(sidecar).getAllByLabelText(/· 已完成$/)).toHaveLength(4);
    expect(within(sidecar).getByText('提醒草稿已生成')).toBeInTheDocument();
    expect(within(sidecar).getByText('待你审阅')).toBeInTheDocument();
    expect(within(sidecar).getByText('群消息草稿已生成')).toBeInTheDocument();
    expect(within(sidecar).getByText('未发送')).toBeInTheDocument();
    expect(within(sidecar).getByLabelText('发送身份 王老师')).toBeInTheDocument();
    expect(within(sidecar).getByLabelText('30 位群成员可见')).toHaveTextContent('30 人可见');
    expect(within(sidecar).getByText('5 位学生', { exact: true })).toBeInTheDocument();
    expect(within(sidecar).getByText('动量守恒作业 A 组')).toBeInTheDocument();
    expect(within(sidecar).getByRole('button', { name: '从动量守恒作业 A 组移除李明' })).toBeInTheDocument();
    expect(within(sidecar).queryByRole('button', { name: '还原名单至本次草稿最初生成的范围' })).not.toBeInTheDocument();
    expect(within(screen.getByLabelText('消息记录')).queryByText(/以下作业尚未截止/)).not.toBeInTheDocument();

    await user.click(within(sidecar).getByRole('button', { name: '从动量守恒作业 A 组移除李明' }));
    const draftEditor = within(sidecar).getByRole('textbox', { name: '群消息正文' });
    expect(draftEditor).not.toHaveValue(expect.stringContaining('@李明 @周悦'));
    expect(within(sidecar).getByText('4 位学生', { exact: true })).toBeInTheDocument();
    await user.click(within(sidecar).getByRole('button', { name: '还原名单至本次草稿最初生成的范围' }));
    expect((draftEditor as HTMLTextAreaElement).value).toContain('@李明 @周悦');
    expect(within(sidecar).getByText('5 位学生', { exact: true })).toBeInTheDocument();
    expect(within(sidecar).queryByRole('button', { name: '还原名单至本次草稿最初生成的范围' })).not.toBeInTheDocument();

    await user.click(within(sidecar).getByRole('button', { name: '从动量守恒作业 A 组移除李明' }));
    await user.clear(draftEditor);
    await user.type(draftEditor, '请以下同学今天完成作业。');
    expect(within(sidecar).getByText('有修改')).toBeInTheDocument();

    await user.click(within(sidecar).getByRole('button', { name: '确认并发送至高二物理 3 班' }));
    await waitFor(() => expect(within(sidecar).getByText('已发送 1 条班级群消息')).toBeInTheDocument());
    const receipt = within(sidecar).getByRole('status', { name: '班级群消息发送成功' });
    expect(within(receipt).getByText('王老师 → 高二物理 3 班 · [模拟] ClassIn 群消息执行回执')).toBeInTheDocument();
    expect(within(receipt).getByRole('button', { name: '查看群消息' })).toBeInTheDocument();
    expect(within(receipt).queryByText('发送身份')).not.toBeInTheDocument();
    expect(within(sidecar).getByText('已记录教师采纳结果')).toBeInTheDocument();
    expect(within(sidecar).getByText(/\[模拟\] WorkBuddy 评价事件.*尚不代表教学效果/)).toBeInTheDocument();

    const timeline = screen.getByLabelText('消息记录');
    const sentMessage = within(timeline).getByText('请以下同学今天完成作业。');
    expect(sentMessage.closest('article')).toHaveTextContent('我 ·');
    expect(sentMessage).not.toHaveTextContent('WorkBuddy');
    expect(within(sidecar).getAllByText(/\[模拟\] ClassIn 群消息执行回执/).length).toBeGreaterThanOrEqual(2);
  });

  it('creates a second simulated task from the weekly teaching plan and sends one teacher notice', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');

    await user.click(screen.getByRole('button', { name: 'WorkBuddy' }));
    const sidecar = screen.getByLabelText('WorkBuddy 私密协作窗口');
    await user.click(within(sidecar).getByRole('button', { name: '课前准备根据本周教学计划生成课前准备通知' }));

    const composer = within(sidecar).getByRole('textbox', { name: '向 WorkBuddy 输入要求' });
    expect(composer).toHaveValue('你帮我看看本周的教学计划，然后看看我们是不是可以让孩子们提前做好准备，给孩子们形成一条通知消息，以便我一键发给他们。');
    await user.click(within(sidecar).getByRole('button', { name: '生成消息草稿' }));

    await waitFor(() => expect(within(sidecar).getByRole('heading', { name: '课前准备通知已生成' })).toBeInTheDocument());
    expect(within(sidecar).getByText('读取本周教学计划')).toBeInTheDocument();
    expect(within(sidecar).getByText('提炼课前准备事项')).toBeInTheDocument();
    expect(within(sidecar).getByText('生成班级通知草稿')).toBeInTheDocument();
    expect(within(sidecar).getByText('3 节课', { exact: true })).toBeInTheDocument();
    expect(within(sidecar).getByText('6 项准备', { exact: true })).toBeInTheDocument();
    expect(within(sidecar).getByText('动量守恒定律')).toBeInTheDocument();
    expect(within(sidecar).getByText('碰撞模型综合')).toBeInTheDocument();
    expect(within(sidecar).getByText('机械波基础')).toBeInTheDocument();
    const noticeEditor = within(sidecar).getByRole('textbox', { name: '群通知正文' });
    expect((noticeEditor as HTMLTextAreaElement).value).toContain('根据本周（8月10日－8月14日）教学计划');
    expect(within(screen.getByLabelText('消息记录')).queryByText(/根据本周.*教学计划/)).not.toBeInTheDocument();

    await user.click(within(sidecar).getByRole('button', { name: '确认并发送至高二物理 3 班' }));
    await waitFor(() => expect(within(sidecar).getByText('已发送 1 条班级群消息')).toBeInTheDocument());
    expect(within(screen.getByLabelText('消息记录')).getByText(/根据本周.*教学计划/)).toBeInTheDocument();
  });

  it('retains both failed and successful execution evidence when a recoverable send succeeds on retry', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', 'recoverable_failure');
    await user.click(screen.getByRole('button', { name: 'WorkBuddy' }));
    const sidecar = screen.getByLabelText('WorkBuddy 私密协作窗口');
    await user.click(within(sidecar).getByRole('button', { name: '生成消息草稿' }));
    await waitFor(() => expect(within(sidecar).getByRole('button', { name: /确认并发送/ })).toBeInTheDocument());
    await user.click(within(sidecar).getByRole('button', { name: /确认并发送/ }));
    await waitFor(() => expect(within(sidecar).getByRole('button', { name: '重试发送' })).toBeInTheDocument());
    expect(within(sidecar).getByText('已记录本次未完成采纳')).toBeInTheDocument();

    await user.click(within(sidecar).getByRole('button', { name: '重试发送' }));
    await waitFor(() => expect(within(sidecar).getByText('已记录教师采纳结果')).toBeInTheDocument());
    expect(within(sidecar).getByText('已记录本次未完成采纳')).toBeInTheDocument();
    expect(within(sidecar).getByText('班级群消息执行未完成')).toBeInTheDocument();
    expect(within(sidecar).getByText('班级群消息执行完成')).toBeInTheDocument();
    expect(within(sidecar).getAllByText(/\[模拟\] WorkBuddy 评价事件/)).toHaveLength(2);
  });
});
