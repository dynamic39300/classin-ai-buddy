import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { TeacherHomeworkReviewWorkspace } from '@features/homework-workspace';

export function TeacherHomeworkReviewPage() {
  const { homeworkId, submissionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  if (!homeworkId || !submissionId) return null;
  const query = searchParams.toString();
  const detailPath = `/teacher/homework/${homeworkId}${query ? `?${query}` : ''}`;
  return (
    <TeacherHomeworkReviewWorkspace
      homeworkId={homeworkId}
      submissionId={submissionId}
      onBack={() => navigate(detailPath)}
      onComplete={() => navigate(detailPath)}
    />
  );
}
