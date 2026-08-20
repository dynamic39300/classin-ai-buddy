import { useParams, useSearchParams } from 'react-router-dom';
import { ClassAnnouncementWorkspace } from '@features/class-collaboration-workspace/ClassAnnouncementWorkspace';
import { normalizeCollaborationSource } from '@features/class-collaboration-workspace/class-collaboration-view';

export function TeacherClassAnnouncementPage() {
  const { classId, announcementId } = useParams();
  const [searchParams] = useSearchParams();
  const source = normalizeCollaborationSource(searchParams.get('from') ?? searchParams.get('source'));
  return <ClassAnnouncementWorkspace role="teacher" classId={classId} announcementId={announcementId} source={source} />;
}
