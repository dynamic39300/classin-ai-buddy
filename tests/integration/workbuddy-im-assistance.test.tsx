import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMemo, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MessageWorkspace, MessageWorkspaceProvider, useMessageWorkspaceStore } from '@features/message-workspace';
import { WorkBuddyImProvider, createImmediateWorkBuddyImExperienceScheduler } from '@features/workbuddy-im-assistance';
import { createHomeworkScenario, HOMEWORK_NOW } from '@mocks/scenarios/homework';
import { MockWorkBuddyImHomeworkReminderAdapter } from '@mocks/adapters/workbuddy-im-homework-reminder';
import { MockGuidedExplanationDistributionAdapter } from '@mocks/adapters/workbuddy-guided-explanation';
import type { HomeworkReminderAdapterScenario } from '@contracts/workbuddy/im-homework-reminder';
import type { GuidedExplanationScenario } from '@contracts/workbuddy/guided-explanation';

function TestWorkBuddyBridge({ children, mode = 'success', guidedMode = 'success' }: { children: ReactNode; mode?: HomeworkReminderAdapterScenario | 'empty'; guidedMode?: GuidedExplanationScenario }) {
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
  const guidedExplanationAdapter = useMemo(() => {
    const instance = new MockGuidedExplanationDistributionAdapter({ appendTeacherMessage: ({ id, threadId, authorName, body, sentAt, contentReference }) => actions.appendMessage({ role: 'teacher', authorName, threadId, body, sentAt, messageId: id, contentReference }) });
    instance.setScenario(guidedMode);
    return instance;
  }, [actions, guidedMode]);
  const scheduler = useMemo(() => createImmediateWorkBuddyImExperienceScheduler(), []);
  return <WorkBuddyImProvider adapter={adapter} guidedExplanationAdapter={guidedExplanationAdapter} experienceScheduler={scheduler} teacher={{ id: 'teacher-001', name: '王老师' }} now={() => HOMEWORK_NOW}>{children}</WorkBuddyImProvider>;
}

