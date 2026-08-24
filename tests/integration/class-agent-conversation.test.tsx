import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { AppRole } from '@domain/account/role';
import type { ClassAgentReply } from '@domain/class-agent/class-agent';
import { ClassAgentConversationProvider, useOptionalClassAgentConversation } from '@features/class-agent-conversation';
import { MessageWorkspace, MessageWorkspaceProvider, useMessageWorkspaceStore } from '@features/message-workspace';
import { MockClassAgentConversationAdapter } from '@mocks/adapters/class-agent/class-agent-conversation';
import {
  CLASS_AGENT_DEFINITIONS,
  HOMEWORK_CORRECTION_AGENT,
  PHYSICS_CLASS_AGENT,
  PUBLIC_CLASS_AGENT_BINDINGS,
} from '@mocks/scenarios/class-agent';

function AgentBridge({ children, failOnce = false }: { children: ReactNode; failOnce?: boolean }) {
  const { actions } = useMessageWorkspaceStore();
  const adapter = useMemo(() => {
    const nextAdapter = new MockClassAgentConversationAdapter({
      definitions: CLASS_AGENT_DEFINITIONS,
      delay: async () => undefined,
    });
    if (failOnce) nextAdapter.setScenario('recoverable-failure-once');
    return nextAdapter;
  }, [failOnce]);
  const onReply = useCallback((reply: ClassAgentReply) => actions.appendMessage({
    role: reply.recipientRole,
    authorRole: 'class-agent',
    authorName: reply.agentName,
    threadId: reply.threadId,
    body: reply.body,
    sentAt: reply.sentAt,
    messageId: reply.id,
    classAgent: {
      agentId: reply.agentId,
      channel: reply.channel,
      visibilityLabel: reply.visibilityLabel,
      truthLabel: reply.truthLabel,
    },
  }), [actions]);
  return (
    <ClassAgentConversationProvider adapter={adapter} definitions={CLASS_AGENT_DEFINITIONS} onReply={onReply}>
      {children}
    </ClassAgentConversationProvider>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function StaleAuthorizationProbe() {
  const conversation = useOptionalClassAgentConversation();
  const [result, setResult] = useState('not-submitted');
  if (!conversation) return null;
  const originalBinding = PUBLIC_CLASS_AGENT_BINDINGS.find(({ agentId }) => agentId === PHYSICS_CLASS_AGENT.id);
  if (!originalBinding) return null;
  const projection = conversation.projectAgents({
    role: 'teacher',
    classId: PHYSICS_CLASS_AGENT.classId,
    channel: 'public-class',
    mode: 'agent-only',
    query: '',
    bindings: [originalBinding],
  });
  const selection = conversation.selectAgent({
    projection,
    agentId: PHYSICS_CLASS_AGENT.id,
    currentBindings: [originalBinding],
  });
  return (
    <>
      <button type="button" onClick={() => {
        if (selection.status !== 'selected' || !selection.mention) return;
        const submission = conversation.submit({
          currentBindings: [{ ...originalBinding, authorizationVersion: 'v2' }],
          agentMention: selection.mention,
          threadId: 'class-physics-3',
          requesterRole: 'teacher',
          requesterName: '王老师',
          body: '请检查授权版本',
          recentMessages: [],
        });
        setResult(submission.status === 'ignored' ? submission.reason : submission.status);
      }}>提交旧授权目标</button>
      <output>{result}</output>
    </>
  );
}

function renderAgentWorkspace(role: AppRole, initialEntry = '/', failOnce = false) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MessageWorkspaceProvider>
        <AgentBridge failOnce={failOnce}>
          <MessageWorkspace role={role} />
          <LocationProbe />
        </AgentBridge>
      </MessageWorkspaceProvider>
    </MemoryRouter>,
  );
}

