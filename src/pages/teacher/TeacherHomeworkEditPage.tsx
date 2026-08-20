import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { TeacherHomeworkEditorWorkspace } from '@features/homework-workspace';
import { useClassWorkspaceStore } from '@features/class-workspace/class-workspace-store';
import { buildHomeworkClassOptions } from './homework-context';

export function TeacherHomeworkEditPage() {
  const { homeworkId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { classes } = useClassWorkspaceStore();
  const classOptions = useMemo(() => buildHomeworkClassOptions(classes), [classes]);
  if (!homeworkId) return null;
  const query = searchParams.toString();
  const detailPath = `/teacher/homework/${homeworkId}${query ? `?${query}` : ''}`;
  return (
    <TeacherHomeworkEditorWorkspace
      homeworkId={homeworkId}
      classOptions={classOptions}
      onBack={() => navigate(detailPath)}
      onComplete={(id) => navigate(`/teacher/homework/${id}${query ? `?${query}` : ''}`)}
    />
  );
}
