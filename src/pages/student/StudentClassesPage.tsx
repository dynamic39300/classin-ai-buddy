import { useParams } from 'react-router-dom';
import { StudentClassWorkspace } from '@features/class-workspace/StudentClassWorkspace';
import { useMessageThreads } from '@features/message-workspace';
import { StudentOpenCourseCollectionWorkspace } from '@features/open-course-workspace/StudentOpenCourseCollectionWorkspace';

type StudentClassesPageProps = {
  surface?: 'classes' | 'open-courses';
};

export function StudentClassesPage({ surface = 'classes' }: StudentClassesPageProps) {
  const { classId, openCourseId } = useParams();
  const messageThreads = useMessageThreads();
  if (surface === 'classes') return <StudentClassWorkspace detailId={classId} messageThreads={messageThreads} />;
  if (!openCourseId) return <StudentOpenCourseCollectionWorkspace />;
  return <StudentOpenCourseCollectionWorkspace detailId={openCourseId} />;
}
