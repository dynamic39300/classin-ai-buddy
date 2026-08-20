import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { StudentHomeworkResultWorkspace } from '@features/homework-workspace';

export function StudentHomeworkResultPage() {
  const { homeworkId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  if (!homeworkId) return null;
  const query = searchParams.toString();
  return (
    <StudentHomeworkResultWorkspace
      homeworkId={homeworkId}
      onBack={() => navigate(`/student/homework/${homeworkId}${query ? `?${query}` : ''}`)}
    />
  );
}
