import { Navigate, useLocation, useParams } from 'react-router-dom';

export function TeacherOpenCourseDetailPage() {
  const { openCourseId = '' } = useParams();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('dialog', 'detail');
  params.set('course', openCourseId);
  if (!params.get('source') && params.get('from')) params.set('source', params.get('from') ?? 'list');
  params.delete('from');
  if (!params.get('source')) params.set('source', 'list');
  return <Navigate to={`/teacher/open-courses?${params.toString()}`} replace />;
}
