import { describe, expect, it } from 'vitest';
import {
  clampWorkBuddyWidth,
  getDefaultWorkBuddyWidth,
  getWorkBuddyWidthLimits,
} from './message-workspace-layout';

describe('message workspace resizable layout', () => {
  it('keeps the default WorkBuddy width inside the 384px to 520px range', () => {
    expect(getDefaultWorkBuddyWidth(1280)).toBeCloseTo(435.2);
    expect(getDefaultWorkBuddyWidth(1440)).toBeCloseTo(489.6);
    expect(getDefaultWorkBuddyWidth(1920)).toBe(520);
  });

  it('preserves the communication surface minimum width for both entry scopes', () => {
    expect(getWorkBuddyWidthLimits(1280, 'messages-global')).toEqual({ min: 384, max: 540 });
    expect(getWorkBuddyWidthLimits(1280, 'messages-class')).toEqual({ min: 384, max: 576 });
  });

  it('clamps restored and dragged widths to the current layout limits', () => {
    const limits = getWorkBuddyWidthLimits(1440, 'messages-global');
    expect(clampWorkBuddyWidth(240, limits)).toBe(384);
    expect(clampWorkBuddyWidth(720, limits)).toBe(limits.max);
    expect(clampWorkBuddyWidth(500, limits)).toBe(500);
  });
});
