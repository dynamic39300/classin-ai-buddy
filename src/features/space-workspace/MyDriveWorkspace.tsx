import { DriveWorkspace, type DriveWorkspaceProps } from './DriveWorkspace';

export function MyDriveWorkspace(props: Omit<DriveWorkspaceProps, 'surface'>) {
  return <DriveWorkspace {...props} surface="my-drive" />;
}
