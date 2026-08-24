import { createContext, useContext } from 'react';
import type { GuidedExplanationArtifact } from '@domain/workbuddy/guided-explanation';

export type WorkBuddyArtifactLibraryStore = Readonly<{
  artifacts: readonly GuidedExplanationArtifact[];
  add: (artifact: GuidedExplanationArtifact) => void;
  list: () => readonly GuidedExplanationArtifact[];
  get: (id: string, version?: number) => GuidedExplanationArtifact | null;
}>;

export const WorkBuddyArtifactLibraryContext = createContext<WorkBuddyArtifactLibraryStore | null>(null);

export function useOptionalWorkBuddyArtifactLibrary() {
  return useContext(WorkBuddyArtifactLibraryContext);
}

export function useWorkBuddyArtifactLibrary() {
  const value = useOptionalWorkBuddyArtifactLibrary();
  if (!value) throw new Error('useWorkBuddyArtifactLibrary must be used within WorkBuddyArtifactLibraryProvider');
  return value;
}
