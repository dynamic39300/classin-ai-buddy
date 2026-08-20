import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageHeader } from '@app/shell/usePageHeader';
import { AllLessonsReportWorkspace } from '@features/teaching-insights-workspace/AllLessonsReportWorkspace';
import { TeachingInsightsWorkspace } from '@features/teaching-insights-workspace/TeachingInsightsWorkspace';
import { INSIGHT_CLASSES } from '@mocks/scenarios/insights';

type TeacherInsightsPageProps = { surface?: 'overview' | 'lessons' };

export function TeacherInsightsPage({ surface = 'overview' }: TeacherInsightsPageProps) {
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('class');
  const courseId = searchParams.get('course');
  const className = INSIGHT_CLASSES.find(({ id }) => id === classId)?.name;
  const fromHome = searchParams.get('source') === 'home';
  const pageHeader = useMemo(() => {
    if (surface === 'lessons') {
      return {
        title: '全部课堂',
        breadcrumbs: [
          { label: '教学洞察', to: `/teacher/insights${classId ? `?class=${encodeURIComponent(classId)}${courseId ? `&course=${encodeURIComponent(courseId)}` : ''}` : ''}`, state: { restoreInsightsFocus: true } },
          { label: '全部课堂' },
        ],
      };
    }
    if (fromHome && className) return { title: className, breadcrumbs: [{ label: '首页', to: '/teacher/home' }, { label: className }] };
    return { title: '教学洞察' };
  }, [classId, className, courseId, fromHome, surface]);
  usePageHeader(pageHeader);
  return surface === 'lessons' ? <AllLessonsReportWorkspace /> : <TeachingInsightsWorkspace />;
}
