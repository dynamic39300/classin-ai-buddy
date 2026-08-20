import type {
  ResourceSortKey,
  SpaceSortKey,
  SpaceSurface,
} from '@domain/space/space';

export type DriveView = 'list' | 'grid';
export type ResourceTab = 'all' | 'mine';

export type SpaceRouteState = {
  parentId: string | null;
  query: string;
  driveSort: SpaceSortKey;
  resourceSort: ResourceSortKey;
  view: DriveView;
  resourceTab: ResourceTab;
};

const DRIVE_SORTS: ReadonlyArray<SpaceSortKey> = ['name', 'updated', 'size'];
const RESOURCE_SORTS: ReadonlyArray<ResourceSortKey> = ['latest', 'name'];

function isOneOf<Value extends string>(
  value: string | null,
  options: ReadonlyArray<Value>,
): value is Value {
  return value !== null && options.some((option) => option === value);
}

export function parseSpaceRouteState(
  surface: SpaceSurface,
  params: URLSearchParams,
): SpaceRouteState {
  const isDrive = surface === 'my-drive' || surface === 'organization-drive';
  const sort = params.get('sort');
  const view = params.get('view');
  const resourceTab = params.get('resourceTab');
  const parentId = params.get('parentId')?.trim() || null;

  return {
    parentId: isDrive ? parentId : null,
    query: params.get('q') ?? '',
    driveSort: isDrive && isOneOf(sort, DRIVE_SORTS) ? sort : 'name',
    resourceSort: surface === 'resource-center' && isOneOf(sort, RESOURCE_SORTS)
      ? sort
      : 'latest',
    view: isDrive && (view === 'list' || view === 'grid') ? view : 'list',
    resourceTab: surface === 'resource-center' && (resourceTab === 'all' || resourceTab === 'mine')
      ? resourceTab
      : 'all',
  };
}
