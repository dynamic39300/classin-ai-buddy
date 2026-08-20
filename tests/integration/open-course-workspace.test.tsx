import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PageHeaderProvider } from '@app/shell/PageHeaderContext';
import { usePageHeaderConfig } from '@app/shell/usePageHeader';
import { ClassWorkspaceProvider } from '@features/class-workspace/ClassWorkspaceProvider';
import {
  OpenCourseWorkspaceProvider,
  TeacherOpenCourseCollectionWorkspace,
  createOpenCourseSessionStore,
} from '@features/open-course-workspace';
import { createDemoOpenCoursePasscode } from '@domain/open-course/open-course';
import { TeacherOpenCourseCreatePage } from '@pages/teacher/TeacherOpenCourseCreatePage';
import { TeacherOpenCourseDetailPage } from '@pages/teacher/TeacherOpenCourseDetailPage';
import { TeacherOpenCourseEditPage } from '@pages/teacher/TeacherOpenCourseEditPage';
import { TeacherOpenCoursePreflightPage } from '@pages/teacher/TeacherOpenCoursePreflightPage';
import { StudentOpenCourseJoinPage } from '@pages/student/StudentOpenCourseJoinPage';
import { StudentOpenCourseDetailPage } from '@pages/student/StudentOpenCourseDetailPage';
import { StudentOpenCoursePreflightPage } from '@pages/student/StudentOpenCoursePreflightPage';

function TestRoutes() {
  return (
    <>
      <NavigationProbe />
      <Routes>
        <Route path="/teacher/open-courses/new" element={<TeacherOpenCourseCreatePage />} />
        <Route path="/teacher/open-courses/:openCourseId" element={<TeacherOpenCourseDetailPage />} />
        <Route path="/teacher/open-courses/:openCourseId/edit" element={<TeacherOpenCourseEditPage />} />
        <Route path="/teacher/open-courses/:openCourseId/preflight" element={<TeacherOpenCoursePreflightPage />} />
        <Route path="/student/open-courses/join" element={<StudentOpenCourseJoinPage />} />
        <Route path="/student/open-courses/:openCourseId" element={<StudentOpenCourseDetailPage />} />
        <Route path="/student/open-courses/:openCourseId/preflight" element={<StudentOpenCoursePreflightPage />} />
        <Route path="/teacher/open-courses" element={<TeacherOpenCourseCollectionWorkspace />} />
        <Route path="/student/open-courses" element={<span>学生公开课列表</span>} />
        <Route path="/teacher/home" element={<span>教师首页</span>} />
        <Route path="/student/home" element={<span>学生首页</span>} />
      </Routes>
    </>
  );
}

function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  const teacherDetailPath = location.pathname.replace(/\/(edit|preflight)$/, '');
  return (
    <div>
      <output aria-label="当前路径">{location.pathname}{location.search}</output>
      <button type="button" onClick={() => navigate(`${teacherDetailPath}?source=list`)}>转到教师详情</button>
      <button type="button" onClick={() => navigate('/student/open-courses/join?source=home')}>转到学生加入</button>
    </div>
  );
}

function HeaderProbe() {
  const header = usePageHeaderConfig();
  return (
    <output aria-label="当前页头">
      {header.title}|{header.breadcrumbs?.map(({ label }) => label).join('>') ?? ''}
    </output>
  );
}

function renderWorkspace(initialEntry: string) {
  const session = createOpenCourseSessionStore();
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ClassWorkspaceProvider>
        <OpenCourseWorkspaceProvider store={session}>
          <PageHeaderProvider fallback={{ title: '公开课' }}>
            <HeaderProbe />
            <TestRoutes />
          </PageHeaderProvider>
        </OpenCourseWorkspaceProvider>
      </ClassWorkspaceProvider>
    </MemoryRouter>,
  );
}

async function createReadyCourse(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('公开课名称'), '家长沟通公开课');
  fireEvent.change(screen.getByLabelText('开始时间'), { target: { value: '2026-08-08T14:45' } });
  await user.selectOptions(screen.getByLabelText('课堂时长'), '90');
  await user.click(screen.getByLabelText('展示座位席'));
  expect(screen.getByLabelText('学生自动上台')).not.toBeChecked();
  expect(screen.getByLabelText('学生自动上台')).toBeDisabled();
  await user.click(screen.getByLabelText('录制 ClassIn 教室（演示开关）'));
  await user.click(screen.getByRole('button', { name: '发布' }));
}

