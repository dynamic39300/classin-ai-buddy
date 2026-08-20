import { Navigate, useLocation, useParams } from 'react-router-dom';

export function TeacherOpenCourseEditPage() {
  const { openCourseId } = useParams();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('dialog', 'edit');
  if (openCourseId) params.set('course', openCourseId);
  return <Navigate to={`/teacher/open-courses?${params.toString()}`} replace />;
}
