import type { ClassRecord } from '@domain/class/class';
import type { HomeworkClassOption } from '@domain/homework/homework';

export function buildHomeworkClassOptions(classes: ReadonlyArray<ClassRecord>): HomeworkClassOption[] {
  return classes
    .filter(({ visibleTo }) => visibleTo.includes('teacher'))
    .map((record) => ({
      id: record.id,
      name: record.name,
      courses: record.courses.filter(({ status }) => status === 'active').map((course) => ({
        id: course.id,
        name: course.name,
        units: course.units.map((unit) => ({ id: unit.id, name: unit.title })),
      })),
    }));
}
