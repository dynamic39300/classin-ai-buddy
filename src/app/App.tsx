import { useCallback, useMemo, type ReactNode } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { RoleSessionProvider } from '@features/role-switch';
import { ClassWorkspaceProvider, useClassWorkspaceStore } from '@features/class-workspace';
import { HomeworkWorkspaceProvider, useHomeworkWorkspace } from '@features/homework-workspace';
import { MessageWorkspaceProvider, useMessageWorkspaceStore } from '@features/message-workspace';
import { WorkBuddyImProvider } from '@features/workbuddy-im-assistance';
import { ClassAgentConversationProvider } from '@features/class-agent-conversation';
import { parseWorkBuddyWorkspaceRoute, WorkBuddyWorkspaceProvider } from '@features/ai-agent-workspace';
import { WorkBuddyArtifactLibraryProvider, useWorkBuddyArtifactLibrary } from '@features/workbuddy-artifact-library';
import { OpenCourseWorkspaceProvider, createOpenCourseSessionStore } from '@features/open-course-workspace';
import { SpaceWorkspaceProvider } from '@features/space-workspace/SpaceWorkspaceProvider';
import { addClassActivity, type ClassCourse } from '@domain/class/class';
import type { ClassAgentReply } from '@domain/class-agent/class-agent';
import type { PublishedHomework } from '@domain/homework/homework';
import { WORKBUDDY_HISTORY } from '@mocks/scenarios/workbuddy';
import { HOMEWORK_NOW } from '@mocks/scenarios/homework';
import { WORKBUDDY_CONTEXT_ITEMS, WORKBUDDY_MOMENTUM_RECOMMENDATION } from '@mocks/scenarios/workbuddy-context';
import {
  WORKBUDDY_CAPABILITY_MANIFESTS,
  WORKBUDDY_COURSE_PACKAGE_DEFINITION,
  WORKBUDDY_COURSEWARE_DEFINITION,
  WORKBUDDY_COURSEWARE_OUTPUT,
  WORKBUDDY_REPLANNED_COURSEWARE_OUTPUT,
  WORKBUDDY_COURSEWARE_SAVE_ACTION,
  WORKBUDDY_FIXED_CLOCK,
  WORKBUDDY_PACKAGE_ACTION_INPUT,
  WORKBUDDY_PACKAGE_FAILED_ARTIFACT_IDS,
  WORKBUDDY_RUNTIME_FIXTURE,
} from '@mocks/scenarios/workbuddy-course-production';
import { MockClassInWritebackAdapter } from '@mocks/adapters/workbuddy-classin-writeback';
import { MockQuizActivityDraftAdapter } from '@mocks/adapters/workbuddy-quiz-activity-draft';
import { MockPackageWritebackAdapter } from '@mocks/adapters/workbuddy-package-writeback';
import { MockTeacherInAdapter } from '@mocks/adapters/workbuddy-teacherin';
import { MockWorkBuddyImHomeworkReminderAdapter } from '@mocks/adapters/workbuddy-im-homework-reminder';
import { MockGuidedExplanationDistributionAdapter } from '@mocks/adapters/workbuddy-guided-explanation';
import { MockClassAgentConversationAdapter } from '@mocks/adapters/class-agent/class-agent-conversation';
import { CLASS_AGENT_DEFINITIONS, DIRECT_CLASS_AGENT_BINDINGS } from '@mocks/scenarios/class-agent';
import { WORKBUDDY_QUIZ_PAPER } from '@mocks/scenarios/workbuddy-quiz-activity';
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

function WorkBuddyImBridge({ children }: { children: ReactNode }) {
  const homework = useHomeworkWorkspace();
  const { actions: messageActions } = useMessageWorkspaceStore();
  const artifactLibrary = useWorkBuddyArtifactLibrary();
  const adapter = useMemo(() => new MockWorkBuddyImHomeworkReminderAdapter({
    readSnapshot: ({ classId, classLabel }) => ({
      classId,
      classLabel,
      homeworks: homework.homeworks,
      submissions: homework.submissions,
      students: homework.students,
    }),
    appendTeacherMessage: ({ id, threadId, authorName, body, sentAt }) => messageActions.appendMessage({
      role: 'teacher', authorName, threadId, body, sentAt, messageId: id,
    }),
  }), [homework.homeworks, homework.students, homework.submissions, messageActions]);
  const guidedExplanationAdapter = useMemo(() => new MockGuidedExplanationDistributionAdapter({
    appendTeacherMessage: ({ id, threadId, authorName, body, sentAt, contentReference }) => messageActions.appendMessage({ role: 'teacher', authorName, threadId, body, sentAt, messageId: id, contentReference }),
  }), [messageActions]);
  return (
    <WorkBuddyImProvider adapter={adapter} guidedExplanationAdapter={guidedExplanationAdapter} onArtifactCreated={artifactLibrary.add} teacher={{ id: 'teacher-001', name: '王老师' }} now={() => HOMEWORK_NOW}>
      {children}
    </WorkBuddyImProvider>
  );
}

