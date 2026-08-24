import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ClassInHomeworkReminderAdapter } from '@contracts/workbuddy/im-homework-reminder';
import type { GuidedExplanationAdapter } from '@contracts/workbuddy/guided-explanation';
import type { WorkBuddyImExperienceScheduler, WorkBuddyImTarget } from '@contracts/workbuddy/im-conversation-run';
import {
  approveHomeworkReminder,
  prepareHomeworkReminder,
  restoreHomeworkReminderScope,
  reviseHomeworkReminder,
  summarizeHomeworkReminderFacts,
} from '@domain/workbuddy/im-homework-reminder';
import { resolveWorkBuddyImTask } from '@domain/workbuddy/im-task-catalog';
import {
  prepareWeeklyPreparationNotice,
  reviseWeeklyPreparationNotice,
  type WeeklyPreparationNoticeFacts,
} from '@domain/workbuddy/im-weekly-preparation-notice';
import {
  appendWorkBuddyImSupplement,
  appendWorkBuddyImEvaluationEvent,
  completeEmptyWorkBuddyImConversationRun,
  completeWorkBuddyImCapability,
  completeWorkBuddyImConversationRun,
  completeWorkBuddyImUnderstanding,
  createWorkBuddyImConversationRun,
  failWorkBuddyImCapability,
  reviseWorkBuddyImArtifactEvent,
  startWorkBuddyImCapability,
} from '@domain/workbuddy/im-conversation-run';
import { EvaluationModule } from '@domain/workbuddy/evaluation';
import { GuidedExplanationModule, type GuidedExplanationApproval, type GuidedExplanationArtifact, type GuidedExplanationRevision, type SendGuidedExplanationAction } from '@domain/workbuddy/guided-explanation';
import {
  WorkBuddyImContext,
  WORKBUDDY_IM_DIRECT_REFERENCE_TASK,
  WORKBUDDY_IM_REFERENCE_TASK,
  type WorkBuddyImActions,
  type WorkBuddyImRunState,
  type WorkBuddyImState,
} from './workbuddy-im-store';
import {
  createBrowserWorkBuddyImExperienceScheduler,
  WORKBUDDY_IM_RUN_TIMING,
} from './workbuddy-im-experience';

type WorkBuddyImProviderProps = Readonly<{
  adapter: ClassInHomeworkReminderAdapter;
  guidedExplanationAdapter: GuidedExplanationAdapter;
  teacher: Readonly<{ id: string; name: string }>;
  now: () => Date;
  experienceScheduler?: WorkBuddyImExperienceScheduler;
  onArtifactCreated?: (artifact: GuidedExplanationArtifact) => void;
  children: ReactNode;
}>;

const INITIAL_STATE: WorkBuddyImState = Object.freeze({
  isOpen: false,
  target: null,
  run: Object.freeze({ status: 'ready' }),
  conversation: null,
  composerDraft: WORKBUDDY_IM_REFERENCE_TASK,
  receiptHistory: Object.freeze([]),
  evaluationHistory: Object.freeze([]),
});

