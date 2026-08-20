import { MonitorUp } from 'lucide-react';
import styles from '@features/casting-workspace/CastingWorkspace.module.css';

export function StudentCastingPage() {
  return (
    <section className={styles.page} aria-label="课堂投屏">
      <div className={styles.dialog} role="dialog" aria-modal="false" aria-labelledby="student-casting-title">
        <header className={styles.dialogHeader}>
          <div className={styles.titleGroup}><span className={styles.appIcon} aria-hidden="true"><MonitorUp size={18} /></span><h1 id="student-casting-title">课堂投屏</h1></div>
        </header>
        <div className={styles.stateBody} role="status">
          <div className={styles.stateIcon} data-status="idle" aria-hidden="true"><MonitorUp size={26} /></div>
          <h2>等待老师投屏</h2>
          <p className={styles.stateCopy}>老师开始投屏后，课堂画面会在这里显示。学生端只能查看投屏状态，不能发起或结束投屏。</p>
        </div>
        <footer className={styles.dialogFooter}><MonitorUp aria-hidden="true" size={15} /><span>投屏接收为 Placeholder，当前 Demo 不连接真实设备或传输画面。</span></footer>
      </div>
    </section>
  );
}
