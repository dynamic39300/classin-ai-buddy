import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageHeaderConfig } from './usePageHeader';
import styles from './Topbar.module.css';

export function Topbar() {
  const { title, breadcrumbs, meta } = usePageHeaderConfig();
  return (
    <header className={styles.topbar}>
      <div className={styles.pageContext}>
        {breadcrumbs?.length ? (
          <nav className={styles.breadcrumbs} aria-label="面包屑">
            {breadcrumbs.map((item, index) => (
              <span className={styles.breadcrumbItem} key={`${item.label}-${index}`}>
                {item.to ? <Link to={item.to} state={item.state}>{item.label}</Link> : <strong>{item.label}</strong>}
                {index < breadcrumbs.length - 1 ? <ChevronRight aria-hidden="true" size={14} /> : null}
              </span>
            ))}
          </nav>
        ) : <h1>{title}</h1>}
      </div>
      {meta ? <time className={styles.pageMeta} dateTime={meta.dateTime}>{meta.label}</time> : null}
    </header>
  );
}
