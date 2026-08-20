import { PenTool } from 'lucide-react';
import type { AppRole } from '@domain/account/role';
import styles from './BlackboardWorkspace.module.css';

export function BlackboardWorkspace({ role = 'teacher' }: { role?: AppRole }) {
  const student = role === 'student-family';
  return (
    <section className={styles.page} aria-labelledby="blackboard-placeholder-title">
      <div className={styles.placeholder}>
        <PenTool aria-hidden="true" size={40} strokeWidth={1.5} />
        <h2 id="blackboard-placeholder-title">{student ? '课堂黑板暂未接入' : '黑板暂未接入'}</h2>
        <p>{student ? '这里只展示已获授权的课堂黑板内容，当前 Demo 不连接真实板书服务。' : '黑板编辑区域暂时以占位方式保留，当前 Demo 不连接真实板书服务。'}</p>
      </div>
    </section>
  );
}
