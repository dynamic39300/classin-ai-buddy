import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceComposer } from './WorkspaceComposer';

describe('WorkspaceComposer', () => {
  it('uses one accessible submit control and submits with Enter', () => {
    let value = '';
    const submit = vi.fn();
    const { rerender } = render(
      <WorkspaceComposer
        ariaLabel="输入消息"
        onSubmit={submit}
        onValueChange={(nextValue) => { value = nextValue; }}
        placeholder="输入消息"
        submitLabel="发送消息"
        value={value}
      />,
    );
    const textbox = screen.getByRole('textbox', { name: '输入消息' });
    fireEvent.change(textbox, { target: { value: '你好' } });
    rerender(
      <WorkspaceComposer
        ariaLabel="输入消息"
        onSubmit={submit}
        onValueChange={(nextValue) => { value = nextValue; }}
        placeholder="输入消息"
        submitLabel="发送消息"
        value={value}
      />,
    );
    fireEvent.keyDown(screen.getByRole('textbox', { name: '输入消息' }), { key: 'Enter' });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '发送消息' })).toHaveTextContent('');
  });

  it('keeps Shift Enter for multiline input and blocks empty submission', () => {
    const submit = vi.fn();
    const { rerender } = render(
      <WorkspaceComposer
        ariaLabel="向 Agent 补充要求"
        onSubmit={submit}
        onValueChange={() => undefined}
        placeholder="补充要求"
        submitLabel="发送补充要求"
        value="已有内容"
      />,
    );
    const textbox = screen.getByRole('textbox', { name: '向 Agent 补充要求' });
    fireEvent.keyDown(textbox, { key: 'Enter', shiftKey: true });
    expect(submit).not.toHaveBeenCalled();

    rerender(
      <WorkspaceComposer
        ariaLabel="向 Agent 补充要求"
        onSubmit={submit}
        onValueChange={() => undefined}
        placeholder="补充要求"
        submitLabel="发送补充要求"
        value=""
      />,
    );
    expect(screen.getByRole('button', { name: '发送补充要求' })).toBeDisabled();
  });

  it('reveals the configured count near the limit', () => {
    render(
      <WorkspaceComposer
        ariaLabel="向 TeachBuddy 输入要求"
        countThreshold={4}
        maxLength={10}
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        placeholder="安排任务"
        submitLabel="发送给 TeachBuddy"
        value="12345"
      />,
    );
    expect(screen.getByText('5 / 10')).toBeVisible();
    expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '10');
  });
});
