import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MessageWorkspaceProvider } from './MessageWorkspaceProvider';
import { useMessageWorkspaceStore } from './message-workspace-store';

function MessageSessionProbe() {
  const { state, actions } = useMessageWorkspaceStore();
  if (state.status !== 'ready') return null;
  const { threads } = state;
  const thread = threads.find(({ id }) => id === 'class-physics-3');

  return (
    <>
      <output aria-label="老师班级消息未读">{thread?.unreadByRole.teacher ?? 0}</output>
      <output aria-label="学生班级消息未读">{thread?.unreadByRole['student-family'] ?? 0}</output>
      <button
        type="button"
        onClick={() => thread && actions.readThread('teacher', thread.id)}
      >
        阅读班级消息
      </button>
    </>
  );
}

describe('message workspace provider', () => {
  it('shares one role-isolated message session across consumers', async () => {
    const user = userEvent.setup();
    render(
      <MessageWorkspaceProvider>
        <MessageSessionProbe />
        <MessageSessionProbe />
      </MessageWorkspaceProvider>,
    );

    expect(screen.getAllByLabelText('老师班级消息未读').map(({ textContent }) => textContent)).toEqual(['1', '1']);
    expect(screen.getAllByLabelText('学生班级消息未读').map(({ textContent }) => textContent)).toEqual(['3', '3']);
    await user.click(screen.getAllByRole('button', { name: '阅读班级消息' })[0]!);
    expect(screen.getAllByLabelText('老师班级消息未读').map(({ textContent }) => textContent)).toEqual(['0', '0']);
    expect(screen.getAllByLabelText('学生班级消息未读').map(({ textContent }) => textContent)).toEqual(['3', '3']);
  });
});
