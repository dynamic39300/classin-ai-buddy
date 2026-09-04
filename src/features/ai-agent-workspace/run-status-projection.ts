import type { WorkBuddyRunState } from '@domain/workbuddy/run-state';

type RunStatusProjection = {
  recoveryLabel: string;
  actionLabel: string;
  actionFeedback: string;
};

const RUN_STATUS_PROJECTIONS: Record<WorkBuddyRunState['status'], RunStatusProjection> = {
  running: { recoveryLabel: '可补充要求，或记录停止意图', actionLabel: '停止任务（本地 Demo）', actionFeedback: '停止意图已记录在当前本地 Demo；尚未连接真实 Agent，任务状态未改变。' },
  waiting: { recoveryLabel: '确认范围后继续，或返回修改要求', actionLabel: '确认并继续（本地 Demo）', actionFeedback: '确认意图已记录在当前本地 Demo；尚未连接真实 Agent，任务仍保持待确认。' },
  completed: { recoveryLabel: '进入 Artifact Focus 复查已完成产物', actionLabel: '复查产物', actionFeedback: 'Artifact Focus：已展开完成产物供教师复查。' },
  failed: { recoveryLabel: '可重试，或修改上下文后重新发起', actionLabel: '重试任务（本地 Demo）', actionFeedback: '重试意图已记录在当前本地 Demo；尚未连接真实 Agent，失败状态未改变。' },
};

export function getRunStatusProjection(state: WorkBuddyRunState) {
  return RUN_STATUS_PROJECTIONS[state.status];
}
