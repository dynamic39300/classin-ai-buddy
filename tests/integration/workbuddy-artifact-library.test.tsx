import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FileLibrary } from '@features/ai-agent-workspace';
import { WorkBuddyArtifactLibraryProvider } from '@features/workbuddy-artifact-library';
import { GuidedExplanationModule } from '@domain/workbuddy/guided-explanation';

describe('WorkBuddy artifact library', () => {
  it('projects a generated format-neutral artifact into My Files without exposing its adapter format', () => {
    const prepared = GuidedExplanationModule.prepare({
      runRef: 'run-guided-library-1',
      classId: 'physics-3', classLabel: '高二物理 3 班', threadId: 'direct-wang-li', targetKind: 'direct', targetLabel: '李明',
      teacherId: 'teacher-001', teacherName: '王老师', question: '质量为 0.20 kg 的小球 A 以 5.0 m/s 向右运动，与静止的 0.30 kg 小球 B 正碰，碰后 A 以 1.0 m/s 向左反弹，求 B 碰后的速度大小和方向？', generatedAt: '2026-08-24T09:00:00+08:00',
    })!;
    render(
      <WorkBuddyArtifactLibraryProvider initialArtifacts={[prepared.artifact]}>
        <FileLibrary productBoundary="classin-integrated" draftReceipts={{}} onUseAsContext={() => undefined} onOpenRun={() => undefined} onCreateTeacherInDraft={() => { throw new Error('not used'); }} onOpenTeacherIn={() => undefined} onLocateInSpace={() => undefined} />
      </WorkBuddyArtifactLibraryProvider>,
    );
    expect(screen.getByText(prepared.artifact.title)).toBeInTheDocument();
    expect(screen.queryByText('H5', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText('交互讲解')).toBeInTheDocument();
    expect(screen.getByText(/7 个文件/)).toBeInTheDocument();
  });
});
