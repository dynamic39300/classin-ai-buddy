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
import { WORKBUDDY_CONTEXT_ITEMS, WORKBUDDY_MOMENTUM_RECOMMENDATION } from '@mocks/scenarios/workbuddy-context';
import { MockClassInWritebackAdapter } from '@mocks/adapters/workbuddy-classin-writeback';
import { MockPackageWritebackAdapter } from '@mocks/adapters/workbuddy-package-writeback';
import { OperationGuardProvider } from './shell/operation-guard';
import { RootRouter } from './router/RootRouter';

const OPEN_COURSE_SESSION = createOpenCourseSessionStore(['open-reading']);
const WORKBUDDY_WRITEBACK_ADAPTER = new MockClassInWritebackAdapter();
const WORKBUDDY_PACKAGE_WRITEBACK_ADAPTER = new MockPackageWritebackAdapter();

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
                  <WorkBuddyWorkspaceProvider
                    initialRuns={WORKBUDDY_HISTORY}
                    initialContextItems={WORKBUDDY_CONTEXT_ITEMS}
                    recommendedContextItemIds={WORKBUDDY_MOMENTUM_RECOMMENDATION}
                    writebackAdapter={WORKBUDDY_WRITEBACK_ADAPTER}
                    writebackScenarioController={WORKBUDDY_WRITEBACK_ADAPTER}
                    packageWritebackAdapter={WORKBUDDY_PACKAGE_WRITEBACK_ADAPTER}
                  >
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