describe('shared class agent conversation channels', () => {
  it('revalidates a selected Agent against the current authorization version at send time', async () => {
    const user = userEvent.setup();
    const adapter = new MockClassAgentConversationAdapter({
      definitions: CLASS_AGENT_DEFINITIONS,
      delay: async () => undefined,
    });
    render(
      <ClassAgentConversationProvider adapter={adapter} definitions={CLASS_AGENT_DEFINITIONS} onReply={() => undefined}>
        <StaleAuthorizationProbe />
      </ClassAgentConversationProvider>,
    );

    await user.click(screen.getByRole('button', { name: '提交旧授权目标' }));
    expect(screen.getByText('stale-authorization')).toBeInTheDocument();
  });

  it.each([
    'teacher',
    'student-family',
  ] as const)('lets %s mention the same agent in the public class channel', async (role) => {
    const user = userEvent.setup();
    renderAgentWorkspace(role);

    expect(screen.getByText(/群内公开回复/)).toBeInTheDocument();
    expect(screen.getAllByText('[模拟] Agent').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '选择班级 Agent' }));
    await user.click(screen.getByRole('option', { name: new RegExp(`${PHYSICS_CLASS_AGENT.name}.*Agent`) }));
    const composer = screen.getByRole('textbox', { name: '输入消息' });
    expect(screen.getByText(`@${PHYSICS_CLASS_AGENT.name}`)).toBeInTheDocument();
    await user.type(composer, '第 5 题的方向怎么判断？');
    await user.click(screen.getByRole('button', { name: '发送' }));

    await waitFor(() => expect(screen.getAllByText(/先确定研究对象，再把碰撞前后的动量方向/).length).toBeGreaterThan(0));
    expect(screen.getByText('当前班级群成员可见 · [模拟]')).toBeInTheDocument();
    expect(screen.getByText('班级 Agent 已完成模拟回复。')).toBeInTheDocument();
  });

  it('does not trigger the public agent for a normal class message', async () => {
    const user = userEvent.setup();
    renderAgentWorkspace('student-family');
    await user.type(screen.getByRole('textbox', { name: '输入消息' }), '我先自己再看一遍。');
    await user.click(screen.getByRole('button', { name: '发送' }));
    expect(screen.getByText('消息已在本地 Demo 中发送。')).toBeInTheDocument();
    expect(screen.queryByText(/先确定研究对象，再把碰撞前后的动量方向/)).not.toBeInTheDocument();
  });

  it('opens the mixed picker from typed @ and selects a primary Agent with the keyboard', async () => {
    const user = userEvent.setup();
    renderAgentWorkspace('teacher');
    const composer = screen.getByRole('textbox', { name: '输入消息' });
    await user.type(composer, '@错题');
    expect(screen.getByRole('option', { name: new RegExp(HOMEWORK_CORRECTION_AGENT.name) })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.getByText(`@${HOMEWORK_CORRECTION_AGENT.name}`)).toBeInTheDocument();
    expect(composer).toHaveValue('');
    await user.type(composer, '帮我整理订正步骤');
    await user.click(screen.getByRole('button', { name: '发送' }));
    await waitFor(() => expect(screen.getAllByText(/把原答案与条件逐项对照/).length).toBeGreaterThan(0));
  });

  it('keeps ordinary member mentions as text instead of routing them to an Agent', async () => {
    const user = userEvent.setup();
    renderAgentWorkspace('student-family');
    const composer = screen.getByRole('textbox', { name: '输入消息' });
    await user.type(composer, '@王');
    await user.click(screen.getByRole('option', { name: /王老师.*物理老师/ }));
    expect(composer).toHaveValue('@王老师 ');
    expect(screen.queryByText(/主响应 Agent/)).not.toBeInTheDocument();
  });

  it.each([
    ['teacher', 'direct-class-agent-physics-3-teacher'],
    ['student-family', 'direct-class-agent-physics-3-student'],
  ] as const)('opens an isolated direct thread for %s and replies without a mention', async (role, expectedThreadId) => {
    const user = userEvent.setup();
    renderAgentWorkspace(role);
    await user.click(screen.getByRole('button', { name: '私聊' }));
    const agentThread = screen.getByRole('button', { name: new RegExp(`${PHYSICS_CLASS_AGENT.name}.*我是本班已授权`) });
    await user.click(agentThread);

    expect(screen.getByTestId('location')).toHaveTextContent(`thread=${expectedThreadId}`);
    expect(screen.getByText('仅你与班级 Agent 可见 · [模拟]')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: '输入消息' }), '第 5 题的方向怎么判断？');
    await user.click(screen.getByRole('button', { name: '发送' }));
    await waitFor(() => expect(screen.getAllByText(/先确定研究对象，再把碰撞前后的动量方向/).length).toBeGreaterThan(0));
  });

  it('keeps teacher and student agent contacts on separate target threads', async () => {
    const user = userEvent.setup();
    renderAgentWorkspace('teacher');
    await user.click(screen.getByRole('button', { name: '私聊' }));
    await user.click(screen.getByRole('button', { name: '发起私聊' }));
    const dialog = screen.getByRole('dialog', { name: '发起私聊' });
    await user.type(within(dialog).getByRole('textbox', { name: '搜索联系人' }), PHYSICS_CLASS_AGENT.name);
    await user.click(within(dialog).getByRole('button', { name: new RegExp(PHYSICS_CLASS_AGENT.name) }));
    expect(screen.getByTestId('location')).toHaveTextContent('thread=direct-class-agent-physics-3-teacher');
    expect(screen.getByTestId('location')).not.toHaveTextContent('direct-class-agent-physics-3-student');
  });

  it('preserves unsent drafts when switching between direct Agent threads', async () => {
    const user = userEvent.setup();
    renderAgentWorkspace('teacher');
    await user.click(screen.getByRole('button', { name: '私聊' }));
    await user.click(screen.getByRole('button', { name: new RegExp(`${PHYSICS_CLASS_AGENT.name}.*我是本班已授权`) }));
    const composer = screen.getByRole('textbox', { name: '输入消息' });
    await user.type(composer, '这是一条尚未发送的草稿');

    await user.click(screen.getByRole('button', { name: new RegExp(`${HOMEWORK_CORRECTION_AGENT.name}.*我是本班已授权`) }));
    await user.click(screen.getByRole('button', { name: new RegExp(`${PHYSICS_CLASS_AGENT.name}.*我是本班已授权`) }));

    expect(screen.getByRole('textbox', { name: '输入消息' })).toHaveValue('这是一条尚未发送的草稿');
  });

  it('shows target context and restores a replaced Agent within the undo window', async () => {
    const user = userEvent.setup();
    renderAgentWorkspace('teacher');
    await user.click(screen.getByRole('button', { name: '选择班级 Agent' }));
    await user.click(screen.getByRole('option', { name: new RegExp(`${PHYSICS_CLASS_AGENT.name}.*Agent`) }));
    expect(screen.getByText(`主响应 Agent · 群内公开 · ${PHYSICS_CLASS_AGENT.contextScopeLabel}`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '选择班级 Agent' }));
    await user.click(screen.getByRole('option', { name: new RegExp(`${HOMEWORK_CORRECTION_AGENT.name}.*Agent`) }));
    expect(screen.getByText(`@${HOMEWORK_CORRECTION_AGENT.name}`)).toBeInTheDocument();
    expect(screen.getByText(`已切换为 ${HOMEWORK_CORRECTION_AGENT.name}，可在 5 秒内撤销。`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '撤销切换' }));

    expect(screen.getByText(`@${PHYSICS_CLASS_AGENT.name}`)).toBeInTheDocument();
    expect(screen.getByText(`已恢复 ${PHYSICS_CLASS_AGENT.name} 为主响应 Agent。`)).toBeInTheDocument();
  });

  it('keeps the user message and exposes retry after a recoverable reply failure', async () => {
    const user = userEvent.setup();
    renderAgentWorkspace('student-family', '/', true);
    await user.click(screen.getByRole('button', { name: '选择班级 Agent' }));
    await user.click(screen.getByRole('option', { name: new RegExp(`${PHYSICS_CLASS_AGENT.name}.*Agent`) }));
    await user.type(screen.getByRole('textbox', { name: '输入消息' }), '第 5 题怎么判断？');
    await user.click(screen.getByRole('button', { name: '发送' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('班级 Agent 暂时没有完成回复');
    expect(screen.getAllByText(`@${PHYSICS_CLASS_AGENT.name} 第 5 题怎么判断？`).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '重试' }));
    await waitFor(() => expect(screen.getAllByText(/先确定研究对象，再把碰撞前后的动量方向/).length).toBeGreaterThan(0));
  });
});
