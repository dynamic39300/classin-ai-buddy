import { useParams } from 'react-router-dom';
import { StudentOpenCourseDetailWorkspace } from '@features/open-course-workspace';

export function StudentOpenCourseDetailPage() {
  const { openCourseId = '' } = useParams();
  return <StudentOpenCourseDetailWorkspace courseId={openCourseId} />;
}
