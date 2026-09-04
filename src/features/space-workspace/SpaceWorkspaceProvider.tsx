import { useMemo, useState, type ReactNode } from 'react';
import { CATALOG_RESOURCES, SPACE_ITEMS } from '@mocks/scenarios/space';
import { SpaceWorkspaceContext } from './space-workspace-store';

export function SpaceWorkspaceProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState(SPACE_ITEMS);
  const [acquiredResourceIds, setAcquiredResourceIds] = useState<ReadonlySet<string>>(new Set(['resource-reading']));
  const value = useMemo(
    () => ({ items, acquiredResourceIds, catalogResources: CATALOG_RESOURCES, setItems, setAcquiredResourceIds }),
    [acquiredResourceIds, items],
  );
  return <SpaceWorkspaceContext.Provider value={value}>{children}</SpaceWorkspaceContext.Provider>;
}
