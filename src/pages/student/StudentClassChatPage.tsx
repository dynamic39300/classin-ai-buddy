import { useParams } from 'react-router-dom';
import { MessageWorkspace } from '@features/message-workspace/MessageWorkspace';
import { useClassWorkspaceStore } from '@features/class-workspace/class-workspace-store';

export function StudentClassChatPage() {
  const { classId } = useParams();
  const { classes } = useClassWorkspaceStore();
  const readOnly = !classes.some(({ id }) => id === classId);
  return <MessageWorkspace role="student-family" fixedClassId={classId} readOnly={readOnly} />;
}
