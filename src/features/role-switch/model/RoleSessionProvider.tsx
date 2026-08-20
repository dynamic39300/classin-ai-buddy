import { useCallback, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { getOtherRole, parseAppRole } from '@domain/account/role';
import type { AppRole } from '@domain/account/role';
import { ROLE_STORAGE_KEY, RoleSessionContext } from './role-session';

function readStoredRole(): AppRole | null {
  try {
    return parseAppRole(window.sessionStorage.getItem(ROLE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStoredRole(role: AppRole | null): void {
  try {
    if (role === null) {
      window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(ROLE_STORAGE_KEY, role);
    }
  } catch {
    // The in-memory session remains usable when storage is unavailable.
  }
}

export function RoleSessionProvider({ children }: PropsWithChildren) {
  const [role, setRole] = useState<AppRole | null>(readStoredRole);

  const selectRole = useCallback((nextRole: AppRole) => {
    writeStoredRole(nextRole);
    setRole(nextRole);
  }, []);

  const switchRole = useCallback(() => {
    setRole((currentRole) => {
      if (currentRole === null) return null;
      const nextRole = getOtherRole(currentRole);
      writeStoredRole(nextRole);
      return nextRole;
    });
  }, []);

  const logout = useCallback(() => {
    writeStoredRole(null);
    setRole(null);
  }, []);

  const value = useMemo(
    () => ({ role, selectRole, switchRole, logout }),
    [logout, role, selectRole, switchRole],
  );

  return <RoleSessionContext.Provider value={value}>{children}</RoleSessionContext.Provider>;
}
