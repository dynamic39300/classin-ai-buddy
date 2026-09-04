import { useCallback, useMemo, useState, type PropsWithChildren } from 'react';
import { IDLE_GUARD, OperationGuardContext, type OperationGuard } from './operation-guard-context';

export function OperationGuardProvider({ children }: PropsWithChildren) {
  const [guard, setGuard] = useState<OperationGuard>(IDLE_GUARD);
  const registerGuard = useCallback((nextGuard: OperationGuard) => setGuard(nextGuard), []);
  const value = useMemo(() => ({ guard, registerGuard }), [guard, registerGuard]);
  return <OperationGuardContext.Provider value={value}>{children}</OperationGuardContext.Provider>;
}
