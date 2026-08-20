import { useCallback, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { RoleSessionProvider } from '@features/role-switch';
import { ClassWorkspaceProvider } from '@features/class-workspace/ClassWorkspaceProvider';
import { useClassWorkspaceStore } from '@features/class-workspace/class-workspace-store';
import { HomeworkWorkspaceProvider } from '@features/homework-workspace';
import { MessageWorkspaceProvider } from '@features/message-workspace';
import { WorkBuddyWorkspaceProvider } from '@features/ai-agent-workspace';
import { OpenCourseWorkspaceProvider, createOpenCourseSessionStore } from '@features/open-course-workspace';
import { SpaceWorkspaceProvider } from '@features/space-workspace/SpaceWorkspaceProvider';
import { addClassActivity, type ClassCourse } from '@domain/class/class';
import type { PublishedHomework } from '@domain/homework/homework';
import { WORKBUDDY_HISTORY } from '@mocks/scenarios/workbuddy';
import { OperationGuardProvider } from './shell/operation-guard';
import { RootRouter } from './router/RootRouter';

const OPEN_COURSE_SESSION = createOpenCourseSessionStore(['open-reading']);

function removeHomeworkProjection(courses: ReadonlyArray<ClassCourse>, activityId: string): ClassCourse[] {
  return courses.map((course) => ({
    ...course,
    activities: course.activities?.filter(({ id }) => id !== activityId),
    units: course.units.map((unit) => ({
      ...unit,
      activities: unit.activities.filter(({ id }) => id !== activityId),
    })),
  }));
}

function ClassHomeworkBridge({ children }: { children: ReactNode }) {
  const { setClasses } = useClassWorkspaceStore();
  const projectHomework = useCallback((homework: PublishedHomework) => {
    setClasses((current) => current.map((record) => {
      const withoutPrevious = removeHomeworkProjection(record.courses, homework.activityId);
      if (record.id !== homework.classId) return { ...record, courses: withoutPrevious };
      return {
        ...record,
        courses: addClassActivity(withoutPrevious, homework.courseId, homework.unitId, {
          id: homework.activityId,
          type: 'homework',
          homeworkId: homework.id,
          title: homework.title,
          status: 'pending',
          scheduledAt: homework.dueAt,
          detail: `作业 · ${new Date(homework.dueAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} 截止`,
        }),
      };
    }));
  }, [setClasses]);

  return <HomeworkWorkspaceProvider onHomeworkPublished={projectHomework}>{children}</HomeworkWorkspaceProvider>;
}

export function App() {
  return (
    <RoleSessionProvider>
      <OperationGuardProvider>
        <ClassWorkspaceProvider>
          <ClassHomeworkBridge>
            <OpenCourseWorkspaceProvider store={OPEN_COURSE_SESSION}>
              <MessageWorkspaceProvider>
                <SpaceWorkspaceProvider>
                  <WorkBuddyWorkspaceProvider initialRuns={WORKBUDDY_HISTORY}>
                    <BrowserRouter>
                      <RootRouter />
                    </BrowserRouter>
                  </WorkBuddyWorkspaceProvider>
                </SpaceWorkspaceProvider>
              </MessageWorkspaceProvider>
            </OpenCourseWorkspaceProvider>
          </ClassHomeworkBridge>
        </ClassWorkspaceProvider>
      </OperationGuardProvider>
    </RoleSessionProvider>
  );
}
