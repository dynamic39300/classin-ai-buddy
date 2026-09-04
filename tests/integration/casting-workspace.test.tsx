import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CastingWorkspace } from '@features/casting-workspace/CastingWorkspace';
import { OperationGuardProvider } from '@app/shell/operation-guard';

describe('casting workspace', () => {
  it('runs success, end, failure, and retry through observable states', async () => {
    const user = userEvent.setup();
    render(<OperationGuardProvider><MemoryRouter><CastingWorkspace /></MemoryRouter></OperationGuardProvider>);
    await user.click(screen.getByRole('button', { name: '投屏到 2大屏' }));
    expect(screen.getByRole('heading', { name: '连接中' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '成功' }));
    expect(screen.getByRole('button', { name: '结束投屏' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '结束投屏' }));
    expect(screen.getByRole('heading', { name: '投屏已结束' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '再次投屏' }));
    await user.click(screen.getByRole('button', { name: '投屏到 2大屏' }));
    await user.click(screen.getByRole('button', { name: '失败' }));
    expect(screen.getByRole('button', { name: '重新连接' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重新连接' }));
    expect(screen.getByRole('button', { name: '成功' })).toBeInTheDocument();
  });

  it('validates six digit casting codes', async () => {
    const user = userEvent.setup();
    render(<OperationGuardProvider><MemoryRouter><CastingWorkspace /></MemoryRouter></OperationGuardProvider>);
    const input = screen.getByRole('textbox', { name: '投屏码' });
    await user.type(input, '2468');
    expect(screen.getByRole('alert')).toHaveTextContent('6 位数字');
    expect(screen.getByRole('button', { name: '投屏' })).toBeDisabled();
    await user.type(input, '10');
    expect(screen.getByRole('button', { name: '投屏' })).toBeEnabled();
  });
});
