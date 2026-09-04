import { describe, expect, it } from 'vitest';
import { TEACHERIN_BRAND } from './product-brand';

describe('TeacherIn product brand contract', () => {
  it('keeps one formal name, one short name and one Chinese descriptor', () => {
    expect(TEACHERIN_BRAND).toEqual({
      officialName: 'ClassIn TeacherIn',
      shortName: 'TeacherIn',
      descriptor: 'AI 教学搭档',
      workspaceDescriptor: '教师工作空间',
    });
  });
});
