import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { StudentSettingsPage } from '@pages/student/StudentSettingsPage';
import { TeacherSettingsPage } from '@pages/teacher/TeacherSettingsPage';

const SECTION_LABELS = ['我的权益', '个人信息', '账号与安全', '系统设置', '教室设置', '设备检测', '文件传输', '关于软件', '帮助中心', '切换账号', '退出软件'];

function renderSettings(page: ReactElement) {
  return render(<MemoryRouter>{page}</MemoryRouter>);
}

describe('settings workspace', () => {
  it.each([
    ['老师', <TeacherSettingsPage />],
    ['学生', <StudentSettingsPage />],
  ])('renders the evidenced benefits fields for the %s page', (roleLabel, page) => {
    renderSettings(page);
    expect(screen.getByRole('region', { name: `${roleLabel}账号与设置` })).toBeInTheDocument();
    expect(screen.getAllByRole('button').filter((button) => SECTION_LABELS.includes(button.textContent ?? '')).map((button) => button.textContent)).toEqual(SECTION_LABELS);
    expect(screen.getByText('账户名')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '金石' })).toBeInTheDocument();
    expect(screen.getByText('免费版')).toBeInTheDocument();
    expect(screen.getByText('每月免费课堂剩余次数')).toBeInTheDocument();
    expect(screen.getByText('10次')).toBeInTheDocument();
    expect(screen.getByText('组织云存储')).toBeInTheDocument();
    expect(screen.getByText('0/5G')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '权益说明' })).toBeInTheDocument();
  });

  it('keeps upgrade and every non-benefit section inside explicit placeholder boundaries', async () => {
    const user = userEvent.setup();
    renderSettings(<TeacherSettingsPage />);

    await user.click(screen.getByRole('button', { name: '升级' }));
    expect(screen.getByRole('status')).toHaveTextContent('支付和套餐服务未接入');
    await user.click(screen.getByRole('button', { name: '系统设置' }));
    expect(screen.getByRole('heading', { name: '系统设置' })).toBeInTheDocument();
    expect(screen.getByText(/只保留栏目入口和边界说明/)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '返回我的权益' }));
    expect(screen.getByRole('heading', { name: '金石' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '切换账号' }));
    expect(screen.getByText(/账号列表、认证和切换会话尚未接入/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '退出软件' }));
    expect(screen.getByText(/客户端关闭尚未接入/)).toBeInTheDocument();
  });

  it('opens a URL-selected section and keeps navigation reflected in the route', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/teacher/settings/system']}>
        <Routes><Route path="/teacher/settings/:settingsSection?" element={<TeacherSettingsPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: '系统设置' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '返回我的权益' }));
    expect(screen.getByRole('heading', { name: '金石' })).toBeInTheDocument();
  });
});
