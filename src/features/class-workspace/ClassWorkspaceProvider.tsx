import { useMemo, useState, type ReactNode } from 'react';
import type { ClassRecord, OpenCourseRecord } from '@domain/class/class';
import { CLASS_RECORDS, OPEN_COURSE_RECORDS } from '@mocks/scenarios/classes';
import { ClassWorkspaceContext } from './class-workspace-store';

export function ClassWorkspaceProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<ReadonlyArray<ClassRecord>>(CLASS_RECORDS);
  const [openCourses, setOpenCourses] = useState<ReadonlyArray<OpenCourseRecord>>(OPEN_COURSE_RECORDS);
  const value = useMemo(
    () => ({ classes, openCourses, setClasses, setOpenCourses }),
    [classes, openCourses],
  );

  return <ClassWorkspaceContext.Provider value={value}>{children}</ClassWorkspaceContext.Provider>;
}
