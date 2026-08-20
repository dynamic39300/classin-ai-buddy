import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AllLessonsReportWorkspace } from '@features/teaching-insights-workspace/AllLessonsReportWorkspace';
import { TeachingInsightsWorkspace } from '@features/teaching-insights-workspace/TeachingInsightsWorkspace';

describe('teaching insights workspace', () => {
  it('switches the complete class scenario without reusing students from another class', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LocationProbe /><TeachingInsightsWorkspace /></MemoryRouter>);

    expect(screen.getByText('20/20 位学生')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /初三英语 2 班/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: '班级范围' }), 'physics-3');

    expect(screen.getByText('30/30 位学生')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /动量守恒模型/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Unit3精读/ })).not.toBeInTheDocument();
  });

  it('shows every available class in the compact class selector', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LocationProbe /><TeachingInsightsWorkspace /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /初三英语 2 班/ }));
    const classSelect = screen.getByRole('combobox', { name: '班级范围' });
    expect(within(classSelect).getByRole('option', { name: '高二物理 1 班' })).toBeInTheDocument();
    expect(within(classSelect).getByRole('option', { name: '初三英语 2 班' })).toBeInTheDocument();
  });

  it('filters one class by course and resets the course when the class changes', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LocationProbe /><TeachingInsightsWorkspace /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /初三英语 2 班/ }));
    expect(screen.getByRole('group', { name: '教学洞察范围筛选选项' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '课程范围' })).toHaveValue('all');
    expect(screen.getByRole('option', { name: '英语精读' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '词汇专项' })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: '课程范围' }), 'english-reading');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('class=english-2&course=english-reading');
    expect(screen.getByText('精读课到课稳定，下一步聚焦表达与错题复盘。')).toBeInTheDocument();
    expect(screen.getByText('14/18')).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /词汇专项/ })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: '班级范围' }), 'physics-3');
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('class=physics-3');
    expect(screen.getByLabelText('当前路径')).not.toHaveTextContent('course=');
    expect(screen.getByRole('combobox', { name: '课程范围' })).toHaveValue('all');
    await user.keyboard('{Escape}');
    expect(screen.getByText('30/30 位学生')).toBeInTheDocument();
  });

  it('shows the mobile-aligned metrics, exactly three recent lessons, and student detail', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LocationProbe /><TeachingInsightsWorkspace /></MemoryRouter>);
    expect(screen.getByText('18/24')).toBeInTheDocument();
    const classContext = screen.getByRole('button', { name: /初三英语 2 班/ });
    expect(classContext).toHaveTextContent('20 位学生 · 全部课程 · 进行中');
    expect(classContext).not.toHaveTextContent('18/24');
    expect(screen.queryByText(/2026-03-01 至 2026-09-30/)).not.toBeInTheDocument();
    expect(screen.getAllByText('92%')[0]).toBeInTheDocument();
    expect(screen.getAllByText('78%')[0]).toBeInTheDocument();
    const lessonSection = screen.getByRole('heading', { name: '近期课堂' }).closest('section');
    expect(lessonSection).not.toBeNull();
    expect(within(lessonSection as HTMLElement).getAllByRole('row')).toHaveLength(4);
    expect(lessonSection).not.toHaveTextContent('2026');
    await user.click(screen.getByRole('button', { name: /李华/ }));
    expect(screen.getByRole('complementary', { name: '学生洞察详情' })).toHaveTextContent('下一步关注');
  });

  it('shows a concise evidence narrative with hover and focus definitions', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LocationProbe /><TeachingInsightsWorkspace /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: '出勤' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '课堂互动与氛围' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '作业提交质量' })).toBeInTheDocument();
    expect(screen.getByText('最近课堂主动参与')).toBeInTheDocument();
    expect(screen.getByText('最近课堂被动响应')).toBeInTheDocument();
    expect(screen.getByText('作业提交率')).toBeInTheDocument();
    expect(screen.queryByText('请假合规')).not.toBeInTheDocument();
    expect(screen.queryByText('生均互动次数')).not.toBeInTheDocument();
    expect(screen.queryByText('知识点偏差')).not.toBeInTheDocument();
    expect(screen.queryByText('完成质量')).not.toBeInTheDocument();
    expect(screen.getByText('本周教学结论')).toBeInTheDocument();
    expect(screen.getByText('课堂响应较好，优先处理未交与错题。')).toBeInTheDocument();
    expect(screen.getByText('先用班级出勤率判断到课覆盖，再回到学生名单确认缺勤发生在哪些课堂。')).toBeInTheDocument();
    expect(screen.getByText('下一节课先做全员响应，再安排自愿说明理由，分别观察响应与主动表达。')).toBeInTheDocument();
    expect(screen.getByText('未提交学生优先催交；已提交但错误较多的学生进入错题讲评。')).toBeInTheDocument();
    expect(screen.queryByText('怎么读')).not.toBeInTheDocument();
    expect(screen.queryByText('优势')).not.toBeInTheDocument();
    expect(screen.queryByText('改进点')).not.toBeInTheDocument();
    const recentLessons = screen.getByRole('heading', { name: '近期课堂' }).closest('section');
    expect(recentLessons).not.toBeNull();
    for (const label of ['课堂', '出勤', '主动参与', '被动响应', '作业正确率']) {
      expect(within(recentLessons as HTMLElement).getByRole('columnheader', { name: label })).toBeInTheDocument();
    }
    expect(within(recentLessons as HTMLElement).getByRole('button', { name: '查看全部课堂' })).toBeInTheDocument();

    const explanationTrigger = screen.getByRole('button', { name: '作业正确率说明' });
    await user.hover(explanationTrigger);
    expect(screen.getByText('已批改客观题中，正确作答数量占已作答数量的比例。')).toHaveAttribute('role', 'tooltip');
    expect(screen.queryByRole('complementary', { name: '指标说明' })).not.toBeInTheDocument();
  });

  it('closes the top class picker with Escape and restores its trigger focus', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><TeachingInsightsWorkspace /></MemoryRouter>);
    const trigger = screen.getByRole('button', { name: /初三英语 2 班/ });

    await user.click(trigger);
    expect(screen.getByRole('group', { name: '教学洞察范围筛选选项' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('group', { name: '教学洞察范围筛选选项' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('filters attention students and opens lesson report placeholder', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LocationProbe /><TeachingInsightsWorkspace /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /需关注 8/ }));
    expect(screen.getByText('8/20 位学生')).toBeInTheDocument();
    const recentLesson = screen.getByRole('row', { name: /Unit3精读/ });
    expect(within(recentLesson).getByText('76%')).toBeInTheDocument();
    await user.click(within(recentLesson).getByRole('button', { name: /查看Unit3精读.*报告/ }));
    expect(screen.getByRole('status')).toHaveTextContent('不连接真实报告服务');
  });

  it('keeps export and reward actions within their Placeholder boundary', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LocationProbe /><TeachingInsightsWorkspace /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: '导出报告' }));
    expect(screen.getByRole('status')).toHaveTextContent('不生成离线报表');

    await user.click(screen.getByRole('button', { name: '李华' }));
    await user.click(screen.getByRole('button', { name: '奖励' }));
    expect(screen.getByRole('status')).toHaveTextContent('不直接发放真实奖励');
  });

  it('preserves class context through all lessons and exposes lesson facts and historical trends', async () => {
    const user = userEvent.setup();
    renderInsightsRoutes('/teacher/insights?class=physics-3');

    await user.click(screen.getByRole('button', { name: '查看全部课堂' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/teacher/insights/lessons?class=physics-3');
    expect(screen.getByRole('heading', { name: '全部课堂' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '历史趋势' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /出勤率趋势/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /动量守恒模型/ }));
    const expandedLesson = screen.getByRole('button', { name: /动量守恒模型/ }).closest('article');
    expect(expandedLesson).not.toBeNull();
    expect(within(expandedLesson as HTMLElement).getByText('主动参与')).toBeInTheDocument();
    expect(within(expandedLesson as HTMLElement).getByText('82%')).toBeInTheDocument();
    expect(within(expandedLesson as HTMLElement).getByText('被动响应')).toBeInTheDocument();
    expect(within(expandedLesson as HTMLElement).getByText('94%')).toBeInTheDocument();
    expect(within(expandedLesson as HTMLElement).getAllByText('作业正确率')).toHaveLength(2);
    expect(within(expandedLesson as HTMLElement).getAllByText('86%')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: '作业正确率趋势' }));
    expect(screen.getByRole('region', { name: '历史趋势' })).toHaveTextContent('86%');
    await user.click(screen.getByRole('button', { name: '下一讲参考' }));
    expect(screen.getByRole('status')).toHaveTextContent('不生成预测结果');
    expect(screen.queryByRole('button', { name: '返回洞察' })).not.toBeInTheDocument();
  });

  it('keeps the all-lessons report concise and discloses metric definitions on demand', async () => {
    const user = userEvent.setup();
    renderInsightsRoutes('/teacher/insights/lessons?class=physics-3');

    expect(screen.queryByText('按最近日期倒序浏览每节课堂的证据。')).not.toBeInTheDocument();
    expect(screen.queryByText(/趋势只展示已有课堂事实/)).not.toBeInTheDocument();
    expect(screen.queryByText('基于当前范围课堂事实')).not.toBeInTheDocument();
    expect(screen.queryByText('事实数据')).not.toBeInTheDocument();

    const attendanceHelp = screen.getAllByRole('button', { name: '出勤率说明' })[0];
    expect(attendanceHelp).toBeDefined();
    if (!attendanceHelp) throw new Error('Missing attendance metric help');
    await user.hover(attendanceHelp);
    expect(document.getElementById(attendanceHelp.getAttribute('aria-describedby') ?? '')).toHaveTextContent('实际到课人数占应到人数的比例。');

    await user.click(screen.getByRole('button', { name: '主动参与趋势' }));
    const participationHelp = screen.getByRole('button', { name: '主动参与说明' });
    participationHelp.focus();
    expect(document.getElementById(participationHelp.getAttribute('aria-describedby') ?? '')).toHaveTextContent('主动发起或参与课堂互动的人数占比。');

    const lessonSection = screen.getByRole('heading', { name: '全部课堂记录' }).closest('section');
    expect(lessonSection).not.toBeNull();
    expect(within(lessonSection as HTMLElement).getByText('08/08')).toBeInTheDocument();
    expect(lessonSection).not.toHaveTextContent('2026');
  });

  it('preserves a concrete course through the all-lessons route', async () => {
    const user = userEvent.setup();
    renderInsightsRoutes('/teacher/insights?class=english-2&course=english-reading');

    await user.click(screen.getByRole('button', { name: '查看全部课堂' }));
    expect(screen.getByLabelText('当前路径')).toHaveTextContent('/teacher/insights/lessons?class=english-2&course=english-reading');
    expect(screen.getByText('初三英语 2 班 · 英语精读')).toBeInTheDocument();
    expect(screen.getByText(/20 位学生 · 3 节课堂/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /词汇专项/ })).not.toBeInTheDocument();
  });

  it('does not expose messaging from student insight details', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LocationProbe /><TeachingInsightsWorkspace /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /李华/ }));
    expect(screen.queryByRole('button', { name: '发消息' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '奖励' })).toBeInTheDocument();
  });

  it('restores focus to the student row after closing the detail panel', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LocationProbe /><TeachingInsightsWorkspace /></MemoryRouter>);
    const studentButton = screen.getByRole('button', { name: '李华' });
    await user.click(studentButton);
    expect(screen.getByRole('complementary', { name: '学生洞察详情' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: '关闭学生详情' }));
    expect(studentButton).toHaveFocus();
    expect(screen.getByLabelText('当前路径')).not.toHaveTextContent('student=');
  });

  it('exposes the complete mobile student KPI table with sortable headers', () => {
    render(<MemoryRouter><LocationProbe /><TeachingInsightsWorkspace /></MemoryRouter>);

    const studentSection = screen.getByRole('heading', { name: '学生表现' }).closest('section');
    expect(studentSection).not.toBeNull();
    for (const label of ['迟到', '缺勤', '提问', '作业状态', '按时率', '补交', '作业正确率']) {
      expect(within(studentSection as HTMLElement).getByRole('columnheader', { name: label })).toBeInTheDocument();
    }
    expect(within(studentSection as HTMLElement).getByRole('columnheader', { name: '状态' })).toHaveAttribute('aria-sort', 'descending');
    expect(within(studentSection as HTMLElement).getByRole('columnheader', { name: '迟到' })).toHaveAttribute('aria-sort', 'none');
  });

  it('opens only same-class student deep links and explains invalid targets', () => {
    const valid = render(<MemoryRouter initialEntries={['/teacher/insights?class=english-2&student=student-002']}><LocationProbe /><TeachingInsightsWorkspace /></MemoryRouter>);
    expect(screen.getByRole('complementary', { name: '学生洞察详情' })).toHaveTextContent('李华');
    valid.unmount();

    render(<MemoryRouter initialEntries={['/teacher/insights?class=physics-3&student=student-002']}><LocationProbe /><TeachingInsightsWorkspace /></MemoryRouter>);
    expect(screen.queryByRole('complementary', { name: '学生洞察详情' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('不属于当前班级');
  });

  it('renders explicit loading, error, empty, and permission states', () => {
    const states = [
      ['loading', '正在加载班级、课堂和学生数据...'],
      ['error', '班级洞察数据暂时无法读取'],
      ['empty-lessons', '完成课堂后才会产生课堂洞察记录'],
      ['empty-students', '当前班级暂无学生数据'],
      ['forbidden', '当前账号没有查看教师教学洞察的权限'],
    ] as const;

    for (const [viewState, copy] of states) {
      const view = render(<MemoryRouter><TeachingInsightsWorkspace viewState={viewState} /></MemoryRouter>);
      expect(screen.getByRole(viewState === 'error' || viewState === 'forbidden' ? 'alert' : 'status')).toHaveTextContent(copy);
      view.unmount();
    }
  });
});

function LocationProbe() {
  const location = useLocation();
  return <span aria-label="当前路径" role="none">{location.pathname}{location.search}</span>;
}

function renderInsightsRoutes(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <Routes>
        <Route path="/teacher/insights" element={<TeachingInsightsWorkspace />} />
        <Route path="/teacher/insights/lessons" element={<AllLessonsReportWorkspace />} />
      </Routes>
    </MemoryRouter>,
  );
}
