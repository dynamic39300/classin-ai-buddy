import { useParams } from 'react-router-dom';
import { ClassWorkspace } from '@features/class-workspace/ClassWorkspace';
import { TeacherClassWorkspace } from '@features/class-workspace/TeacherClassWorkspace';
import { MessageWorkspace, useMessageThreads } from '@features/message-workspace';
import { TeacherOpenCourseCollectionWorkspace } from '@features/open-course-workspace';

type TeacherClassesPageProps = {
  surface?: 'classes' | 'open-courses';
};

export function TeacherClassesPage({ surface = 'classes' }: TeacherClassesPageProps) {
  const { classId, openCourseId } = useParams();
  const messageThreads = useMessageThreads();
  if (surface === 'classes') return (
    <TeacherClassWorkspace
      detailId={classId}
      messageThreads={messageThreads}
      renderClassChat={({ classId: targetClassId, readOnly }) => (
        <MessageWorkspace role="teacher" fixedClassId={targetClassId} readOnly={readOnly} embedded />
      )}
    />
  );
  if (!openCourseId) return <TeacherOpenCourseCollectionWorkspace />;
  return <ClassWorkspace role="teacher" surface={surface} detailId={classId ?? openCourseId} />;
}
