import { useState, type ReactNode } from 'react';
import { OpenCourseSessionContext } from './open-course-session-context';
import {
  createOpenCourseSessionStore,
  type OpenCourseSessionStore,
} from './open-course-session-store';

export function OpenCourseWorkspaceProvider({
  children,
  store,
}: {
  children: ReactNode;
  store?: OpenCourseSessionStore;
}) {
  const [internalStore] = useState(createOpenCourseSessionStore);
  return (
    <OpenCourseSessionContext.Provider value={store ?? internalStore}>
      {children}
    </OpenCourseSessionContext.Provider>
  );
}
