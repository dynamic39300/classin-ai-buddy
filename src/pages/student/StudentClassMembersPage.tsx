import { useParams, useSearchParams } from 'react-router-dom';
import { ClassMembersWorkspace } from '@features/class-collaboration-workspace/ClassMembersWorkspace';
import { normalizeCollaborationSource } from '@features/class-collaboration-workspace/class-collaboration-view';

export function StudentClassMembersPage() {
  const { classId } = useParams();
  const [searchParams] = useSearchParams();
  const source = normalizeCollaborationSource(searchParams.get('from') ?? searchParams.get('source'));
  return <ClassMembersWorkspace role="student-family" classId={classId} source={source} />;
}
