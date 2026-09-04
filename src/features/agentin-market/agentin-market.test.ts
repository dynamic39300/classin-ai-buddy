import { describe, expect, it } from 'vitest';
import { AGENTIN_EVIDENCE_ID, getAgentInMarketView } from './agentin-market';

describe('AgentInMarketModule', () => {
  it('returns the stable screenshot-backed default projection', () => {
    const view = getAgentInMarketView();

    expect(view.gradeLabel).toBe('小学·二年级');
    expect(view.subjects).toEqual(['语文', '数学', '科学', '道德与法治', '其他']);
    expect(view.sorts).toEqual(['最热', '最新']);
    expect(view.favorites.map(({ label }) => label)).toEqual([
      '我的班级知识库', '数学思维教练', '鲁迅', '杜甫', '学小伴', '李白', 'xinlei的替身',
    ]);
    expect(view.favorites[0]?.pinned).toBe(true);
    expect(view.available).toHaveLength(28);
    expect(view.unavailableInContext).toHaveLength(8);
    expect(view.totalMatches).toBe(36);
  });

  it('resolves the four fixed recommendations in evidence order', () => {
    expect(getAgentInMarketView().recommendations.map(({ title }) => title)).toEqual([
      '每日名言', '成语溯源与应用专家', '地理百科大全', '孔子',
    ]);
  });

  it('matches title, description, and author while trimming and folding case', () => {
    expect(getAgentInMarketView({ text: '  noBOOK ' }).unavailableInContext.map(({ id }) => id)).toEqual(['nobook']);
    expect(getAgentInMarketView({ text: '张润臣' }).available.map(({ id }) => id)).toEqual(['question-extractor']);
    expect(getAgentInMarketView({ text: '七大洲' }).available.map(({ id }) => id)).toEqual(['geography-encyclopedia']);
  });

  it('preserves evidence order and projects an empty result without mutating fixtures', () => {
    const before = getAgentInMarketView().available.map(({ id }) => id);
    expect(getAgentInMarketView({ text: 'ClassIn' }).available[0]?.id).toBe('doushen-tutor');
    expect(getAgentInMarketView({ text: '完全不存在的智能体' }).totalMatches).toBe(0);
    expect(getAgentInMarketView().available.map(({ id }) => id)).toEqual(before);
  });

  it('keeps compatibility and provenance explicit for every card', () => {
    const view = getAgentInMarketView({ text: ' ' });
    for (const item of [...view.recommendations, ...view.available, ...view.unavailableInContext]) {
      expect(item.sourceEvidence).toBe(AGENTIN_EVIDENCE_ID);
      expect(item.avatarAsset).toMatch(/^\/reference\/agentin\/avatars\/.+\.png$/);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.favoritesLabel).toMatch(/人收藏$/);
      expect(item.authorLabel).toMatch(/^@/);
    }
    expect(view.available.every(({ availability }) => availability === 'available')).toBe(true);
    expect(view.unavailableInContext.every(({ availability }) => availability === 'unavailable_in_context')).toBe(true);
  });
});
