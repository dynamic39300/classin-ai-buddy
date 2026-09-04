import { createContext } from 'react';
import {
  createOpenCourseSessionStore,
  type OpenCourseSessionStore,
} from './open-course-session-store';

export const OpenCourseSessionContext = createContext<OpenCourseSessionStore>(createOpenCourseSessionStore());
