import type { AppRole } from '@domain/account/role';
import type { ClassRecord, OpenCourseRecord } from '@domain/class/class';
import { getMessageThreadSubtitle, getMessageThreadTitle, type MessageThread } from '@domain/message/message';
import type { ProductTarget } from '@domain/navigation/product-target';
import type { ScheduleEvent } from '@domain/schedule/schedule';
import type { TaskItem } from '@domain/task/task';
import {
  getScheduleTeachingObjectKind,
  getTaskTeachingObjectKind,
  type TeachingObjectKind,
} from '@domain/teaching-object/teaching-object';

export type SearchCategory = 'all' | 'class' | 'open-course' | 'task' | 'schedule' | 'message';
export type SearchDocumentType = Exclude<SearchCategory, 'all'>;

export type SearchDocument = {
  id: string;
  type: SearchDocumentType;
  title: string;
  context: string;
  keywords: string;
  teachingObjectKind: TeachingObjectKind | null;
  target: ProductTarget;
};

export type SearchSources = {
  classes: ReadonlyArray<ClassRecord>;
  openCourses: ReadonlyArray<OpenCourseRecord>;
  tasks: ReadonlyArray<TaskItem>;
  scheduleEvents: ReadonlyArray<ScheduleEvent>;
  messageThreads: ReadonlyArray<MessageThread>;
};

export function buildSearchDocuments(role: AppRole, sources: SearchSources): SearchDocument[] {
  const classes = sources.classes
    .filter(({ visibleTo }) => visibleTo.includes(role))
    .map((record): SearchDocument => ({
      id: `class:${record.id}`,
      type: 'class',
      title: record.name,
      context: `${record.memberCount} 位成员 · ${record.courses.length} 门课程`,
      keywords: record.name,
      teachingObjectKind: 'class',
      target: { kind: 'class', classId: record.id },
    }));
  const openCourses = sources.openCourses
    .filter(({ visibleTo }) => visibleTo.includes(role))
    .map((course): SearchDocument => ({
      id: `open-course:${course.id}`,
      type: 'open-course',
      title: course.title,
      context: `${course.subject} · ${course.instructorName}`,
      keywords: `${course.title} ${course.subject} ${course.instructorName}`,
      teachingObjectKind: 'open-course',
      target: { kind: 'open-course', openCourseId: course.id },
    }));
  const tasks = sources.tasks
    .filter((item) => item.roleState[role] !== undefined)
    .map((item): SearchDocument => ({
      id: `task:${item.id}`,
      type: 'task',
      title: item.title,
      context: `${item.className} · ${item.course}`,
      keywords: `${item.title} ${item.className} ${item.course} ${item.actorName}`,
      teachingObjectKind: getTaskTeachingObjectKind(item.kind),
      target: { kind: 'task', taskId: item.id },
    }));
  const schedule = sources.scheduleEvents
    .filter(({ audience }) => audience === 'both' || audience === role)
    .map((event): SearchDocument => ({
      id: `schedule:${event.id}`,
      type: 'schedule',
      title: event.title,
      context: `${event.date} ${event.startTime} · ${event.course} · ${event.context}`,
      keywords: `${event.title} ${event.course} ${event.context} ${event.date}`,
      teachingObjectKind: getScheduleTeachingObjectKind(event),
      target: { kind: 'schedule-event', eventId: event.id },
    }));
  const messages = sources.messageThreads
    .filter(({ visibleTo }) => visibleTo.includes(role))
    .map((thread): SearchDocument => ({
      id: `message:${thread.id}`,
      type: 'message',
      title: getMessageThreadTitle(role, thread),
      context: getMessageThreadSubtitle(role, thread),
      keywords: `${getMessageThreadTitle(role, thread)} ${getMessageThreadSubtitle(role, thread)} ${thread.entries.at(-1)?.body ?? ''}`,
      teachingObjectKind: null,
      target: { kind: 'message', category: thread.category, threadId: thread.id },
    }));
  return [...classes, ...openCourses, ...tasks, ...schedule, ...messages];
}

function scoreDocument(document: SearchDocument, normalized: string): number {
  const title = document.title.toLocaleLowerCase();
  const context = document.context.toLocaleLowerCase();
  const keywords = document.keywords.toLocaleLowerCase();
  if (!normalized) return 1;
  if (title.startsWith(normalized)) return 4;
  if (title.includes(normalized)) return 3;
  if (context.includes(normalized)) return 2;
  return keywords.includes(normalized) ? 1 : 0;
}

export function searchDocuments(
  documents: ReadonlyArray<SearchDocument>,
  query: string,
  category: SearchCategory = 'all',
  limit = 20,
): SearchDocument[] {
  const normalized = query.trim().toLocaleLowerCase();
  return documents
    .map((document) => ({ document, score: scoreDocument(document, normalized) }))
    .filter(({ document, score }) => score > 0 && (category === 'all' || document.type === category))
    .sort((left, right) => right.score - left.score || left.document.title.localeCompare(right.document.title, 'zh-CN'))
    .slice(0, limit)
    .map(({ document }) => document);
}
