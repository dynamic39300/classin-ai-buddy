import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  HomeworkWorkspaceProvider,
  StudentHomeworkEditorWorkspace,
  StudentHomeworkSubmissionWorkspace,
  TeacherHomeworkDetailWorkspace,
  TeacherHomeworkEditorWorkspace,
  TeacherHomeworkReviewWorkspace,
  useHomeworkWorkspace,
} from '@features/homework-workspace';
import { TeacherHomeworkCreatePage } from '@pages/teacher/TeacherHomeworkCreatePage';
import { ClassWorkspaceProvider } from '@features/class-workspace/ClassWorkspaceProvider';

function FirstSubmissionJourney() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <>
      <TeacherHomeworkDetailWorkspace homeworkId="homework-momentum-a" initialGroup="not_submitted" />
      {submitted ? (
        <StudentHomeworkSubmissionWorkspace homeworkId="homework-momentum-a" />
      ) : (
        <StudentHomeworkEditorWorkspace
          homeworkId="homework-momentum-a"
          mode="first"
          onSubmitted={() => setSubmitted(true)}
        />
      )}
    </>
  );
}

describe('homework workspace', () => {
  it('shares one homework object across student submission and teacher groups without a confirmation page', async () => {
    const user = userEvent.setup();
    render(<HomeworkWorkspaceProvider><FirstSubmissionJourney /></HomeworkWorkspaceProvider>);

    expect(screen.getByRole('button', { name: '李明，未交' })).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: '我的答案' }), '总动量在碰撞前后保持不变。');
    await user.click(screen.getByRole('button', { name: '提交作业' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '已提交，等待老师批阅' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /待批 2/ }));
    expect(screen.getByRole('button', { name: '李明，待批' })).toBeEnabled();
  });

  it('grades an integer score and refreshes the readonly review result', async () => {
    const user = userEvent.setup();
    render(
      <HomeworkWorkspaceProvider>
        <TeacherHomeworkReviewWorkspace homeworkId="homework-momentum-a" submissionId="submission-momentum-002" />
      </HomeworkWorkspaceProvider>,
    );

    await user.type(screen.getByRole('spinbutton', { name: /分数/ }), '88');
    await user.type(screen.getByRole('textbox', { name: '文字评语' }), '过程完整。');
    await user.click(screen.getByRole('button', { name: '完成批阅' }));

    expect(screen.getByRole('status')).toHaveTextContent('批阅已完成');
    expect(screen.getByRole('spinbutton', { name: /分数/ })).toBeDisabled();
    expect(screen.getByText('已批')).toBeInTheDocument();
  });

  it('requires a return comment and lets the student resubmit a correction', async () => {
    const user = userEvent.setup();
    const view = render(
      <HomeworkWorkspaceProvider>
        <TeacherHomeworkReviewWorkspace homeworkId="homework-momentum-a" submissionId="submission-momentum-002" />
      </HomeworkWorkspaceProvider>,
    );

    await user.click(screen.getByRole('button', { name: '打回订正' }));
    expect(screen.getByRole('status')).toHaveTextContent('请填写明确的订正要求');
    await user.type(screen.getByRole('textbox', { name: '文字评语' }), '请补充正方向。');
    await user.click(screen.getByRole('button', { name: '打回订正' }));
    expect(screen.getByRole('status')).toHaveTextContent('已打回订正');

    view.unmount();
    render(
      <HomeworkWorkspaceProvider>
        <StudentHomeworkEditorWorkspace homeworkId="homework-correction" mode="correction" />
        <TeacherHomeworkDetailWorkspace homeworkId="homework-correction" initialGroup="returned" />
      </HomeworkWorkspaceProvider>,
    );
    const editor = screen.getByRole('main', { name: /订正作业/ });
    const answer = within(editor).getByRole('textbox', { name: '我的答案' });
    await user.clear(answer);
    await user.type(answer, '波速不变时，频率与波长成反比。');
    await user.click(within(editor).getByRole('button', { name: '重新提交' }));
    expect(within(editor).getByRole('status')).toHaveTextContent('订正已重新提交');
    await user.click(screen.getByRole('tab', { name: /待批 1/ }));
    expect(screen.getByRole('button', { name: '李明，待批' })).toBeEnabled();
  });

  it('marks ended submissions as late only through the late mode', async () => {
    const user = userEvent.setup();
    render(
      <HomeworkWorkspaceProvider>
        <StudentHomeworkEditorWorkspace homeworkId="homework-late" mode="late" />
        <SubmissionProbe homeworkId="homework-late" />
      </HomeworkWorkspaceProvider>,
    );
    await user.type(screen.getByRole('textbox', { name: '我的答案' }), '补交冲量方向分析。');
    await user.click(screen.getByRole('button', { name: '提交补交' }));
    expect(screen.getByText('作业已补交。')).toBeInTheDocument();
    expect(screen.getByTestId('submission-state')).toHaveTextContent('submitted:true');
  });

  it('validates and publishes the fixed 100-point editor contract', async () => {
    const user = userEvent.setup();
    render(
      <HomeworkWorkspaceProvider>
        <TeacherHomeworkEditorWorkspace />
        <HomeworkCount />
      </HomeworkWorkspaceProvider>,
    );
    await user.click(screen.getByRole('button', { name: '发布' }));
    expect(screen.getByText('请输入作业标题')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('输入作业标题'), '能量守恒综合练习');
    await user.type(screen.getByPlaceholderText('说明作答要求和提交内容'), '完成第 1 至 4 题。');
    await user.selectOptions(screen.getByLabelText(/班级/), 'physics-3');
    await user.type(screen.getByLabelText(/开始时间/), '2026-08-10T08:00');
    await user.type(screen.getByLabelText(/截止时间/), '2026-08-11T18:00');
    await user.click(screen.getByRole('button', { name: '发布' }));

    expect(screen.getByText('作业已发布，学生端与教师看板已同步。')).toBeInTheDocument();
    expect(screen.getByTestId('homework-count')).toHaveTextContent('6');
    expect(screen.getByText('100 分', { selector: 'dd' })).toBeInTheDocument();
  });

  it('prefills class context and preserves its source query after publishing', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/teacher/homework/new?class=physics-3&course=course-momentum&unit=unit-momentum-1&source=class_unit']}>
        <ClassWorkspaceProvider><HomeworkWorkspaceProvider>
          <LocationProbe />
          <Routes>
            <Route path="/teacher/homework/new" element={<TeacherHomeworkCreatePage />} />
            <Route path="/teacher/homework/:homeworkId" element={<span>作业详情路由</span>} />
            <Route path="/teacher/classes/:classId" element={<span>班级详情路由</span>} />
          </Routes>
        </HomeworkWorkspaceProvider></ClassWorkspaceProvider>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/班级/)).toHaveValue('physics-3');
    expect(screen.getByLabelText(/课程/)).toHaveValue('course-momentum');
    expect(screen.getByLabelText(/单元/)).toHaveValue('unit-momentum-1');
    await user.type(screen.getByPlaceholderText('输入作业标题'), '单元深链作业');
    await user.type(screen.getByPlaceholderText('说明作答要求和提交内容'), '完成单元练习。');
    await user.type(screen.getByLabelText(/开始时间/), '2026-08-10T08:00');
    await user.type(screen.getByLabelText(/截止时间/), '2026-08-11T18:00');
    await user.click(screen.getByRole('button', { name: '发布' }));

    expect(screen.getByText('作业详情路由')).toBeInTheDocument();
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/teacher/homework/homework-local-1?class=physics-3&course=course-momentum&unit=unit-momentum-1&source=class_unit');
  });

  it('returns a class-scoped create flow to the originating class', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/teacher/homework/new?class=physics-3&course=course-momentum&unit=unit-momentum-1&source=class_unit']}>
        <ClassWorkspaceProvider><HomeworkWorkspaceProvider>
          <LocationProbe />
          <Routes>
            <Route path="/teacher/homework/new" element={<TeacherHomeworkCreatePage />} />
            <Route path="/teacher/classes/:classId" element={<span>班级详情路由</span>} />
          </Routes>
        </HomeworkWorkspaceProvider></ClassWorkspaceProvider>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: '返回' }));
    expect(screen.getByText('班级详情路由')).toBeInTheDocument();
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/teacher/classes/physics-3');
  });
});

function SubmissionProbe({ homeworkId }: { homeworkId: string }) {
  const { submissions, currentStudentId } = useHomeworkWorkspace();
  const submission = submissions.find((item) => item.homeworkId === homeworkId && item.studentId === currentStudentId);
  return <output data-testid="submission-state">{submission ? `${submission.status}:${submission.isLate}` : 'missing'}</output>;
}

function HomeworkCount() {
  const { homeworks } = useHomeworkWorkspace();
  return <output data-testid="homework-count">{homeworks.length}</output>;
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="当前路径">{location.pathname}{location.search}</output>;
}
