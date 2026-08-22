import { Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { AppRole } from '@domain/account/role';
import { BoundaryDialog } from '@app/shell/BoundaryDialog';
import {
  buildSpacePath,
  canAddFolder,
  canCreateOrganizationFolder,
  canTransferToMyDrive,
  createTransferredCopy,
  deleteSpaceItems,
  searchCatalogResources,
  getSpaceItems,
  validateFolderName,
  type OrganizationPermission,
  type SpaceFile,
  type SpaceItemAction,
  type SpaceItem,
  type SpaceSurface,
} from '@domain/space/space';
import { ORGANIZATION_ROOT_PERMISSION, SPACE_NOW, SPACE_SELF_USER_ID } from '@mocks/scenarios/space';
import { useSpaceWorkspaceStore } from './space-workspace-store';
import { parseSpaceRouteState, type SpaceRouteState } from './space-route-state';
import { SpaceNavigation } from './SpaceNavigation';
import { MyDriveWorkspace } from './MyDriveWorkspace';
import { OrganizationDriveWorkspace } from './OrganizationDriveWorkspace';
import { QuestionBankPlaceholder } from './QuestionBankPlaceholder';
import { ResourceCenterWorkspace } from './ResourceCenterWorkspace';
import styles from './SpaceWorkspace.module.css';

type SpaceWorkspaceProps = { role: AppRole; surface: SpaceSurface };

export function SpaceWorkspace({ role, surface }: SpaceWorkspaceProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { items, catalogResources, acquiredResourceIds, setItems, setAcquiredResourceIds } = useSpaceWorkspaceStore();
  const locatedFileId = searchParams.get('file');
  const locatedFile = locatedFileId
    ? items.find((item) => item.id === locatedFileId && item.kind === 'file' && item.scope === 'personal')
    : undefined;
  const teacherInDraftId = searchParams.get('draft');
  const teacherInDraft = teacherInDraftId ? {
    id: teacherInDraftId,
    title: searchParams.get('title')?.trim() || 'WorkBuddy 作品草稿',
    source: searchParams.get('source') === 'workbuddy' ? 'workbuddy' as const : 'teacherin' as const,
  } : null;
  const folderSequence = useRef(0);
  const transferSequence = useRef(0);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set(locatedFile ? [locatedFile.id] : []));
  const [previewItem, setPreviewItem] = useState<SpaceFile | null>(null);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderError, setFolderError] = useState<string | null>(null);
  const [deleteGuard, setDeleteGuard] = useState(false);
  const [supplementMenuOpen, setSupplementMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(() => locatedFileId
    ? locatedFile ? `已在空间中定位“${locatedFile.name}”。` : '未能在当前空间中定位这份 WorkBuddy 产物。'
    : null);
  const [placeholderDialog, setPlaceholderDialog] = useState<string | null>(null);

  const routeState = useMemo(() => parseSpaceRouteState(surface, searchParams), [searchParams, surface]);
  const updateRouteState = (updates: Partial<SpaceRouteState>) => {
    const next = new URLSearchParams(searchParams);
    const setOrDelete = (key: string, value: string | null) => { if (value) next.set(key, value); else next.delete(key); };
    if ('parentId' in updates) setOrDelete('parentId', updates.parentId ?? null);
    if ('query' in updates) setOrDelete('q', updates.query ?? '');
    if ('driveSort' in updates) setOrDelete('sort', updates.driveSort === 'name' ? null : updates.driveSort ?? null);
    if ('resourceSort' in updates) setOrDelete('sort', updates.resourceSort === 'latest' ? null : updates.resourceSort ?? null);
    if ('view' in updates) setOrDelete('view', updates.view === 'list' ? null : updates.view ?? null);
    if ('resourceTab' in updates) setOrDelete('resourceTab', updates.resourceTab === 'all' ? null : updates.resourceTab ?? null);
    setSearchParams(next);
  };

  const driveSurface: Extract<SpaceSurface, 'my-drive' | 'organization-drive'> = surface === 'organization-drive' ? 'organization-drive' : 'my-drive';
  const hasValidParent = routeState.parentId === null || items.some((item) => item.kind === 'folder' && item.id === routeState.parentId && item.scope === (driveSurface === 'organization-drive' ? 'organization' : 'personal') && item.permission !== 'hidden');
  const parentId = hasValidParent ? routeState.parentId : null;
  useEffect(() => {
    if (hasValidParent || routeState.parentId === null) return;
    const next = new URLSearchParams(searchParams);
    next.delete('parentId');
    setSearchParams(next, { replace: true });
  }, [hasValidParent, routeState.parentId, searchParams, setSearchParams]);
  const currentFolder = parentId ? items.find((item) => item.id === parentId && item.kind === 'folder') : undefined;
  const currentPermission: OrganizationPermission = currentFolder?.permission ?? ORGANIZATION_ROOT_PERMISSION;
  const visibleItems = useMemo(() => getSpaceItems(items, driveSurface, parentId, routeState.query, routeState.driveSort), [driveSurface, items, parentId, routeState.driveSort, routeState.query]);
  const path = useMemo(() => buildSpacePath(items, parentId), [items, parentId]);
  const catalogList = useMemo(() => searchCatalogResources(catalogResources, { query: routeState.query, sort: routeState.resourceSort }), [catalogResources, routeState.query, routeState.resourceSort]);
  const mineList = useMemo(() => catalogResources.filter(({ id }) => acquiredResourceIds.has(id)), [acquiredResourceIds, catalogResources]);

  if (role !== 'teacher') return null;

  const openSurface = (nextSurface: SpaceSurface) => navigate(nextSurface === 'my-drive' ? '/teacher/space' : `/teacher/space/${nextSurface}`);
  const moveToDirectory = (id: string | null) => { updateRouteState({ parentId: id, query: '' }); setSelectedIds(new Set()); };
  const toggleSelected = (id: string) => { setDeleteGuard(false); setSelectedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const openNewFolder = () => { setNewMenuOpen(false); setNewFolderOpen(true); setFolderError(null); };
  const createFolder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateFolderName(newFolderName);
    if (validation) { setFolderError(validation); return; }
    const scope = driveSurface === 'organization-drive' ? 'organization' : 'personal';
    if (!canAddFolder(items, scope)) { setFolderError('文件夹总数已达到 2000 个上限。'); return; }
    if (scope === 'organization' && !canCreateOrganizationFolder(currentPermission)) { setFolderError('当前节点没有新建文件夹权限。'); return; }
    const name = newFolderName.trim();
    folderSequence.current += 1;
    setItems((current) => [...current, { id: `space-folder-${SPACE_NOW.getTime()}-${folderSequence.current}`, parentId, kind: 'folder', name, updatedAt: SPACE_NOW.toISOString(), scope, ownerId: SPACE_SELF_USER_ID, permission: scope === 'organization' ? currentPermission : undefined, description: '在本地 Demo 中创建的文件夹。' }]);
    setNewFolderName(''); setNewFolderOpen(false); setFolderError(null); setFeedback('文件夹已创建，当前变更仅保存在本地 Demo。');
  };
  const confirmDelete = () => { setItems((current) => deleteSpaceItems(current, selectedIds)); setSelectedIds(new Set()); setDeleteGuard(false); setFeedback('已删除选中内容及其子项；本地 Demo 不提供恢复。'); };
  const acquireResource = (id: string) => { if (acquiredResourceIds.has(id)) { setFeedback('已在我的资源。'); return; } setAcquiredResourceIds((current) => new Set(current).add(id)); setFeedback('获取成功，资源已加入我的资源。'); };
  const transferToMyDrive = (item: SpaceItem) => {
    if (!canTransferToMyDrive(item)) return;
    transferSequence.current += 1;
    setItems((current) => [...current, createTransferredCopy(item, `transferred-${item.id}-${SPACE_NOW.getTime()}-${transferSequence.current}`, SPACE_SELF_USER_ID, SPACE_NOW.toISOString())]);
    setFeedback(`已将“${item.name}”作为新副本转存到我的云盘。`);
  };
  const handleItemAction = (item: SpaceItem, action: SpaceItemAction) => {
    if (!action.enabled) { setFeedback(action.disabledReason ?? '当前操作不可用。'); return; }
    if (action.id === 'open' && item.kind === 'folder') { moveToDirectory(item.id); return; }
    if (action.id === 'preview' && item.kind === 'file') { setPreviewItem(item); return; }
    if (action.id === 'transfer') { transferToMyDrive(item); return; }
    if (action.id === 'delete') { setSelectedIds(new Set([item.id])); setDeleteGuard(true); return; }
    setFeedback(action.feedback ?? '当前状态暂无更多操作。');
  };
  const placeholder = (message: string) => setPlaceholderDialog(`Placeholder：${message}`);
  const newFolderPanel = newFolderOpen ? <aside className={styles.createPanel} aria-label="新建文件夹面板"><header><div><span className={styles.eyebrow}>空间操作</span><h2>新建文件夹</h2></div><button className={styles.iconButton} type="button" aria-label="关闭新建文件夹面板" title="关闭" onClick={() => setNewFolderOpen(false)}><X aria-hidden="true" size={17} /></button></header><form onSubmit={createFolder}><label>文件夹名称<input autoFocus value={newFolderName} onChange={(event) => { setNewFolderName(event.target.value); setFolderError(null); }} placeholder="例如：周末课堂资料" /></label>{folderError ? <p className={styles.errorText} role="alert">{folderError}</p> : null}<p>文件夹总数不超过 2000 个；本次变更只写入本地 Demo。</p><footer><button className={styles.secondaryButton} type="button" onClick={() => setNewFolderOpen(false)}>取消</button><button className={styles.primaryButton} type="submit" disabled={!newFolderName.trim()}>创建</button></footer></form></aside> : null;
  const deleteDialog = deleteGuard ? <div className={styles.dialogBackdrop}><section className={styles.confirmDialog} role="dialog" aria-modal="true" aria-labelledby="delete-title"><Trash2 aria-hidden="true" size={22} /><div><h2 id="delete-title">确认删除</h2><p>删除后不可恢复，确定删除 {selectedIds.size} 项？文件夹内子项将一并删除。</p></div><footer><button className={styles.secondaryButton} type="button" onClick={() => setDeleteGuard(false)}>取消</button><button className={styles.dangerButton} type="button" onClick={confirmDelete}>确认删除</button></footer></section></div> : null;
  const driveProps = { path, currentPermission, visibleItems, routeState, updateRouteState, selectedIds, onToggleSelected: toggleSelected, onDeleteRequest: () => setDeleteGuard(true), onOpenDirectory: moveToDirectory, onItemAction: handleItemAction, onPlaceholder: placeholder, newMenuOpen, onToggleNewMenu: () => setNewMenuOpen((current) => !current), onOpenNewFolder: openNewFolder, supplementMenuOpen, onToggleSupplementMenu: () => setSupplementMenuOpen((current) => !current), previewItem, onClosePreview: () => setPreviewItem(null), newFolderPanel, deleteDialog, feedback };

  return <div className={styles.page}><SpaceNavigation active={surface} onOpen={openSurface} />{surface === 'my-drive' ? <MyDriveWorkspace {...driveProps} /> : surface === 'organization-drive' ? <OrganizationDriveWorkspace {...driveProps} /> : surface === 'teacherin' ? <ResourceCenterWorkspace draft={teacherInDraft} routeState={routeState} updateRouteState={updateRouteState} catalogList={catalogList} mineList={mineList} acquiredResourceIds={acquiredResourceIds} onAcquire={acquireResource} feedback={feedback} /> : <QuestionBankPlaceholder />}{<BoundaryDialog description={placeholderDialog} onClose={() => setPlaceholderDialog(null)} />}</div>;
}
