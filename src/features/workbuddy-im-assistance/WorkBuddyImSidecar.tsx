import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { WorkspaceComposer } from '@design-system/WorkspaceComposer';
import { useWorkBuddyIm, WORKBUDDY_IM_DIRECT_REFERENCE_TASK, WORKBUDDY_IM_GUIDED_EXPLANATION_TASK, WORKBUDDY_IM_REFERENCE_TASK, WORKBUDDY_IM_TASKS } from './workbuddy-im-store';
import { WorkBuddyImRunTimeline } from './WorkBuddyImRunTimeline';
import { WorkBuddyReviewArtifact } from './WorkBuddyReviewArtifact';
import { WorkBuddyWeeklyPlanReviewArtifact } from './WorkBuddyWeeklyPlanReviewArtifact';
import { WorkBuddyGuidedExplanationReview } from './WorkBuddyGuidedExplanationReview';
import styles from './WorkBuddyImSidecar.module.css';

type WorkBuddyImSidecarProps = Readonly<{
  onLocateMessage: (messageId: string) => void;
  onInsertDirectReply?: (body: string) => void;
  onClose?: () => void;
}>;

const COMPOSER_MAX_LENGTH = 4_000;
const COMPOSER_COUNT_THRESHOLD = 3_200;

export function WorkBuddyImSidecar({ onLocateMessage, onInsertDirectReply, onClose }: WorkBuddyImSidecarProps) {
  const { state, actions } = useWorkBuddyIm();
  const composerDraft = state.composerDraft;
  const bodyRef = useRef<HTMLDivElement>(null);
  const eventCursor = state.conversation?.events.map(({ id, state: eventState }) => `${id}:${eventState}`).join('|') ?? '';
  useEffect(() => {
    if (!onClose) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.defaultPrevented || document.querySelector('dialog[open]')) return;
      if (event.target instanceof HTMLElement && event.target.matches('input, textarea, [contenteditable="true"]')) return;
      onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  useLayoutEffect(() => {
    if (state.run.status !== 'generating' && state.run.status !== 'draft-ready' && state.run.status !== 'direct-draft-ready' && state.run.status !== 'explanation-draft-ready' && state.run.status !== 'empty') return;
    const body = bodyRef.current;
    if (!body) return;
    if (state.run.status === 'draft-ready' || state.run.status === 'direct-draft-ready' || state.run.status === 'explanation-draft-ready') {
      const reviewArtifact = body.querySelector<HTMLElement>('[data-review-artifact="true"]');
      if (!reviewArtifact) return;
      const bodyRect = body.getBoundingClientRect();
      const reviewRect = reviewArtifact.getBoundingClientRect();
      body.scrollTo?.({ top: body.scrollTop + reviewRect.top - bodyRect.top, behavior: 'auto' });
      return;
    }
    body.scrollTo?.({ top: body.scrollHeight, behavior: 'auto' });
  }, [eventCursor, state.run.status]);

  if (!state.isOpen || !state.target) return null;
  const { run, target } = state;
  const directContext = target.kind === 'direct';
  const composerDisabled = run.status === 'sending' || run.status === 'explanation-sending';
  const composerActionLabel = run.status === 'ready'
    ? directContext ? '生成回复建议' : '生成消息草稿'
    : run.status === 'generating' ? '发送补充要求' : '发送给 WorkBuddy';
  const composerHint = run.status === 'generating'
    ? '任务执行中；补充内容会作为教师消息加入当前私密 Run'
    : run.status === 'sending'
      ? '正在执行发送，请等待回执后继续'
      : run.status === 'draft-ready'
        ? '继续提问会以当前班级上下文启动新的模拟 Run'
        : run.status === 'direct-draft-ready'
          ? '回复建议尚未发送；可继续调整或插入当前回复框'
          : directContext
            ? '内容仅用于当前私聊的教师回复辅助'
            : '内容仅进入教师与 WorkBuddy 的私密任务窗口';
  const submitComposer = () => {
    const text = composerDraft.trim();
    if (!text || composerDisabled) return;
    if (run.status === 'generating') actions.supplement(text);
    else void actions.generate(text);
    actions.editComposerDraft('');
  };

  return (
    <aside className={styles.sidecar} aria-label="WorkBuddy 私密协作窗口" data-dismissible={onClose ? 'true' : 'false'} data-surface="floating-assistant" id="workbuddy-im-sidecar">
      <header className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.mark}><Sparkles aria-hidden="true" size={16} /></span>
          <span><strong>WorkBuddy</strong><small><LockKeyhole aria-hidden="true" size={11} />仅你可见</small></span>
        </div>
        {onClose ? <button type="button" aria-label="关闭 WorkBuddy" onClick={onClose}><X aria-hidden="true" size={17} /></button> : null}
      </header>

      <div className={styles.contextBar}>
        <span>当前上下文</span>
        <strong>{target.classLabel}</strong>
        <i>[模拟] 数据</i>
      </div>

      <div
        className={styles.body}
        data-scrolled="false"
        onScroll={(event) => {
          event.currentTarget.dataset.scrolled = String(event.currentTarget.scrollTop > 1);
        }}
        ref={bodyRef}
      >
        {run.status === 'ready' ? (
          <section className={styles.ready} aria-labelledby="workbuddy-ready-title">
            <div className={styles.intro}>
              <Sparkles aria-hidden="true" size={18} />
              <div><h3 id="workbuddy-ready-title">{directContext ? '告诉我你想如何回复当前私聊' : '直接告诉我你想在当前班级完成什么'}</h3><p>{directContext ? '我会结合当前对话生成回复建议；建议只会插入回复框，仍由你确认并发送。' : '我会先理解任务、展示执行步骤并生成草稿；所有结果都要由你确认后才会进入群聊。'}</p></div>
            </div>
            <div className={styles.taskSuggestions} aria-label="模拟任务" role="group">
              {directContext ? (
                <>
                  <button className={styles.suggestion} type="button" onClick={() => actions.editComposerDraft(WORKBUDDY_IM_DIRECT_REFERENCE_TASK)}><span>回复辅助</span><strong>根据当前对话拟写回复</strong></button>
                  <button className={styles.suggestion} type="button" onClick={() => actions.editComposerDraft(WORKBUDDY_IM_GUIDED_EXPLANATION_TASK)}><span>单题讲解</span><strong>生成可打开的分步讲题内容</strong></button>
                </>
              ) : WORKBUDDY_IM_TASKS.map((task) => (
                  <button className={styles.suggestion} key={task.id} type="button" onClick={() => actions.editComposerDraft(task.prompt)}>
                    <span>{task.label}</span><strong>{task.suggestionTitle}</strong>
                  </button>
                ))}
            </div>
          </section>
        ) : null}

        {run.status === 'direct-draft-ready' ? (
          <section className={styles.directDraft} data-review-artifact="true" aria-label="私聊回复建议">
            <header><span>回复建议</span><strong>未发送</strong></header>
            <label>
              <span>确认或修改后插入回复框</span>
              <textarea aria-label="私聊回复建议正文" value={run.draft.body} onChange={(event) => actions.editBody(event.target.value)} />
            </label>
            <footer>
              <span>插入后仍需由你手动发送</span>
              <button className={styles.primaryButton} type="button" onClick={() => onInsertDirectReply?.(run.draft.body)}>插入回复框</button>
            </footer>
          </section>
        ) : null}

        {run.status === 'explanation-needs-input' ? (
          <section className={styles.centerState} role="status"><AlertTriangle aria-hidden="true" size={24} /><strong>还需要题目内容</strong><span>{run.message}</span></section>
        ) : null}

        {run.status === 'explanation-generation-failure' ? (
          <section className={styles.centerState} role="alert"><AlertTriangle aria-hidden="true" size={24} /><strong>讲题内容生成暂时失败</strong><span>{run.message}</span><button className={styles.primaryButton} type="button" onClick={() => void actions.generate(run.goal)}><RotateCcw aria-hidden="true" size={14} />重新生成</button></section>
        ) : null}

        {state.conversation ? <WorkBuddyImRunTimeline run={state.conversation} /> : null}

        {run.status === 'empty' ? (
          <section className={styles.centerState} role="status">
            <CheckCircle2 aria-hidden="true" size={24} />
            <strong>{run.preparation.kind === 'weekly-preparation-notice'
              ? '本周暂未安排教学计划'
              : run.preparation.reason === 'no-active-homework' ? '当前没有未截止的作业' : '当前未截止作业均已提交'}</strong>
            <span>{run.preparation.kind === 'weekly-preparation-notice' ? '这次不需要生成课前准备通知。' : '这次不需要生成催交消息。'}</span>
            <button className={styles.secondaryButton} type="button" onClick={() => void actions.generate(state.conversation?.goal ?? WORKBUDDY_IM_REFERENCE_TASK)}><RotateCcw aria-hidden="true" size={14} />重新核对</button>
          </section>
        ) : null}

        {run.status === 'draft-ready' && run.preparation.kind === 'homework-reminder' ? (
          <WorkBuddyReviewArtifact
            preparation={run.preparation}
            target={target}
            onApproveAndSend={actions.approveAndSend}
            onEditBody={actions.editBody}
            onRemoveGroup={actions.removeGroup}
            onRemoveStudent={actions.removeStudent}
            onRestoreChecklist={actions.restoreChecklist}
          />
        ) : null}

        {run.status === 'draft-ready' && run.preparation.kind === 'weekly-preparation-notice' ? (
          <WorkBuddyWeeklyPlanReviewArtifact
            preparation={run.preparation}
            target={target}
            onApproveAndSend={actions.approveAndSend}
            onEditBody={actions.editBody}
          />
        ) : null}

        {run.status === 'explanation-draft-ready' ? (
          <WorkBuddyGuidedExplanationReview key={`${run.artifact.id}:v${run.artifact.version}`} artifact={run.artifact} targetLabel={target.kind === 'direct' ? `当前学生私聊（${target.classLabel}）` : `${target.classLabel}群聊`} onRevise={actions.reviseExplanation} onApprove={() => void actions.approveAndSend()} />
        ) : null}

        {run.status === 'explanation-sending' ? (
          <section className={styles.centerState} aria-live="polite" aria-busy="true"><LoaderCircle className={styles.spinner} aria-hidden="true" size={24} /><strong>正在保存并分发交互讲题内容</strong><span>保存与发送完成前不会显示成功回执。</span></section>
        ) : null}

        {run.status === 'explanation-sent' ? (
          <section aria-label="讲题内容发送成功" className={styles.receipt} role="status"><CheckCircle2 aria-hidden="true" className={styles.receiptIcon} size={20} /><div className={styles.receiptSummary}><span>发送成功</span><strong>学生已可打开分步讲解</strong><small>{run.receipt.message.authorName} → {target.classLabel}</small></div><button className={styles.secondaryButton} type="button" onClick={() => onLocateMessage(run.receipt.message.id)}>查看消息</button></section>
        ) : null}

        {run.status === 'explanation-failure' ? (
          <section className={styles.centerState} role="alert"><AlertTriangle aria-hidden="true" size={24} /><strong>{run.kind === 'permission_denied' ? '当前没有分发权限' : run.kind === 'evidence_mismatch' ? '执行证据需要人工复查' : '保存或发送暂时失败'}</strong><span>{run.message}</span>{run.kind === 'recoverable_failure' ? <button className={styles.primaryButton} type="button" onClick={() => void actions.retryExplanation()}><RotateCcw aria-hidden="true" size={14} />重试保存并发送</button> : run.kind === 'evidence_mismatch' ? <button className={styles.secondaryButton} type="button" onClick={actions.close}>关闭并人工复查</button> : <button className={styles.secondaryButton} type="button" onClick={actions.close}>关闭并联系管理员申请权限</button>}</section>
        ) : null}

        {run.status === 'sending' ? (
          <section className={styles.centerState} aria-live="polite" aria-busy="true">
            <LoaderCircle className={styles.spinner} aria-hidden="true" size={24} />
            <strong>正在以{run.preparation.action.actor.teacherName}身份发送</strong>
            <span>发送完成前不会显示成功回执。</span>
          </section>
        ) : null}

        {run.status === 'sent' ? (
          <section aria-label="班级群消息发送成功" className={styles.receipt} role="status">
            <CheckCircle2 aria-hidden="true" className={styles.receiptIcon} size={20} />
            <div className={styles.receiptSummary}>
              <span>发送成功</span>
              <strong>已发送 1 条班级群消息</strong>
              <small>{run.receipt.message.authorName} → {target.classLabel}</small>
            </div>
            <button className={styles.secondaryButton} type="button" onClick={() => onLocateMessage(run.receipt.message.id)}>查看群消息</button>
          </section>
        ) : null}

        {run.status === 'failure' ? (
          <section className={styles.centerState} role="alert">
            <AlertTriangle aria-hidden="true" size={24} />
            <strong>{run.kind === 'stale_context'
              ? run.preparation?.kind === 'weekly-preparation-notice' ? '本周教学计划已经变化' : '提交状态已经变化'
              : run.kind === 'permission_denied' ? '当前没有发送权限'
                : run.kind === 'evidence_mismatch' ? '执行证据需要人工复查' : '这次操作没有完成'}</strong>
            <span>{run.message}</span>
            {run.kind === 'evidence_mismatch' ? (
              <button className={styles.secondaryButton} type="button" onClick={actions.close}>关闭并人工复查</button>
            ) : run.kind === 'recoverable_failure' && run.preparation ? (
              <button className={styles.primaryButton} type="button" onClick={() => void actions.approveAndSend()}><RotateCcw aria-hidden="true" size={14} />重试发送</button>
            ) : run.kind !== 'permission_denied' ? (
              <button className={styles.secondaryButton} type="button" onClick={() => void actions.generate(state.conversation?.goal ?? WORKBUDDY_IM_REFERENCE_TASK)}><RotateCcw aria-hidden="true" size={14} />刷新并重新生成</button>
            ) : null}
          </section>
        ) : null}
      </div>

      <WorkspaceComposer
        ariaLabel="向 WorkBuddy 输入要求"
        className={styles.runComposerDock}
        countThreshold={COMPOSER_COUNT_THRESHOLD}
        disabled={composerDisabled}
        hint={composerHint}
        maxLength={COMPOSER_MAX_LENGTH}
        onSubmit={submitComposer}
        onValueChange={actions.editComposerDraft}
        placeholder={run.status === 'generating' ? '补充要求或调整语气…' : directContext ? '例如：帮我拟一条简洁、专业的回复…' : '给 WorkBuddy 安排任务或继续追问…'}
        submitLabel={composerActionLabel}
        value={composerDraft}
      />
    </aside>
  );
}
