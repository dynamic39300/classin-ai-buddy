import { describe, expect, it } from 'vitest';
import { canOpenGrowthRecord, clampProgress, getCourseProgress, groupGrowthRecords } from './growth';
import { GROWTH_COURSES, GROWTH_RECORDS } from '@mocks/scenarios/growth';

describe('student growth', () => {
  it('clamps progress and handles a zero total', () => {
    expect(clampProgress(1.4)).toBe(1);
    expect(clampProgress(-0.2)).toBe(0);
    expect(getCourseProgress(GROWTH_COURSES[0]!)).toBe(0.6);
    expect(getCourseProgress({ ...GROWTH_COURSES[0]!, totalUnits: 0 })).toBe(0);
  });

  it('groups by newest active class and sorts records newest first', () => {
    const groups = groupGrowthRecords(GROWTH_RECORDS);
    expect([...groups.keys()]).toEqual(['growth-class-001', 'growth-class-002', 'physics-3']);
    expect(groups.get('growth-class-001')?.map(({ id }) => id)).toEqual(['growth-record-001', 'growth-record-002', 'growth-record-writing']);
  });

  it('exposes result actions only for finished published records', () => {
    expect(canOpenGrowthRecord(GROWTH_RECORDS[0]!)).toBe(false);
    expect(canOpenGrowthRecord(GROWTH_RECORDS[1]!)).toBe(true);
    expect(canOpenGrowthRecord({ ...GROWTH_RECORDS[1]!, reportStatus: 'reviewing' })).toBe(false);
  });
});
