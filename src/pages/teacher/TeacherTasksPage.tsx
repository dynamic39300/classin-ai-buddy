import { TaskTodoWorkspace } from '@features/task-todo-workspace/TaskTodoWorkspace';
import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { usePageHeader } from '@app/shell/usePageHeader';
import { TASK_ITEMS } from '@mocks/scenarios/tasks';

export function TeacherTasksPage() {
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const taskTitle = TASK_ITEMS.find(({ id }) => id === taskId)?.title ?? '任务详情';
  const fromHome = searchParams.get('from') === 'home';
  const pageHeader = useMemo(() => taskId
    ? {
        title: taskTitle,
        breadcrumbs: fromHome
          ? [{ label: '首页', to: '/teacher/home' }, { label: taskTitle }]
          : [{ label: '待办', to: '/teacher/tasks' }, { label: taskTitle }],
      }
    : { title: '待办' }, [fromHome, taskId, taskTitle]);
  usePageHeader(pageHeader);
  return <TaskTodoWorkspace role="teacher" detailId={taskId} />;
}
