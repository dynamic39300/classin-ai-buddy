import { useMemo } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AiAgentWorkspaceLayout,
  ClassMvpWorkBuddyShell,
  resolveClassMvpWorkBuddyExperience,
} from '@features/ai-agent-workspace';
import { useClassWorkspaceStore } from '@features/class-workspace';

export function ClassMvpWorkBuddyLayout() {
  const { classId } = useParams();
  const [searchParams] = useSearchParams();
  const { classes } = useClassWorkspaceStore();
  const courseId = searchParams.get('course') ?? undefined;
  const profile = useMemo(() => resolveClassMvpWorkBuddyExperience({
    classId,
    courseId,
    classes,
  }), [classId, classes, courseId]);

  if (!profile) return <Navigate to="/teacher/classes" replace />;
  return (
    <ClassMvpWorkBuddyShell profile={profile}>
      <AiAgentWorkspaceLayout profile={profile} showTaskBarReturn={false} />
    </ClassMvpWorkBuddyShell>
  );
}
