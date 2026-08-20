import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlackboardWorkspace } from '@features/blackboard-workspace/BlackboardWorkspace';

describe('blackboard workspace', () => {
  it('exposes the blackboard as an honest placeholder', () => {
    render(<BlackboardWorkspace />);
    expect(screen.getByRole('heading', { name: '黑板暂未接入' })).toBeInTheDocument();
    expect(screen.getByText('黑板编辑区域暂时以占位方式保留，当前 Demo 不连接真实板书服务。')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
