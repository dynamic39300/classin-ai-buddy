import { describe, expect, it } from 'vitest';
import {
  createStandaloneContentModule,
  isStandaloneContentSession,
} from './content';
import { isTeacherInCompatibleContentPackage } from '@domain/teacherin/content';

const INPUT = Object.freeze({
  accountId: 'teacher-1',
  idempotencyKey: 'publish-courseware-1',
  contentType: 'courseware' as const,
  title: '函数单调性智能课件',
  description: '从图像到定义的完整课件。',
  stage: '高中',
  subject: '数学',
  tags: ['课件', '函数'],
  sourceRunRef: 'run-1',
  sourceArtifactRef: { id: 'artifact-1', version: 'v2' },
  assetFormat: 'pptx',
  visibility: 'private' as const,
  decidedAt: '2026-08-25T10:30:00+08:00',
});

describe('StandaloneContentModule', () => {
  it('publishes a TeacherIn-compatible package with complete evidence and stable replay', () => {
    const module = createStandaloneContentModule();
    const first = module.publish(INPUT);
    const replay = module.publish(INPUT);
    expect(first).toEqual(replay);
    expect(first.status).toBe('success');
    if (first.status !== 'success') throw new Error('expected success');
    expect(isTeacherInCompatibleContentPackage(first.content)).toBe(true);
    expect(module.list('teacher-1')).toEqual([first.content]);
    expect(module.list('teacher-2')).toEqual([]);
    expect(module.receiptForArtifact('teacher-1', 'artifact-1')).toEqual(first.receipt);
    expect(isStandaloneContentSession(module.exportSession())).toBe(true);
  });

  it('fails closed when the same idempotency key carries different content', () => {
    const module = createStandaloneContentModule();
    module.publish(INPUT);
    expect(module.publish({ ...INPUT, title: '另一份课件' })).toEqual({
      status: 'evidence_mismatch',
      idempotencyKey: INPUT.idempotencyKey,
    });
  });

  it('validates the authoritative TeacherIn schema before persisting a publication', () => {
    const module = createStandaloneContentModule();
    expect(module.publish({ ...INPUT, decidedAt: 'not-a-date' })).toEqual({
      status: 'evidence_mismatch',
      idempotencyKey: INPUT.idempotencyKey,
    });
    expect(module.exportSession().packages).toEqual([]);
    expect(module.exportSession().receipts).toEqual([]);
  });

  it('rejects sessions with stale receipts or an invalid TeacherIn content schema', () => {
    const module = createStandaloneContentModule();
    module.publish(INPUT);
    const session = module.exportSession();
    expect(isStandaloneContentSession({
      ...session,
      receipts: session.receipts.map((receipt) => ({ ...receipt, objectVersion: 'v99' })),
    })).toBe(false);
    expect(isStandaloneContentSession({
      ...session,
      packages: session.packages.map((content) => ({ ...content, schemaVersion: 'approximate-v1' })),
    })).toBe(false);
  });
});
