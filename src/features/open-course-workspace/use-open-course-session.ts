import { useContext, useSyncExternalStore } from 'react';
import { OpenCourseSessionContext } from './open-course-session-context';

export function useOpenCourseSession() {
  const store = useContext(OpenCourseSessionContext);
  const joinedCourseIds = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { joinedCourseIds, joinCourse: store.join, resetSession: store.reset };
}
