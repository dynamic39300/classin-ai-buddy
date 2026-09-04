import { useParams } from 'react-router-dom';
import { SPACE_SURFACES, type SpaceSurface } from '@domain/space/space';
import { SpaceWorkspace } from '@features/space-workspace/SpaceWorkspace';

export function TeacherSpacePage() {
  const { spaceSurface } = useParams();
  const compatibleSurface = spaceSurface === 'resource-center' ? 'teacherin' : spaceSurface;
  const surface = SPACE_SURFACES.includes(compatibleSurface as SpaceSurface)
    ? compatibleSurface as SpaceSurface
    : 'my-drive';
  return <SpaceWorkspace key={surface} role="teacher" surface={surface} />;
}
