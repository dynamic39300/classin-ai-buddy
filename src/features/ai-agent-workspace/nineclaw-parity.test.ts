import { describe, expect, it } from 'vitest';
import { NINECLAW_M4_1_PARITY_TARGETS } from './nineclaw-parity';

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
});
