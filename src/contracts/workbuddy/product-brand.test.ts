import { describe, expect, it } from 'vitest';
import { TEACHBUDDY_BRAND } from './product-brand';

describe('TeachBuddy product brand contract', () => {
  it('keeps one formal name, one short name and one Chinese descriptor', () => {
    expect(TEACHBUDDY_BRAND).toEqual({
      officialName: 'ClassIn TeachBuddy',
      shortName: 'TeachBuddy',
      descriptor: 'AI 教学搭档',
      workspaceDescriptor: '教师工作空间',
    });
  });
});
