import { useContext } from 'react';
import { OperationGuardContext, STANDALONE_GUARD, type OperationGuardValue } from './operation-guard-context';

export function useOperationGuard(): OperationGuardValue {
  return useContext(OperationGuardContext) ?? STANDALONE_GUARD;
}
