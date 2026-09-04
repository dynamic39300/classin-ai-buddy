import { useContext, useEffect } from 'react';
import { PageHeaderContext, type PageHeaderConfig } from './PageHeaderState';

export function usePageHeader(config: PageHeaderConfig): void {
  const context = useContext(PageHeaderContext);
  if (!context) throw new Error('usePageHeader must be used inside PageHeaderProvider');
  const { setConfig, reset } = context;

  useEffect(() => {
    setConfig(config);
    return reset;
  }, [config, reset, setConfig]);
}

export function usePageHeaderConfig(): PageHeaderConfig {
  const context = useContext(PageHeaderContext);
  if (!context) throw new Error('usePageHeaderConfig must be used inside PageHeaderProvider');
  return context.config;
}