describe('open course workspace', () => {
  it('validates the fixed Demo clock and all constrained create fields', async () => {
    const user = userEvent.setup();
    renderWorkspace('/teacher/open-courses/new');

    expect(screen.getByRole('button', { name: /组织 · 我的账号/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '拍摄或相册' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '添加' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '立即升级' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '拍摄或相册' }));
    expect(screen.getByText(/未访问设备媒体/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('开始时间'), { target: { value: '2026-08-08T14:14' } });
    await user.click(screen.getByRole('button', { name: '发布' }));
    expect(screen.getByText('请输入公开课名称。')).toBeInTheDocument();
    expect(screen.getByText('开始时间不能早于 Demo 当前时间。')).toBeInTheDocument();
    expect(screen.getByText('请检查表单中的必填项和时间。')).toBeInTheDocument();
  });

  it('keeps legacy create deep links in the named dialog and protects unsaved edits', async () => {
    const user = userEvent.setup();
    renderWorkspace('/teacher/open-courses/new?source=list');

    const dialog = screen.getByRole('dialog', { name: '新建公开课' });
    await user.type(within(dialog).getByLabelText('公开课名称'), '未保存公开课');
    await user.click(within(dialog).getByRole('button', { name: '关闭新建公开课' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('公开课尚未保存');
    await user.click(within(dialog).getByRole('button', { name: '继续编辑' }));
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '关闭新建公开课' }));
    await user.click(within(dialog).getByRole('button', { name: '放弃修改' }));
    expect(screen.getByRole('heading', { name: '公开课' })).toBeInTheDocument();
  });

  it('redirects legacy edit links to the same named collection dialog', async () => {
    renderWorkspace('/teacher/open-courses/open-family/edit?source=list');

    expect(await screen.findByRole('dialog', { name: '编辑公开课' })).toBeInTheDocument();
    expect(screen.getByLabelText('当前路径')).toHaveTextContent(
      '/teacher/open-courses?source=list&dialog=edit&course=open-family',
    );
  });

  it('opens ended courses in a read-only dialog and hides management actions', () => {
    renderWorkspace('/teacher/open-courses/open-history?source=list');

    expect(screen.getByLabelText('当前页头')).toHaveTextContent('公开课|');
    expect(screen.getByRole('dialog', { name: '公开课详情' })).toHaveTextContent('产品经理成长训练营');
    expect(screen.getAllByText('已结束').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole('button', { name: '邀请学生' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除公开课' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /上课|进入教室|未开始/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /教学报告/ })).toHaveTextContent('Placeholder');
    expect(screen.getByRole('button', { name: /课后评价/ })).toHaveTextContent('Placeholder');
  });

  it('opens detail editing in a dialog and preserves collection state after deletion', async () => {
    const user = userEvent.setup();
    renderWorkspace('/teacher/open-courses?q=家长&status=scheduled&sort=title-asc');

    await user.click(screen.getByRole('row', { name: '查看公开课 家长会说明会' }));
    const detailDialog = screen.getByRole('dialog', { name: '公开课详情' });
    expect(within(detailDialog).queryByText(/单次课堂/)).not.toBeInTheDocument();
    const identityHeader = within(detailDialog).getByRole('heading', { name: '家长会说明会' }).closest('header');
    expect(identityHeader).not.toBeNull();
    if (!identityHeader) throw new Error('公开课标题区未渲染。');
    expect(within(identityHeader).getByRole('button', { name: '上课' })).toBeInTheDocument();
    const enterHint = within(identityHeader).getByRole('button', { name: '查看上课时间提示' });
    expect(enterHint).toHaveAccessibleDescription('未开始开课前 30 分钟可进入，当前还需等待 255 分钟。');
    expect(within(detailDialog).queryByText('开课前 30 分钟可进入，当前还需等待 255 分钟。')).toBeInTheDocument();
    expect(screen.getByLabelText('当前路径')).toHaveTextContent(
      '/teacher/open-courses?q=%E5%AE%B6%E9%95%BF&status=scheduled&sort=title-asc&dialog=detail&course=open-family&source=list',
    );
    await user.click(screen.getByRole('button', { name: '编辑' }));
    const editor = screen.getByRole('dialog', { name: '编辑公开课' });
    await user.clear(within(editor).getByLabelText('公开课名称'));
    await user.type(within(editor).getByLabelText('公开课名称'), '家长会说明会（更新）');
    await user.click(within(editor).getByRole('button', { name: '保存' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent(
      '/teacher/open-courses?q=%E5%AE%B6%E9%95%BF&status=scheduled&sort=title-asc&dialog=detail&course=open-family&source=list',
    );

    await user.click(screen.getByRole('button', { name: '删除公开课' }));
    const dialog = screen.getByRole('alertdialog', { name: '删除公开课？' });
    await user.click(within(dialog).getByRole('button', { name: '确认删除' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent(
      '/teacher/open-courses?q=%E5%AE%B6%E9%95%BF&status=scheduled&sort=title-asc',
    );
  });

  it('creates into detail, invites on demand, enters preflight, and deletes to the list', async () => {
    const user = userEvent.setup();
    renderWorkspace('/teacher/open-courses/new?source=home');
    await createReadyCourse(user);

    const createdPath = screen.getByLabelText('当前路径').textContent ?? '';
    const createdId = createdPath.match(/course=([^&]+)/)?.[1] ?? '';
    expect(screen.getByRole('dialog', { name: '公开课详情' })).toBeInTheDocument();
    expect(screen.getByLabelText('当前路径')).toHaveTextContent(`/teacher/open-courses?source=home&dialog=detail&course=${createdId}`);
    await user.click(screen.getByRole('button', { name: '邀请学生' }));
    expect(screen.getByRole('dialog', { name: '邀请学生' })).toBeInTheDocument();
    expect(screen.getByText(createDemoOpenCoursePasscode(createdId))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '微信' }));
    expect(screen.getByText('微信为 Demo Placeholder，未连接真实外部服务。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭邀请学生' }));
    expect(screen.queryByRole('dialog', { name: '邀请学生' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '网页直播链接' }));
    expect(screen.getByText(/网页直播链接为 Demo Placeholder/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '上课' }));
    expect(screen.getByRole('heading', { name: /进入 家长沟通公开课/ })).toBeInTheDocument();
    await user.click(screen.getByLabelText('摄像头'));
    expect(screen.getByRole('group', { name: '摄像头方向' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '进入教室' }));
    expect(screen.getByRole('dialog', { name: 'ClassIn 教室' })).toHaveTextContent('未连接真实音视频');
    await user.click(screen.getByRole('button', { name: '关闭并停留在课前检查' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/preflight?source=home');

    await user.click(screen.getByRole('button', { name: '转到教师详情' }));
    await user.click(screen.getByRole('button', { name: '删除公开课' }));
    const dialog = screen.getByRole('alertdialog', { name: '删除公开课？' });
    await user.click(within(dialog).getByRole('button', { name: '确认删除' }));
    expect(screen.getByRole('heading', { name: '公开课' })).toBeInTheDocument();
  });

  it('shares a student join across pages, rejects duplicates, and keeps detail read-only', async () => {
    const user = userEvent.setup();
    renderWorkspace('/teacher/open-courses/new');
    await createReadyCourse(user);
    const createdPath = screen.getByLabelText('当前路径').textContent ?? '';
    const createdId = createdPath.match(/course=([^&]+)/)?.[1] ?? '';
    await user.click(screen.getByRole('button', { name: '关闭公开课详情' }));
    await user.click(screen.getByRole('button', { name: '转到学生加入' }));

    const passcode = createDemoOpenCoursePasscode(createdId);
    await user.type(screen.getByLabelText('In 口令'), passcode);
    await user.click(screen.getByRole('button', { name: '加入公开课' }));
    expect(screen.getByRole('heading', { name: '家长沟通公开课' })).toBeInTheDocument();
    expect(screen.getByText('我的公开课 · 只读')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '邀请学生' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '转到学生加入' }));
    await user.type(screen.getByLabelText('In 口令'), passcode);
    await user.click(screen.getByRole('button', { name: '加入公开课' }));
    expect(screen.getByText('你已加入该公开课。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '返回' }));
    expect(screen.getByText('学生首页')).toBeInTheDocument();
  });

  it('prefills the passcode handed off by the composite join workspace', () => {
    renderWorkspace('/student/open-courses/join?source=home&passcode=IN81NY53');
    expect(screen.getByLabelText('In 口令')).toHaveValue('IN81NY53');
  });
});
