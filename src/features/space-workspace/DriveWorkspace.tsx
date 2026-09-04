import {
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  ChevronRight,
  Clock3,
  Download,
  File,
  FilePlus2,
  FileQuestion,
  Folder,
  FolderPlus,
  Grid2X2,
  HardDrive,
  List,
  MonitorUp,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  canCreateOrganizationFolder,
  canDeleteSpaceItem,
  getSpaceItemAction,
  getSpaceItemActions,
  ORGANIZATION_PERMISSION_LABELS,
  SPACE_FILE_CAPABILITY_LABELS,
  SPACE_FILE_STATUS_LABELS,
  SPACE_SURFACE_LABELS,
  type OrganizationPermission,
  type SpaceFile,
  type SpaceItem,
  type SpaceItemAction,
  type SpaceSortKey,
  type SpaceSurface,
} from '@domain/space/space';
import { SPACE_SELF_USER_ID } from '@mocks/scenarios/space';
import { SpaceActionMenu } from './SpaceActionMenu';
import type { SpaceRouteState } from './space-route-state';
import styles from './SpaceWorkspace.module.css';

function formatSpaceDate(iso: string): string {
  const value = new Date(iso);
  return `${value.getMonth() + 1}月${value.getDate()}日 ${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function SpaceMark({ item }: { item: SpaceItem }) {
  const Icon = item.kind === 'folder' ? Folder : File;
  return <span className={styles.itemMark} data-kind={item.kind}><Icon aria-hidden="true" size={18} /></span>;
}

export type DriveWorkspaceProps = {
  surface: Extract<SpaceSurface, 'my-drive' | 'organization-drive'>;
  path: ReadonlyArray<{ id: string; parentId: string | null; name: string }>;
  currentPermission: OrganizationPermission;
  visibleItems: ReadonlyArray<SpaceItem>;
  routeState: SpaceRouteState;
  updateRouteState: (updates: Partial<SpaceRouteState>) => void;
  selectedIds: ReadonlySet<string>;
  onToggleSelected: (id: string) => void;
  onDeleteRequest: () => void;
  onOpenDirectory: (id: string | null) => void;
  onItemAction: (item: SpaceItem, action: SpaceItemAction) => void;
  onPlaceholder: (message: string) => void;
  newMenuOpen: boolean;
  onToggleNewMenu: () => void;
  onOpenNewFolder: () => void;
  supplementMenuOpen: boolean;
  onToggleSupplementMenu: () => void;
  previewItem: SpaceFile | null;
  onClosePreview: () => void;
  newFolderPanel: ReactNode;
  deleteDialog: ReactNode;
  feedback: string | null;
};

export function DriveWorkspace(props: DriveWorkspaceProps) {
  const { surface, path, currentPermission, visibleItems, routeState, updateRouteState, selectedIds, onToggleSelected, onDeleteRequest, onOpenDirectory, onItemAction, onPlaceholder, newMenuOpen, onToggleNewMenu, onOpenNewFolder, supplementMenuOpen, onToggleSupplementMenu, previewItem, onClosePreview, newFolderPanel, deleteDialog, feedback } = props;
  const canCreateHere = surface === 'my-drive' || canCreateOrganizationFolder(currentPermission);
  const sortLabel = routeState.driveSort === 'updated' ? '修改时间' : routeState.driveSort === 'size' ? '大小' : '名称';
  const renderItem = (item: SpaceItem) => {
    const deletable = canDeleteSpaceItem(item, SPACE_SELF_USER_ID);
    const actions = getSpaceItemActions(item, SPACE_SELF_USER_ID);
    const primaryAction = actions[0];
    return <article className={styles.driveRow} role="row" data-view={routeState.view} key={item.id}>
      <label className={styles.checkCell} role="cell" title={deletable ? '选择' : '当前权限不可删除'}><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => onToggleSelected(item.id)} aria-label={`选择${item.name}`} disabled={!deletable} /></label>
      <button type="button" className={styles.itemButton} aria-label={`打开${item.name}`} onClick={() => primaryAction && onItemAction(item, primaryAction)}><SpaceMark item={item} /><span className={styles.itemCopy}><strong>{item.name}</strong><small>{item.kind === 'folder' ? '文件夹' : `${item.extension} · ${item.sizeLabel}`}</small></span></button>
      <div className={styles.itemLabels} role="cell">{item.kind === 'file' ? <span data-status={item.status}>{SPACE_FILE_STATUS_LABELS[item.status]}</span> : null}{item.kind === 'file' ? item.capabilities.map((capability) => <span key={capability}>{SPACE_FILE_CAPABILITY_LABELS[capability]}</span>) : null}{item.permission ? <span>{ORGANIZATION_PERMISSION_LABELS[item.permission]}</span> : null}</div>
      <span className={styles.itemDate} role="cell">{formatSpaceDate(item.updatedAt)}</span>
      <div className={styles.rowActions} role="cell"><SpaceActionMenu itemName={item.name} actions={actions} onAction={(action) => onItemAction(item, action)} /></div>
    </article>;
  };

  return <section className={styles.pageContent} aria-labelledby="space-title">
    <h1 className={styles.srOnly} id="space-title">{SPACE_SURFACE_LABELS[surface]}</h1>
    <div className={styles.driveToolbar} role="group" aria-label="文件列表工具栏">
      {path.length > 0 ? <div className={styles.breadcrumbs} aria-label="文件夹路径"><button type="button" onClick={() => onOpenDirectory(null)}>{SPACE_SURFACE_LABELS[surface]}</button>{path.map((folder) => <span key={folder.id}><ChevronRight aria-hidden="true" size={14} /><button type="button" onClick={() => onOpenDirectory(folder.id)}>{folder.name}</button></span>)}</div> : null}
      <div className={styles.toolbarControls}>
        <label className={`${styles.searchBox} ${styles.driveSearch}`}><Search aria-hidden="true" size={14} /><span className={styles.srOnly}>搜索当前目录</span><input type="search" value={routeState.query} onChange={(event) => updateRouteState({ query: event.target.value })} placeholder="搜索文件" /></label>
        <span className={styles.itemCount}>{visibleItems.length} 项内容</span>
        <div className={styles.toolbarActions} role="group" aria-label="文件操作">
          {selectedIds.size > 0 ? <button className={styles.dangerButton} type="button" onClick={onDeleteRequest}><Trash2 aria-hidden="true" size={15} />删除 {selectedIds.size} 项</button> : null}
          {canCreateHere ? <div className={styles.newMenuWrap}><button className={styles.iconButton} type="button" aria-label="新建" title="新建" aria-expanded={newMenuOpen} onClick={onToggleNewMenu}><FilePlus2 aria-hidden="true" size={17} /></button>{newMenuOpen ? <div className={styles.newMenu} role="menu"><button type="button" role="menuitem" onClick={onOpenNewFolder}><FolderPlus aria-hidden="true" size={16} />新建文件夹</button><button type="button" role="menuitem" onClick={() => onPlaceholder('新建板书仅保留入口，未创建 EDB 文件。')}><MonitorUp aria-hidden="true" size={16} />新建板书</button><button type="button" role="menuitem" onClick={() => onPlaceholder('新建作业资源仅保留入口，未创建资源。')}><FileQuestion aria-hidden="true" size={16} />作业资源</button><button type="button" role="menuitem" onClick={() => onPlaceholder('协作文档仅保留入口，未连接协作服务。')}><FilePlus2 aria-hidden="true" size={16} />协作文档</button></div> : null}</div> : null}
          <button className={styles.iconButton} type="button" aria-label="上传" title="上传" onClick={() => onPlaceholder('上传入口已保留，未读取文件；单目录文件上限为 300。')}><Upload aria-hidden="true" size={17} /></button>
          {surface === 'organization-drive' && currentPermission === 'manage' ? <button className={styles.iconButton} type="button" aria-label="成员管理" title="成员管理" onClick={() => onPlaceholder('成员管理入口已保留，当前 Demo 不配置真实成员权限。')}><Users aria-hidden="true" size={17} /></button> : null}
          <div className={styles.newMenuWrap}><button className={styles.iconButton} type="button" aria-label="辅助工具" title="辅助工具" aria-expanded={supplementMenuOpen} onClick={onToggleSupplementMenu}><MoreHorizontal aria-hidden="true" size={17} /></button>{supplementMenuOpen ? <div className={styles.newMenu} role="menu" aria-label="云盘辅助工具"><button type="button" role="menuitem" onClick={() => { onToggleSupplementMenu(); onPlaceholder('全局文档搜索为 PC 补充入口，尚未接入空间索引。'); }}><Search aria-hidden="true" size={15} />全局文档搜索</button><button type="button" role="menuitem" onClick={() => { onToggleSupplementMenu(); onPlaceholder('最近打开为 PC 补充入口，尚未接入打开记录。'); }}><Clock3 aria-hidden="true" size={15} />最近打开</button><button type="button" role="menuitem" onClick={() => { onToggleSupplementMenu(); onPlaceholder('存储详情为 PC 补充入口，尚未接入真实容量服务。'); }}><HardDrive aria-hidden="true" size={15} />存储详情</button></div> : null}</div>
          <label className={styles.iconSelect} title={`排序：${sortLabel}`}><ArrowUpDown aria-hidden="true" size={16} /><span className={styles.srOnly}>文件排序</span><select aria-label="文件排序" value={routeState.driveSort} onChange={(event) => updateRouteState({ driveSort: event.target.value as SpaceSortKey })}><option value="name">名称</option><option value="updated">修改时间</option><option value="size">大小</option></select></label>
          <div className={styles.viewSwitch} role="group" aria-label="文件视图"><button type="button" aria-pressed={routeState.view === 'list'} aria-label="列表视图" title="列表视图" onClick={() => updateRouteState({ view: 'list' })}><List aria-hidden="true" size={16} /></button><button type="button" aria-pressed={routeState.view === 'grid'} aria-label="网格视图" title="网格视图" onClick={() => updateRouteState({ view: 'grid' })}><Grid2X2 aria-hidden="true" size={16} /></button></div>
        </div>
      </div>
    </div>
    <div className={styles.driveList} role="table" aria-label="文件列表" data-view={routeState.view}><div className={styles.driveHeader} role="row"><span role="columnheader">选择</span><span role="columnheader">名称 / 格式</span><span role="columnheader">状态 / 权限</span><span role="columnheader">更新时间</span><span role="columnheader">操作</span></div>{visibleItems.map(renderItem)}{visibleItems.length === 0 ? <div className={styles.emptyState}><Folder aria-hidden="true" size={22} /><strong>{routeState.query ? '没有匹配内容' : '这个文件夹是空的'}</strong><span>{routeState.query ? '仅搜索当前目录的名称和后缀' : '可以新建文件夹或使用上传入口'}</span></div> : null}</div>
    {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
    {previewItem ? <aside className={styles.previewPanel} aria-label="文件预览面板"><header><div><span className={styles.eyebrow}>{previewItem.extension} 文件</span><h2>{previewItem.name}</h2></div><button className={styles.iconButton} type="button" aria-label="关闭文件预览" title="关闭" onClick={onClosePreview}><X aria-hidden="true" size={17} /></button></header><div className={styles.previewBody}><div className={styles.previewCanvas}><File aria-hidden="true" size={30} /><strong>{previewItem.status === 'ready' ? '文件预览' : SPACE_FILE_STATUS_LABELS[previewItem.status]}</strong><span>{previewItem.status === 'ready' ? '这里仅展示预览壳，未加载真实文件内容。' : getSpaceItemAction(previewItem).feedback}</span></div><dl className={styles.fileFacts}><div><dt>修改时间</dt><dd>{formatSpaceDate(previewItem.updatedAt)}</dd></div><div><dt>大小</dt><dd>{previewItem.sizeLabel}</dd></div><div><dt>能力</dt><dd>{previewItem.capabilities.map((capability) => SPACE_FILE_CAPABILITY_LABELS[capability]).join('、')}</dd></div></dl></div><footer>{!previewItem.capabilities.includes('no-external-share') ? <button className={styles.secondaryButton} type="button" onClick={() => onPlaceholder('转发入口已保留，未打开选人或真实发送流程。')}><ArrowRight aria-hidden="true" size={15} />转发</button> : null}{previewItem.extension === 'PNG' ? <button className={styles.secondaryButton} type="button" onClick={() => onPlaceholder('保存到相册未接入真实文件或系统相册服务。')}><Download aria-hidden="true" size={15} />保存到相册</button> : null}{previewItem.extension === 'PNG' ? <button className={styles.secondaryButton} type="button" onClick={() => onPlaceholder('编辑图片未连接真实图片编辑器。')}><Pencil aria-hidden="true" size={15} />编辑图片</button> : null}{previewItem.extension === 'EDB' ? <button className={styles.secondaryButton} type="button" onClick={() => onPlaceholder('板书编辑未连接真实编辑器。')}><MonitorUp aria-hidden="true" size={15} />编辑板书</button> : null}{previewItem.status === 'ready' && previewItem.capabilities.includes('classroom-openable') ? <button className={styles.primaryButton} type="button" onClick={() => onPlaceholder('课堂打开未连接真实课堂引擎。')}><BookOpen aria-hidden="true" size={15} />课堂打开</button> : null}</footer></aside> : null}
    {newFolderPanel}
    {deleteDialog}
  </section>;
}