export function WorkBuddyImProvider({ adapter, guidedExplanationAdapter, teacher, now, experienceScheduler, onArtifactCreated, children }: WorkBuddyImProviderProps) {
  const scheduler = useMemo(() => experienceScheduler ?? createBrowserWorkBuddyImExperienceScheduler(), [experienceScheduler]);
  const [state, setState] = useState<WorkBuddyImState>(INITIAL_STATE);
  const stateRef = useRef(state);
  const requestRef = useRef(0);

  const commit = useCallback((update: (current: WorkBuddyImState) => WorkBuddyImState) => {
    setState((current) => {
      const next = update(current);
      stateRef.current = next;
      return next;
    });
  }, []);

  const open = useCallback((target: WorkBuddyImTarget) => {
    commit((current) => {
      const sameTarget = current.target?.threadId === target.threadId && current.target.classId === target.classId;
      return Object.freeze({
        isOpen: true,
        target,
        run: sameTarget ? current.run : Object.freeze({ status: 'ready' }),
        conversation: sameTarget ? current.conversation : null,
        receiptHistory: sameTarget ? current.receiptHistory : Object.freeze([]),
        evaluationHistory: sameTarget ? current.evaluationHistory : Object.freeze([]),
        composerDraft: sameTarget
          ? current.composerDraft
          : target.kind === 'direct' ? WORKBUDDY_IM_DIRECT_REFERENCE_TASK : WORKBUDDY_IM_REFERENCE_TASK,
      });
    });
  }, [commit]);

  const close = useCallback(() => {
    commit((current) => Object.freeze({ ...current, isOpen: false }));
  }, [commit]);

  const editComposerDraft = useCallback((text: string) => {
    commit((current) => Object.freeze({ ...current, composerDraft: text }));
  }, [commit]);

  const generate = useCallback(async (goal: string) => {
    const target = stateRef.current.target;
    const normalizedGoal = goal.trim();
    if (!target || !normalizedGoal) return;
    const task = resolveWorkBuddyImTask(normalizedGoal);
    if (target.kind === 'direct' && task.id !== 'guided-explanation') {
      const latestPeerMessage = [...(target.recentMessages ?? [])]
        .reverse()
        .find(({ authorRole }) => authorRole === 'student-family')?.body.trim();
      const body = latestPeerMessage
        ? `我看到了你提到的“${latestPeerMessage}”。我先核对一下相关信息，再给你一个明确答复。`
        : '收到你的消息。我先核对一下相关信息，再给你一个明确答复。';
      commit((current) => Object.freeze({
        ...current,
        run: Object.freeze({
          status: 'direct-draft-ready',
          draft: Object.freeze({
            body,
            goal: normalizedGoal,
            version: 1,
            truthLabel: '[模拟] WorkBuddy 私聊回复建议',
          }),
        }),
        conversation: null,
      }));
      return;
    }
    const requestId = ++requestRef.current;
    let activeIndex = -1;
    const startedAt = scheduler.now();
    let conversation = createWorkBuddyImConversationRun({
      target,
      taskId: task.id,
      goal: normalizedGoal,
      startedAt,
      occurredAt: now().toISOString(),
      organizeEndsAt: startedAt + WORKBUDDY_IM_RUN_TIMING.organizingMs,
      runInstanceId: task.id === 'guided-explanation' ? String(requestId) : undefined,
    });
    commit((current) => Object.freeze({
      ...current,
      run: Object.freeze({ status: 'generating' }),
      conversation,
      receiptHistory: Object.freeze([]),
      evaluationHistory: Object.freeze([]),
    }));
    try {
      await scheduler.wait(WORKBUDDY_IM_RUN_TIMING.organizingMs);
      if (requestId !== requestRef.current || stateRef.current.target?.threadId !== target.threadId) return;
      conversation = completeWorkBuddyImUnderstanding(conversation, now().toISOString());
      commit((current) => Object.freeze({ ...current, conversation }));

      let homeworkFacts: Awaited<ReturnType<ClassInHomeworkReminderAdapter['readFacts']>> | null = null;
      let weeklyFacts: WeeklyPreparationNoticeFacts | null = null;
      for (activeIndex = 0; activeIndex < conversation.plan.length; activeIndex += 1) {
        conversation = startWorkBuddyImCapability(
          conversation,
          activeIndex,
          scheduler.now() + WORKBUDDY_IM_RUN_TIMING.capabilityMs,
          now().toISOString(),
        );
        commit((current) => Object.freeze({ ...current, conversation }));
        const factRequest = activeIndex === 1 && task.id !== 'guided-explanation'
          ? (task.id === 'weekly-preparation-notice'
            ? adapter.readWeeklyPreparationFacts({ classId: target.classId, classLabel: target.classLabel })
            : adapter.readFacts({ classId: target.classId, classLabel: target.classLabel })).then(
            (value) => Object.freeze({ status: 'fulfilled' as const, value }),
            (reason: unknown) => Object.freeze({ status: 'rejected' as const, reason }),
          )
          : null;
        await scheduler.wait(WORKBUDDY_IM_RUN_TIMING.capabilityMs);
        if (requestId !== requestRef.current || stateRef.current.target?.threadId !== target.threadId) return;
        if (factRequest) {
          const factResult = await factRequest;
          if (factResult.status === 'rejected') throw factResult.reason;
          if (task.id === 'weekly-preparation-notice') weeklyFacts = factResult.value as WeeklyPreparationNoticeFacts;
          else homeworkFacts = factResult.value as Awaited<ReturnType<ClassInHomeworkReminderAdapter['readFacts']>>;
        }

        const homeworkSummary = homeworkFacts ? summarizeHomeworkReminderFacts(homeworkFacts, now()) : null;
        const preparationCount = weeklyFacts?.planItems.reduce((total, item) => total + item.preparations.length, 0) ?? 0;
        const guidedSummaries = ['已锁定当前消息线程和教师身份', '已从课程与作业上下文定位练习单第 5 题', '已生成 4 个讲解步骤与检查点', '已准备最终发送话术和可打开的分步讲解链接'];
        const outputSummary = task.id === 'guided-explanation'
          ? guidedSummaries[activeIndex] ?? '讲题内容已准备'
          : task.id === 'weekly-preparation-notice'
          ? activeIndex === 0
            ? `已锁定“${target.classLabel}”和当前目标群聊`
            : activeIndex === 1
              ? weeklyFacts && weeklyFacts.planItems.length > 0
                ? `已读取${weeklyFacts.weekLabel} ${weeklyFacts.planItems.length} 节教学安排：${weeklyFacts.planItems.map(({ topic }) => topic).join('、')}`
                : '本周暂未安排正式教学计划'
              : activeIndex === 2
                ? weeklyFacts ? `已从 ${weeklyFacts.planItems.length} 节课中提炼 ${preparationCount} 项课前准备` : '等待本周教学计划'
                : weeklyFacts && weeklyFacts.planItems.length > 0
                  ? '已生成 1 条可编辑的班级课前准备通知草稿'
                  : '本周没有可生成通知的教学安排'
          : activeIndex === 0
            ? `已锁定“${target.classLabel}”和当前目标群聊`
            : activeIndex === 1
              ? homeworkSummary && homeworkSummary.activeHomeworkCount > 0
                ? `找到 ${homeworkSummary.activeHomeworkCount} 项未截止作业：${homeworkSummary.activeHomeworkTitles.join('、')}`
                : '当前班级没有未截止的正式作业'
              : activeIndex === 2
                ? homeworkSummary
                  ? `已核对 ${homeworkSummary.recipientStudentCount} 名学员，发现 ${homeworkSummary.unsubmittedAssignmentCount} 个未提交项`
                  : '等待有效作业事实'
                : homeworkSummary && homeworkSummary.reminderGroupCount > 0
                  ? `已按 ${homeworkSummary.reminderGroupCount} 项作业生成 1 条可编辑提醒草稿`
                  : '核对完成，本次无需生成催交草稿';
        conversation = completeWorkBuddyImCapability(
          conversation,
          activeIndex,
          outputSummary,
          `${WORKBUDDY_IM_RUN_TIMING.capabilityMs / 1_000} 秒`,
          now().toISOString(),
        );
        commit((current) => Object.freeze({ ...current, conversation }));
      }
      if (task.id === 'guided-explanation') {
        const latestPeerMessage = [...(target.recentMessages ?? [])].reverse().find(({ authorRole, body }) => authorRole === 'student-family' && /[？?]|第\s*\d+\s*题|怎么|为什么|如何|不会|求解|判断/u.test(body))?.body.trim();
        const prepared = await guidedExplanationAdapter.generateGuidedExplanation({
          runRef: conversation.runRef,
          classId: target.classId, classLabel: target.classLabel, threadId: target.threadId,
          targetKind: target.kind === 'direct' ? 'direct' : 'class', targetLabel: target.classLabel,
          teacherId: teacher.id, teacherName: teacher.name,
          question: latestPeerMessage ?? '', generatedAt: now().toISOString(),
        });
        if (!prepared) {
          conversation = completeEmptyWorkBuddyImConversationRun(conversation, '需要补充题干后才能生成讲题内容。', now().toISOString());
          commit((current) => Object.freeze({ ...current, run: Object.freeze({ status: 'explanation-needs-input', message: '请补充需要讲解的题干，或在包含学生问题的会话中重试。' }), conversation }));
          return;
        }
        conversation = completeWorkBuddyImConversationRun(conversation, prepared.artifact, now().toISOString());
        commit((current) => Object.freeze({ ...current, run: Object.freeze({ status: 'explanation-draft-ready', ...prepared }), conversation }));
        return;
      }
      const preparation = task.id === 'weekly-preparation-notice'
        ? prepareWeeklyPreparationNotice({
          facts: weeklyFacts ?? await adapter.readWeeklyPreparationFacts({ classId: target.classId, classLabel: target.classLabel }),
          threadId: target.threadId, teacherId: teacher.id, teacherName: teacher.name, now: now(),
        })
        : prepareHomeworkReminder({
          facts: homeworkFacts ?? await adapter.readFacts({ classId: target.classId, classLabel: target.classLabel }),
          threadId: target.threadId, teacherId: teacher.id, teacherName: teacher.name, now: now(),
        });
      if (preparation.status === 'ready') {
        conversation = completeWorkBuddyImConversationRun(conversation, preparation.draft, now().toISOString());
        const run: WorkBuddyImRunState = Object.freeze({ status: 'draft-ready', preparation });
        commit((current) => Object.freeze({ ...current, run, conversation }));
      } else {
        const emptySummary = preparation.kind === 'weekly-preparation-notice'
          ? '本周暂未安排教学计划，本次无需发送课前准备通知。'
          : preparation.reason === 'no-active-homework'
            ? '当前没有未截止的作业，本次无需发送催交消息。'
            : '当前未截止作业均已提交，本次无需发送催交消息。';
        conversation = completeEmptyWorkBuddyImConversationRun(conversation, emptySummary, now().toISOString());
        const run: WorkBuddyImRunState = Object.freeze({ status: 'empty', preparation });
        commit((current) => Object.freeze({ ...current, run, conversation }));
      }
    } catch (error) {
      if (requestId !== requestRef.current) return;
      const message = error instanceof Error ? error.message : task.id === 'guided-explanation' ? '讲题内容生成暂时失败，请重试。' : task.id === 'weekly-preparation-notice' ? '暂时无法读取本周教学计划' : '暂时无法读取作业与提交状态';
      if (activeIndex >= 0) conversation = failWorkBuddyImCapability(conversation, activeIndex, message, now().toISOString());
      commit((current) => Object.freeze({
        ...current,
        run: task.id === 'guided-explanation'
          ? Object.freeze({ status: 'explanation-generation-failure', message, goal: normalizedGoal })
          : Object.freeze({ status: 'failure', kind: 'read_failure', message }),
        conversation,
      }));
    }
  }, [adapter, commit, guidedExplanationAdapter, now, scheduler, teacher.id, teacher.name]);

  const reviseExplanation = useCallback((revision: GuidedExplanationRevision) => {
    commit((current) => {
      if (current.run.status !== 'explanation-draft-ready') return current;
      const revised = GuidedExplanationModule.revise(current.run, revision);
      return Object.freeze({ ...current, run: Object.freeze({ status: 'explanation-draft-ready', ...revised }), conversation: current.conversation ? reviseWorkBuddyImArtifactEvent(current.conversation, revised.artifact) : null });
    });
  }, [commit]);

  const supplement = useCallback((text: string) => {
    const normalized = text.trim();
    if (!normalized) return;
    commit((current) => current.run.status === 'generating' && current.conversation
      ? Object.freeze({
        ...current,
        conversation: appendWorkBuddyImSupplement(current.conversation, normalized, now().toISOString()),
      })
      : current);
  }, [commit, now]);

  const revise = useCallback((revision: Parameters<typeof reviseHomeworkReminder>[1]) => {
    commit((current) => {
      if (current.run.status !== 'draft-ready') return current;
      if (current.run.preparation.kind !== 'homework-reminder') return current;
      const preparation = reviseHomeworkReminder(current.run.preparation, revision);
      return Object.freeze({
        ...current,
        run: preparation
          ? Object.freeze({ status: 'draft-ready', preparation })
          : Object.freeze({ status: 'empty', preparation: Object.freeze({
            kind: 'homework-reminder', status: 'empty', reason: 'all-submitted', contextSnapshot: current.run.preparation.contextSnapshot,
          }) }),
        conversation: preparation && current.conversation
          ? reviseWorkBuddyImArtifactEvent(current.conversation, preparation.draft)
          : current.conversation,
      });
    });
  }, [commit]);

  const removeStudent = useCallback((homeworkId: string, studentId: string) => {
    const run = stateRef.current.run;
    if (run.status !== 'draft-ready') return;
    if (run.preparation.kind !== 'homework-reminder') return;
    const groups = run.preparation.draft.groups
      .map((group) => group.homeworkId === homeworkId
        ? Object.freeze({ ...group, students: Object.freeze(group.students.filter(({ id }) => id !== studentId)) })
        : group)
      .filter(({ students }) => students.length > 0);
    revise({ groups });
  }, [revise]);

  const removeGroup = useCallback((homeworkId: string) => {
    const run = stateRef.current.run;
    if (run.status !== 'draft-ready') return;
    if (run.preparation.kind !== 'homework-reminder') return;
    revise({ groups: run.preparation.draft.groups.filter((group) => group.homeworkId !== homeworkId) });
  }, [revise]);

  const restoreChecklist = useCallback(() => {
    commit((current) => {
      if (current.run.status !== 'draft-ready') return current;
      if (current.run.preparation.kind !== 'homework-reminder') return current;
      const preparation = restoreHomeworkReminderScope(current.run.preparation);
      if (preparation === current.run.preparation) return current;
      return Object.freeze({
        ...current,
        run: Object.freeze({ status: 'draft-ready', preparation }),
        conversation: current.conversation
          ? reviseWorkBuddyImArtifactEvent(current.conversation, preparation.draft)
          : current.conversation,
      });
    });
  }, [commit]);

  const editBody = useCallback((body: string) => {
    const run = stateRef.current.run;
    if (run.status === 'direct-draft-ready') {
      if (!body.trim() || body === run.draft.body) return;
      commit((current) => current.run.status === 'direct-draft-ready'
        ? Object.freeze({
          ...current,
          run: Object.freeze({
            status: 'direct-draft-ready',
            draft: Object.freeze({ ...current.run.draft, body, version: current.run.draft.version + 1 }),
          }),
        })
        : current);
      return;
    }
    if (run.status !== 'draft-ready' || !body.trim() || body === run.preparation.draft.body) return;
    if (run.preparation.kind === 'weekly-preparation-notice') {
      commit((current) => {
        if (current.run.status !== 'draft-ready' || current.run.preparation.kind !== 'weekly-preparation-notice') return current;
        const preparation = reviseWeeklyPreparationNotice(current.run.preparation, body);
        return Object.freeze({
          ...current,
          run: Object.freeze({ status: 'draft-ready', preparation }),
          conversation: current.conversation ? reviseWorkBuddyImArtifactEvent(current.conversation, preparation.draft) : current.conversation,
        });
      });
      return;
    }
    revise({ body: body.trim() });
  }, [commit, revise]);

  const executeGuidedExplanation = useCallback(async (artifact: GuidedExplanationArtifact, action: SendGuidedExplanationAction, approval: GuidedExplanationApproval) => {
    commit((current) => Object.freeze({ ...current, run: Object.freeze({ status: 'explanation-sending', artifact, action, approval }) }));
    try {
      const receipt = await guidedExplanationAdapter.executeGuidedExplanation(action, approval, { id: artifact.id, version: artifact.version });
      const evidenceMatches = receipt.runRef === action.runRef
        && receipt.contextSnapshotId === action.contextSnapshotId
        && receipt.artifactRef.id === artifact.id
        && receipt.artifactRef.version === artifact.version;
      if (!evidenceMatches) {
        commit((current) => Object.freeze({
          ...current,
          run: Object.freeze({ status: 'explanation-failure', kind: 'evidence_mismatch', message: '讲题内容分发回执与审批证据链不一致；已停止自动操作，请人工核对消息与文件。', artifact, action, approval, receipt }),
          receiptHistory: Object.freeze([...current.receiptHistory, receipt]),
        }));
        return;
      }
      const evaluation = EvaluationModule.recordExecutionOutcome({
        runRef: action.runRef, contextSnapshotRef: action.contextSnapshotId,
        artifactRef: { id: artifact.id, version: `v${artifact.version}` }, action, approval, receipt,
      });
      if (!evaluation) {
        commit((current) => Object.freeze({ ...current, run: Object.freeze({ status: 'explanation-failure', kind: 'evidence_mismatch', message: '讲题内容的 Action、Approval 与 Receipt 引用不一致，请人工复查。', artifact, action, approval, receipt }), receiptHistory: Object.freeze([...current.receiptHistory, receipt]) }));
        return;
      }
      if (receipt.status === 'success') {
        onArtifactCreated?.(artifact);
        commit((current) => Object.freeze({
          ...current, run: Object.freeze({ status: 'explanation-sent', artifact, action, approval, receipt, evaluation }),
          conversation: current.conversation ? appendWorkBuddyImEvaluationEvent(current.conversation, receipt, evaluation) : null,
          receiptHistory: Object.freeze([...current.receiptHistory, receipt]), evaluationHistory: Object.freeze([...current.evaluationHistory, evaluation]),
        }));
        return;
      }
      commit((current) => Object.freeze({
        ...current, run: Object.freeze({ status: 'explanation-failure', kind: receipt.status, message: receipt.result, artifact, action, approval, receipt, evaluation }),
        conversation: current.conversation ? appendWorkBuddyImEvaluationEvent(current.conversation, receipt, evaluation) : null,
        receiptHistory: Object.freeze([...current.receiptHistory, receipt]), evaluationHistory: Object.freeze([...current.evaluationHistory, evaluation]),
      }));
    } catch (error) {
      commit((current) => Object.freeze({ ...current, run: Object.freeze({ status: 'explanation-failure', kind: 'recoverable_failure', message: error instanceof Error ? error.message : '讲题内容暂时无法分发', artifact, action, approval }) }));
    }
  }, [commit, guidedExplanationAdapter, onArtifactCreated]);

  const retryExplanation = useCallback(async () => {
    const run = stateRef.current.run;
    if (run.status !== 'explanation-failure' || run.kind !== 'recoverable_failure') return;
    await executeGuidedExplanation(run.artifact, run.action, run.approval);
  }, [executeGuidedExplanation]);

  const approveAndSend = useCallback(async (body?: string) => {
    const run = stateRef.current.run;
    if (run.status === 'explanation-draft-ready') {
      const approved = GuidedExplanationModule.approve(run, teacher.id, now().toISOString());
      if (!approved) return;
      await executeGuidedExplanation(run.artifact, approved.action, approved.approval);
      return;
    }
    let preparation = run.status === 'draft-ready'
      ? run.preparation
      : run.status === 'failure' && run.kind === 'recoverable_failure' ? run.preparation : undefined;
    if (!preparation) return;
    if (body !== undefined) {
      const normalizedBody = body.trim();
      if (!normalizedBody) return;
      if (normalizedBody !== preparation.draft.body) {
        if (preparation.kind === 'weekly-preparation-notice') {
          preparation = reviseWeeklyPreparationNotice(preparation, normalizedBody);
        } else {
          const revised = reviseHomeworkReminder(preparation, { body: normalizedBody });
          if (!revised) return;
          preparation = revised;
        }
      }
    }
    const approved = approveHomeworkReminder(preparation.action, teacher.id, now());
    if (!approved) {
      commit((current) => Object.freeze({
        ...current,
        run: Object.freeze({
          status: 'failure',
          kind: 'approval_expired',
          message: preparation.kind === 'weekly-preparation-notice'
            ? '通知草稿确认已过期，请刷新本周教学计划后重新确认。'
            : '草稿确认已过期，请刷新作业状态后重新确认。',
          preparation,
        }),
      }));
      return;
    }
    commit((current) => Object.freeze({
      ...current,
      run: Object.freeze({ status: 'sending', preparation, approval: approved.approval }),
      conversation: current.conversation
        ? reviseWorkBuddyImArtifactEvent(current.conversation, preparation.draft)
        : current.conversation,
    }));
    try {
      const receipt = await adapter.execute(approved.action, approved.approval);
      const evaluation = EvaluationModule.recordExecutionOutcome({
        runRef: approved.action.runRef,
        contextSnapshotRef: preparation.contextSnapshot.id,
        artifactRef: { id: preparation.draft.id, version: `v${preparation.draft.version}` },
        action: approved.action,
        approval: approved.approval,
        receipt,
      });
      if (!evaluation) {
        commit((current) => Object.freeze({
          ...current,
          run: Object.freeze({
            status: 'failure', kind: 'evidence_mismatch', preparation, receipt,
            message: '执行回执与当前 Run 的审批证据链不一致；已停止自动执行，请人工核对群消息与审批记录。',
          }),
          receiptHistory: Object.freeze([...current.receiptHistory, receipt]),
        }));
        return;
      }
      if (receipt.status === 'success') {
        commit((current) => Object.freeze({
          ...current,
          run: Object.freeze({ status: 'sent', preparation, approval: approved.approval, receipt, evaluation }),
          conversation: current.conversation ? appendWorkBuddyImEvaluationEvent(current.conversation, receipt, evaluation) : null,
          receiptHistory: Object.freeze([...current.receiptHistory, receipt]),
          evaluationHistory: Object.freeze([...current.evaluationHistory, evaluation]),
        }));
        return;
      }
      commit((current) => Object.freeze({
        ...current,
        run: Object.freeze({ status: 'failure', kind: receipt.status, message: receipt.result, preparation, receipt, evaluation }),
        conversation: current.conversation ? appendWorkBuddyImEvaluationEvent(current.conversation, receipt, evaluation) : current.conversation,
        receiptHistory: Object.freeze([...current.receiptHistory, receipt]),
        evaluationHistory: Object.freeze([...current.evaluationHistory, evaluation]),
      }));
    } catch (error) {
      commit((current) => Object.freeze({
        ...current,
        run: Object.freeze({ status: 'failure', kind: 'recoverable_failure', message: error instanceof Error ? error.message : '消息暂时无法发送', preparation }),
      }));
    }
  }, [adapter, commit, executeGuidedExplanation, now, teacher.id]);

  const actions = useMemo<WorkBuddyImActions>(() => ({
    open, close, editComposerDraft, generate, supplement, removeStudent, removeGroup, restoreChecklist, editBody, reviseExplanation, retryExplanation, approveAndSend,
  }), [approveAndSend, close, editBody, editComposerDraft, generate, open, removeGroup, removeStudent, restoreChecklist, retryExplanation, reviseExplanation, supplement]);
  const value = useMemo(() => ({ state, actions }), [actions, state]);
  return <WorkBuddyImContext.Provider value={value}>{children}</WorkBuddyImContext.Provider>;
}
