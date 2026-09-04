export type OpenCourseSessionStore = {
  getSnapshot: () => ReadonlySet<string>;
  subscribe: (listener: () => void) => () => void;
  join: (courseId: string) => void;
  reset: () => void;
};

export function createOpenCourseSessionStore(initialCourseIds: Iterable<string> = []): OpenCourseSessionStore {
  let joinedCourseIds: ReadonlySet<string> = new Set(initialCourseIds);
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  return {
    getSnapshot: () => joinedCourseIds,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    join: (courseId) => {
      if (joinedCourseIds.has(courseId)) return;
      joinedCourseIds = new Set([...joinedCourseIds, courseId]);
      emit();
    },
    reset: () => {
      joinedCourseIds = new Set();
      emit();
    },
  };
}
