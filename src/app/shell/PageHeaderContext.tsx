import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { PageHeaderContext, type PageHeaderConfig, type PageHeaderContextValue } from './PageHeaderState';

type PageHeaderProviderProps = {
  fallback: PageHeaderConfig;
  children: ReactNode;
};

export function PageHeaderProvider({ fallback, children }: PageHeaderProviderProps) {
  const [override, setOverride] = useState<PageHeaderConfig | null>(null);
  const reset = useCallback(() => setOverride(null), []);

  const value = useMemo<PageHeaderContextValue>(() => ({
    config: override ?? fallback,
    setConfig: setOverride,
    reset,
  }), [fallback, override, reset]);

  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}
