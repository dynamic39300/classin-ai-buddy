import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@app/shell/AppShell';
import { StudentHomePage } from '@pages/student/StudentHomePage';
import { StudentClassesPage } from '@pages/student/StudentClassesPage';
import { StudentClassChatPage } from '@pages/student/StudentClassChatPage';
import { StudentClassAnnouncementPage } from '@pages/student/StudentClassAnnouncementPage';
import { StudentClassMembersPage } from '@pages/student/StudentClassMembersPage';
import { StudentClassSettingsPage } from '@pages/student/StudentClassSettingsPage';
import { StudentJoinPage } from '@pages/student/StudentJoinPage';
import { StudentOpenCourseDetailPage } from '@pages/student/StudentOpenCourseDetailPage';
import { StudentOpenCourseJoinPage } from '@pages/student/StudentOpenCourseJoinPage';
import { StudentOpenCoursePreflightPage } from '@pages/student/StudentOpenCoursePreflightPage';
import { StudentSettingsPage } from '@pages/student/StudentSettingsPage';
import { StudentMessagesPage } from '@pages/student/StudentMessagesPage';
import { StudentSchedulePage } from '@pages/student/StudentSchedulePage';
import { StudentTodosPage } from '@pages/student/StudentTodosPage';
import { StudentGrowthPage } from '@pages/student/StudentGrowthPage';
import { StudentClassResourcesPage } from '@pages/student/StudentClassResourcesPage';
import { StudentHomeworkDetailPage } from '@pages/student/StudentHomeworkDetailPage';
import { StudentHomeworkEditorPage } from '@pages/student/StudentHomeworkEditorPage';
import { StudentHomeworkResultPage } from '@pages/student/StudentHomeworkResultPage';
import { StudentHomeworkSubmissionPage } from '@pages/student/StudentHomeworkSubmissionPage';
import { StudentBlackboardPage } from '@pages/student/StudentBlackboardPage';
import { StudentCastingPage } from '@pages/student/StudentCastingPage';

export function StudentRoutes() {
  return (
    <Routes>
      <Route path="/student" element={<AppShell role="student-family" />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<StudentHomePage />} />
        <Route path="classes" element={<StudentClassesPage />} />
        <Route path="classes/:classId" element={<StudentClassesPage />} />
        <Route path="classes/:classId/chat" element={<StudentClassChatPage />} />
        <Route path="classes/:classId/announcements/:announcementId" element={<StudentClassAnnouncementPage />} />
        <Route path="classes/:classId/members" element={<StudentClassMembersPage />} />
        <Route path="classes/:classId/settings" element={<StudentClassSettingsPage />} />
        <Route path="classes/:classId/resources" element={<StudentClassResourcesPage />} />
        <Route path="open-courses" element={<StudentClassesPage surface="open-courses" />} />
        <Route path="open-courses/join" element={<StudentOpenCourseJoinPage />} />
        <Route path="open-courses/:openCourseId" element={<StudentOpenCourseDetailPage />} />
        <Route path="open-courses/:openCourseId/preflight" element={<StudentOpenCoursePreflightPage />} />
        <Route path="join" element={<StudentJoinPage />} />
        <Route path="settings/:settingsSection?" element={<StudentSettingsPage />} />
        <Route path="schedule" element={<StudentSchedulePage />} />
        <Route path="todos" element={<StudentTodosPage />} />
        <Route path="todos/:taskId" element={<StudentTodosPage />} />
        <Route path="homework/:homeworkId" element={<StudentHomeworkDetailPage />} />
        <Route path="homework/:homeworkId/edit" element={<StudentHomeworkEditorPage />} />
        <Route path="homework/:homeworkId/submission" element={<StudentHomeworkSubmissionPage />} />
        <Route path="homework/:homeworkId/result" element={<StudentHomeworkResultPage />} />
        <Route path="growth" element={<StudentGrowthPage />} />
        <Route path="messages" element={<StudentMessagesPage />} />
        <Route path="blackboard" element={<StudentBlackboardPage />} />
        <Route path="casting" element={<StudentCastingPage />} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/student/home" replace />} />
    </Routes>
  );
}
