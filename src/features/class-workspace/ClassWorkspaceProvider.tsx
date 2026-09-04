import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ClassRecord, OpenCourseRecord } from '@domain/class/class';
import { CLASS_RECORDS, OPEN_COURSE_RECORDS } from '@mocks/scenarios/classes';
import { ClassWorkspaceContext } from './class-workspace-store';
import { loadClassWorkspaceSession, saveClassWorkspaceSession } from './class-workspace-session';

export function ClassWorkspaceProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<ReadonlyArray<ClassRecord>>(() => loadClassWorkspaceSession(CLASS_RECORDS));
  const [openCourses, setOpenCourses] = useState<ReadonlyArray<OpenCourseRecord>>(OPEN_COURSE_RECORDS);
  const classesRef = useRef(classes);
  useLayoutEffect(() => { classesRef.current = classes; }, [classes]);
  useEffect(() => { saveClassWorkspaceSession(classes); }, [classes]);
  const getClasses = useCallback(() => classesRef.current, []);
  const value = useMemo(
    () => ({ classes, openCourses, getClasses, setClasses, setOpenCourses }),
    [classes, getClasses, openCourses],
  );

  return <ClassWorkspaceContext.Provider value={value}>{children}</ClassWorkspaceContext.Provider>;
}
