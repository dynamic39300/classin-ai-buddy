import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PageHeaderProvider } from '@app/shell/PageHeaderContext';
import { ClassWorkspaceProvider } from '@features/class-workspace/ClassWorkspaceProvider';
import { TeacherOpenCourseCollectionWorkspace } from '@features/open-course-workspace';

function LocationProbe() {
  const location = useLocation();
  return <span aria-label="当前路径" role="none">{location.pathname}{location.search}</span>;
}

function renderCollection(initialEntry = '/teacher/open-courses') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <PageHeaderProvider fallback={{ title: '公开课' }}>
        <ClassWorkspaceProvider>
          <TeacherOpenCourseCollectionWorkspace />
        </ClassWorkspaceProvider>
      </PageHeaderProvider>
    </MemoryRouter>,
  );
}

describe('teacher open course collection', () => {
  it('shows only teacher-owned courses and derives status from the demo clock', () => {
    renderCollection();

    const table = screen.getByRole('table', { name: '我的公开课' });
    expect(within(table).getByText('家长会说明会')).toBeInTheDocument();
    expect(within(table).getByText('产品经理成长训练营')).toBeInTheDocument();
    expect(within(table).queryByText('高效阅读公开课')).not.toBeInTheDocument();
    expect(within(table).getByText('待开始')).toBeInTheDocument();
    expect(within(table).getByText('已结束')).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: '班级与公开课' })).not.toBeInTheDocument();
  });

  it('keeps collection filters in the URL and isolates row edit navigation', async () => {
    const user = userEvent.setup();
    renderCollection();

    await user.click(screen.getByRole('button', { name: '待开始' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('status=scheduled');
    expect(screen.getByText('家长会说明会')).toBeInTheDocument();
    expect(screen.queryByText('产品经理成长训练营')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '编辑家长会说明会' }));
    expect(screen.getByRole('dialog', { name: '编辑公开课' })).toBeInTheDocument();
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/teacher/open-courses?status=scheduled&dialog=edit&course=open-family');
  });

  it('keeps sorting behind the same compact icon control', async () => {
    const user = userEvent.setup();
    renderCollection();

    const sort = screen.getByRole('combobox', { name: '公开课排序' });
    expect(sort).toBeInTheDocument();
    expect(sort.parentElement).toHaveAttribute('title', '排序');
    await user.selectOptions(sort, 'title-asc');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('sort=title-asc');
  });
});
