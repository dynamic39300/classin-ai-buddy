import { createContext, useContext } from 'react';
import type { AppRole } from '@domain/account/role';

export const ROLE_STORAGE_KEY = 'classin.pc.demo.role.v1';

export type RoleSession = {
  role: AppRole | null;
  selectRole: (role: AppRole) => void;
  switchRole: () => void;
  logout: () => void;
};

export const RoleSessionContext = createContext<RoleSession | null>(null);

export function useRoleSession(): RoleSession {
  const value = useContext(RoleSessionContext);
  if (value === null) {
    throw new Error('useRoleSession must be used within RoleSessionProvider');
  }
  return value;
}
