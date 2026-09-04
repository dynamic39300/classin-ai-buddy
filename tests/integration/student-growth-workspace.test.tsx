import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { StudentGrowthWorkspace } from '@features/student-growth-workspace/StudentGrowthWorkspace';

describe('student growth workspace', () => {
  it('shows all six mobile baseline metrics with accessible definitions and keeps the recent class expanded', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StudentGrowthWorkspace /></MemoryRouter>);
    const diagnosis = screen.getByRole('region', { name: '学习节奏稳定，下一步建议复盘最近一次错题。' });
    expect(within(diagnosis).getByRole('button', { name: /成长范围.*全部班级/ })).toBeInTheDocument();
    for (const value of ['12 天', '89%', '7 天', '18 小时', '76%', '24 枚']) expect(screen.getByText(value)).toBeInTheDocument();
    expect(screen.getAllByRole('tooltip')).toHaveLength(6);
    const accuracyHelp = screen.getByRole('button', { name: '准确率说明' });
    await user.hover(accuracyHelp);
    const accuracyTooltip = screen.getByRole('tooltip', { name: /怎么算.*100 题答对 76 题/ });
    expect(accuracyHelp).toHaveAttribute('aria-describedby', accuracyTooltip.id);
    expect(accuracyTooltip).toHaveTextContent('怎么看');
    expect(accuracyTooltip).toHaveTextContent('不代表课程总成绩');
    expect(accuracyTooltip).not.toHaveTextContent('Demo');
    expect(screen.getByRole('button', { name: /初三英语A班/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /初二数学提高班/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('filters to one class and opens the published blackboard entry', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StudentGrowthWorkspace /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /成长范围.*全部班级/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: '班级范围' }), 'growth-class-001');
    expect(screen.getByRole('combobox', { name: '课程范围' })).not.toBeDisabled();
    expect(screen.getByRole('option', { name: '精读课' })).toBeInTheDocument();
    expect(screen.queryByText('函数专题')).not.toBeInTheDocument();
    const trigger = screen.getAllByRole('button', { name: '已发布板书' })[0]!;
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: '已发布板书' })).toHaveTextContent('老师发布的课堂板书入口已保留');
    await user.click(screen.getByRole('button', { name: '关闭学习记录详情' }));
    expect(trigger).toHaveFocus();
  });

  it('filters a selected class down to one course and restores all courses when the class changes', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StudentGrowthWorkspace /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /成长范围.*全部班级/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: '班级范围' }), 'growth-class-001');
    expect(screen.getByText('2 门课程')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '写作课' })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: '课程范围' }), 'growth-course-001');
    expect(screen.getByRole('button', { name: /成长范围.*精读课/ })).toBeInTheDocument();
    expect(screen.getByText('1 门课程')).toBeInTheDocument();
    expect(screen.queryByText('函数专题')).not.toBeInTheDocument();
    expect(screen.getByText('作业完成 92%')).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: '班级范围' }), 'growth-class-002');
    expect(screen.getByRole('combobox', { name: '课程范围' })).toHaveValue('all');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: /成长范围.*初二数学提高班/ })).toBeInTheDocument();
    expect(screen.getByText('1 门课程')).toBeInTheDocument();
    expect(screen.getAllByText('函数专题')).not.toHaveLength(0);
  });

  it('clears the compact range filter back to all classes and courses', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StudentGrowthWorkspace /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /成长范围.*全部班级/ }));
    const clearButton = screen.getByRole('button', { name: '清除筛选' });
    expect(clearButton).toBeDisabled();
    await user.selectOptions(screen.getByRole('combobox', { name: '班级范围' }), 'growth-class-001');
    await user.selectOptions(screen.getByRole('combobox', { name: '课程范围' }), 'growth-course-001');
    await user.click(clearButton);
    expect(screen.getByRole('combobox', { name: '班级范围' })).toHaveValue('all');
    expect(screen.getByRole('combobox', { name: '课程范围' })).toHaveValue('all');
  });
});
