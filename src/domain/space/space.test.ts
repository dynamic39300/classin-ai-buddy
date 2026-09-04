import { describe, expect, it } from 'vitest';
import { CATALOG_RESOURCES, SPACE_ITEMS, SPACE_SELF_USER_ID } from '@mocks/scenarios/space';
import {
  canAddFile,
  canAddFolder,
  canCreateOrganizationFolder,
  canDeleteSpaceItem,
  canTransferToMyDrive,
  collectDescendantIds,
  createTransferredCopy,
  deleteSpaceItems,
  filterCatalogResources,
  getAuthorizedResources,
  getSpaceItemAction,
  getSpaceItemActions,
  getSpaceItems,
  searchCatalogResources,
  SPACE_LIMITS,
  validateFolderName,
  type SpaceFile,
  type SpaceFolder,
} from './space';

function getItem(id: string) {
  const item = SPACE_ITEMS.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing test item ${id}`);
  return item;
}

describe('space domain', () => {
  it('separates scopes, filters hidden nodes, and searches only current-directory names and extensions', () => {
    const personal = getSpaceItems(SPACE_ITEMS, 'my-drive', null, 'pdf');
    const organization = getSpaceItems(SPACE_ITEMS, 'organization-drive', null);

    expect(personal.map(({ id }) => id)).toEqual(['my-root-pdf']);
    expect(new Set(organization.map(({ id }) => id))).toEqual(new Set(['org-manage-folder', 'org-operate-folder', 'org-view-folder']));
    expect(organization.map(({ id }) => id)).not.toContain('org-hidden-folder');
  });

  it('keeps folders first for every supported sort', () => {
    for (const sort of ['name', 'updated', 'size'] as const) {
      const result = getSpaceItems(SPACE_ITEMS, 'my-drive', null, '', sort);
      expect(result[0]?.kind).toBe('folder');
    }
  });

  it('validates folder and per-directory limits', () => {
    const folders: SpaceFolder[] = Array.from({ length: SPACE_LIMITS.maxFoldersTotal }, (_, index) => ({
      id: `folder-${index}`, parentId: null, kind: 'folder', name: `目录${index}`, updatedAt: '', scope: 'personal', ownerId: SPACE_SELF_USER_ID, description: '',
    }));
    const files: SpaceFile[] = Array.from({ length: SPACE_LIMITS.maxFilesPerDirectory }, (_, index) => ({
      id: `file-${index}`, parentId: null, kind: 'file', name: `文件${index}.txt`, extension: 'TXT', sizeBytes: 1, sizeLabel: '1 B', status: 'ready', capabilities: ['classroom-openable'], updatedAt: '', scope: 'personal', ownerId: SPACE_SELF_USER_ID, description: '',
    }));

    expect(validateFolderName('   ')).toContain('不能为空');
    expect(validateFolderName('备课')).toBeNull();
    expect(canAddFolder(folders, 'personal')).toBe(false);
    expect(canAddFile(files, 'personal', null)).toBe(false);
  });

  it('enforces organization manage, operate, view, and transfer permissions', () => {
    expect(canCreateOrganizationFolder('manage')).toBe(true);
    expect(canCreateOrganizationFolder('operate')).toBe(true);
    expect(canCreateOrganizationFolder('view')).toBe(false);
    expect(canDeleteSpaceItem(getItem('org-operate-folder'), SPACE_SELF_USER_ID)).toBe(false);
    expect(canDeleteSpaceItem(getItem('org-own-file'), SPACE_SELF_USER_ID)).toBe(true);
    expect(canDeleteSpaceItem(getItem('org-other-file'), SPACE_SELF_USER_ID)).toBe(false);
    expect(canDeleteSpaceItem(getItem('org-managed-file'), SPACE_SELF_USER_ID)).toBe(true);
    expect(canTransferToMyDrive(getItem('org-other-file'))).toBe(true);
    expect(canTransferToMyDrive(getItem('org-no-transfer'))).toBe(false);
    expect(canTransferToMyDrive(getItem('org-managed-file'))).toBe(true);
  });

  it('deletes folders recursively and creates a distinct transferred copy on every call', () => {
    expect(collectDescendantIds(SPACE_ITEMS, ['my-root-folder'])).toEqual(new Set(['my-root-folder', 'my-nested-folder', 'my-folder-ppt', 'my-folder-failed', 'my-nested-note']));
    expect(deleteSpaceItems(SPACE_ITEMS, ['my-root-folder']).map(({ id }) => id)).not.toContain('my-nested-note');

    const source = getItem('org-other-file');
    if (source.kind !== 'file') throw new Error('Expected a file');
    const first = createTransferredCopy(source, 'copy-1', SPACE_SELF_USER_ID, '2026-08-09');
    const second = createTransferredCopy(source, 'copy-2', SPACE_SELF_USER_ID, '2026-08-09');
    expect(first.id).not.toBe(second.id);
    expect(first.scope).toBe('personal');
    expect(first.parentId).toBeNull();
  });

  it('filters catalog by the selected path and title or tag, then sorts it', () => {
    const latest = filterCatalogResources(CATALOG_RESOURCES, { stage: '高中', subject: '物理', publisher: 'ClassIn 教研资源', query: '课件', sort: 'latest' });
    const named = filterCatalogResources(CATALOG_RESOURCES, { stage: '高中', subject: '物理', publisher: 'ClassIn 教研资源', query: '复习', sort: 'name' });
    expect(latest.map(({ id }) => id)).toEqual(['resource-momentum']);
    expect(named.map(({ id }) => id)).toEqual(['resource-wave']);
  });

  it('searches and sorts the complete catalog without requiring taxonomy filters', () => {
    expect(searchCatalogResources(CATALOG_RESOURCES, { query: '动量', sort: 'latest' }).map(({ id }) => id)).toEqual(['resource-momentum']);
    expect(searchCatalogResources(CATALOG_RESOURCES, { query: '复习', sort: 'name' }).map(({ id }) => id)).toEqual(['resource-wave']);
    expect(searchCatalogResources(CATALOG_RESOURCES)).toHaveLength(CATALOG_RESOURCES.length);
  });

  it('limits student resources to the visible class and returns status-specific file actions', () => {
    expect(getAuthorizedResources('student-family', 'physics-3', CATALOG_RESOURCES).map(({ id }) => id)).toEqual(['resource-momentum']);
    expect(getAuthorizedResources('teacher', 'physics-3', CATALOG_RESOURCES)).toEqual([]);
    expect(getSpaceItemAction(getItem('my-folder-ppt')).feedback).toContain('转换中');
    expect(getSpaceItemAction(getItem('my-folder-failed')).feedback).toContain('处理失败');
  });

  it('derives file menu actions from object type, scope, permission, and status', () => {
    expect(getSpaceItemActions(getItem('my-root-pdf'), SPACE_SELF_USER_ID)).toEqual([
      { id: 'preview', label: '预览文件', enabled: true },
      { id: 'delete', label: '删除', enabled: true },
    ]);

    expect(getSpaceItemActions(getItem('my-folder-ppt'), SPACE_SELF_USER_ID)[0]).toEqual({
      id: 'view-status',
      label: '查看转换状态',
      enabled: true,
      feedback: '文件仍在转换中，完成后才可预览。',
    });

    expect(getSpaceItemActions(getItem('org-other-file'), SPACE_SELF_USER_ID)).toEqual([
      { id: 'preview', label: '预览文件', enabled: true },
      { id: 'transfer', label: '保存为我的云盘副本', enabled: true },
      {
        id: 'delete',
        label: '删除',
        enabled: false,
        disabledReason: '可操作节点只能删除自己上传的文件。',
      },
    ]);

    expect(getSpaceItemActions(getItem('org-no-transfer'), SPACE_SELF_USER_ID)).toContainEqual({
      id: 'transfer',
      label: '保存为我的云盘副本',
      enabled: false,
      disabledReason: '当前文件未开放转存。',
    });
  });
});
