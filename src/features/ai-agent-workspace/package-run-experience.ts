import type { PackageArtifact } from '@domain/workbuddy/course-package';

export type PackageExperienceState = Readonly<{
  status: 'idle' | 'running' | 'stopped' | 'completed';
  phase: 0 | 1 | 2 | 3;
}>;

export type PackageExperienceArtifact = Readonly<{
  id: string;
  title: string;
  kind: PackageArtifact['kind'];
  version: string;
  state: 'waiting' | 'running' | 'completed' | 'excluded';
}>;

export function createPackageExperience(): PackageExperienceState {
  return Object.freeze({ status: 'idle', phase: 0 });
}

export function startPackageExperience(state: PackageExperienceState): PackageExperienceState {
  return state.status === 'idle' ? Object.freeze({ status: 'running', phase: 0 }) : state;
}

export function advancePackageExperience(state: PackageExperienceState): PackageExperienceState {
  if (state.status !== 'running') return state;
  if (state.phase === 2) return Object.freeze({ status: 'completed', phase: 3 });
  return Object.freeze({ status: 'running', phase: (state.phase + 1) as 1 | 2 });
}

export function stopPackageExperience(state: PackageExperienceState): PackageExperienceState {
  return state.status === 'running' ? Object.freeze({ ...state, status: 'stopped' }) : state;
}

export function resumePackageExperience(state: PackageExperienceState): PackageExperienceState {
  return state.status === 'stopped' ? Object.freeze({ ...state, status: 'running' }) : state;
}

export function projectPackageExperienceArtifacts(
  experience: PackageExperienceState,
  artifacts: readonly PackageArtifact[],
): readonly PackageExperienceArtifact[] {
  return Object.freeze(artifacts.map((artifact, index) => {
    let state: PackageExperienceArtifact['state'];
    if (artifact.state === 'excluded') state = 'excluded';
    else if (experience.status === 'completed') state = 'completed';
    else if (experience.status === 'idle') state = 'waiting';
    else if (index === 0) state = experience.phase === 0 ? 'running' : 'completed';
    else if (index === artifacts.length - 1) state = experience.phase === 2 ? 'running' : experience.phase === 3 ? 'completed' : 'waiting';
    else state = experience.phase === 0 ? 'waiting' : experience.phase === 1 ? 'running' : 'completed';
    return Object.freeze({ id: artifact.id, title: artifact.title, kind: artifact.kind, version: artifact.version, state });
  }));
}
