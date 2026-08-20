import { useParams, useSearchParams } from 'react-router-dom';
import { ClassSettingsWorkspace } from '@features/class-collaboration-workspace/ClassSettingsWorkspace';
import { normalizeCollaborationSource } from '@features/class-collaboration-workspace/class-collaboration-view';

export function TeacherClassSettingsPage() {
  const { classId } = useParams();
  const [searchParams] = useSearchParams();
  const source = normalizeCollaborationSource(searchParams.get('from') ?? searchParams.get('source'));
  return <ClassSettingsWorkspace role="teacher" classId={classId} source={source} />;
}
