import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { StudentHomeworkSubmissionWorkspace } from '@features/homework-workspace';

export function StudentHomeworkSubmissionPage() {
  const { homeworkId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  if (!homeworkId) return null;
  const query = searchParams.toString();
  const suffix = query ? `?${query}` : '';
  const editParams = new URLSearchParams(searchParams);
  editParams.set('mode', 'modify');
  return (
    <StudentHomeworkSubmissionWorkspace
      homeworkId={homeworkId}
      onBack={() => navigate(`/student/homework/${homeworkId}${suffix}`)}
      onModify={() => navigate(`/student/homework/${homeworkId}/edit?${editParams.toString()}`)}
    />
  );
}
