import { describe, expect, it } from 'vitest';
import { ArtifactLibraryModule } from './artifact-library';
import { GuidedExplanationModule } from './guided-explanation';

const prepared = GuidedExplanationModule.prepare({
  runRef: 'run-guided-library-1', classId: 'physics-3', classLabel: '高二物理 3 班', threadId: 'class-physics-3',
  targetKind: 'class', targetLabel: '高二物理 3 班', teacherId: 'teacher-001', teacherName: '王老师',
  question: '质量为 0.20 kg 的小球 A 以 5.0 m/s 向右运动，与静止的 0.30 kg 小球 B 正碰，碰后 A 以 1.0 m/s 向左反弹，求 B 碰后的速度大小和方向？', generatedAt: '2026-08-24T09:00:00+08:00',
})!;

describe('ArtifactLibraryModule', () => {
  it('adds, lists and gets immutable artifact versions', () => {
    const first = ArtifactLibraryModule.add(Object.freeze([]), prepared.artifact);
    const replaced = ArtifactLibraryModule.add(first, prepared.artifact);
    expect(ArtifactLibraryModule.list(replaced)).toHaveLength(1);
    expect(ArtifactLibraryModule.get(replaced, prepared.artifact.id, 1)).toBe(prepared.artifact);
    expect(ArtifactLibraryModule.get(replaced, 'missing')).toBeNull();
  });
});
