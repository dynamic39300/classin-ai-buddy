import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PageHeaderProvider } from '@app/shell/PageHeaderContext';
import { AgentInMarketWorkspace } from './AgentInMarketWorkspace';

function renderWorkspace() {
  return render(
    <PageHeaderProvider fallback={{ title: 'AgentIn' }}>
      <AgentInMarketWorkspace />
    </PageHeaderProvider>,
  );
}

describe('AgentInMarketWorkspace', () => {
  it('renders the source-backed default hierarchy and unavailable boundary', () => {
    renderWorkspace();
    expect(screen.getByLabelText('AgentIn 智能体市场')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: '搜索智能体' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '猜你喜欢' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '以下智能体当前场景不支持添加' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /豆神AI 私教问答/ })).toBeInTheDocument();
  });

  it('searches all source-backed cards and hides recommendations while searching', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await user.type(screen.getByRole('searchbox', { name: '搜索智能体' }), 'NOBOOK');
    expect(screen.queryByRole('heading', { name: '猜你喜欢' })).not.toBeInTheDocument();
    expect(screen.getByText('找到 1 个与“NOBOOK”相关的智能体')).toBeInTheDocument();
    const unavailable = screen.getByRole('heading', { name: '以下智能体当前场景不支持添加' }).parentElement;
    expect(unavailable).not.toBeNull();
    expect(within(unavailable as HTMLElement).getByRole('button', { name: /NOBOOK/ })).toBeInTheDocument();
  });

  it('rotates recommendations without claiming network refresh', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    const section = screen.getByRole('heading', { name: '猜你喜欢' }).parentElement?.parentElement;
    expect(section).not.toBeNull();
    const before = within(section as HTMLElement).getAllByRole('button')[1];
    expect(before).toHaveTextContent('每日名言');
    await user.click(screen.getByRole('button', { name: '换一换' }));
    const after = within(section as HTMLElement).getAllByRole('button')[1];
    expect(after).toHaveTextContent('成语溯源与应用专家');
  });

  it('makes non-implemented controls explicit and never claims an agent was added', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await user.click(screen.getByRole('button', { name: '数学' }));
    expect(screen.getByText('已选择“数学”，真实筛选逻辑尚未接入。')).toBeInTheDocument();
    await user.click(within(screen.getByLabelText('智能体目录')).getByRole('button', { name: /鲁迅/ }));
    expect(screen.getByText('“鲁迅”的详情与添加流程暂未开放。')).toBeInTheDocument();
    expect(screen.queryByText(/已添加/)).not.toBeInTheDocument();
  });
});
