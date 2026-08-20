import { Check, Database, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { CORE_CONTEXT_SECTIONS, type CoreContextSection } from '@domain/workbuddy/core-context';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import styles from './CoreContextPanel.module.css';

const SECTION_LABELS: Record<CoreContextSection, string> = {
  actor_organization: '教师与组织',
  teaching_scope: '教学范围',
  learner_scope: '学习者范围',
  time_schedule: '时间与日程',
  resources_input: '资源与教师输入',
  teaching_evidence: '教学证据',
  domain_knowledge: 'Domain Knowledge',
};

const SOURCE_LABELS = {
  classin: 'ClassIn 业务事实',
  'teacher-input': '教师输入',
  'institution-rule': '机构规则',
  'domain-knowledge': '受版本治理的知识',
} as const;

export function CoreContextPanel({ onClose }: { onClose: () => void }) {
  const {
    contextProposal,
    contextSnapshot,
    applyRecommendedContext,
    confirmCoreContext,
    resetCoreContext,
  } = useWorkBuddyWorkspace();
  const includedCount = contextSnapshot?.items.length ?? contextProposal.items.filter(({ included }) => included).length;
  const status = contextSnapshot ? 'Snapshot 已冻结' : contextProposal.status === 'ready_to_confirm' ? '可以确认 Snapshot' : '需要补充教学范围';

  return (
    <aside className={styles.panel} aria-label="核心上下文" onKeyDown={(event) => {
      if (event.key === 'Escape') onClose();
    }}>
      <header className={styles.header}>
        <div>
          <strong>核心上下文 · {includedCount}</strong>
          <span>固定版本 Mock · 可重置</span>
        </div>
        <button type="button" aria-label="关闭核心上下文" onClick={onClose}><X aria-hidden="true" size={16} /></button>
      </header>

      <div className={styles.body}>
        <section className={styles.truthNotice} aria-label="上下文真值说明">
          <ShieldCheck aria-hidden="true" size={16} />
          <div><strong>实时事实与任务快照分开</strong><p>当前内容来自固定版本 Mock；确认后冻结为本次 Run 使用的 Snapshot。</p></div>
        </section>

        <div className={styles.statusCard} data-ready={contextProposal.status === 'ready_to_confirm'}>
          <span>{status}</span>
          {contextSnapshot ? <code>{contextSnapshot.version}</code> : <small>选择建议不会自动创建任务</small>}
        </div>

        <button className={styles.recommendation} type="button" onClick={applyRecommendedContext}>
          <Database aria-hidden="true" size={16} />
          <span><strong>应用动量课程建议</strong><small>高二物理 3 班 · 动量与碰撞 · 第一单元</small></span>
        </button>

        {CORE_CONTEXT_SECTIONS.map((section) => (
          <section className={styles.contextSection} key={section}>
            <h2>{SECTION_LABELS[section]}</h2>
            <div className={styles.itemList}>
              {contextProposal.items.filter((item) => item.section === section).map((item) => {
                const included = contextSnapshot?.items.some(({ id }) => id === item.id) ?? item.included;
                return (
                  <article className={styles.contextItem} data-included={included} key={item.id}>
                    <span className={styles.itemState} role="img" aria-label={included ? '已纳入' : '建议项'}>{included ? <Check aria-hidden="true" size={13} /> : <span aria-hidden="true" />}</span>
                    <div>
                      <strong>{item.label}</strong>
                      <p>{SOURCE_LABELS[item.source]} · {item.sourceVersion}</p>
                    </div>
                    <span className={styles.permission}>{item.permission === 'read' ? '可读取' : '受限'} · {item.sensitivity}</span>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        <p className={styles.sensitiveNote}>学生姓名默认不进入普通课程生产任务；能力调用只取得最小必要的 Context Projection。</p>
      </div>

      <footer className={styles.footer}>
        <button type="button" onClick={resetCoreContext}><RotateCcw aria-hidden="true" size={14} />重置 M4 场景</button>
        <button className={styles.confirmButton} type="button" disabled={contextProposal.status !== 'ready_to_confirm' || Boolean(contextSnapshot)} onClick={confirmCoreContext}>确认 ContextSnapshot</button>
      </footer>
    </aside>
  );
}
