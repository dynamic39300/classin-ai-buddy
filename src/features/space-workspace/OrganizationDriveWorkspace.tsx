import { DriveWorkspace, type DriveWorkspaceProps } from './DriveWorkspace';

export function OrganizationDriveWorkspace(props: Omit<DriveWorkspaceProps, 'surface'>) {
  return <DriveWorkspace {...props} surface="organization-drive" />;
}
