import { Archive, ArrowUpDown, Check, Search } from 'lucide-react';
import type { CatalogResource, ResourceSortKey } from '@domain/space/space';
import type { SpaceRouteState } from './space-route-state';
import styles from './SpaceWorkspace.module.css';

type ResourceCenterWorkspaceProps = {
  routeState: SpaceRouteState;
  updateRouteState: (updates: Partial<SpaceRouteState>) => void;
  catalogList: ReadonlyArray<CatalogResource>;
  mineList: ReadonlyArray<CatalogResource>;
  acquiredResourceIds: ReadonlySet<string>;
  onAcquire: (id: string) => void;
  feedback: string | null;
};

export function ResourceCenterWorkspace({ routeState, updateRouteState, catalogList, mineList, acquiredResourceIds, onAcquire, feedback }: ResourceCenterWorkspaceProps) {
  const renderCards = (resources: ReadonlyArray<CatalogResource>, mine: boolean) => (
    <div className={styles.resourceGrid}>
      {resources.map((resource) => {
        const acquired = acquiredResourceIds.has(resource.id);
        return <article className={styles.resourceCard} key={resource.id}>
          <div className={styles.resourceCover}><span>{resource.format}</span><strong>{resource.title.slice(0, 1)}</strong></div>
          <div className={styles.resourceCopy}><div><strong>{resource.title}</strong><small>{resource.stage} · {resource.subject} · {resource.publisher}</small></div><p>{resource.description}</p><div className={styles.tagRow}>{resource.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
          <footer><span>{mine ? '只读' : acquired ? <><Check aria-hidden="true" size={14} />已获取</> : '可获取'}</span>{!mine ? <button className={acquired ? styles.secondaryButton : styles.primaryButton} type="button" onClick={() => onAcquire(resource.id)}>{acquired ? '已获取' : '获取'}</button> : null}</footer>
        </article>;
      })}
      {resources.length === 0 ? <div className={styles.emptyState}><Archive aria-hidden="true" size={22} /><strong>{mine ? '还没有获取任何资源' : '没有匹配的资源'}</strong><span>{mine ? '从全部资源获取后会显示在这里' : '调整标题或标签关键词'}</span></div> : null}
    </div>
  );

  return (
    <section className={styles.pageContent} aria-labelledby="space-title">
      <h1 className={styles.srOnly} id="space-title">资源中心</h1>
      <div className={styles.surfaceTabs} role="tablist" aria-label="资源中心视图">
        <button type="button" role="tab" aria-selected={routeState.resourceTab === 'all'} onClick={() => updateRouteState({ resourceTab: 'all', query: '', resourceSort: 'latest' })}>全部资源</button>
        <button type="button" role="tab" aria-selected={routeState.resourceTab === 'mine'} onClick={() => updateRouteState({ resourceTab: 'mine', query: '', resourceSort: 'latest' })}>我的资源 <small>{acquiredResourceIds.size}</small></button>
      </div>
      {routeState.resourceTab === 'mine' ? <section className={styles.mineSection} aria-label="我的资源只读列表"><div className={styles.readonlyNotice}><Check aria-hidden="true" size={15} />只读列表</div>{renderCards(mineList, true)}</section> : <><div className={styles.listToolbar}><label className={styles.searchBox}><Search aria-hidden="true" size={15} /><span className={styles.srOnly}>搜索资源标题或标签</span><input type="search" value={routeState.query} onChange={(event) => updateRouteState({ query: event.target.value })} placeholder="搜索标题或标签" /></label><label className={styles.iconSelect} title={routeState.resourceSort === 'name' ? '排序：名称' : '排序：最新'}><ArrowUpDown aria-hidden="true" size={16} /><span className={styles.srOnly}>资源排序</span><select aria-label="资源排序" value={routeState.resourceSort} onChange={(event) => updateRouteState({ resourceSort: event.target.value as ResourceSortKey })}><option value="latest">最新</option><option value="name">名称</option></select></label></div>{renderCards(catalogList, false)}</>}
      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
    </section>
  );
}
