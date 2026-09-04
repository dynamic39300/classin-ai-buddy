import type { GuidedExplanationArtifact } from './guided-explanation';

export type WorkBuddyArtifactLibrary = readonly GuidedExplanationArtifact[];

export function addWorkBuddyArtifact(current: WorkBuddyArtifactLibrary, artifact: GuidedExplanationArtifact): WorkBuddyArtifactLibrary {
  const withoutSameVersion = current.filter(({ id, version }) => id !== artifact.id || version !== artifact.version);
  return Object.freeze([...withoutSameVersion, artifact]);
}

export function listWorkBuddyArtifacts(current: WorkBuddyArtifactLibrary): WorkBuddyArtifactLibrary {
  return current;
}

export function getWorkBuddyArtifact(current: WorkBuddyArtifactLibrary, id: string, version?: number): GuidedExplanationArtifact | null {
  const matching = current.filter((artifact) => artifact.id === id && (version === undefined || artifact.version === version));
  return matching.at(-1) ?? null;
}

export const ArtifactLibraryModule = Object.freeze({
  add: addWorkBuddyArtifact,
  list: listWorkBuddyArtifacts,
  get: getWorkBuddyArtifact,
});
