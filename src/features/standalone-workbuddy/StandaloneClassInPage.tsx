import { ArrowUpRight, Check, Database, FileUp, Link2Off } from 'lucide-react';
import { Link } from 'react-router-dom';
import { STANDALONE_TEACHBUDDY_ROUTES, TEACHBUDDY_BRAND } from '@contracts/workbuddy/product-brand';
import styles from './StandaloneWorkBuddy.module.css';

export function StandaloneClassInPage() {
  return (
    <section className={styles.classInPage} aria-labelledby="classin-connection-title">
      <header>
        <span className={styles.kicker}>从独立使用到教学业务协同</span>
        <h1 id="classin-connection-title">现在可以开始，连接 ClassIn 后更省一步</h1>
        <p>当前 {TEACHBUDDY_BRAND.shortName} 只依据你主动输入的任务描述和上传资料。它不会读取任何班级、学生或作业事实。</p>
      </header>

      <div className={styles.connectionComparison}>
        <article>
          <span><Link2Off size={18} />当前：独立使用</span>
          <h2>由老师补充教学范围</h2>
          <ul><li><FileUp size={16} />输入年级、学科、单元和目标</li><li><FileUp size={16} />上传讲义、题目或参考材料</li><li><Check size={16} />生成结果先审阅，再下载或保存</li></ul>
        </article>
        <article data-connected="true">
          <span><Database size={18} />[未来] 连接 ClassIn</span>
          <h2>自动带入已授权教学上下文</h2>
          <ul><li><Check size={16} />班级、课程、单元和教学活动</li><li><Check size={16} />作业进度与授权范围内的学情</li><li><Check size={16} />确认后写入 ClassIn 草稿或教学对象</li></ul>
        </article>
      </div>

      <aside className={styles.classInCta}>
        <div><strong>你不需要先连接，才能体验 {TEACHBUDDY_BRAND.shortName}</strong><p>先完成一个任务；需要跨班级上下文、教学活动写回或机构协同时，再了解 ClassIn 的完整方案。</p></div>
        <div><Link to={STANDALONE_TEACHBUDDY_ROUTES.newTask}>先创建一个任务</Link><a href="https://www.classin.com/" target="_blank" rel="noreferrer">了解 ClassIn <ArrowUpRight size={15} /></a></div>
      </aside>
    </section>
  );
}
