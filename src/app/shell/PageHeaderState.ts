import { createContext } from 'react';

export type PageHeaderBreadcrumb = {
  label: string;
  to?: string;
  state?: unknown;
};

export type PageHeaderMeta = {
  label: string;
  dateTime?: string;
};

export type PageHeaderConfig = {
  title: string;
  breadcrumbs?: readonly PageHeaderBreadcrumb[];
  meta?: PageHeaderMeta;
};

export type PageHeaderContextValue = {
  config: PageHeaderConfig;
  setConfig: (config: PageHeaderConfig) => void;
  reset: () => void;
};

export const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);
