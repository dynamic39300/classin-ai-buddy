import { useParams } from 'react-router-dom';
import { StudentResourceWorkspace } from '@features/space-workspace/StudentResourceWorkspace';

export function StudentClassResourcesPage() {
  const { classId } = useParams();
  return <StudentResourceWorkspace role="student-family" classId={classId} />;
}
