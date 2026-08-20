import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@app/shell/AppShell';
import { TeacherHomePage } from '@pages/teacher/TeacherHomePage';
import { TeacherBlackboardPage } from '@pages/teacher/TeacherBlackboardPage';
import { TeacherCastingPage } from '@pages/teacher/TeacherCastingPage';
import { TeacherClassesPage } from '@pages/teacher/TeacherClassesPage';
import { TeacherClassChatPage } from '@pages/teacher/TeacherClassChatPage';
import { TeacherClassAnnouncementPage } from '@pages/teacher/TeacherClassAnnouncementPage';
import { TeacherClassMembersPage } from '@pages/teacher/TeacherClassMembersPage';
import { TeacherClassSettingsPage } from '@pages/teacher/TeacherClassSettingsPage';
import { TeacherJoinPage } from '@pages/teacher/TeacherJoinPage';
import { TeacherOpenCourseCreatePage } from '@pages/teacher/TeacherOpenCourseCreatePage';
import { TeacherOpenCourseDetailPage } from '@pages/teacher/TeacherOpenCourseDetailPage';
import { TeacherOpenCourseEditPage } from '@pages/teacher/TeacherOpenCourseEditPage';
import { TeacherOpenCoursePreflightPage } from '@pages/teacher/TeacherOpenCoursePreflightPage';
import { TeacherSettingsPage } from '@pages/teacher/TeacherSettingsPage';
import { TeacherInsightsPage } from '@pages/teacher/TeacherInsightsPage';
import { TeacherMessagesPage } from '@pages/teacher/TeacherMessagesPage';
import { TeacherSchedulePage } from '@pages/teacher/TeacherSchedulePage';
import { TeacherTasksPage } from '@pages/teacher/TeacherTasksPage';
import { TeacherSpacePage } from '@pages/teacher/TeacherSpacePage';
import { TeacherHomeworkCreatePage } from '@pages/teacher/TeacherHomeworkCreatePage';
import { TeacherHomeworkDetailPage } from '@pages/teacher/TeacherHomeworkDetailPage';
import { TeacherHomeworkEditPage } from '@pages/teacher/TeacherHomeworkEditPage';
import { TeacherHomeworkReviewPage } from '@pages/teacher/TeacherHomeworkReviewPage';
import { TeacherAiAgentPage } from '@pages/teacher/TeacherAiAgentPage';
import { AiAgentWorkspaceLayout } from '@features/ai-agent-workspace';

export function TeacherRoutes() {
  return (
    <Routes>
      <Route path="/teacher" element={<AppShell role="teacher" />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<TeacherHomePage />} />
        <Route path="ai-agent" element={<AiAgentWorkspaceLayout />}>
          <Route index element={<Navigate to="new" replace />} />
          <Route path="new" element={<TeacherAiAgentPage />} />
          <Route path="runs/:runId" element={<TeacherAiAgentPage />} />
          <Route path=":section" element={<TeacherAiAgentPage />} />
        </Route>
        <Route path="classes" element={<TeacherClassesPage />} />
        <Route path="classes/:classId" element={<TeacherClassesPage />} />
        <Route path="classes/:classId/chat" element={<TeacherClassChatPage />} />
        <Route path="classes/:classId/announcements/:announcementId" element={<TeacherClassAnnouncementPage />} />
        <Route path="classes/:classId/members" element={<TeacherClassMembersPage />} />
        <Route path="classes/:classId/settings" element={<TeacherClassSettingsPage />} />
        <Route path="open-courses" element={<TeacherClassesPage surface="open-courses" />} />
        <Route path="open-courses/new" element={<TeacherOpenCourseCreatePage />} />
        <Route path="open-courses/:openCourseId" element={<TeacherOpenCourseDetailPage />} />
        <Route path="open-courses/:openCourseId/edit" element={<TeacherOpenCourseEditPage />} />
        <Route path="open-courses/:openCourseId/preflight" element={<TeacherOpenCoursePreflightPage />} />
        <Route path="join" element={<TeacherJoinPage />} />
        <Route path="settings/:settingsSection?" element={<TeacherSettingsPage />} />
        <Route path="schedule" element={<TeacherSchedulePage />} />
        <Route path="tasks" element={<TeacherTasksPage />} />
        <Route path="tasks/:taskId" element={<TeacherTasksPage />} />
        <Route path="homework/new" element={<TeacherHomeworkCreatePage />} />
        <Route path="homework/:homeworkId" element={<TeacherHomeworkDetailPage />} />
        <Route path="homework/:homeworkId/edit" element={<TeacherHomeworkEditPage />} />
        <Route path="homework/:homeworkId/submissions/:submissionId" element={<TeacherHomeworkReviewPage />} />
        <Route path="insights" element={<TeacherInsightsPage />} />
        <Route path="insights/lessons" element={<TeacherInsightsPage surface="lessons" />} />
        <Route path="space" element={<TeacherSpacePage />} />
        <Route path="space/:spaceSurface" element={<TeacherSpacePage />} />
        <Route path="messages" element={<TeacherMessagesPage />} />
        <Route path="blackboard" element={<TeacherBlackboardPage />} />
        <Route path="casting" element={<TeacherCastingPage />} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/teacher/home" replace />} />
    </Routes>
  );
}
