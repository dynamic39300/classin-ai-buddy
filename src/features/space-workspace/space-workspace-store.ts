import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { CatalogResource, SpaceItem } from '@domain/space/space';

export type SpaceWorkspaceStore = {
  items: ReadonlyArray<SpaceItem>;
  acquiredResourceIds: ReadonlySet<string>;
  catalogResources: ReadonlyArray<CatalogResource>;
  setItems: Dispatch<SetStateAction<ReadonlyArray<SpaceItem>>>;
  setAcquiredResourceIds: Dispatch<SetStateAction<ReadonlySet<string>>>;
};

export const SpaceWorkspaceContext = createContext<SpaceWorkspaceStore | null>(null);

export function useSpaceWorkspaceStore(): SpaceWorkspaceStore {
  const store = useContext(SpaceWorkspaceContext);
  if (!store) throw new Error('useSpaceWorkspaceStore must be used within SpaceWorkspaceProvider');
  return store;
}
