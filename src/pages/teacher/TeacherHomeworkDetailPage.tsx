import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { TeacherHomeworkDetailWorkspace } from '@features/homework-workspace';

function sourcePath(source: string | null, classId?: string, notificationId?: string, context?: URLSearchParams): string {
  if (source === 'home' || source === 'teacher_home') return '/teacher/home';
  if (source === 'teacher_schedule') {
    const params = new URLSearchParams();
    const date = context?.get('date');
    const event = context?.get('event');
    const view = context?.get('view');
    if (date) params.set('date', date);
    if (event) params.set('event', event);
    if (view === 'day' || view === 'week') params.set('view', view);
    return `/teacher/schedule${params.size ? `?${params.toString()}` : ''}`;
  }
  if (source === 'class_unit' && classId) {
    const params = new URLSearchParams({ view: 'directory' });
    const course = context?.get('course');
    if (course) params.set('course', course);
    return `/teacher/classes/${classId}?${params.toString()}`;
  }
  if (source === 'notification') {
    const params = new URLSearchParams({ category: 'system' });
    if (notificationId) params.set('thread', notificationId);
    return `/teacher/messages?${params.toString()}`;
  }
  if (source === 'task_center') {
    const params = new URLSearchParams();
    for (const key of ['task', 'lifecycle', 'q', 'class', 'course', 'kind', 'scroll']) {
      const value = context?.get(key);
      if (value) params.set(key, value);
    }
    return `/teacher/tasks${params.size ? `?${params.toString()}` : ''}`;
  }
  return '/teacher/tasks';
}

export function TeacherHomeworkDetailPage() {
  const { homeworkId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  if (!homeworkId) return null;
  const query = searchParams.toString();
  const source = searchParams.get('source');
  return (
    <TeacherHomeworkDetailWorkspace
      homeworkId={homeworkId}
      backLabel={source === 'home' || source === 'teacher_home' ? '返回首页' : source === 'teacher_schedule' ? '返回课程表' : source === 'class_unit' ? '返回班级' : source === 'notification' ? '返回通知' : '返回待办'}
      onBack={() => navigate(sourcePath(
        source,
        searchParams.get('class') ?? undefined,
        searchParams.get('notification') ?? undefined,
        searchParams,
      ))}
      onEdit={(id) => navigate(`/teacher/homework/${id}/edit${query ? `?${query}` : ''}`)}
      onReview={(submissionId) => navigate(`/teacher/homework/${homeworkId}/submissions/${submissionId}${query ? `?${query}` : ''}`)}
    />
  );
}
