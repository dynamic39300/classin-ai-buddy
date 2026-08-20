import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { HomeworkFormValues } from '@domain/homework/homework';
import { TeacherHomeworkEditorWorkspace } from '@features/homework-workspace';
import { useClassWorkspaceStore } from '@features/class-workspace/class-workspace-store';
import { buildHomeworkClassOptions } from './homework-context';

export function TeacherHomeworkCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { classes } = useClassWorkspaceStore();
  const classOptions = useMemo(() => buildHomeworkClassOptions(classes), [classes]);
  const query = searchParams.toString();
  const initialValues = useMemo<Pick<HomeworkFormValues, 'classId' | 'courseId' | 'unitId'>>(() => ({
    classId: searchParams.get('class'),
    courseId: searchParams.get('course'),
    unitId: searchParams.get('unit'),
  }), [searchParams]);
  const source = searchParams.get('source');
  const returnPath = source === 'class_unit' && searchParams.get('class')
    ? `/teacher/classes/${searchParams.get('class')}?view=directory${searchParams.get('course') ? `&course=${encodeURIComponent(searchParams.get('course') ?? '')}` : ''}`
    : source === 'teacher_schedule'
      ? `/teacher/schedule?${new URLSearchParams({ date: searchParams.get('date') ?? '', event: searchParams.get('event') ?? '', ...(searchParams.get('view') ? { view: searchParams.get('view') ?? '' } : {}) }).toString()}`
      : '/teacher/tasks';
  return (
    <TeacherHomeworkEditorWorkspace
      initialValues={initialValues}
      classOptions={classOptions}
      onBack={() => navigate(returnPath)}
      onComplete={(homeworkId) => navigate(`/teacher/homework/${homeworkId}${query ? `?${query}` : ''}`)}
    />
  );
}
