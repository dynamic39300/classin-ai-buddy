import { useState, type ReactElement, type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { ClassRecord, OpenCourseRecord } from '@domain/class/class';
import { ClassAnnouncementWorkspace } from '@features/class-collaboration-workspace/ClassAnnouncementWorkspace';
import { ClassMembersWorkspace } from '@features/class-collaboration-workspace/ClassMembersWorkspace';
import { ClassSettingsWorkspace } from '@features/class-collaboration-workspace/ClassSettingsWorkspace';
import { ClassWorkspaceContext, useClassWorkspaceStore } from '@features/class-workspace/class-workspace-store';
import { CLASS_RECORDS } from '@mocks/scenarios/classes';

function cloneRecords(): ClassRecord[] {
  return structuredClone(CLASS_RECORDS) as ClassRecord[];
}

function TestStore({ children, initialClasses }: { children: ReactNode; initialClasses: ReadonlyArray<ClassRecord> }) {
  const [classes, setClasses] = useState(initialClasses);
  const [openCourses, setOpenCourses] = useState<ReadonlyArray<OpenCourseRecord>>([]);
  return (
    <ClassWorkspaceContext.Provider value={{ classes, openCourses, setClasses, setOpenCourses }}>
      {children}
    </ClassWorkspaceContext.Provider>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <span aria-label="当前路径">{location.pathname}{location.search}</span>;
}

function TeacherAnnouncementProjectionProbe() {
  const { classes } = useClassWorkspaceStore();
  const announcement = classes
    .find(({ id }) => id === 'physics-3')
    ?.announcements.find(({ id }) => id === 'announcement-physics-1');
  return (
    <>
      <span aria-label="教师确认名单数量">{announcement?.confirmedMemberIds.length ?? 0}</span>
      <span aria-label="共享公告学生阅读状态">{String(announcement?.readByRole['student-family'] ?? false)}</span>
    </>
  );
}

function MemberLeftAtProbe({ memberId }: { memberId: string }) {
  const { classes } = useClassWorkspaceStore();
  const member = classes.find(({ id }) => id === 'physics-3')?.members.find(({ id }) => id === memberId);
  return <span aria-label={`${memberId} leftAt`}>{member?.leftAt ?? 'active'}</span>;
}

function renderWorkspace(
  element: ReactElement,
  records: ReadonlyArray<ClassRecord> = cloneRecords(),
  initialEntry = '/',
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <TestStore initialClasses={records}>{element}</TestStore>
    </MemoryRouter>,
  );
}

describe('class collaboration workspace', () => {
  it('keeps teacher reminder and student confirmation explicitly local', async () => {
    const user = userEvent.setup();
    const teacherView = renderWorkspace(
      <ClassAnnouncementWorkspace
        role="teacher"
        classId="physics-3"
        announcementId="announcement-physics-1"
      />,
    );

    expect(screen.getByLabelText('公告确认统计')).toHaveTextContent('1 已确认');
    expect(screen.getByLabelText('公告确认统计')).toHaveTextContent('1 未确认');
    expect(screen.getByRole('heading', { name: '已确认样例' }).parentElement).toHaveTextContent('小吴');
    expect(screen.getByRole('heading', { name: '未确认样例' }).parentElement).toHaveTextContent('李明');
    await user.click(screen.getByRole('button', { name: '提醒未确认成员' }));
    expect(screen.getByRole('status')).toHaveTextContent('本地记录');
    expect(screen.getByRole('status')).toHaveTextContent('不发送真实消息');

    teacherView.unmount();
    renderWorkspace(
      <>
        <ClassAnnouncementWorkspace
          role="student-family"
          classId="physics-3"
          announcementId="announcement-physics-1"
        />
        <TeacherAnnouncementProjectionProbe />
      </>,
    );
    const confirm = screen.getByRole('button', { name: '我已确认' });
    await user.click(confirm);
    expect(screen.getByRole('button', { name: '已确认' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('当前学生视角');
    expect(screen.getByLabelText('教师确认名单数量')).toHaveTextContent('1');
    expect(screen.getByLabelText('共享公告学生阅读状态')).toHaveTextContent('false');
    expect(screen.queryByText('成员确认样例')).not.toBeInTheDocument();
  });

  it('shows only active members, searches account and class nickname, and keeps the student page read-only', async () => {
    const user = userEvent.setup();
    const records = cloneRecords();
    const physics = records.find(({ id }) => id === 'physics-3')!;
    physics.members.push({
      id: 'member-left',
      name: '已退出成员',
      classNickname: '旧昵称',
      role: 'student-family',
      plan: 'free',
      relationship: '学生',
      joinedAt: '2026-06-01',
      leftAt: '2026-07-01',
    });

    const teacherView = renderWorkspace(<ClassMembersWorkspace role="teacher" classId="physics-3" />, records);
    expect(screen.getByText(/2\/50/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '班主任 / 教师' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '学习者' })).toBeInTheDocument();
    expect(screen.queryByText('已退出成员')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('搜索账号名或班级昵称'), '小吴');
    expect(screen.getByText('小吴', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByText('李明')).not.toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText('搜索账号名或班级昵称'));
    await user.type(screen.getByPlaceholderText('搜索账号名或班级昵称'), '李明');
    expect(screen.getByText('李明', { selector: 'strong' })).toBeInTheDocument();

    teacherView.unmount();
    renderWorkspace(<ClassMembersWorkspace role="student-family" classId="physics-3" />, records);
    expect(screen.queryByRole('button', { name: '邀请成员' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /修改昵称/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /移除/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('applies headmaster removal atomically and confirms promotion', async () => {
    const user = userEvent.setup();
    renderWorkspace(
      <>
        <ClassMembersWorkspace role="teacher" classId="physics-3" />
        <MemberLeftAtProbe memberId="member-zhang" />
        <MemberLeftAtProbe memberId="member-li" />
        <MemberLeftAtProbe memberId="member-wu" />
      </>,
    );

    await user.click(screen.getByRole('checkbox', { name: '选择 张老师' }));
    await user.click(screen.getByRole('checkbox', { name: '选择 李明' }));
    await user.click(screen.getByRole('button', { name: '批量移除 2' }));
    const removalDialog = screen.getByRole('alertdialog');
    await user.click(within(removalDialog).getByRole('button', { name: '确认移除' }));
    expect(screen.getByRole('status')).toHaveTextContent('未移除任何成员');
    expect(screen.getByText('张老师', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('李明', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByLabelText('member-zhang leftAt')).toHaveTextContent('active');
    expect(screen.getByLabelText('member-li leftAt')).toHaveTextContent('active');

    await user.click(screen.getByRole('checkbox', { name: '选择 张老师' }));
    await user.click(screen.getByRole('checkbox', { name: '选择 李明' }));
    await user.click(screen.getByRole('checkbox', { name: '选择 小吴' }));
    await user.click(screen.getByRole('button', { name: '批量移除 1' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '确认移除' }));
    expect(screen.getByLabelText('member-wu leftAt')).toHaveTextContent('2026-08-09T12:00:00+08:00');
    expect(screen.queryByText('小吴', { selector: 'strong' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '设为教师李明' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '确认设置' }));
    expect(within(screen.getByRole('region', { name: '班主任 / 教师' })).getByText('李明', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '设为教师李明' })).not.toBeInTheDocument();
  });

  it('keeps all three teacher invitation methods stable without changing member counts', async () => {
    const user = userEvent.setup();
    renderWorkspace(<ClassMembersWorkspace role="teacher" classId="physics-3" />);
    expect(screen.getByText(/2\/50/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '邀请成员' }));
    const dialog = screen.getByRole('dialog', { name: '邀请成员' });
    const submit = within(dialog).getByRole('button', { name: '确定 0' });
    expect(submit).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox', { name: /周然/ }));
    await user.click(within(dialog).getByRole('button', { name: '确定 1' }));
    expect(within(dialog).getByRole('status')).toHaveTextContent('成员与人数未改变');
    expect(screen.getByText(/2\/50/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('tab', { name: 'In口令' }));
    expect(within(dialog).getByText(/^\d{3} \d{3}$/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('tab', { name: '二维码' }));
    expect(within(dialog).getByLabelText('高二物理 3 班邀请二维码 Mock')).toBeInTheDocument();
  });

  it('separates headmaster settings from student controls and returns successful exits by source', async () => {
    const user = userEvent.setup();
    const teacherView = renderWorkspace(<ClassSettingsWorkspace role="teacher" classId="physics-3" />);

    expect(screen.getByText('退出班级或课程结课后可查看内容')).toBeInTheDocument();
    expect(screen.getByText('协同教师可创建活动')).toBeInTheDocument();
    expect(screen.getAllByText('当前版本只读')).toHaveLength(2);
    const nicknamePermission = screen.getByRole('switch', { name: /允许学生修改班级昵称/ });
    expect(nicknamePermission).toBeChecked();
    await user.click(nicknamePermission);
    expect(nicknamePermission).not.toBeChecked();
    expect(screen.queryByText(/学校|学科|头像/)).not.toBeInTheDocument();

    teacherView.unmount();
    renderWorkspace(
      <ClassSettingsWorkspace role="student-family" classId="physics-3" source="home" />,
      cloneRecords(),
      '/student/classes/physics-3/settings?from=home',
    );
    expect(screen.queryByText('班主任权限')).not.toBeInTheDocument();
    expect(screen.queryByText('邀请与成员')).not.toBeInTheDocument();
    expect(screen.queryByText('批量移除成员')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '修改昵称' }));
    const nicknameInput = screen.getByRole('textbox', { name: '班级昵称' });
    await user.clear(nicknameInput);
    await user.type(nicknameInput, '物理课代表');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByText('物理课代表')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '退出班级' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '确认退出' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/student/home');
  });

  it('limits ordinary teachers to inviting and nickname edits and returns exits to the class list', async () => {
    const user = userEvent.setup();
    const records = cloneRecords();
    const ordinary = records.find(({ id }) => id === 'physics-1')!;
    ordinary.members.push({
      id: 'member-ordinary-student',
      name: '赵同学',
      role: 'student-family',
      plan: 'free',
      relationship: '学生',
      joinedAt: '2026-06-10',
      leftAt: null,
    });

    const membersView = renderWorkspace(<ClassMembersWorkspace role="teacher" classId="physics-1" />, records);
    expect(screen.getByRole('button', { name: '邀请成员' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '修改昵称赵同学' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '修改昵称王老师' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /设为教师/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /移除/ })).not.toBeInTheDocument();

    membersView.unmount();
    const settingsView = renderWorkspace(<ClassSettingsWorkspace role="teacher" classId="physics-1" />, records);
    expect(screen.getByRole('button', { name: '打开邀请' })).toBeInTheDocument();
    expect(screen.queryByText('班主任权限')).not.toBeInTheDocument();
    expect(screen.queryByText('批量移除成员')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '退出班级' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '退出班级' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '确认退出' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/teacher/classes');

    settingsView.unmount();
    renderWorkspace(<ClassSettingsWorkspace role="student-family" classId="physics-1" />);
    expect(screen.getByRole('heading', { name: '无法访问这个班级内容' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '安全返回' })).toBeInTheDocument();
  });
});
