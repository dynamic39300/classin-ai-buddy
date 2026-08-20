import { useParams } from 'react-router-dom';
import { OpenCoursePreflightWorkspace } from '@features/open-course-workspace';

export function StudentOpenCoursePreflightPage() {
  const { openCourseId = '' } = useParams();
  return <OpenCoursePreflightWorkspace role="student-family" courseId={openCourseId} />;
}
