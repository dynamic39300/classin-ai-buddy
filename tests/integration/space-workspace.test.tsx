import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ClassWorkspaceProvider } from '@features/class-workspace/ClassWorkspaceProvider';
import { SpaceWorkspace } from '@features/space-workspace/SpaceWorkspace';
import { SpaceWorkspaceProvider } from '@features/space-workspace/SpaceWorkspaceProvider';
import { StudentResourceWorkspace } from '@features/space-workspace/StudentResourceWorkspace';
import type { SpaceSurface } from '@domain/space/space';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="current-location">{location.pathname}{location.search}</span>;
}

function renderTeacherSpace(surface: SpaceSurface, initialEntry = '/teacher/space') {
  return render(<MemoryRouter initialEntries={[initialEntry]}><SpaceWorkspaceProvider><SpaceWorkspace role="teacher" surface={surface} /><LocationProbe /></SpaceWorkspaceProvider></MemoryRouter>);
}

function renderStudentResources(classId: string) {
  return render(<MemoryRouter><ClassWorkspaceProvider><SpaceWorkspaceProvider><StudentResourceWorkspace role="student-family" classId={classId} /></SpaceWorkspaceProvider></ClassWorkspaceProvider></MemoryRouter>);
}

describe('space workspace', () => {
  it('starts on my drive with exactly four top-level surfaces and no removed tools', () => {
    renderTeacherSpace('my-drive');

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['我的云盘', '组织云盘', 'TeacherIn', '题库中心']);
    expect(screen.getByRole('heading', { name: '我的云盘' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '返回上级目录' })).not.toBeInTheDocument();
    expect(screen.queryByText('个人资料')).not.toBeInTheDocument();
    expect(screen.queryByText('整理个人教学资料和目录。')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('文件夹路径')).not.toBeInTheDocument();
    const fileToolbar = screen.getByRole('group', { name: '文件列表工具栏' });
    expect(within(fileToolbar).getByRole('searchbox', { name: '搜索当前目录' })).toHaveAttribute('placeholder', '搜索文件');
    expect(within(fileToolbar).getByRole('combobox', { name: '文件排序' })).toBeInTheDocument();
    expect(within(fileToolbar).getByRole('group', { name: '文件视图' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['选择', '名称 / 格式', '状态 / 权限', '更新时间', '操作']);
    expect(screen.getByRole('button', { name: '辅助工具' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '全局文档搜索' })).not.toBeInTheDocument();
    expect(screen.queryByText('本地教室')).not.toBeInTheDocument();
    expect(screen.queryByText('FlowIn')).not.toBeInTheDocument();
  });

  it('restores drive state from the URL and falls back from an unknown directory', async () => {
    const user = userEvent.setup();
    renderTeacherSpace('my-drive', '/teacher/space?parentId=missing&q=pdf&sort=updated&view=grid');

    expect(screen.getByText('动量守恒课堂讲义.pdf')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: '搜索当前目录' })).toHaveValue('pdf');
    expect(screen.getByRole('button', { name: '网格视图' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('current-location')).not.toHaveTextContent('parentId=missing');

    await user.clear(screen.getByRole('searchbox', { name: '搜索当前目录' }));
    await user.click(screen.getByRole('button', { name: '打开高二物理备课' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('parentId=my-root-folder');
    expect(within(screen.getByRole('group', { name: '文件列表工具栏' })).getByLabelText('文件夹路径')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '我的云盘' }));
    expect(screen.getByTestId('current-location')).not.toHaveTextContent('parentId=');
  });

  it('creates folders, searches by extension, previews capabilities, and deletes recursively with confirmation', async () => {
    const user = userEvent.setup();
    renderTeacherSpace('my-drive');

    await user.click(screen.getByRole('button', { name: /新建/ }));
    await user.click(screen.getByRole('menuitem', { name: '新建文件夹' }));
    expect(screen.getByRole('button', { name: '创建' })).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: '文件夹名称' }), '周末课堂资料');
    await user.click(screen.getByRole('button', { name: '创建' }));
    expect(screen.getByText('周末课堂资料')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: '搜索当前目录' }), 'pdf');
    expect(screen.getByText('动量守恒课堂讲义.pdf')).toBeInTheDocument();
    expect(screen.queryByText('动量模型板书.edb')).not.toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox', { name: '搜索当前目录' }));

    await user.click(screen.getByRole('button', { name: '打开动量守恒课堂讲义.pdf' }));
    expect(screen.getByRole('complementary', { name: '文件预览面板' })).toHaveTextContent('可课堂打开');
    await user.click(screen.getByRole('button', { name: '课堂打开' }));
    expect(screen.getByRole('dialog', { name: '能力边界说明' })).toHaveTextContent('未连接真实课堂引擎');
    await user.click(screen.getByRole('button', { name: '关闭' }));
    await user.click(screen.getByRole('button', { name: '关闭文件预览' }));

    await user.click(screen.getByRole('button', { name: '打开碰撞实验装置.png' }));
    expect(screen.getByRole('button', { name: '保存到相册' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '编辑图片' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '编辑图片' }));
    expect(screen.getByRole('dialog', { name: '能力边界说明' })).toHaveTextContent('未连接真实图片编辑器');
    await user.click(screen.getByRole('button', { name: '关闭' }));
    await user.click(screen.getByRole('button', { name: '关闭文件预览' }));

    await user.click(screen.getByRole('checkbox', { name: '选择高二物理备课' }));
    await user.click(screen.getByRole('button', { name: '删除 1 项' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('文件夹内子项将一并删除');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '确认删除' }));
    expect(screen.queryByText('高二物理备课')).not.toBeInTheDocument();
  });

  it('keeps PC supplements honest and exclusive file actions as placeholders', async () => {
    const user = userEvent.setup();
    renderTeacherSpace('my-drive');

    await user.click(screen.getByRole('button', { name: '辅助工具' }));
    await user.click(within(screen.getByRole('menu', { name: '云盘辅助工具' })).getByRole('menuitem', { name: '全局文档搜索' }));
    expect(screen.getByRole('dialog', { name: '能力边界说明' })).toHaveTextContent('PC 补充入口');
    await user.click(screen.getByRole('button', { name: '关闭' }));
    await user.click(screen.getByRole('button', { name: /新建/ }));
    await user.click(screen.getByRole('menuitem', { name: '新建板书' }));
    expect(screen.getByRole('dialog', { name: '能力边界说明' })).toHaveTextContent('未创建 EDB 文件');
  });

  it('opens a real file action menu and restores focus when it closes', async () => {
    const user = userEvent.setup();
    renderTeacherSpace('my-drive');
    const trigger = screen.getByRole('button', { name: '动量守恒课堂讲义.pdf更多操作' });

    await user.click(trigger);
    const menu = screen.getByRole('menu', { name: '动量守恒课堂讲义.pdf操作' });
    expect(within(menu).getByRole('menuitem', { name: '预览文件' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: '删除' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu', { name: '动量守恒课堂讲义.pdf操作' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('filters hidden organization nodes and applies operate/delete/transfer boundaries', async () => {
    const user = userEvent.setup();
    renderTeacherSpace('organization-drive');

    expect(screen.queryByText('内部管理资料')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '组织云盘上下文' })).not.toBeInTheDocument();
    expect(screen.getByText('可管理', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('按节点权限浏览和复用组织资料。')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '成员管理' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '选择物理教研组' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '打开物理教研组' }));
    expect(screen.getAllByText('可操作', { exact: true }).length).toBeGreaterThan(0);
    expect(screen.getByRole('checkbox', { name: '选择王老师教案.docx' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: '选择高二物理题型整理.pdf' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '内部作业包.edu更多操作' }));
    expect(within(screen.getByRole('menu', { name: '内部作业包.edu操作' })).getByRole('menuitem', { name: '保存为我的云盘副本' })).toHaveAttribute('aria-disabled', 'true');
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: '王老师教案.docx更多操作' }));
    await user.click(within(screen.getByRole('menu', { name: '王老师教案.docx操作' })).getByRole('menuitem', { name: '保存为我的云盘副本' }));
    expect(screen.getByRole('status')).toHaveTextContent('作为新副本转存');
    await user.click(screen.getByRole('button', { name: '王老师教案.docx更多操作' }));
    await user.click(within(screen.getByRole('menu', { name: '王老师教案.docx操作' })).getByRole('menuitem', { name: '保存为我的云盘副本' }));
    expect(screen.getByRole('status')).toHaveTextContent('作为新副本转存');
  });

  it('searches, sorts, and acquires resources from the direct catalog list', async () => {
    const user = userEvent.setup();
    renderTeacherSpace('teacherin');

    expect(screen.getByRole('tab', { name: '全部资源' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText('教材与课件')).not.toBeInTheDocument();
    expect(screen.queryByText('直接浏览全部资源，也可以切换到已获取的只读列表。')).not.toBeInTheDocument();
    expect(screen.getByText('动量守恒模型课件')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: '搜索资源标题或标签' }), '动量');
    expect(screen.queryByText('机械波错题复习单')).not.toBeInTheDocument();
    const card = screen.getByText('动量守恒模型课件').closest('article');
    await user.click(within(card as HTMLElement).getByRole('button', { name: '获取' }));
    expect(screen.getByRole('status')).toHaveTextContent('获取成功');

    await user.click(screen.getByRole('tab', { name: /我的资源/ }));
    expect(screen.getByText('动量守恒模型课件')).toBeInTheDocument();
    expect(screen.getByText('只读列表')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument();
  });

  it('restores resource search and sort from the URL and clears them when opening my resources', async () => {
    const user = userEvent.setup();
    renderTeacherSpace('teacherin', '/teacher/space/teacherin?q=动量&sort=name');

    expect(screen.getByRole('searchbox', { name: '搜索资源标题或标签' })).toHaveValue('动量');
    expect(screen.getByRole('combobox', { name: '资源排序' })).toHaveValue('name');
    expect(screen.getByTestId('current-location')).toHaveTextContent('q=动量');
    expect(screen.getByTestId('current-location')).toHaveTextContent('sort=name');

    await user.click(screen.getByRole('tab', { name: /我的资源/ }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('resourceTab=mine');
    expect(screen.getByTestId('current-location')).not.toHaveTextContent('q=');
    expect(screen.getByTestId('current-location')).not.toHaveTextContent('sort=');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('renders question bank as one trustworthy placeholder without local actions', () => {
    renderTeacherSpace('question-bank');
    expect(screen.getByRole('heading', { name: '题库中心 Placeholder' })).toBeInTheDocument();
    expect(screen.queryByText('可信边界')).not.toBeInTheDocument();
    expect(screen.queryByText('题库服务依赖尚未接入，本次只保留空间入口。')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '返回我的云盘' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '新建测验' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '我的题库' })).not.toBeInTheDocument();
  });

  it('shows students only resources authorized by the current class', async () => {
    const user = userEvent.setup();
    renderStudentResources('physics-3');
    expect(screen.getByText('动量守恒模型课件')).toBeInTheDocument();
    expect(screen.queryByText('阅读定位与主旨练习')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查看资料' }));
    expect(screen.getByRole('status')).toHaveTextContent('不下载真实文件');
  });

  it('blocks student resource URLs without a visible class context', () => {
    renderStudentResources('physics-1');
    expect(screen.getByText('无法访问这个班级资源')).toBeInTheDocument();
    expect(screen.queryByText('动量守恒模型课件')).not.toBeInTheDocument();
  });
});
