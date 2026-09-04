import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { HomeworkEditorMode } from '@domain/homework/homework';
import { StudentHomeworkEditorWorkspace } from '@features/homework-workspace';

function parseMode(value: string | null): HomeworkEditorMode {
  return value === 'late' || value === 'modify' || value === 'correction' ? value : 'first';
}

export function StudentHomeworkEditorPage() {
  const { homeworkId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  if (!homeworkId) return null;
  const paramsWithoutMode = new URLSearchParams(searchParams);
  paramsWithoutMode.delete('mode');
  const query = paramsWithoutMode.toString();
  const suffix = query ? `?${query}` : '';
  return (
    <StudentHomeworkEditorWorkspace
      homeworkId={homeworkId}
      mode={parseMode(searchParams.get('mode'))}
      onBack={() => navigate(`/student/homework/${homeworkId}${suffix}`)}
      onSubmitted={() => navigate(`/student/homework/${homeworkId}${suffix ? suffix + '&submitted=1' : '?submitted=1'}`)}
    />
  );
}