function createWorkspaceTree(
  role: 'teacher' | 'student-family',
  mode?: HomeworkReminderAdapterScenario | 'empty',
  immersive = false,
  guidedMode: GuidedExplanationScenario = 'success',
) {
  return (
    <MemoryRouter>
      <MessageWorkspaceProvider>
        <TestWorkBuddyBridge mode={mode} guidedMode={guidedMode}>
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
  guidedMode: GuidedExplanationScenario = 'success',
) {
  return render(createWorkspaceTree(role, mode, immersive, guidedMode));
}

describe('WorkBuddy IM assistance', () => {
  it('generates, approves, distributes and opens a format-neutral guided explanation', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');
    await user.click(screen.getByRole('button', { name: 'WorkBuddy' }));
    const sidecar = screen.getByLabelText('WorkBuddy 私密协作窗口');
    await user.click(within(sidecar).getByRole('button', { name: /单题讲解生成可打开的分步讲题内容/ }));
    await user.click(within(sidecar).getByRole('button', { name: '生成消息草稿' }));

    const review = await within(sidecar).findByLabelText('单题交互讲解待审核');
    expect((within(review).getByRole('textbox', { name: '学生题目' }) as HTMLTextAreaElement).value).toContain('0.20 kg');
    expect((within(review).getByRole('textbox', { name: '最终发送话术' }) as HTMLTextAreaElement).value).toContain('练习单第 5 题');
    const previewLink = within(review).getByRole('button', { name: '查看分步讲解' });
    await user.click(previewLink);
    expect(screen.getByRole('dialog', { name: '小球正碰：用动量守恒求碰后速度' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(previewLink).toHaveFocus());
    expect((within(review).getByRole('textbox', { name: '第 2 步讲解' }) as HTMLTextAreaElement).value).toContain('m_Av_A + m_Bv_B');
    expect((within(review).getByRole('textbox', { name: '教师审核版完整答案' }) as HTMLTextAreaElement).value).toContain('4.0 m/s');
    const questionEditor = within(review).getByRole('textbox', { name: '学生题目' });
    const stepTitleEditor = within(review).getByRole('textbox', { name: '第 3 步标题' });
    const processEditor = within(review).getByRole('textbox', { name: '第 3 步讲解' });
    const checkpointEditor = within(review).getByRole('textbox', { name: '第 3 步检查点' });
    const answerEditor = within(review).getByRole('textbox', { name: '教师审核版完整答案' });
    const messageEditor = within(review).getByRole('textbox', { name: '最终发送话术' });
    await user.clear(messageEditor);
    await user.type(messageEditor, '同学们，第 5 题的分步解法已经整理好，请打开链接查看。');
    await user.clear(questionEditor);
    await user.type(questionEditor, '教师核对后的完整碰撞题目：A 与 B 正碰，求 B 碰后速度。');
    await user.clear(processEditor);
    await user.type(processEditor, "教师修订计算：0.30×v'_B = 1.20，所以 v'_B = 4.0 m/s。");
    await user.clear(stepTitleEditor);
    await user.type(stepTitleEditor, '教师修订后的计算步骤');
    await user.clear(checkpointEditor);
    await user.type(checkpointEditor, '检查单位与方向。');
    await user.clear(answerEditor);
    await user.type(answerEditor, '教师修订答案：小球 B 碰后以 4.0 m/s 向右运动。');
    expect(within(review).getByRole('button', { name: '确认保存并发送' })).toBeDisabled();
    await user.click(within(review).getByRole('button', { name: '应用修改' }));
    await waitFor(() => expect(within(sidecar).getByText('v2 · 未发送')).toBeInTheDocument());
    const revisedReview = within(sidecar).getByLabelText('单题交互讲解待审核');
    await user.click(within(revisedReview).getByRole('button', { name: '确认保存并发送' }));

    expect(await within(sidecar).findByLabelText('讲题内容发送成功')).toBeInTheDocument();
    await user.click(within(sidecar).getByRole('button', { name: '查看消息' }));
    expect(screen.getAllByText('同学们，第 5 题的分步解法已经整理好，请打开链接查看。').length).toBeGreaterThanOrEqual(1);
    const openButton = await screen.findByRole('button', { name: '查看分步讲解' });
    await user.click(openButton);
    const viewer = screen.getByRole('dialog', { name: '小球正碰：用动量守恒求碰后速度' });
    expect(within(viewer).getByText('完整答案')).toBeInTheDocument();
    expect(within(viewer).getByText(/教师修订计算/)).toBeInTheDocument();
    expect(within(viewer).getByText('教师修订后的计算步骤')).toBeInTheDocument();
    expect(within(viewer).getByText(/检查单位与方向/)).toBeInTheDocument();
    expect(within(viewer).getByText(/教师修订答案/)).toBeInTheDocument();
    expect(within(viewer).getAllByRole('listitem')).toHaveLength(4);
    expect(within(viewer).getByRole('button', { name: '关闭讲题内容' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '小球正碰：用动量守恒求碰后速度' })).not.toBeInTheDocument();
    expect(openButton).toHaveFocus();
  });

  it('limits direct guided explanation distribution to the current student thread', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');
    await user.click(screen.getByRole('button', { name: '私聊' }));
    await user.click(screen.getByRole('button', { name: /李明.*明白了，我重新画一下过程图/ }));
    await user.click(screen.getByRole('button', { name: 'WorkBuddy' }));
    const sidecar = screen.getByLabelText('WorkBuddy 私密协作窗口');
    await user.click(within(sidecar).getByRole('button', { name: /单题讲解生成可打开的分步讲题内容/ }));
    await user.click(within(sidecar).getByRole('button', { name: '生成回复建议' }));
    const review = await within(sidecar).findByLabelText('单题交互讲解待审核');
    expect(within(review).getByText(/发送到：当前学生私聊（李明）/)).toBeInTheDocument();
    expect((within(review).getByRole('textbox', { name: '第 3 步讲解' }) as HTMLTextAreaElement).value).toContain('1.20÷0.30 = 4.0 m/s');
    const directAnswer = within(review).getByRole('textbox', { name: '教师审核版完整答案' });
    await user.clear(directAnswer);
    await user.type(directAnswer, '私聊教师修订答案：B 以 4.0 m/s 向右运动。');
    await user.click(within(review).getByRole('button', { name: '应用修改' }));
    await waitFor(() => expect(within(sidecar).getByText('v2 · 未发送')).toBeInTheDocument());
    const revisedReview = within(sidecar).getByLabelText('单题交互讲解待审核');
    await user.click(within(revisedReview).getByRole('button', { name: '确认保存并发送' }));
    expect(await within(sidecar).findByLabelText('讲题内容发送成功')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看分步讲解' })).toBeInTheDocument();
  });

  it('preserves the guided artifact and recovers with the same approved action after a transient failure', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', undefined, false, 'recoverable_failure');
    await user.click(screen.getByRole('button', { name: 'WorkBuddy' }));
    const sidecar = screen.getByLabelText('WorkBuddy 私密协作窗口');
    await user.click(within(sidecar).getByRole('button', { name: /单题讲解生成可打开的分步讲题内容/ }));
    await user.click(within(sidecar).getByRole('button', { name: '生成消息草稿' }));
    await user.click(await within(sidecar).findByRole('button', { name: '确认保存并发送' }));
    expect(await within(sidecar).findByRole('alert')).toHaveTextContent('尚未保存或发送');
    await user.click(within(sidecar).getByRole('button', { name: '重试保存并发送' }));
    expect(await within(sidecar).findByLabelText('讲题内容发送成功')).toBeInTheDocument();
  });

  it.each([
    ['permission_denied', '当前没有分发权限'],
    ['evidence_mismatch', '执行证据需要人工复查'],
  ] as const)('projects %s as a non-retry guided explanation terminal state', async (guidedMode, heading) => {
    const user = userEvent.setup();
    renderWorkspace('teacher', undefined, false, guidedMode);
    await user.click(screen.getByRole('button', { name: 'WorkBuddy' }));
    const sidecar = screen.getByLabelText('WorkBuddy 私密协作窗口');
    await user.click(within(sidecar).getByRole('button', { name: /单题讲解生成可打开的分步讲题内容/ }));
    await user.click(within(sidecar).getByRole('button', { name: '生成消息草稿' }));
    await user.click(await within(sidecar).findByRole('button', { name: '确认保存并发送' }));
    expect(await within(sidecar).findByRole('alert')).toHaveTextContent(heading);
    expect(within(sidecar).queryByRole('button', { name: '重试保存并发送' })).not.toBeInTheDocument();
    if (guidedMode === 'permission_denied') expect(within(sidecar).getByRole('button', { name: '关闭并联系管理员申请权限' })).toBeInTheDocument();
  });

  it('projects a generation failure with a fresh-run recovery command', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', undefined, false, 'generation_failure');
    await user.click(screen.getByRole('button', { name: 'WorkBuddy' }));
    const sidecar = screen.getByLabelText('WorkBuddy 私密协作窗口');
    await user.click(within(sidecar).getByRole('button', { name: /单题讲解生成可打开的分步讲题内容/ }));
    await user.click(within(sidecar).getByRole('button', { name: '生成消息草稿' }));
    const alert = await within(sidecar).findByRole('alert');
    expect(alert).toHaveTextContent('讲题内容生成暂时失败');
    expect(within(alert).getByRole('button', { name: '重新生成' })).toBeInTheDocument();
  });
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
    expect(within(receipt).getByText('王老师 → 高二物理 3 班')).toBeInTheDocument();
    expect(within(receipt).getByRole('button', { name: '查看群消息' })).toBeInTheDocument();
    expect(within(receipt).queryByText('发送身份')).not.toBeInTheDocument();
    expect(within(sidecar).getByText('已记录教师采纳结果')).toBeInTheDocument();
    expect(within(sidecar).getByText(/\[模拟\] WorkBuddy 评价事件.*尚不代表教学效果/)).toBeInTheDocument();

    const timeline = screen.getByLabelText('消息记录');
    const sentMessage = within(timeline).getByText('请以下同学今天完成作业。');
    expect(sentMessage.closest('article')).toHaveTextContent('我 ·');
    expect(sentMessage).not.toHaveTextContent('WorkBuddy');
    expect(within(sidecar).getAllByText(/\[模拟\] ClassIn 群消息执行回执/).length).toBeGreaterThanOrEqual(1);
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
