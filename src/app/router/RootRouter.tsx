import { Navigate, Route, Routes } from 'react-router-dom';
import { RoleSelectPage, useRoleSession } from '@features/role-switch';
import { StudentRoutes } from './StudentRoutes';
import { TeacherRoutes } from './TeacherRoutes';

export function RootRouter() {
  const { role } = useRoleSession();

  if (role === null) {
    return (
      <Routes>
        <Route path="/select-role" element={<RoleSelectPage />} />
        <Route path="*" element={<Navigate to="/select-role" replace />} />
      </Routes>
    );
  }

  return role === 'teacher' ? <TeacherRoutes /> : <StudentRoutes />;
}
