import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { RoleSessionProvider } from './RoleSessionProvider';
import { ROLE_STORAGE_KEY, useRoleSession } from './role-session';

function SessionProbe() {
  const { role, selectRole, switchRole, logout } = useRoleSession();
  return (
    <div>
      <output>{role ?? 'none'}</output>
      <button type="button" onClick={() => selectRole('teacher')}>select teacher</button>
      <button type="button" onClick={switchRole}>switch</button>
      <button type="button" onClick={logout}>logout</button>
    </div>
  );
}

describe('RoleSessionProvider', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('persists selection, switches role and clears the session on logout', async () => {
    const user = userEvent.setup();
    render(<RoleSessionProvider><SessionProbe /></RoleSessionProvider>);

    expect(screen.getByRole('status')).toHaveTextContent('none');
    await user.click(screen.getByRole('button', { name: 'select teacher' }));
    expect(screen.getByRole('status')).toHaveTextContent('teacher');
    expect(window.sessionStorage.getItem(ROLE_STORAGE_KEY)).toBe('teacher');

    await user.click(screen.getByRole('button', { name: 'switch' }));
    expect(screen.getByRole('status')).toHaveTextContent('student-family');
    expect(window.sessionStorage.getItem(ROLE_STORAGE_KEY)).toBe('student-family');

    await user.click(screen.getByRole('button', { name: 'logout' }));
    expect(screen.getByRole('status')).toHaveTextContent('none');
    expect(window.sessionStorage.getItem(ROLE_STORAGE_KEY)).toBeNull();
  });

  it('ignores an invalid persisted role', () => {
    window.sessionStorage.setItem(ROLE_STORAGE_KEY, 'admin');
    render(<RoleSessionProvider><SessionProbe /></RoleSessionProvider>);
    expect(screen.getByRole('status')).toHaveTextContent('none');
  });
});
