import type { TaskFileReference } from '@domain/workbuddy/task-assembly';

export type TaskFileCatalogSource = 'my-files' | 'classin-space';

export type TaskFileCatalogQuery = Readonly<{
  source: TaskFileCatalogSource;
  query: string;
}>;

export type TaskFileCatalogResult =
  | Readonly<{ outcome: 'loaded'; items: readonly TaskFileReference[] }>
  | Readonly<{ outcome: 'permission_denied'; message: string }>
  | Readonly<{ outcome: 'recoverable_failure'; message: string }>;

export type TaskMaterialCatalogPort = Readonly<{
  list(input: TaskFileCatalogQuery): Promise<TaskFileCatalogResult>;
}>;

export type LocalTaskFileCandidate = Readonly<{
  name: string;
  type: string;
  size: number;
  lastModified: number;
}>;

export type LocalTaskFileValidation =
  | Readonly<{ ok: true; reference: TaskFileReference }>
  | Readonly<{ ok: false; reason: 'unsupported' | 'too_large' | 'read_error'; message: string }>;
