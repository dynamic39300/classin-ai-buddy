import { isCompactTeachingActionLabel } from './teaching-action';
import { describe, expect, it } from 'vitest';

describe('teaching action vocabulary', () => {
  it('limits visible quick-action labels to four characters', () => {
    const labels = [
      '去上课',
      '去备课',
      '课前准备',
      '课堂报告',
      '课堂记录',
      '去做作业',
      '继续作业',
      '提交概况',
      '去批改',
      '继续批改',
      '作业数据',
      '去催交',
      '录播管理',
      '录播数据',
      '课程管理',
      '查看课程',
      '课程报告',
    ];

    expect(labels.every(isCompactTeachingActionLabel)).toBe(true);
    expect(isCompactTeachingActionLabel('查看课堂报告')).toBe(false);
  });
});
