import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '@app/App';

describe('WorkBuddy quiz activity integration', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('projects the independent task, paper review, activity parameters and draft approval', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /老师视角/ }));
    await user.click(within(screen.getByRole('navigation', { name: '老师视角主导航' })).getByRole('link', { name: 'Work Buddy' }));
    await user.click(screen.getByRole('button', { name: '生成测验并创建活动草稿' }));
    await user.click(screen.getByRole('button', { name: '展开核心上下文' }));
    const context = screen.getByRole('complementary', { name: '核心上下文' });
    await user.click(within(context).getByRole('button', { name: /应用动量守恒测验建议/ }));
    await user.click(within(context).getByRole('button', { name: '确认上下文版本' }));
    await user.click(screen.getByRole('button', { name: '创建任务' }));

    const composer = screen.getByRole('textbox', { name: '向 WorkBuddy 补充要求' });
    await user.type(composer, '解析里请突出正方向约定。');
    await user.click(screen.getByRole('button', { name: '发送补充要求' }));
    expect(screen.getByText('解析里请突出正方向约定。')).toBeVisible();
    expect(screen.getByText('WorkBuddy 已收到')).toBeVisible();

    const brief = screen.getByRole('article', { name: '确认试卷结构' });
    const judgement = within(brief).getByRole('checkbox', { name: '判断题' });
    await user.click(judgement);
    expect(within(brief).getByRole('textbox', { name: '题目数量' })).toHaveValue('4');
    await user.clear(within(brief).getByRole('spinbutton', { name: '试卷总分' }));
    await user.type(within(brief).getByRole('spinbutton', { name: '试卷总分' }), '80');
    expect(screen.getByRole('button', { name: '产出 · 0' })).toBeDisabled();
    await user.click(within(brief).getByRole('button', { name: '确认以上要求并生成' }));
    const generation = await screen.findByRole('status', { name: '测验生成进度' }, { timeout: 2_000 });
    expect(generation).toHaveTextContent('第 1/4 步 · 分析测评目标');
    await waitFor(() => expect(generation).toHaveTextContent('第 2/4 步 · 组织题型与分值'), { timeout: 2_000 });
    expect(screen.queryByRole('button', { name: '开始生成试卷' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '继续设置测验活动' })).not.toBeInTheDocument();
    const review = await screen.findByRole('article', { name: '审阅并确认测验试卷' }, { timeout: 5_000 });
    expect(review).toHaveTextContent('活动设置依赖当前试卷内容');
    expect(screen.queryByRole('article', { name: '测验活动参数' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '产出 · 1' })).toBeEnabled();
    const auxiliary = screen.getByRole('complementary', { name: '任务辅助区' });
    expect(within(auxiliary).getByRole('tab', { name: '产出 · 1' })).toHaveAttribute('aria-selected', 'true');
    const output = within(auxiliary).getByRole('region', { name: '测验试卷产出' });
    expect(within(output).getByText('系统机械能一定不变')).toBeVisible();
    expect(within(output).getByText('4 题', { exact: true })).toBeVisible();
    expect(within(output).getByText('80 分', { exact: true })).toBeVisible();
    await user.click(within(auxiliary).getByRole('tab', { name: '上下文' }));
    expect(within(auxiliary).getByRole('complementary', { name: '核心上下文' })).toBeVisible();
    await user.click(within(auxiliary).getByRole('tab', { name: '产出 · 1' }));
    await user.click(within(auxiliary).getByRole('button', { name: '确认试卷内容，继续设置活动' }));
    expect(screen.queryByRole('complementary', { name: '任务辅助区' })).not.toBeInTheDocument();
    expect(screen.getByText('试卷内容已确认')).toBeVisible();
    const settings = await screen.findByRole('article', { name: '测验活动参数' });

    await user.selectOptions(within(settings).getByRole('combobox', { name: '答题限时' }), 'custom');
    await user.clear(within(settings).getByRole('spinbutton', { name: '自定义限时（分钟）' }));
    await user.type(within(settings).getByRole('spinbutton', { name: '自定义限时（分钟）' }), '35');
    const endAt = within(settings).getByLabelText('截止时间');
    fireEvent.change(endAt, { target: { value: '' } });
    await user.click(within(settings).getByRole('button', { name: '准备创建草稿' }));
    expect(within(settings).getByRole('alert')).toHaveTextContent('请输入有效日期');
    fireEvent.change(endAt, { target: { value: '2026-08-26T22:00' } });
    await user.click(within(settings).getByRole('button', { name: '准备创建草稿' }));

    const approval = screen.getByRole('article', { name: '创建测验活动草稿确认' });
    expect(approval).toHaveTextContent('将创建草稿，不会发布');
    expect(approval).toHaveTextContent('对象版本');
    expect(approval).toHaveTextContent('可逆');
  });
});
