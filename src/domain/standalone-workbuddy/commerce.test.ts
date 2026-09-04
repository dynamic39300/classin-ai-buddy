import { describe, expect, it } from 'vitest';
import { createAiCreditModule, isStandaloneCommerceSession } from './commerce';

describe('AiCreditModule', () => {
  it('quotes, reserves and settles exactly once', () => {
    const module = createAiCreditModule();
    module.ensureAccount('teacher-1');
    expect(module.quote('single-courseware').amount).toBe(60);
    const reserved = module.reserve({ accountId: 'teacher-1', taskKind: 'single-courseware', goal: '生成课件', workspaceNamespace: 'standalone-teacher', idempotencyKey: 'task-1' });
    expect(reserved).toMatchObject({ status: 'reserved', amount: 60 });
    if (reserved.status !== 'reserved') throw new Error('expected reservation');
    expect(module.view('teacher-1').availableBalance).toBe(300);
    expect(module.settle(reserved.id, 'run-1')).toMatchObject({ status: 'success', balance: 300 });
    expect(module.settle(reserved.id, 'run-1')).toMatchObject({ status: 'success', balance: 300 });
    expect(module.view('teacher-1').ledger.filter(({ kind }) => kind === 'task_charge')).toHaveLength(1);
  });

  it('fails closed when a key is reused with a different request', () => {
    const module = createAiCreditModule();
    module.reserve({ accountId: 'teacher-1', taskKind: 'single-courseware', goal: '生成课件', workspaceNamespace: 'standalone-teacher', idempotencyKey: 'same-key' });
    expect(module.reserve({ accountId: 'teacher-1', taskKind: 'single-courseware', goal: '另一份课件', workspaceNamespace: 'standalone-teacher', idempotencyKey: 'same-key' })).toEqual({ status: 'evidence_mismatch', idempotencyKey: 'same-key' });
  });

  it('releases failed task reservations and grants a membership order once', () => {
    const module = createAiCreditModule();
    const reserved = module.reserve({ accountId: 'teacher-1', taskKind: 'course-package', goal: '生成方案包', workspaceNamespace: 'standalone-teacher', idempotencyKey: 'task-2' });
    if (reserved.status !== 'reserved') throw new Error('expected reservation');
    module.release(reserved.id, 'run-not-created');
    expect(module.view('teacher-1').availableBalance).toBe(360);
    const order = module.createOrder({ accountId: 'teacher-1', planId: 'teaching', idempotencyKey: 'order-1' });
    if (order.status !== 'processing') throw new Error('expected order');
    expect(module.completeOrder(order.order.id)).toMatchObject({ status: 'success', grantedCredits: 1500, balance: 1860, truthLabel: '[模拟]' });
    expect(module.completeOrder(order.order.id)).toMatchObject({ status: 'success', balance: 1860 });
    expect(module.view('teacher-1').ledger.filter(({ kind }) => kind === 'membership_grant')).toHaveLength(1);
    expect(isStandaloneCommerceSession(module.exportSession())).toBe(true);
  });

  it('does not sell the welcome tier or accept a ledger with broken balance continuity', () => {
    const module = createAiCreditModule();
    module.ensureAccount('teacher-1');
    expect(module.createOrder({ accountId: 'teacher-1', planId: 'free', idempotencyKey: 'free-again' })).toEqual({ status: 'plan_not_purchasable' });
    const session = module.exportSession();
    const invalid = { ...session, ledger: session.ledger.map((entry) => ({ ...entry, balanceAfter: entry.balanceAfter + 1 })) };
    expect(isStandaloneCommerceSession(invalid)).toBe(false);
  });

  it('rejects persisted evidence with duplicate settlement entries or over-reserved balance', () => {
    const module = createAiCreditModule();
    const reserved = module.reserve({ accountId: 'teacher-1', taskKind: 'single-courseware', goal: '生成课件', workspaceNamespace: 'standalone-teacher', idempotencyKey: 'task-guard' });
    if (reserved.status !== 'reserved') throw new Error('expected reservation');
    module.settle(reserved.id, 'run-guard');
    const session = module.exportSession();
    expect(isStandaloneCommerceSession({ ...session, ledger: [...session.ledger, session.ledger.at(-1)] })).toBe(false);
    expect(isStandaloneCommerceSession({
      ...session,
      reservations: [...session.reservations, { ...session.reservations[0], id: 'reservation-over', idempotencyKey: 'over', requestFingerprint: '1234abcd', status: 'reserved', amount: 60 }],
      wallets: session.wallets.map((wallet) => ({ ...wallet, balance: 0 })),
    })).toBe(false);
  });

  it('keeps separate charges traceable when the prototype reuses a stable Run reference', () => {
    const module = createAiCreditModule();
    const first = module.reserve({ accountId: 'teacher-1', taskKind: 'single-courseware', goal: '第一份课件', workspaceNamespace: 'standalone-teacher', idempotencyKey: 'task-first' });
    const second = module.reserve({ accountId: 'teacher-1', taskKind: 'single-courseware', goal: '第二份课件', workspaceNamespace: 'standalone-teacher', idempotencyKey: 'task-second' });
    if (first.status !== 'reserved' || second.status !== 'reserved') throw new Error('expected reservations');
    module.settle(first.id, 'run-m4-courseware');
    module.settle(second.id, 'run-m4-courseware');
    expect(module.view('teacher-1').balance).toBe(240);
    expect(isStandaloneCommerceSession(module.exportSession())).toBe(true);
  });
});
