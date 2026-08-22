import type { AppRole } from '@domain/account/role';

export type SpaceSurface = 'my-drive' | 'organization-drive' | 'teacherin' | 'question-bank';
export type SpaceScope = 'personal' | 'organization';
export type SpaceFileStatus = 'ready' | 'converting' | 'failed';
export type SpaceFileCapability = 'classroom-openable' | 'storage-only' | 'no-external-share';
export type OrganizationPermission = 'manage' | 'operate' | 'view' | 'hidden';
export type SpaceSortKey = 'name' | 'updated' | 'size';
export type ResourceSortKey = 'latest' | 'name';

type SpaceItemBase = {
  id: string;
  parentId: string | null;
  name: string;
  updatedAt: string;
  scope: SpaceScope;
  ownerId: string;
  permission?: OrganizationPermission;
  allowTransfer?: boolean;
  description: string;
};

export type SpaceFolder = SpaceItemBase & {
  kind: 'folder';
};

export type SpaceFile = SpaceItemBase & {
  kind: 'file';
  extension: string;
  sizeBytes: number;
  sizeLabel: string;
  status: SpaceFileStatus;
  capabilities: readonly SpaceFileCapability[];
};

export type SpaceItem = SpaceFolder | SpaceFile;

export type SpaceItemActionId = 'open' | 'preview' | 'view-status' | 'view-failure' | 'transfer' | 'delete';

export type SpaceItemAction = {
  id: SpaceItemActionId;
  label: string;
  enabled: boolean;
  feedback?: string;
  disabledReason?: string;
};

export type CatalogResource = {
  id: string;
  title: string;
  stage: string;
  subject: string;
  publisher: string;
  format: string;
  description: string;
  tags: readonly string[];
  classIds: readonly string[];
  updatedAt: string;
};

export type CatalogFilter = {
  stage: string;
  subject: string;
  publisher: string;
  query?: string;
  sort?: ResourceSortKey;
};

export const SPACE_LIMITS = {
  maxFoldersTotal: 2000,
  maxFilesPerDirectory: 300,
} as const;

export const SPACE_SURFACES: readonly SpaceSurface[] = [
  'my-drive',
  'organization-drive',
  'teacherin',
  'question-bank',
];

export const SPACE_SURFACE_LABELS: Record<SpaceSurface, string> = {
  'my-drive': '我的云盘',
  'organization-drive': '组织云盘',
  teacherin: 'TeacherIn',
  'question-bank': '题库中心',
};

export const SPACE_FILE_STATUS_LABELS: Record<SpaceFileStatus, string> = {
  ready: '可使用',
  converting: '转换中',
  failed: '处理失败',
};

export const SPACE_FILE_CAPABILITY_LABELS: Record<SpaceFileCapability, string> = {
  'classroom-openable': '可课堂打开',
  'storage-only': '仅存储',
  'no-external-share': '不可外部分享',
};

export const ORGANIZATION_PERMISSION_LABELS: Record<OrganizationPermission, string> = {
  manage: '可管理',
  operate: '可操作',
  view: '仅查看',
  hidden: '不可见',
};

function compareSpaceItems(left: SpaceItem, right: SpaceItem, sort: SpaceSortKey): number {
  if (left.kind !== right.kind) return left.kind === 'folder' ? -1 : 1;
  if (sort === 'updated') return right.updatedAt.localeCompare(left.updatedAt);
  if (sort === 'size') {
    const leftSize = left.kind === 'file' ? left.sizeBytes : 0;
    const rightSize = right.kind === 'file' ? right.sizeBytes : 0;
    return rightSize - leftSize || left.name.localeCompare(right.name, 'zh-CN');
  }
  return left.name.localeCompare(right.name, 'zh-CN');
}

