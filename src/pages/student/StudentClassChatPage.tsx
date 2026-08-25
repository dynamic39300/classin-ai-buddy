import { useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ImmersiveMessageWorkspaceFrame } from '@app/shell/ImmersiveMessageWorkspaceFrame';
import {
  MESSAGE_WORKSPACE_SHELL_TRANSITION_MS,
  useMessageWorkspaceShell,
} from '@app/shell/MessageWorkspaceShellContext';
import { MessageWorkspace } from '@features/message-workspace/MessageWorkspace';
import { useClassWorkspaceStore } from '@features/class-workspace/class-workspace-store';

export function StudentClassChatPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const messageShell = useMessageWorkspaceShell();
  const { classes } = useClassWorkspaceStore();
  const selectedClass = classes.find(({ id }) => id === classId);
  const readOnly = !selectedClass;
  const returnPath = `/student/classes/${classId ?? ''}${searchParams.get('from') === 'home' ? '?from=home' : ''}`;
  const returnToClass = useCallback(() => {
    if (messageShell.mode === 'exiting') return;
    messageShell.exitImmersive();
    window.setTimeout(() => navigate(returnPath), MESSAGE_WORKSPACE_SHELL_TRANSITION_MS);
  }, [messageShell, navigate, returnPath]);

  return (
    <ImmersiveMessageWorkspaceFrame
      title="班级群聊"
      exitLabel="返回班级"
      exitIcon="back"
      onExit={returnToClass}
    >
      <MessageWorkspace
        role="student-family"
        fixedClassId={classId}
        readOnly={readOnly}
        immersive
      />
    </ImmersiveMessageWorkspaceFrame>
  );
}
