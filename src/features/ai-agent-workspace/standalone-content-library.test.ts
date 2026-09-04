import { describe, expect, it } from 'vitest';
import { isTeacherInCompatibleContentPackage } from '@domain/teacherin/content';
import { standaloneContentItems, standaloneContentPackages } from './standalone-content-library';

describe('standalone content library', () => {
  it('owns stable consumer-only fixtures without ClassIn organization data', () => {
    const first = standaloneContentItems();
    const second = standaloneContentItems();

    expect(first).toHaveLength(5);
    expect(first.every(({ id, truth }) => id.startsWith('standalone-content-') && truth === '[模拟]')).toBe(true);
    expect(JSON.stringify(first)).not.toMatch(/ClassIn|机构内容库|教研组|班级/);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(standaloneContentPackages().every(isTeacherInCompatibleContentPackage)).toBe(true);
    expect(first.every(({ meta }) => meta.some((value) => value.includes('teacherin-content-v1')))).toBe(true);
  });

  it('never projects another account private fixture as the current teacher work', () => {
    const privateFixture = standaloneContentPackages().find(({ authorization }) => authorization.visibility === 'private');
    if (!privateFixture) throw new Error('expected private fixture');
    expect(standaloneContentItems([privateFixture], 'teacher-a').some(({ id }) => id === privateFixture.id)).toBe(false);
    expect(standaloneContentItems([privateFixture], 'demo-teacher')).toContainEqual(expect.objectContaining({
      id: privateFixture.id,
      source: '我的作品',
    }));
  });
});
