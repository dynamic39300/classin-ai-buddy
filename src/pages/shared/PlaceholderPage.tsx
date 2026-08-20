import { ArrowLeft, Construction } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AppRole } from '@domain/account/role';
import { getRoleHomePath } from '@domain/account/role';
import styles from './PlaceholderPage.module.css';

type PlaceholderPageProps = {
  role: AppRole;
  title: string;
  description: string;
};

export function PlaceholderPage({ role, title, description }: PlaceholderPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.notice}>
        <span className={styles.icon}><Construction aria-hidden="true" size={22} /></span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
          <p className={styles.boundary}>当前仅展示功能入口和桌面结构，不连接真实 ClassIn 服务。</p>
        </div>
        <Link to={getRoleHomePath(role)}>
          <ArrowLeft aria-hidden="true" size={16} /> 返回首页
        </Link>
      </div>
    </div>
  );
}
