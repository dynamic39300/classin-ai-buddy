import { describe, expect, it } from 'vitest';
import { resolveRoleSwitch } from './role-switch-policy';

describe('resolveRoleSwitch', () => {
  it('switches immediately during ordinary browsing', () => {
    expect(resolveRoleSwitch({ kind: 'idle' })).toEqual({ kind: 'switch-now' });
  });

  it('saves an eligible draft before switching', () => {
    expect(resolveRoleSwitch({ kind: 'draft', canAutoSave: true })).toEqual({
      kind: 'save-then-switch',
    });
  });

  it('requests a decision for unsaved work', () => {
    expect(resolveRoleSwitch({ kind: 'draft', canAutoSave: false })).toEqual({
      kind: 'confirm-unsaved',
    });
    expect(resolveRoleSwitch({ kind: 'unsaved-edit' })).toEqual({
      kind: 'confirm-unsaved',
    });
  });

  it.each(['submit', 'upload', 'classroom', 'casting'] as const)(
    'blocks switching during %s',
    (operation) => {
      const decision = resolveRoleSwitch({ kind: 'critical-operation', operation });
      expect(decision.kind).toBe('blocked');
      if (decision.kind === 'blocked') {
        expect(decision.reason).toContain('再切换视角');
      }
    },
  );
});
