import { FileQuestion } from 'lucide-react';
import styles from './SpaceWorkspace.module.css';

export function QuestionBankPlaceholder() {
  return (
    <section className={`${styles.pageContent} ${styles.questionPage}`} aria-labelledby="space-title">
      <h1 className={styles.srOnly} id="space-title">题库中心</h1>
      <div className={styles.questionPlaceholder}>
        <span className={styles.placeholderIcon}><FileQuestion aria-hidden="true" size={24} /></span>
        <div><h2>题库中心 Placeholder</h2><p>不展示题目、试卷、题库分段、试题篮或新建测验，也不模拟题库读写。</p></div>
      </div>
    </section>
  );
}
