import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { StandaloneTeacherProvider, StandaloneWorkBuddyRoutes, useStandaloneTeacher } from '@features/standalone-workbuddy';

function renderStandalone(path: string) {
  return render(
    <StandaloneTeacherProvider>
      <MemoryRouter initialEntries={[path]}>
        <StandaloneWorkBuddyRoutes />
      </MemoryRouter>
    </StandaloneTeacherProvider>,
  );
}

describe('standalone teacher WorkBuddy', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows the independent acquisition landing page before ClassIn role selection', () => {
    renderStandalone('/teachbuddy');
    expect(screen.getByRole('heading', { level: 1, name: '把教学想法，变成可以直接审阅的成果' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '免费开始' })[0]).toHaveAttribute('href', '/teachbuddy/register');
    expect(screen.getByText('注册即得 360 AI 点数')).toBeInTheDocument();
  });

  it('guards the app route and preserves a safe standalone next path', () => {
    renderStandalone('/teachbuddy/app/credits');
    expect(screen.getByRole('heading', { level: 1, name: '欢迎回到 TeacherIn' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '免费注册' })).toHaveAttribute('href', '/teachbuddy/register?next=%2Fteachbuddy%2Fapp%2Fcredits');
  });

  it('projects recoverable registration validation without entering the workspace', async () => {
    const user = userEvent.setup();
    renderStandalone('/teachbuddy/register');
    await user.type(screen.getByLabelText('教师称呼'), '林');
    await user.type(screen.getByLabelText('邮箱'), 'invalid');
    await user.type(screen.getByLabelText('密码'), 'short');
    await user.click(screen.getByRole('button', { name: '注册并免费开始' }));
    expect(screen.getByRole('alert')).toHaveTextContent('请输入至少 2 个字的教师姓名');
    expect(screen.getByRole('heading', { level: 1, name: '开始你的 AI 教学工作台' })).toBeInTheDocument();
  });

  it('blocks task admission when simulated AI points are exhausted', async () => {
    const user = userEvent.setup();
    function AdmissionHarness() {
      const experience = useStandaloneTeacher();
      const [message, setMessage] = useState('');
      const create = () => {
        const index = experience.creditView?.ledger.length ?? 0;
        const result = experience.taskAdmission.start({
          taskType: 'course-package',
          goal: `课程方案 ${index}`,
          createRun: () => `run-${index}`,
        });
        setMessage(result.ok ? 'created' : result.reason);
      };
      return <><button type="button" onClick={() => experience.register({ name: '林老师', email: 'credit@example.com', password: 'teaching88' })}>register</button><button type="button" onClick={create}>create</button><output>{experience.creditView?.availableBalance ?? 'signed-out'}:{message}</output></>;
    }
    render(<StandaloneTeacherProvider><AdmissionHarness /></StandaloneTeacherProvider>);
    await user.click(screen.getByRole('button', { name: 'register' }));
    await user.click(screen.getByRole('button', { name: 'create' }));
    await user.click(screen.getByRole('button', { name: 'create' }));
    await user.click(screen.getByRole('button', { name: 'create' }));
    expect(screen.getByText('0:created')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'create' }));
    expect(screen.getByText('0:insufficient_credits')).toBeInTheDocument();
  });
});
