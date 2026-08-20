import { useNavigate, useParams } from 'react-router-dom';
import { SettingsWorkspace } from '@features/settings-workspace';

export function TeacherSettingsPage() {
  const navigate = useNavigate();
  const { settingsSection } = useParams();
  return <SettingsWorkspace role="teacher" section={settingsSection} onSectionChange={(section) => navigate(`/teacher/settings/${section}`, { replace: true })} />;
}
