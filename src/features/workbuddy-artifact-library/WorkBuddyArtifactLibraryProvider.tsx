import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { GuidedExplanationArtifact } from '@domain/workbuddy/guided-explanation';
import { ArtifactLibraryModule } from '@domain/workbuddy/artifact-library';
import { WorkBuddyArtifactLibraryContext } from './workbuddy-artifact-library-store';

export function WorkBuddyArtifactLibraryProvider({ children, initialArtifacts = [] }: { children: ReactNode; initialArtifacts?: readonly GuidedExplanationArtifact[] }) {
  const [artifacts, setArtifacts] = useState<readonly GuidedExplanationArtifact[]>(initialArtifacts);
  const add = useCallback((artifact: GuidedExplanationArtifact) => setArtifacts((current) => ArtifactLibraryModule.add(current, artifact)), []);
  const list = useCallback(() => ArtifactLibraryModule.list(artifacts), [artifacts]);
  const get = useCallback((id: string, version?: number) => ArtifactLibraryModule.get(artifacts, id, version), [artifacts]);
  const value = useMemo(() => Object.freeze({ artifacts, add, list, get }), [add, artifacts, get, list]);
  return <WorkBuddyArtifactLibraryContext.Provider value={value}>{children}</WorkBuddyArtifactLibraryContext.Provider>;
}
