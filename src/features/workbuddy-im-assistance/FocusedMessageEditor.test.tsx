import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { FocusedMessageEditor } from './FocusedMessageEditor';

function Harness() {
  const [value, setValue] = useState('第一段\n\n第二段');
  return <FocusedMessageEditor id="test-message" label="群通知正文" value={value} onChange={setValue} />;
}

describe('FocusedMessageEditor', () => {
  it('expands the same editor inline and restores focus after collapse', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const editor = screen.getByRole('textbox', { name: '群通知正文' });
    const region = editor.closest('[data-focused-message-editor="true"]');
    const expand = screen.getByRole('button', { name: '展开编辑群通知正文' });

    expect(region).toHaveAttribute('data-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(expand);
    expect(region).toHaveAttribute('data-expanded', 'true');
    await waitFor(() => expect(editor).toHaveFocus());

    await user.clear(editor);
    await user.type(editor, '完整通知正文\n\n1. 第一项\n2. 第二项');
    expect(editor).toHaveValue('完整通知正文\n\n1. 第一项\n2. 第二项');
    expect(screen.getByText('21 字')).toBeVisible();

    const collapse = screen.getByRole('button', { name: '收起群通知正文' });
    await user.click(collapse);
    expect(region).toHaveAttribute('data-expanded', 'false');
    expect(screen.queryByText('21 字')).not.toBeInTheDocument();
    await waitFor(() => expect(expand).toHaveFocus());
  });
});
