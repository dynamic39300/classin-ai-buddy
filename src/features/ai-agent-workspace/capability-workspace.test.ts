import { describe, expect, it } from 'vitest';
import { CAPABILITY_SURFACE_CONFIGS, CONTENT_ITEMS, FILE_ITEMS, SKILL_ITEMS, TOOL_ITEMS, executeCapabilityCommand, filterCapabilityItems, getCapabilitySurface, surfaceItems } from './capability-workspace';

describe('WorkBuddy capability workspace model', () => {
  it('exposes the six approved secondary destinations in order', () => {
    expect(CAPABILITY_SURFACE_CONFIGS.map(({ id }) => id)).toEqual(['skills', 'tools', 'content', 'files', 'schedules', 'settings']);
    expect(CAPABILITY_SURFACE_CONFIGS.map(({ label }) => label)).toEqual(['技能市场', '工具连接', '内容资源', '我的文件', '定时任务', '设置']);
  });

  it('keeps a stable surface configuration and first tab', () => {
    expect(getCapabilitySurface('skills').tabs[0]).toEqual({ id: 'recommended', label: '推荐' });
    expect(getCapabilitySurface('settings').tabs).toEqual([]);
  });

  it('filters skills by title, description, and source', () => {
    expect(filterCapabilityItems(SKILL_ITEMS, '错因', 'market').map(({ id }) => id)).toEqual(['skill-homework-cluster']);
    expect(filterCapabilityItems(SKILL_ITEMS, '星河', 'market').map(({ id }) => id)).toEqual(['skill-homework-cluster']);
  });

  it('mine tabs only show installed or governed items', () => {
    expect(filterCapabilityItems(SKILL_ITEMS, '', 'mine').map(({ id }) => id)).toEqual([
      'skill-courseware-structure', 'skill-lesson-rehearsal', 'skill-goal-clarifier',
    ]);
  });

  it('filters saved content and source-specific files', () => {
    expect(filterCapabilityItems(CONTENT_ITEMS, '', 'saved').map(({ id }) => id)).toEqual(['content-momentum-review']);
    expect(filterCapabilityItems(FILE_ITEMS, '', 'artifacts').map(({ id }) => id)).toEqual(['file-courseware-v2']);
    expect(filterCapabilityItems(FILE_ITEMS, '', 'cloud').map(({ id }) => id)).toEqual(['file-wave-template', 'file-restricted-reference']);
  });

  it('filters active and historical scheduled task views', () => {
    expect(filterCapabilityItems(surfaceItems('schedules'), '', 'active').map(({ id }) => id)).toEqual(['schedule-weekly-summary', 'schedule-homework-review']);
    expect(filterCapabilityItems(surfaceItems('schedules'), '', 'history').map(({ id }) => id)).toEqual(['schedule-weekly-summary', 'schedule-lesson-prep']);
  });

  it('keeps tool policy-blocked and authentication-failed states visible', () => {
    expect(TOOL_ITEMS.find(({ id }) => id === 'tool-calendar')).toMatchObject({ status: '认证失败', statusTone: 'danger' });
    expect(TOOL_ITEMS.find(({ id }) => id === 'tool-web-search')).toMatchObject({ status: '策略阻断', statusTone: 'warning' });
  });

  it('keeps every fixture traceable to a source and permission contract', () => {
    for (const item of [...SKILL_ITEMS, ...TOOL_ITEMS, ...CONTENT_ITEMS, ...FILE_ITEMS, ...surfaceItems('schedules')]) {
      expect(item.source.length).toBeGreaterThan(0);
      expect(item.permissions.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
    }
  });

  it('normalizes capability mutations through the simulated Adapter seam', () => {
    const result = executeCapabilityCommand(SKILL_ITEMS, { itemId: 'skill-homework-cluster', status: '已安装', statusTone: 'neutral', message: '安装完成' });
    expect(result).toMatchObject({ truth: '[模拟]', outcome: 'succeeded', message: '安装完成' });
    expect(result.items.find(({ id }) => id === 'skill-homework-cluster')?.status).toBe('已安装');
  });
});
