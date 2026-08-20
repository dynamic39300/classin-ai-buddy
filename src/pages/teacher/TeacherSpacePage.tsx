import { useParams } from 'react-router-dom';
import { SPACE_SURFACES, type SpaceSurface } from '@domain/space/space';
import { SpaceWorkspace } from '@features/space-workspace/SpaceWorkspace';

export function TeacherSpacePage() {
  const { spaceSurface } = useParams();
  const surface = SPACE_SURFACES.includes(spaceSurface as SpaceSurface)
    ? spaceSurface as SpaceSurface
    : 'my-drive';
  return <SpaceWorkspace key={surface} role="teacher" surface={surface} />;
}
