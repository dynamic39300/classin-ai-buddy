export type CriticalOperation = 'submit' | 'upload' | 'classroom' | 'casting';

export type RoleSwitchContext =
  | { kind: 'idle' }
  | { kind: 'draft'; canAutoSave: boolean }
  | { kind: 'unsaved-edit' }
  | { kind: 'critical-operation'; operation: CriticalOperation };

export type RoleSwitchDecision =
  | { kind: 'switch-now' }
  | { kind: 'save-then-switch' }
  | { kind: 'confirm-unsaved' }
  | { kind: 'blocked'; reason: string };

const OPERATION_LABELS: Record<CriticalOperation, string> = {
  submit: '提交正在进行中',
  upload: '上传正在进行中',
  classroom: '课堂正在进行中',
  casting: '投屏正在进行中',
};

export function resolveRoleSwitch(context: RoleSwitchContext): RoleSwitchDecision {
  switch (context.kind) {
    case 'idle':
      return { kind: 'switch-now' };
    case 'draft':
      return context.canAutoSave
        ? { kind: 'save-then-switch' }
        : { kind: 'confirm-unsaved' };
    case 'unsaved-edit':
      return { kind: 'confirm-unsaved' };
    case 'critical-operation':
      return {
        kind: 'blocked',
        reason: `${OPERATION_LABELS[context.operation]}，请完成或结束当前操作后再切换视角。`,
      };
  }
}