function ClassAgentBridge({ children }: { children: ReactNode }) {
  const { actions: messageActions } = useMessageWorkspaceStore();
  const adapter = useMemo(() => new MockClassAgentConversationAdapter({
    definitions: CLASS_AGENT_DEFINITIONS,
  }), []);
  const onReply = useCallback((reply: ClassAgentReply) => {
    messageActions.appendMessage({
      role: reply.recipientRole,
      authorRole: 'class-agent',
      authorName: reply.agentName,
      threadId: reply.threadId,
      body: reply.body,
      sentAt: reply.sentAt,
      messageId: reply.id,
      classAgent: {
        agentId: reply.agentId,
        channel: reply.channel,
        visibilityLabel: reply.visibilityLabel,
        truthLabel: reply.truthLabel,
      },
    });
  }, [messageActions]);
  return (
    <ClassAgentConversationProvider
      adapter={adapter}
      definitions={CLASS_AGENT_DEFINITIONS}
      directAuthorizationBindings={DIRECT_CLASS_AGENT_BINDINGS}
      onReply={onReply}
    >
      {children}
    </ClassAgentConversationProvider>
  );
}

function WorkBuddyBridge({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { getClasses, setClasses } = useClassWorkspaceStore();
  const workspaceNamespace = parseWorkBuddyWorkspaceRoute(location.pathname)?.profileId ?? 'ideal-full';
  const adapters = useMemo(() => {
    const packageWriteback = new MockPackageWritebackAdapter();
    packageWriteback.setScenario('success');
    return {
      writeback: new MockClassInWritebackAdapter(),
      packageWriteback,
      teacherIn: new MockTeacherInAdapter(),
      quizActivityDraft: new MockQuizActivityDraftAdapter({
        idempotencyScope: workspaceNamespace,
        targetReader: {
          read: (target) => {
            const record = getClasses().find(({ id }) => id === target.classId);
            const course = record?.courses.find(({ id }) => id === target.courseId);
            const unit = course?.units.find(({ id }) => id === target.unitId);
            if (!record || !course || !unit) return null;
            return { classId: record.id, courseId: course.id, unitId: unit.id, version: unit.sourceVersion ?? `${unit.id}-unversioned`, canCreateDraft: record.roleByAppRole.teacher === 'headmaster' || record.roleByAppRole.teacher === 'teacher' };
          },
        },
        onDraftCreated: (activity, target) => setClasses((current) => current.map((record) => {
          if (record.id !== target.classId) return record;
          return { ...record, courses: addClassActivity(record.courses, target.courseId, target.unitId, activity) };
        })),
      }),
    };
  }, [getClasses, setClasses, workspaceNamespace]);

  return (
    <WorkBuddyWorkspaceProvider
      key={workspaceNamespace}
      workspaceNamespace={workspaceNamespace}
      initialRuns={WORKBUDDY_HISTORY}
      initialContextItems={WORKBUDDY_CONTEXT_ITEMS}
      recommendedContextItemIds={WORKBUDDY_MOMENTUM_RECOMMENDATION}
      coursewareDefinition={WORKBUDDY_COURSEWARE_DEFINITION}
      coursewareOutput={WORKBUDDY_COURSEWARE_OUTPUT}
      replannedCoursewareOutput={WORKBUDDY_REPLANNED_COURSEWARE_OUTPUT}
      capabilityManifests={WORKBUDDY_CAPABILITY_MANIFESTS}
      coursewareActionInput={WORKBUDDY_COURSEWARE_SAVE_ACTION}
      packageDefinition={WORKBUDDY_COURSE_PACKAGE_DEFINITION}
      packageActionInput={WORKBUDDY_PACKAGE_ACTION_INPUT}
      packageFailedArtifactIds={WORKBUDDY_PACKAGE_FAILED_ARTIFACT_IDS}
      runtimeFixture={WORKBUDDY_RUNTIME_FIXTURE}
      clock={WORKBUDDY_FIXED_CLOCK}
      writebackAdapter={adapters.writeback}
      writebackScenarioController={adapters.writeback}
      packageWritebackAdapter={adapters.packageWriteback}
      packageWritebackScenarioController={adapters.packageWriteback}
      teacherInAdapter={adapters.teacherIn}
      quizPaper={WORKBUDDY_QUIZ_PAPER}
      quizActivityDraftAdapter={adapters.quizActivityDraft}
      quizActivityDraftScenarioController={adapters.quizActivityDraft}
    >
      {children}
    </WorkBuddyWorkspaceProvider>
  );
}

export function App() {
  return (
    <RoleSessionProvider>
      <OperationGuardProvider>
        <ClassWorkspaceProvider>
          <ClassHomeworkBridge>
            <OpenCourseWorkspaceProvider store={OPEN_COURSE_SESSION}>
              <WorkBuddyArtifactLibraryProvider>
              <MessageWorkspaceProvider>
                <ClassAgentBridge>
                  <WorkBuddyImBridge>
                    <BrowserRouter>
                      <SpaceWorkspaceProvider>
                        <WorkBuddyBridge>
                          <RootRouter />
                        </WorkBuddyBridge>
                      </SpaceWorkspaceProvider>
                    </BrowserRouter>
                  </WorkBuddyImBridge>
                </ClassAgentBridge>
              </MessageWorkspaceProvider>
              </WorkBuddyArtifactLibraryProvider>
            </OpenCourseWorkspaceProvider>
          </ClassHomeworkBridge>
        </ClassWorkspaceProvider>
      </OperationGuardProvider>
    </RoleSessionProvider>
  );
}
