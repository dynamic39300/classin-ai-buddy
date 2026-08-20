import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { ClassRecord, OpenCourseRecord } from '@domain/class/class';

export type ClassWorkspaceStore = {
  classes: ReadonlyArray<ClassRecord>;
  openCourses: ReadonlyArray<OpenCourseRecord>;
  setClasses: Dispatch<SetStateAction<ReadonlyArray<ClassRecord>>>;
  setOpenCourses: Dispatch<SetStateAction<ReadonlyArray<OpenCourseRecord>>>;
};

export const ClassWorkspaceContext = createContext<ClassWorkspaceStore | null>(null);

export function useClassWorkspaceStore(): ClassWorkspaceStore {
  const store = useContext(ClassWorkspaceContext);
  if (!store) throw new Error('useClassWorkspaceStore must be used within ClassWorkspaceProvider');
  return store;
}
