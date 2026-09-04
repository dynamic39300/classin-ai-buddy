import { useState, type ReactNode } from 'react';
import {
  createAiCreditModule,
  MEMBERSHIP_PLANS,
  type AiCreditTaskKind,
} from '@domain/standalone-workbuddy/commerce';
import {
  createStandaloneTeacherIdentityModule,
} from '@domain/standalone-workbuddy/identity';
import { createStandaloneContentModule, type PublishPersonalContentInput } from '@domain/standalone-workbuddy/content';
import type { WorkBuddyTaskAdmission } from '@features/ai-agent-workspace';
import {
  loadStandaloneCommerceSession,
  loadStandaloneContentSession,
  loadStandaloneIdentitySession,
  saveStandaloneCommerceSession,
  saveStandaloneContentSession,
  saveStandaloneIdentitySession,
} from './standalone-session';
import { StandaloneTeacherContext, type StandaloneTeacherExperience } from './standalone-teacher-context';

function taskKind(value: string): AiCreditTaskKind | null {
  return value === 'single-courseware' || value === 'course-package' || value === 'quiz-activity-creation' ? value : null;
}

export function StandaloneTeacherProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [identityModule] = useState(() => createStandaloneTeacherIdentityModule(loadStandaloneIdentitySession()));
  const [commerceModule] = useState(() => createAiCreditModule(loadStandaloneCommerceSession()));
  const [contentModule] = useState(() => createStandaloneContentModule(loadStandaloneContentSession()));
  const [, render] = useState(0);
  const refresh = () => render((value) => value + 1);
  const persist = () => {
    saveStandaloneIdentitySession(identityModule.exportSession());
    saveStandaloneCommerceSession(commerceModule.exportSession());
    saveStandaloneContentSession(contentModule.exportSession());
    refresh();
  };
  const identity = identityModule.view();
  const accountId = identity.status === 'signed_in' ? identity.teacher.id : null;
  const creditView = accountId ? commerceModule.view(accountId) : null;
  const taskAdmission: WorkBuddyTaskAdmission = Object.freeze({
    quote: (value) => {
      const kind = taskKind(value);
      return kind ? commerceModule.quote(kind) : null;
    },
    start: ({ taskType, goal, createRun }) => {
      const currentIdentity = identityModule.view();
      const kind = taskKind(taskType);
      if (currentIdentity.status !== 'signed_in' || !kind) return Object.freeze({ ok: false as const, reason: 'run_not_created' as const });
      const accountView = commerceModule.view(currentIdentity.teacher.id);
      const idempotencyKey = `standalone-task-${currentIdentity.teacher.id}-${accountView.balance}-${accountView.ledger.length}`;
      const reservation = commerceModule.reserve({
        accountId: currentIdentity.teacher.id,
        taskKind: kind,
        goal,
        workspaceNamespace: `standalone-teacher:${currentIdentity.teacher.id}`,
        idempotencyKey,
      });
      if (reservation.status === 'insufficient') return Object.freeze({ ok: false as const, reason: 'insufficient_credits' as const });
      if (reservation.status === 'evidence_mismatch') return Object.freeze({ ok: false as const, reason: 'evidence_mismatch' as const });
      const runId = createRun();
      if (!runId) {
        commerceModule.release(reservation.id, 'run-not-created');
        persist();
        return Object.freeze({ ok: false as const, reason: 'run_not_created' as const });
      }
      commerceModule.settle(reservation.id, runId);
      persist();
      return Object.freeze({ ok: true as const, runId });
    },
  });

  const value: StandaloneTeacherExperience = Object.freeze({
    identity,
    register: (input) => {
      const result = identityModule.register(input);
      if (result.ok) commerceModule.ensureAccount(result.teacher.id);
      persist();
      return result;
    },
    login: (input) => {
      const result = identityModule.login(input);
      if (result.ok) commerceModule.ensureAccount(result.teacher.id);
      persist();
      return result;
    },
    logout: () => { identityModule.logout(); persist(); },
    creditView,
    membershipPlans: MEMBERSHIP_PLANS,
    purchasePlan: (planId) => {
      const currentIdentity = identityModule.view();
      if (currentIdentity.status !== 'signed_in') return Object.freeze({ ok: false as const });
      const accountView = commerceModule.view(currentIdentity.teacher.id);
      const order = commerceModule.createOrder({
        accountId: currentIdentity.teacher.id,
        planId,
        idempotencyKey: `standalone-order-${currentIdentity.teacher.id}-${planId}-${accountView.balance}-${accountView.ledger.length}`,
      });
      if (order.status !== 'processing') return Object.freeze({ ok: false as const });
      const receipt = commerceModule.completeOrder(order.order.id);
      persist();
      return receipt.status === 'success'
        ? Object.freeze({ ok: true as const, grantedCredits: receipt.grantedCredits })
        : Object.freeze({ ok: false as const });
    },
    taskAdmission,
    personalContent: accountId ? Object.freeze({
      accountId,
      list: () => contentModule.list(accountId),
      receiptForArtifact: (artifactId: string) => contentModule.receiptForArtifact(accountId, artifactId),
      publish: (input: Omit<PublishPersonalContentInput, 'accountId'>) => {
        const result = contentModule.publish({ ...input, accountId });
        persist();
        return result;
      },
    }) : null,
  });
  return <StandaloneTeacherContext.Provider value={value}>{children}</StandaloneTeacherContext.Provider>;
}
