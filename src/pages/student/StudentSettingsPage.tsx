import { useNavigate, useParams } from 'react-router-dom';
import { SettingsWorkspace } from '@features/settings-workspace';

export function StudentSettingsPage() {
  const navigate = useNavigate();
  const { settingsSection } = useParams();
  return <SettingsWorkspace role="student-family" section={settingsSection} onSectionChange={(section) => navigate(`/student/settings/${section}`, { replace: true })} />;
}
