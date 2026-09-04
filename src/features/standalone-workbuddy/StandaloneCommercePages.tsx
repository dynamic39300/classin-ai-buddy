import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { STANDALONE_TEACHERIN_ROUTES } from '@contracts/workbuddy/product-brand';
import type { MembershipPlan, MembershipPlanId } from '@domain/standalone-workbuddy/commerce';
import { useStandaloneTeacher } from './standalone-teacher-context';
import styles from './StandaloneWorkBuddy.module.css';

export function StandaloneCreditsPage() {
  const { creditView } = useStandaloneTeacher();
  const labels = { welcome_grant: '新用户体验点数', task_charge: '任务执行结算', reservation_released: '任务未创建，释放预占', membership_grant: '会员点数到账' } as const;
  return <section className={styles.commercePage} aria-labelledby="credits-title"><header><div><span className={styles.kicker}>AI 点数账户</span><h1 id="credits-title">每一次生成，都清楚可追溯</h1><p>提交任务前显示固定报价；只有任务成功创建才会结算。体验点数当前不会按月自动重置。</p></div><Link to={STANDALONE_TEACHERIN_ROUTES.membership}>补充 AI 点数</Link></header><div className={styles.balancePanel} aria-live="polite"><span>可用点数</span><strong>{creditView?.availableBalance ?? 0}</strong><small>AI 点数</small><dl><div><dt>账户余额</dt><dd>{creditView?.balance ?? 0}</dd></div><div><dt>任务预占</dt><dd>{creditView?.reserved ?? 0}</dd></div></dl></div><section className={styles.ledger} aria-labelledby="ledger-title"><h2 id="ledger-title">点数流水</h2>{creditView?.ledger.length ? <ul>{creditView.ledger.map((entry) => <li key={entry.id}><span><strong>{labels[entry.kind]}</strong><small>余额 {entry.balanceAfter}</small></span><em data-positive={entry.amount > 0}>{entry.amount > 0 ? '+' : ''}{entry.amount}</em></li>)}</ul> : <p>暂无点数流水。</p>}</section></section>;
}

export function StandaloneMembershipPage() {
  const { membershipPlans, purchasePlan } = useStandaloneTeacher();
  const [selected, setSelected] = useState<MembershipPlan | null>(null);
  const [receipt, setReceipt] = useState('');
  const receiptRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (receipt) receiptRef.current?.focus(); }, [receipt]);
  return <section className={styles.commercePage} aria-labelledby="membership-title"><header><div><span className={styles.kicker}>会员与点数</span><h1 id="membership-title">为你的教学节奏选择方案</h1><p>选择适合你的会员方案，补充 AI 点数并持续创建教学任务。</p></div><Link to={STANDALONE_TEACHERIN_ROUTES.credits}>查看点数流水</Link></header><div className={styles.planGrid}>{membershipPlans.map((plan) => <article data-featured={plan.id === 'teaching'} key={plan.id}><span>{plan.id === 'teaching' ? '多数老师选择' : plan.id === 'free' ? '免费开始' : '高频教学'}</span><h2>{plan.name}</h2><p><strong>¥{plan.priceCny}</strong><small>/ 月</small></p><dl><div><dt>每月 AI 点数</dt><dd>{plan.credits}</dd></div><div><dt>适合</dt><dd>{plan.id === 'free' ? '体验核心任务' : plan.id === 'teaching' ? '日常备课与测验' : '多班级高频产出'}</dd></div></dl><button type="button" disabled={plan.id === 'free'} onClick={() => setSelected(plan)}>{plan.id === 'free' ? '当前体验方案' : '选择方案'}</button></article>)}</div>{receipt ? <p ref={receiptRef} className={styles.purchaseReceipt} role="status" tabIndex={-1}>{receipt}</p> : null}{selected ? <MembershipDialog plan={selected} onCancel={() => setSelected(null)} onConfirm={(planId) => { const result = purchasePlan(planId); setSelected(null); setReceipt(result.ok ? `已到账 ${result.grantedCredits} AI 点数，可继续创建任务。` : '订单没有完成，请稍后重试。'); }} /> : null}</section>;
}

function MembershipDialog({ plan, onCancel, onConfirm }: Readonly<{ plan: MembershipPlan; onCancel: () => void; onConfirm: (planId: MembershipPlanId) => void }>) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog className={styles.orderDialog} ref={ref} onCancel={(event) => { event.preventDefault(); onCancel(); }}><form method="dialog"><span className={styles.kicker}>会员订单</span><h2>确认选择{plan.name}</h2><p>确认方案后，对应 AI 点数将立即计入当前账户。</p><dl><div><dt>套餐金额</dt><dd>¥{plan.priceCny} / 月</dd></div><div><dt>到账点数</dt><dd>{plan.credits} AI 点数</dd></div></dl><div><button type="button" onClick={onCancel}>取消</button><button autoFocus type="button" onClick={() => onConfirm(plan.id)}>确认开通</button></div></form></dialog>;
}