export function getSpaceItems(
  items: ReadonlyArray<SpaceItem>,
  surface: Extract<SpaceSurface, 'my-drive' | 'organization-drive'>,
  parentId: string | null,
  query = '',
  sort: SpaceSortKey = 'name',
): SpaceItem[] {
  const scope: SpaceScope = surface === 'organization-drive' ? 'organization' : 'personal';
  const normalized = query.trim().toLocaleLowerCase();
  return items
    .filter((item) => {
      if (item.scope !== scope || item.parentId !== parentId || item.permission === 'hidden') return false;
      if (!normalized) return true;
      const extension = item.kind === 'file' ? item.extension : '';
      return `${item.name} ${extension}`.toLocaleLowerCase().includes(normalized);
    })
    .sort((left, right) => compareSpaceItems(left, right, sort));
}

export function buildSpacePath(items: ReadonlyArray<SpaceItem>, parentId: string | null): SpaceFolder[] {
  const path: SpaceFolder[] = [];
  const visited = new Set<string>();
  let currentId = parentId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const current = items.find((item): item is SpaceFolder => item.id === currentId && item.kind === 'folder');
    if (!current) break;
    path.unshift(current);
    currentId = current.parentId;
  }
  return path;
}

export function validateFolderName(name: string): string | null {
  return name.trim() ? null : '文件夹名称不能为空。';
}

export function canAddFolder(items: ReadonlyArray<SpaceItem>, scope: SpaceScope): boolean {
  return items.filter((item) => item.scope === scope && item.kind === 'folder').length < SPACE_LIMITS.maxFoldersTotal;
}

export function canAddFile(items: ReadonlyArray<SpaceItem>, scope: SpaceScope, parentId: string | null): boolean {
  return items.filter((item) => item.scope === scope && item.parentId === parentId && item.kind === 'file').length < SPACE_LIMITS.maxFilesPerDirectory;
}

export function canCreateOrganizationFolder(permission: OrganizationPermission): boolean {
  return permission === 'manage' || permission === 'operate';
}

export function canDeleteSpaceItem(item: SpaceItem, selfUserId: string): boolean {
  if (item.scope === 'personal') return true;
  if (item.permission === 'manage') return true;
  return item.permission === 'operate' && item.kind === 'file' && item.ownerId === selfUserId;
}

export function canTransferToMyDrive(item: SpaceItem): item is SpaceFile {
  if (item.scope !== 'organization' || item.kind !== 'file' || item.permission === 'hidden') return false;
  return item.permission === 'manage' || item.allowTransfer === true;
}

export function collectDescendantIds(items: ReadonlyArray<SpaceItem>, rootIds: Iterable<string>): Set<string> {
  const ids = new Set(rootIds);
  let changed = true;
  while (changed) {
    changed = false;
    items.forEach((item) => {
      if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
        ids.add(item.id);
        changed = true;
      }
    });
  }
  return ids;
}

export function deleteSpaceItems(items: ReadonlyArray<SpaceItem>, rootIds: Iterable<string>): SpaceItem[] {
  const removedIds = collectDescendantIds(items, rootIds);
  return items.filter((item) => !removedIds.has(item.id));
}

export function createTransferredCopy(
  source: SpaceFile,
  copyId: string,
  ownerId: string,
  updatedAt: string,
): SpaceFile {
  return {
    ...source,
    id: copyId,
    parentId: null,
    scope: 'personal',
    ownerId,
    permission: undefined,
    allowTransfer: undefined,
    updatedAt,
    description: `从组织云盘转存的副本。${source.description}`,
  };
}

export function filterCatalogResources(
  resources: ReadonlyArray<CatalogResource>,
  filter: CatalogFilter,
): CatalogResource[] {
  const normalized = filter.query?.trim().toLocaleLowerCase() ?? '';
  return resources
    .filter((resource) => (
      resource.stage === filter.stage
      && resource.subject === filter.subject
      && resource.publisher === filter.publisher
      && (!normalized || [resource.title, ...resource.tags].join(' ').toLocaleLowerCase().includes(normalized))
    ))
    .sort((left, right) => filter.sort === 'name'
      ? left.title.localeCompare(right.title, 'zh-CN')
      : right.updatedAt.localeCompare(left.updatedAt));
}

