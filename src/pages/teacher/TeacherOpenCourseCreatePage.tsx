import { Navigate, useLocation } from 'react-router-dom';

export function TeacherOpenCourseCreatePage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('dialog', 'create');
  return <Navigate to={`/teacher/open-courses?${params.toString()}`} replace />;
}
