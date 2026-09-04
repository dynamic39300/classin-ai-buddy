import { createContext } from 'react';
import type { RoleSwitchContext } from '@domain/account/role-switch-policy';

export type UnsavedResolution = 'save' | 'discard';
export type OperationGuard = {
  context: RoleSwitchContext;
  resolveUnsaved?: (resolution: UnsavedResolution) => void;
};

export type OperationGuardValue = {
  guard: OperationGuard;
  registerGuard: (guard: OperationGuard) => void;
};

export const IDLE_GUARD: OperationGuard = { context: { kind: 'idle' } };
export const STANDALONE_GUARD: OperationGuardValue = { guard: IDLE_GUARD, registerGuard: () => undefined };
export const OperationGuardContext = createContext<OperationGuardValue | null>(null);
