import { TaskTodoWorkspace } from '@features/task-todo-workspace/TaskTodoWorkspace';
import { useParams } from 'react-router-dom';

export function StudentTodosPage() {
  const { taskId } = useParams();
  return <TaskTodoWorkspace role="student-family" detailId={taskId} />;
}
