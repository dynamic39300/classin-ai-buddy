import { describe, expect, it } from 'vitest';
import { standaloneCapabilityItems } from './standalone-capability-library';

describe('standalone capability library', () => {
  it('uses independent, consumer-safe data for skills, tools and schedules', () => {
    const values = ['skills', 'tools', 'schedules'] as const;
    for (const surface of values) {
      const items = standaloneCapabilityItems(surface);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every(({ id, truth }) => id.startsWith('standalone-') && truth === '[模拟]')).toBe(true);
      expect(JSON.stringify(items)).not.toMatch(/ClassIn|机构|班级|教研组|组织云盘/);
      expect(items).toEqual(standaloneCapabilityItems(surface));
      expect(items).not.toBe(standaloneCapabilityItems(surface));
    }
  });
});
