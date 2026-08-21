import { describe, expect, it } from 'vitest';
import { NINECLAW_M4_1_PARITY_TARGETS } from './nineclaw-parity';
import {
  WORKBUDDY_COURSE_PACKAGE_DEFINITION,
  WORKBUDDY_COURSEWARE_DEFINITION,
  WORKBUDDY_COURSEWARE_OUTPUT,
} from '@mocks/scenarios/workbuddy-course-production';
import { WORKBUDDY_CONTEXT_ITEMS } from '@mocks/scenarios/workbuddy-context';

describe('NineClaw M4.1 frame parity registry', () => {
  it('maps all 22 registered source events to an observable target or context boundary', () => {
    expect(NINECLAW_M4_1_PARITY_TARGETS).toHaveLength(22);
    expect(new Set(NINECLAW_M4_1_PARITY_TARGETS.map(({ sourceId }) => sourceId)).size).toBe(22);
    expect(NINECLAW_M4_1_PARITY_TARGETS.every(({ targetBehavior }) => targetBehavior.trim().length > 0)).toBe(true);
  });

  it('keeps unrelated source narratives out of target behavior', () => {
    const targetCopy = NINECLAW_M4_1_PARITY_TARGETS.map(({ targetBehavior }) => targetBehavior).join('');
    for (const forbidden of ['三顾茅庐', '教学动画', '北京版小学英语', '课后练习.html']) {
      expect(targetCopy).not.toContain(forbidden);
    }
  });

  it('locks the actual deterministic UI fixtures to one function-monotonicity narrative', () => {
    const targetCopy = JSON.stringify({
      definition: WORKBUDDY_COURSEWARE_DEFINITION,
      output: WORKBUDDY_COURSEWARE_OUTPUT,
      package: WORKBUDDY_COURSE_PACKAGE_DEFINITION,
      context: WORKBUDDY_CONTEXT_ITEMS,
    });
    expect(targetCopy).toContain('高一（3）班');
    expect(targetCopy).toContain('函数单调性');
    for (const forbidden of ['动量守恒', '碰撞实验', '机械波', '教学动画', '课后练习.html']) {
      expect(targetCopy).not.toContain(forbidden);
    }
  });
});
