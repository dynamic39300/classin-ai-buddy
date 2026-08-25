import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  DIRECT_CLASS_AGENT_BINDINGS,
  HOMEWORK_CORRECTION_AGENT,
  PHYSICS_CLASS_AGENT,
  PUBLIC_CLASS_AGENT_BINDINGS,
} from '@mocks/scenarios/class-agent';

function AgentBridge({ children, failOnce = false, responseDelayMs = 0 }: { children: ReactNode; failOnce?: boolean; responseDelayMs?: number }) {
  const { actions } = useMessageWorkspaceStore();
  const adapter = useMemo(() => {
    const nextAdapter = new MockClassAgentConversationAdapter({
      definitions: CLASS_AGENT_DEFINITIONS,
      delay: async () => responseDelayMs > 0
        ? new Promise((resolve) => window.setTimeout(resolve, responseDelayMs))
        : undefined,
    });
    if (failOnce) nextAdapter.setScenario('recoverable-failure-once');
    return nextAdapter;
  }, [failOnce, responseDelayMs]);
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
    <ClassAgentConversationProvider
      adapter={adapter}
      definitions={CLASS_AGENT_DEFINITIONS}
      directAuthorizationBindings={DIRECT_CLASS_AGENT_BINDINGS}
      onReply={onReply}
      responsePhaseDelayMs={responseDelayMs > 0 ? Math.floor(responseDelayMs / 2) : 20}
    >
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

function StaleDirectAuthorizationProbe() {
  const conversation = useOptionalClassAgentConversation();
  const [result, setResult] = useState('not-submitted');
  if (!conversation) return null;
  const current = DIRECT_CLASS_AGENT_BINDINGS.find(({ agentId, participantRole }) => (
    agentId === PHYSICS_CLASS_AGENT.id && participantRole === 'teacher'
  ));
  if (!current) return null;
  const stale = { ...current, authorizationVersion: 'stale-v0' };
  const projection = conversation.projectAgents({
    role: 'teacher',
    classId: PHYSICS_CLASS_AGENT.classId,
    channel: 'private-direct',
    mode: 'direct-agent',
    query: '',
    bindings: [stale],
  });
  return (
    <>
      <output>direct candidates {projection.totalAuthorized}</output>
      <button type="button" onClick={() => {
        const submission = conversation.submit({
          currentBindings: [stale],
          threadId: 'direct-class-agent-physics-3-teacher',
          requesterRole: 'teacher',
          requesterName: '王老师',
          body: '检查过期私聊授权',
          recentMessages: [],
        });
        setResult(submission.status === 'ignored' ? submission.reason : submission.status);
      }}>提交过期私聊授权</button>
      <output>{result}</output>
    </>
  );
}

function RevokedRetryProbe({ revoke }: { revoke: () => void }) {
  const conversation = useOptionalClassAgentConversation();
  if (!conversation) return null;
  const current = DIRECT_CLASS_AGENT_BINDINGS.find(({ agentId, participantRole }) => (
    agentId === PHYSICS_CLASS_AGENT.id && participantRole === 'teacher'
  ));
  if (!current) return null;
  const status = conversation.getThreadStatus('revoked-retry-thread');
  return (
    <>
      <button type="button" onClick={() => conversation.submit({
        currentBindings: [current],
        threadId: 'revoked-retry-thread',
        requesterRole: 'teacher',
        requesterName: '王老师',
        body: '先制造一次可恢复失败',
        recentMessages: [],
      })}>提交当前授权请求</button>
      <button type="button" onClick={revoke}>撤销授权</button>
      <button type="button" onClick={() => conversation.retry('revoked-retry-thread')}>执行重试</button>
      <output>{status.status}{'message' in status ? ` · ${status.message}` : ''}</output>
    </>
  );
}

function RevokedRetryHarness() {
  const [bindings, setBindings] = useState<readonly typeof DIRECT_CLASS_AGENT_BINDINGS[number][]>(DIRECT_CLASS_AGENT_BINDINGS);
  const adapter = useMemo(() => {
    const nextAdapter = new MockClassAgentConversationAdapter({
      definitions: CLASS_AGENT_DEFINITIONS,
      delay: async () => undefined,
    });
    nextAdapter.setScenario('recoverable-failure-once');
    return nextAdapter;
  }, []);
  return (
    <ClassAgentConversationProvider
      adapter={adapter}
      definitions={CLASS_AGENT_DEFINITIONS}
      directAuthorizationBindings={bindings}
      onReply={() => undefined}
    >
      <RevokedRetryProbe revoke={() => setBindings([])} />
    </ClassAgentConversationProvider>
  );
}

function renderAgentWorkspace(role: AppRole, initialEntry = '/', failOnce = false, responseDelayMs = 0) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MessageWorkspaceProvider>
        <AgentBridge failOnce={failOnce} responseDelayMs={responseDelayMs}>
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
      <ClassAgentConversationProvider
        adapter={adapter}
        definitions={CLASS_AGENT_DEFINITIONS}
        directAuthorizationBindings={DIRECT_CLASS_AGENT_BINDINGS}
        onReply={() => undefined}
      >
        <StaleAuthorizationProbe />
      </ClassAgentConversationProvider>,
    );

    await user.click(screen.getByRole('button', { name: '提交旧授权目标' }));
    expect(screen.getByText('stale-authorization')).toBeInTheDocument();
  });

  it('filters stale direct authorization from pickers and rejects direct submission', async () => {
    const user = userEvent.setup();
    const adapter = new MockClassAgentConversationAdapter({
      definitions: CLASS_AGENT_DEFINITIONS,
      delay: async () => undefined,
    });
    render(
      <ClassAgentConversationProvider
        adapter={adapter}
        definitions={CLASS_AGENT_DEFINITIONS}
        directAuthorizationBindings={DIRECT_CLASS_AGENT_BINDINGS}
        onReply={() => undefined}
      >
        <StaleDirectAuthorizationProbe />
      </ClassAgentConversationProvider>,
    );

    expect(screen.getByText('direct candidates 0')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '提交过期私聊授权' }));
    expect(screen.getByText('stale-authorization')).toBeInTheDocument();
  });

  it('blocks a direct retry after its class Agent authorization is revoked', async () => {
    const user = userEvent.setup();
    render(<RevokedRetryHarness />);

    await user.click(screen.getByRole('button', { name: '提交当前授权请求' }));
    expect(await screen.findByText(/recoverable_failure/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '撤销授权' }));
    await user.click(screen.getByRole('button', { name: '执行重试' }));

    expect(screen.getByText(/authorization_failure.*班级授权已更新/)).toBeInTheDocument();
  });

  it.each([
    'teacher',
    'student-family',
  ] as const)('lets %s mention the same agent in the public class channel', async (role) => {
    const user = userEvent.setup();
    renderAgentWorkspace(role);

    expect(screen.queryByText(/群内公开回复/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '选择班级 Agent' }));
    await user.click(screen.getByRole('option', { name: new RegExp(PHYSICS_CLASS_AGENT.name) }));
    const composer = screen.getByRole('textbox', { name: '输入消息' }) as HTMLTextAreaElement;
    expect(screen.getByText(`@${PHYSICS_CLASS_AGENT.name}`)).toBeInTheDocument();
    await user.type(composer, '第 5 题的方向怎么判断？');
    await user.click(screen.getByRole('button', { name: '发送' }));

    await waitFor(() => expect(screen.getAllByText(/先做第一步：统一规定正方向/).length).toBeGreaterThan(0));
    expect(screen.queryByText(/最终答案|答案是/)).not.toBeInTheDocument();
    expect(screen.getByText('当前班级群成员可见')).toBeInTheDocument();
    expect(screen.getByText('班级 Agent 已完成回复。')).toBeInTheDocument();
  });

  it('does not trigger the public agent for a normal class message', async () => {
    const user = userEvent.setup();
    renderAgentWorkspace('student-family');
    await user.type(screen.getByRole('textbox', { name: '输入消息' }), '我先自己再看一遍。');
    await user.click(screen.getByRole('button', { name: '发送' }));
    expect(screen.getByText('消息已在本地 Demo 中发送。')).toBeInTheDocument();
    expect(screen.queryByText(/先做第一步：统一规定正方向/)).not.toBeInTheDocument();
  });

  it('opens the mixed picker from typed @ and selects a primary Agent with the keyboard', async () => {
    const user = userEvent.setup();
    renderAgentWorkspace('teacher');
    const composer = screen.getByRole('textbox', { name: '输入消息' }) as HTMLTextAreaElement;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    valueSetter?.call(composer, '请帮 @错题我整理订正步骤');
    composer.setSelectionRange(6, 6);
    fireEvent.input(composer);
    composer.focus();
    expect(screen.getByRole('option', { name: new RegExp(HOMEWORK_CORRECTION_AGENT.name) })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.getByText(`@${HOMEWORK_CORRECTION_AGENT.name}`)).toBeInTheDocument();
    expect(composer).toHaveValue('请帮我整理订正步骤');
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
    const agentThread = screen.getByRole('button', { name: new RegExp(PHYSICS_CLASS_AGENT.name) });
    await user.click(agentThread);

    expect(screen.getByTestId('location')).toHaveTextContent(`thread=${expectedThreadId}`);
    expect(screen.queryByText('仅你与班级 Agent 可见')).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: '输入消息' }), '第 5 题的方向怎么判断？');
    await user.click(screen.getByRole('button', { name: '发送' }));
    await waitFor(() => expect(screen.getAllByText(/我们分三步来/).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/自检：你目前最不确定的是/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/最终答案|答案是/)).not.toBeInTheDocument();
  });

  it.each(['teacher', 'student-family'] as const)('filters %s direct chats to authorized Agents and searches capability keywords', async (role) => {
    const user = userEvent.setup();
    renderAgentWorkspace(role);
    await user.click(screen.getByRole('button', { name: '私聊' }));
    const directList = screen.getByRole('region', { name: '私聊列表' });

    expect(within(directList).getByRole('button', { name: '班级 Agent 4' })).toBeInTheDocument();
    await user.click(within(directList).getByRole('button', { name: '班级 Agent 4' }));
    expect(within(directList).getByRole('region', { name: '班级 Agent · 4' })).toBeInTheDocument();
    expect(within(directList).queryByRole('region', { name: /联系人/ })).not.toBeInTheDocument();

    await user.type(within(directList).getByRole('textbox', { name: '搜索私聊和班级 Agent' }), '变量');
    expect(within(directList).getByRole('button', { name: /实验探究助手/ })).toBeInTheDocument();
    expect(within(directList).queryByRole('button', { name: /物理学习助手/ })).not.toBeInTheDocument();
    expect(within(directList).getByText('1 个结果')).toBeInTheDocument();
  });

  it('loads older human and Agent messages into the same direct thread and keeps them after switching', async () => {
    const user = userEvent.setup();
    renderAgentWorkspace('teacher');
    await user.click(screen.getByRole('button', { name: '私聊' }));
    await user.click(screen.getByRole('button', { name: /物理学习助手/ }));
    const conversation = screen.getByRole('region', { name: '物理学习助手会话' });

    expect(within(conversation).queryByText(/我是本班已授权的物理学习助手/)).not.toBeInTheDocument();
    await user.click(within(conversation).getByRole('button', { name: '加载更早消息' }));
    expect(within(conversation).getByText(/我是本班已授权的物理学习助手/)).toBeInTheDocument();
    expect(within(conversation).getByText('动量方向的正负号应该先看什么？')).toBeInTheDocument();
    expect(within(conversation).getByText('已显示全部历史消息')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /作业订正助手/ }));
    await user.click(screen.getByRole('button', { name: /物理学习助手/ }));
    expect(screen.getByText(/我是本班已授权的物理学习助手/)).toBeInTheDocument();
  });

  it('shows a perceptible two-phase Agent response before completing the direct reply', async () => {
    const user = userEvent.setup();
    renderAgentWorkspace('student-family', '/', false, 600);
    await user.click(screen.getByRole('button', { name: '私聊' }));
    await user.click(screen.getByRole('button', { name: /物理学习助手/ }));
    await user.type(screen.getByRole('textbox', { name: '输入消息' }), '帮我检查这道题的方向');
    await user.click(screen.getByRole('button', { name: '发送' }));

    const understanding = screen.getByText('正在理解你的问题');
    expect(understanding).toBeInTheDocument();
    expect(within(understanding.closest('[role="status"]') as HTMLElement).getByText(PHYSICS_CLASS_AGENT.name)).toBeInTheDocument();
    expect(await screen.findByText('正在整理可检查的回复步骤')).toBeInTheDocument();
    const timeline = screen.getByRole('log', { name: '消息记录' });
    Object.defineProperties(timeline, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1_000 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });
    fireEvent.scroll(timeline);
    await waitFor(() => expect(screen.getAllByText(/我们分三步来/).length).toBeGreaterThan(0));
    expect(screen.getByRole('button', { name: '1 条新消息' })).toBeInTheDocument();
    expect(screen.queryByText('正在整理可检查的回复步骤')).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: new RegExp(PHYSICS_CLASS_AGENT.name) }));
    const composer = screen.getByRole('textbox', { name: '输入消息' });
    await user.type(composer, '这是一条尚未发送的草稿');

    await user.click(screen.getByRole('button', { name: new RegExp(HOMEWORK_CORRECTION_AGENT.name) }));
    await user.click(screen.getByRole('button', { name: new RegExp(PHYSICS_CLASS_AGENT.name) }));

    expect(screen.getByRole('textbox', { name: '输入消息' })).toHaveValue('这是一条尚未发送的草稿');
  });

  it('shows target context and restores a replaced Agent within the undo window', async () => {
    const user = userEvent.setup();
    renderAgentWorkspace('teacher');
    await user.click(screen.getByRole('button', { name: '选择班级 Agent' }));
    await user.click(screen.getByRole('option', { name: new RegExp(PHYSICS_CLASS_AGENT.name) }));
    expect(screen.getByText(`@${PHYSICS_CLASS_AGENT.name}`)).toBeInTheDocument();
    expect(screen.queryByText(/主响应 Agent/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '选择班级 Agent' }));
    await user.click(screen.getByRole('option', { name: new RegExp(HOMEWORK_CORRECTION_AGENT.name) }));
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
    await user.click(screen.getByRole('option', { name: new RegExp(PHYSICS_CLASS_AGENT.name) }));
    await user.type(screen.getByRole('textbox', { name: '输入消息' }), '第 5 题怎么判断？');
    await user.click(screen.getByRole('button', { name: '发送' }));

    const failure = await screen.findByRole('alert');
    expect(failure).toHaveTextContent('班级 Agent 暂时没有完成回复');
    expect(failure).toHaveTextContent(PHYSICS_CLASS_AGENT.name);
    expect(failure).toHaveTextContent('回复未完成');
    expect(screen.getAllByText(`@${PHYSICS_CLASS_AGENT.name} 第 5 题怎么判断？`).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '重试' }));
    await waitFor(() => expect(screen.getAllByText(/先做第一步：统一规定正方向/).length).toBeGreaterThan(0));
  });
});
