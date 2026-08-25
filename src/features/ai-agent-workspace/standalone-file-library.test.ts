import { describe, expect, it } from 'vitest';
import { standaloneFileAssets } from './standalone-file-library';

describe('standalone file library', () => {
  it('owns stable personal fixtures without ClassIn business references', () => {
    const first = standaloneFileAssets();
    const second = standaloneFileAssets();

    expect(first).toHaveLength(4);
    expect(first.every(({ id }) => id.startsWith('standalone-asset-'))).toBe(true);
    expect(JSON.stringify(first)).not.toMatch(/ClassIn|TeacherIn|机构|教研组|班级群|组织云盘/);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first[0]?.project).not.toBe(second[0]?.project);
  });
});