export function searchCatalogResources(
  resources: ReadonlyArray<CatalogResource>,
  filter: Pick<CatalogFilter, 'query' | 'sort'> = {},
): CatalogResource[] {
  const normalized = filter.query?.trim().toLocaleLowerCase() ?? '';
  return resources
    .filter((resource) => !normalized || [resource.title, ...resource.tags].join(' ').toLocaleLowerCase().includes(normalized))
    .sort((left, right) => filter.sort === 'name'
      ? left.title.localeCompare(right.title, 'zh-CN')
      : right.updatedAt.localeCompare(left.updatedAt));
}

export function getUniqueCatalogValues(
  resources: ReadonlyArray<CatalogResource>,
  key: 'stage' | 'subject' | 'publisher',
  constraints: Partial<Pick<CatalogResource, 'stage' | 'subject'>> = {},
): string[] {
  return [...new Set(resources
    .filter((resource) => (!constraints.stage || resource.stage === constraints.stage)
      && (!constraints.subject || resource.subject === constraints.subject))
    .map((resource) => resource[key]))];
}

export function getAuthorizedResources(
  role: AppRole,
  classId: string,
  resources: ReadonlyArray<CatalogResource>,
): CatalogResource[] {
  if (role !== 'student-family') return [];
  return resources.filter(({ classIds }) => classIds.includes(classId));
}

export function getSpaceItemAction(item: SpaceItem): { label: string; feedback: string } {
  if (item.kind === 'folder') return { label: '打开文件夹', feedback: '' };
  if (item.status === 'converting') return { label: '查看状态', feedback: '文件仍在转换中，完成后才可预览。' };
  if (item.status === 'failed') return { label: '查看原因', feedback: '文件处理失败，当前仅保留原始条目。' };
  return { label: '预览文件', feedback: '已打开预览壳；真实文件预览未接入。' };
}

function getDeleteDisabledReason(item: SpaceItem, selfUserId: string): string | undefined {
  if (item.scope === 'personal') return undefined;
  if (item.permission === 'manage') return undefined;
  if (item.permission === 'view') return '当前节点仅查看，不能删除内容。';
  if (item.kind === 'folder') return '可操作节点不能删除文件夹。';
  if (item.ownerId !== selfUserId) return '可操作节点只能删除自己上传的文件。';
  return undefined;
}

function getTransferDisabledReason(item: SpaceFile): string | undefined {
  if (item.allowTransfer === false) return '当前文件未开放转存。';
  if (item.permission === 'view' && !item.allowTransfer) return '当前节点未开放转存。';
  return '当前文件不可转存。';
}

export function getSpaceItemActions(item: SpaceItem, selfUserId: string): SpaceItemAction[] {
  if (item.kind === 'folder') {
    const deleteReason = getDeleteDisabledReason(item, selfUserId);
    return [
      { id: 'open', label: '打开文件夹', enabled: true },
      deleteReason
        ? { id: 'delete', label: '删除', enabled: false, disabledReason: deleteReason }
        : { id: 'delete', label: '删除', enabled: true },
    ];
  }

  const primary: SpaceItemAction = item.status === 'converting'
    ? { id: 'view-status', label: '查看转换状态', enabled: true, feedback: '文件仍在转换中，完成后才可预览。' }
    : item.status === 'failed'
      ? { id: 'view-failure', label: '查看处理失败原因', enabled: true, feedback: '文件处理失败，当前仅保留原始条目。' }
      : { id: 'preview', label: '预览文件', enabled: true };
  const actions: SpaceItemAction[] = [primary];

  if (item.scope === 'organization') {
    actions.push(canTransferToMyDrive(item)
      ? { id: 'transfer', label: '保存为我的云盘副本', enabled: true }
      : { id: 'transfer', label: '保存为我的云盘副本', enabled: false, disabledReason: getTransferDisabledReason(item) });
  }

  const deleteReason = getDeleteDisabledReason(item, selfUserId);
  actions.push(deleteReason
    ? { id: 'delete', label: '删除', enabled: false, disabledReason: deleteReason }
    : { id: 'delete', label: '删除', enabled: true });
  return actions;
}
