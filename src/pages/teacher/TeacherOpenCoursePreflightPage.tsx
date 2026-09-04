import { useParams } from 'react-router-dom';
import { OpenCoursePreflightWorkspace } from '@features/open-course-workspace';

export function TeacherOpenCoursePreflightPage() {
  const { openCourseId = '' } = useParams();
  return <OpenCoursePreflightWorkspace role="teacher" courseId={openCourseId} />;
}
