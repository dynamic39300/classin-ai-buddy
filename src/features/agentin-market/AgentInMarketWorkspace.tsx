import {
  ChevronDown,
  Folder,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  RotateCw,
  Search,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { usePageHeader } from '@app/shell/usePageHeader';
import { getAgentInMarketView, type AgentInCardView } from './agentin-market';
import styles from './AgentInMarketWorkspace.module.css';

const PAGE_HEADER = Object.freeze({ title: '添加智能体' });

function AgentCard({ card, onSelect }: Readonly<{
  card: AgentInCardView;
  onSelect: (card: AgentInCardView) => void;
}>) {
  const unavailable = card.availability === 'unavailable_in_context';
  return (
    <button
      aria-describedby={unavailable ? `agentin-${card.id}-availability` : undefined}
      aria-label={`查看智能体 ${card.title}`}
      className={styles.agentCard}
      data-availability={card.availability}
      type="button"
      onClick={() => onSelect(card)}
    >
      <span className={styles.cardHeader}>
        <img alt="" className={styles.cardAvatar} src={card.avatarAsset} />
        {card.badge === 'hot' ? <span className={styles.hotBadge}>热门</span> : null}
        {card.badge === 'knowledge_base' ? <span className={styles.knowledgeBadge}>知识库</span> : null}
      </span>
      <strong className={styles.cardTitle}>{card.title}</strong>
      <span className={styles.cardDescription}>{card.description}</span>
      <span className={styles.cardMeta}>
        <span>{card.favoritesLabel}</span>
        <span>{card.authorLabel}</span>
      </span>
      {unavailable ? <span className={styles.visuallyHidden} id={`agentin-${card.id}-availability`}>当前场景不支持添加</span> : null}
    </button>
  );
}

export function AgentInMarketWorkspace() {
  usePageHeader(PAGE_HEADER);
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('语文');
  const [sort, setSort] = useState('最热');
  const [recommendationOffset, setRecommendationOffset] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [feedback, setFeedback] = useState<AgentInLocalFeedback | null>(null);
  const view = useMemo(() => getAgentInMarketView({ text: query }), [query]);
  const recommendations = useMemo(() => {
    const items = [...view.recommendations];
    return items.map((item, index) => items[(index + recommendationOffset) % items.length] ?? item);
  }, [recommendationOffset, view.recommendations]);

  const showFeedback = (message: string, sourceControl: string) => setFeedback({ kind: 'not_connected', message, sourceControl });
  const selectCard = (card: AgentInCardView) => showFeedback(
    card.availability === 'unavailable_in_context'
      ? `“${card.title}”当前场景不支持添加。`
      : `“${card.title}”的详情与添加流程暂未开放。`,
    `agent-card:${card.id}`,
  );

  return (
    <section className={styles.workspace} data-sidebar-collapsed={sidebarCollapsed} aria-label="AgentIn 智能体市场">
      <aside className={styles.marketSidebar} aria-label="AgentIn 功能导航">
        <div className={styles.brandRow}>
          <strong aria-label="AgentIn">{sidebarCollapsed ? 'A' : 'AgentIn'}</strong>
          <button
            aria-label={sidebarCollapsed ? '展开 AgentIn 导航' : '收起 AgentIn 导航'}
            type="button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            {sidebarCollapsed ? <PanelLeftOpen aria-hidden="true" size={17} /> : <PanelLeftClose aria-hidden="true" size={17} />}
          </button>
        </div>

        <nav className={styles.marketNavigation} aria-label="AgentIn 页面">
          <button aria-current="page" type="button">
            <LayoutGrid aria-hidden="true" size={19} />
            <span>首页</span>
          </button>
          <button type="button" onClick={() => showFeedback('“我创建的”页面不在本次静态复刻范围内。', 'created-agents')}>
            <Folder aria-hidden="true" size={19} />
            <span>我创建的</span>
          </button>
        </nav>

        <section className={styles.favorites} aria-labelledby="agentin-favorites-heading">
          <h2 id="agentin-favorites-heading">我的收藏</h2>
          <div>
            {view.favorites.map((favorite) => (
              <button key={favorite.id} type="button" onClick={() => showFeedback(`“${favorite.label}”收藏详情暂未开放。`, `favorite:${favorite.id}`)}>
                <img alt="" src={favorite.avatarAsset} />
                <span>{favorite.label}</span>
                {favorite.pinned ? <Pin aria-label="已置顶" size={14} /> : null}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <div className={styles.marketMain}>
        <header className={styles.marketToolbar}>
          <button
            className={styles.gradeButton}
            type="button"
            onClick={() => showFeedback('年级切换暂未开放，当前展示“小学·二年级”。', 'grade')}
          >
            {view.gradeLabel}<ChevronDown aria-hidden="true" size={15} />
          </button>
          <label className={styles.searchControl}>
            <Search aria-hidden="true" size={18} />
            <input
              aria-label="搜索智能体"
              placeholder="搜索智能体"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button aria-label="清空搜索" type="button" onClick={() => setQuery('')}>
                <X aria-hidden="true" size={15} />
              </button>
            ) : null}
          </label>
        </header>

        <div className={styles.scrollArea} data-testid="agentin-market-scroll">
          {query ? (
            <div className={styles.searchSummary} role="status">
              找到 {view.totalMatches} 个与“{query.trim()}”相关的智能体
            </div>
          ) : (
            <section className={styles.recommendationSection} aria-labelledby="agentin-recommendations-heading">
              <div className={styles.sectionHeading}>
                <h2 id="agentin-recommendations-heading">猜你喜欢</h2>
                <button
                  type="button"
                  onClick={() => setRecommendationOffset((offset) => (offset + 1) % view.recommendations.length)}
                >
                  <RotateCw aria-hidden="true" size={16} />换一换
                </button>
              </div>
              <div className={styles.recommendationGrid}>
                {recommendations.map((card) => <AgentCard card={card} key={card.id} onSelect={selectCard} />)}
              </div>
            </section>
          )}

          <section className={styles.catalogSection} aria-label="智能体目录">
            <div className={styles.catalogControls}>
              <div className={styles.subjectTabs} aria-label="学科筛选" role="group">
                {view.subjects.map((label) => (
                  <button
                    aria-pressed={subject === label}
                    key={label}
                    type="button"
                    onClick={() => {
                      setSubject(label);
                      showFeedback(`已选择“${label}”，真实筛选逻辑尚未接入。`, `subject:${label}`);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className={styles.sortControl} aria-label="智能体排序" role="group">
                {view.sorts.map((label) => (
                  <button
                    aria-pressed={sort === label}
                    key={label}
                    type="button"
                    onClick={() => {
                      setSort(label);
                      showFeedback(`已选择“${label}”，真实排序逻辑尚未接入。`, `sort:${label}`);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {view.available.length ? (
              <div className={styles.catalogGrid}>
                {view.available.map((card) => <AgentCard card={card} key={card.id} onSelect={selectCard} />)}
              </div>
            ) : null}

            {view.unavailableInContext.length ? (
              <section className={styles.unavailableSection} aria-labelledby="agentin-unavailable-heading">
                <h2 id="agentin-unavailable-heading">以下智能体当前场景不支持添加</h2>
                <div className={styles.catalogGrid}>
                  {view.unavailableInContext.map((card) => <AgentCard card={card} key={card.id} onSelect={selectCard} />)}
                </div>
              </section>
            ) : null}

            {!view.totalMatches ? (
              <div className={styles.emptyState} role="status">
                <Search aria-hidden="true" size={28} />
                <strong>没有找到相关智能体</strong>
                <span>试试搜索智能体名称、描述或创建者。</span>
              </div>
            ) : null}
          </section>
        </div>

        <div className={styles.feedback} aria-live="polite" data-visible={Boolean(feedback)}>
          <span>{feedback?.message}</span>
          {feedback ? <button aria-label="关闭提示" type="button" onClick={() => setFeedback(null)}><X aria-hidden="true" size={15} /></button> : null}
        </div>
      </div>
    </section>
  );
}

type AgentInLocalFeedback = Readonly<{
  kind: 'not_connected';
  message: string;
  sourceControl: string;
}>;
