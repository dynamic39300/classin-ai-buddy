import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { StudentHomeworkDetailWorkspace } from '@features/homework-workspace';

function sourcePath(source: string | null, classId: string | null, notificationId: string | null, context: URLSearchParams): string {
  if (source === 'student_home') return '/student/home';
  if (source === 'student_schedule') {
    const params = new URLSearchParams();
    const date = context.get('date');
    const event = context.get('event');
    const view = context.get('view');
    if (date) params.set('date', date);
    if (event) params.set('event', event);
    if (view === 'day' || view === 'week') params.set('view', view);
    return `/student/schedule${params.size ? `?${params.toString()}` : ''}`;
  }
  if (source === 'growth') return '/student/growth';
  if (source === 'class_unit' && classId) {
    const params = new URLSearchParams({ view: 'directory' });
    const course = context.get('course');
    if (course) params.set('course', course);
    return `/student/classes/${classId}?${params.toString()}`;
  }
  if (source === 'notification') {
    const params = new URLSearchParams({ category: 'system' });
    if (notificationId) params.set('thread', notificationId);
    return `/student/messages?${params.toString()}`;
  }
  if (source === 'task_center') {
    const params = new URLSearchParams();
    for (const key of ['task', 'lifecycle', 'q', 'class', 'course', 'kind', 'scroll']) {
      const value = context.get(key);
      if (value) params.set(key, value);
    }
    return `/student/todos${params.size ? `?${params.toString()}` : ''}`;
  }
  return '/student/todos';
}

export function StudentHomeworkDetailPage() {
  const { homeworkId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  if (!homeworkId) return null;
  const query = searchParams.toString();
  const suffix = query ? `?${query}` : '';
  return (
    <StudentHomeworkDetailWorkspace
      homeworkId={homeworkId}
      submissionToast={searchParams.get('submitted') === '1'}
      onBack={() => navigate(sourcePath(
        searchParams.get('source'),
        searchParams.get('class'),
        searchParams.get('notification'),
        searchParams,
      ))}
      onEdit={(mode) => navigate(`/student/homework/${homeworkId}/edit?${new URLSearchParams({ ...Object.fromEntries(searchParams), mode }).toString()}`)}
      onSubmission={() => navigate(`/student/homework/${homeworkId}/submission${suffix}`)}
      onResult={() => navigate(`/student/homework/${homeworkId}/result${suffix}`)}
    />
  );
}
