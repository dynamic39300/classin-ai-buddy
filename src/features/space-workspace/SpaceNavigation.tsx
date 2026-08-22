import {
  Archive,
  FileQuestion,
  Folder,
  LibraryBig,
  type LucideIcon,
} from 'lucide-react';
import {
  SPACE_SURFACE_LABELS,
  SPACE_SURFACES,
  type SpaceSurface,
} from '@domain/space/space';
import styles from './SpaceWorkspace.module.css';

const SURFACE_ICONS: Record<SpaceSurface, LucideIcon> = {
  'my-drive': Folder,
  'organization-drive': LibraryBig,
  teacherin: Archive,
  'question-bank': FileQuestion,
};

export function SpaceNavigation({ active, onOpen }: { active: SpaceSurface; onOpen: (surface: SpaceSurface) => void }) {
  return (
    <nav className={styles.topTabs} role="tablist" aria-label="空间栏目">
      {SPACE_SURFACES.map((entry) => {
        const Icon = SURFACE_ICONS[entry];
        return (
          <button type="button" role="tab" aria-selected={active === entry} key={entry} onClick={() => onOpen(entry)}>
            <Icon aria-hidden="true" size={16} />
            {SPACE_SURFACE_LABELS[entry]}
          </button>
        );
      })}
    </nav>
  );
}
