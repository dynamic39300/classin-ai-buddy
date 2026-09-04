import { FileQuestion } from 'lucide-react';
import styles from './SpaceWorkspace.module.css';

export function QuestionBankPlaceholder() {
  return (
    <section className={`${styles.pageContent} ${styles.questionPage}`} aria-labelledby="space-title">
      <h1 className={styles.srOnly} id="space-title">题库中心</h1>
      <div className={styles.questionPlaceholder}>
        <span className={styles.placeholderIcon}><FileQuestion aria-hidden="true" size={24} /></span>
        <div><h2>题库中心</h2><p>题目、试卷、题库分段和试题篮将在这里统一管理。</p></div>
      </div>
    </section>
  );
}
