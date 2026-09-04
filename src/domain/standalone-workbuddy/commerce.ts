export type AiCreditTaskKind = 'single-courseware' | 'course-package' | 'quiz-activity-creation';

export type AiCreditQuote = Readonly<{ taskKind: AiCreditTaskKind; amount: number; label: string }>;
export type AiCreditReservationStatus = 'reserved' | 'settled' | 'released';
export type AiCreditReservationRecord = Readonly<{
  id: string;
  accountId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  taskKind: AiCreditTaskKind;
  amount: number;
  status: AiCreditReservationStatus;
  runRef?: string;
}>;
export type AiCreditLedgerEntry = Readonly<{
  id: string;
  accountId: string;
  kind: 'welcome_grant' | 'task_charge' | 'reservation_released' | 'membership_grant';
  amount: number;
  balanceAfter: number;
  referenceId: string;
  truthLabel: '[模拟]';
}>;
export type AiCreditWallet = Readonly<{ accountId: string; version: number; balance: number }>;
export type MembershipPlanId = 'free' | 'teaching' | 'professional';
export type MembershipPlan = Readonly<{ id: MembershipPlanId; name: string; priceCny: number; credits: number; cadence: 'monthly' }>;
export type MembershipOrder = Readonly<{
  id: string;
  accountId: string;
  planId: MembershipPlanId;
  idempotencyKey: string;
  requestFingerprint: string;
  status: 'processing' | 'completed';
  receiptId?: string;
}>;
export type StandaloneCommerceSession = Readonly<{
  version: 1;
  wallets: readonly AiCreditWallet[];
  reservations: readonly AiCreditReservationRecord[];
  ledger: readonly AiCreditLedgerEntry[];
  orders: readonly MembershipOrder[];
}>;

export type AiCreditViewModel = Readonly<{
  balance: number;
  availableBalance: number;
  reserved: number;
  ledger: readonly AiCreditLedgerEntry[];
}>;

export type CreditReservation =
  | Readonly<{ status: 'reserved'; id: string; idempotencyKey: string; amount: number }>
  | Readonly<{ status: 'insufficient'; required: number; available: number }>
  | Readonly<{ status: 'evidence_mismatch'; idempotencyKey: string }>;

export type CreditCommandResult =
  | Readonly<{ status: 'success'; reservationId: string; balance: number }>
  | Readonly<{ status: 'not_found' | 'invalid_state' }>;

export type MembershipOrderResult =
  | Readonly<{ status: 'processing'; order: MembershipOrder }>
  | Readonly<{ status: 'plan_not_purchasable' }>
  | Readonly<{ status: 'evidence_mismatch'; idempotencyKey: string }>;

export type MembershipOrderReceipt =
  | Readonly<{ status: 'success'; orderId: string; receiptId: string; grantedCredits: number; balance: number; truthLabel: '[模拟]' }>
  | Readonly<{ status: 'not_found' }>;

export type AiCreditModule = Readonly<{
  ensureAccount: (accountId: string) => void;
  view: (accountId: string) => AiCreditViewModel;
  quote: (taskKind: AiCreditTaskKind) => AiCreditQuote;
  reserve: (input: Readonly<{ accountId: string; taskKind: AiCreditTaskKind; goal: string; workspaceNamespace: string; idempotencyKey: string }>) => CreditReservation;
  settle: (reservationId: string, runRef: string) => CreditCommandResult;
  release: (reservationId: string, reason: string) => CreditCommandResult;
  createOrder: (input: Readonly<{ accountId: string; planId: MembershipPlanId; idempotencyKey: string }>) => MembershipOrderResult;
  completeOrder: (orderId: string) => MembershipOrderReceipt;
  exportSession: () => StandaloneCommerceSession;
}>;

export const MEMBERSHIP_PLANS: readonly MembershipPlan[] = Object.freeze([
  Object.freeze({ id: 'free', name: '免费体验', priceCny: 0, credits: 360, cadence: 'monthly' as const }),
  Object.freeze({ id: 'teaching', name: '标准版', priceCny: 39, credits: 1500, cadence: 'monthly' as const }),
  Object.freeze({ id: 'professional', name: '专业版', priceCny: 89, credits: 4200, cadence: 'monthly' as const }),
]);

const QUOTES: Readonly<Record<AiCreditTaskKind, AiCreditQuote>> = Object.freeze({
  'single-courseware': Object.freeze({ taskKind: 'single-courseware', amount: 60, label: '生成单个课件' }),
  'course-package': Object.freeze({ taskKind: 'course-package', amount: 120, label: '生成课程方案包' }),
  'quiz-activity-creation': Object.freeze({ taskKind: 'quiz-activity-creation', amount: 80, label: '生成测验与活动草稿' }),
});

function stableFingerprint(parts: readonly string[]): string {
  let hash = 0x811c9dc5;
  for (const character of parts.join('\u001f')) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

export function isStandaloneCommerceSession(value: unknown): value is StandaloneCommerceSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StandaloneCommerceSession>;
  if (candidate.version !== 1 || !Array.isArray(candidate.wallets) || !Array.isArray(candidate.reservations) || !Array.isArray(candidate.ledger) || !Array.isArray(candidate.orders)) return false;
  const wallets = new Map<string, number>();
  for (const wallet of candidate.wallets) {
    if (!wallet || typeof wallet.accountId !== 'string' || !wallet.accountId || !Number.isSafeInteger(wallet.version) || wallet.version < 1 || !isSafeNonNegativeInteger(wallet.balance) || wallets.has(wallet.accountId)) return false;
    wallets.set(wallet.accountId, wallet.balance);
  }
  const reservationIds = new Set<string>();
  const reservationKeys = new Set<string>();
  for (const reservation of candidate.reservations) {
    if (!reservation || typeof reservation.id !== 'string' || !reservation.id || reservationIds.has(reservation.id) || reservationKeys.has(reservation.idempotencyKey) || !wallets.has(reservation.accountId)) return false;
    if (typeof reservation.taskKind !== 'string' || !Object.hasOwn(QUOTES, reservation.taskKind)) return false;
    const persistedQuote = QUOTES[reservation.taskKind as AiCreditTaskKind];
    if (!['reserved', 'settled', 'released'].includes(reservation.status) || !isSafeNonNegativeInteger(reservation.amount) || reservation.amount !== persistedQuote.amount) return false;
    if (typeof reservation.idempotencyKey !== 'string' || !reservation.idempotencyKey || typeof reservation.requestFingerprint !== 'string' || !/^[0-9a-f]{8}$/.test(reservation.requestFingerprint)) return false;
    if (reservation.status === 'settled' ? typeof reservation.runRef !== 'string' || !reservation.runRef : reservation.runRef !== undefined) return false;
    reservationIds.add(reservation.id);
    reservationKeys.add(reservation.idempotencyKey);
  }
  const ledgerIds = new Set<string>();
  const runningBalances = new Map<string, number>();
  for (const entry of candidate.ledger) {
    if (!entry || typeof entry.id !== 'string' || !entry.id || ledgerIds.has(entry.id) || !wallets.has(entry.accountId) || !isSafeNonNegativeInteger(entry.balanceAfter) || !Number.isSafeInteger(entry.amount) || entry.truthLabel !== '[模拟]' || typeof entry.referenceId !== 'string' || !entry.referenceId) return false;
    if (!['welcome_grant', 'task_charge', 'reservation_released', 'membership_grant'].includes(entry.kind)) return false;
    const previous = runningBalances.get(entry.accountId) ?? 0;
    if (entry.balanceAfter !== previous + entry.amount) return false;
    if (entry.kind === 'welcome_grant' && (previous !== 0 || entry.amount !== 360 || entry.referenceId !== entry.accountId)) return false;
    if (entry.kind === 'task_charge' && (entry.amount >= 0 || !candidate.reservations.some((reservation) => reservation.id === entry.referenceId && reservation.status === 'settled' && reservation.accountId === entry.accountId && reservation.amount === -entry.amount))) return false;
    if (entry.kind === 'reservation_released' && (entry.amount !== 0 || !candidate.reservations.some((reservation) => reservation.id === entry.referenceId && reservation.status === 'released' && reservation.accountId === entry.accountId))) return false;
    runningBalances.set(entry.accountId, entry.balanceAfter);
    ledgerIds.add(entry.id);
  }
  const orderIds = new Set<string>();
  const orderKeys = new Set<string>();
  for (const order of candidate.orders) {
    if (!order || typeof order.id !== 'string' || !order.id || orderIds.has(order.id) || orderKeys.has(order.idempotencyKey) || !wallets.has(order.accountId) || !MEMBERSHIP_PLANS.some(({ id }) => id === order.planId) || order.planId === 'free') return false;
    if (!['processing', 'completed'].includes(order.status) || typeof order.idempotencyKey !== 'string' || !order.idempotencyKey || typeof order.requestFingerprint !== 'string' || !/^[0-9a-f]{8}$/.test(order.requestFingerprint)) return false;
    if ((order.status === 'completed') !== (typeof order.receiptId === 'string')) return false;
    orderIds.add(order.id);
    orderKeys.add(order.idempotencyKey);
  }
  for (const entry of candidate.ledger) {
    if (entry.kind === 'membership_grant' && (entry.amount <= 0 || !candidate.orders.some((order) => order.status === 'completed' && order.receiptId === entry.referenceId && order.accountId === entry.accountId && MEMBERSHIP_PLANS.find(({ id }) => id === order.planId)?.credits === entry.amount))) return false;
  }
  for (const reservation of candidate.reservations) {
    const related = candidate.ledger.filter((entry) => entry.accountId === reservation.accountId && (
      (entry.kind === 'task_charge' && entry.referenceId === reservation.id)
      || (entry.kind === 'reservation_released' && entry.referenceId === reservation.id)
    ));
    if (reservation.status === 'reserved' && related.length !== 0) return false;
    if (reservation.status === 'settled' && (related.length !== 1 || related[0]?.kind !== 'task_charge' || related[0].amount !== -reservation.amount)) return false;
    if (reservation.status === 'released' && (related.length !== 1 || related[0]?.kind !== 'reservation_released')) return false;
  }
  for (const order of candidate.orders) {
    const grants = candidate.ledger.filter((entry) => entry.kind === 'membership_grant' && entry.referenceId === order.receiptId);
    if (order.status === 'processing' && grants.length !== 0) return false;
    if (order.status === 'completed' && grants.length !== 1) return false;
  }
  for (const [accountId, balance] of wallets) {
    const reserved = candidate.reservations.filter((record) => record.accountId === accountId && record.status === 'reserved').reduce((sum, record) => sum + record.amount, 0);
    if (reserved > balance) return false;
  }
  if ([...wallets].some(([accountId, balance]) => runningBalances.get(accountId) !== balance)) return false;
  return true;
}

export function createAiCreditModule(initialSession?: StandaloneCommerceSession): AiCreditModule {
  let wallets = [...(initialSession?.wallets ?? [])];
  let reservations = [...(initialSession?.reservations ?? [])];
  let ledger = [...(initialSession?.ledger ?? [])];
  let orders = [...(initialSession?.orders ?? [])];

  const updateWallet = (accountId: string, balance: number) => {
    wallets = wallets.map((wallet) => wallet.accountId === accountId
      ? Object.freeze({ ...wallet, balance, version: wallet.version + 1 })
      : wallet);
  };
  const ensureAccount = (accountId: string) => {
    if (wallets.some((wallet) => wallet.accountId === accountId)) return;
    wallets = [...wallets, Object.freeze({ accountId, version: 1, balance: 360 })];
    ledger = [...ledger, Object.freeze({ id: `ledger-welcome-${accountId}`, accountId, kind: 'welcome_grant' as const, amount: 360, balanceAfter: 360, referenceId: accountId, truthLabel: '[模拟]' as const })];
  };
  const view = (accountId: string): AiCreditViewModel => {
    ensureAccount(accountId);
    const balance = wallets.find((wallet) => wallet.accountId === accountId)?.balance ?? 0;
    const reserved = reservations.filter((record) => record.accountId === accountId && record.status === 'reserved').reduce((sum, record) => sum + record.amount, 0);
    return Object.freeze({ balance, reserved, availableBalance: balance - reserved, ledger: Object.freeze(ledger.filter((entry) => entry.accountId === accountId).slice().reverse()) });
  };
  const exportSession = (): StandaloneCommerceSession => Object.freeze({
    version: 1,
    wallets: Object.freeze(wallets),
    reservations: Object.freeze(reservations),
    ledger: Object.freeze(ledger),
    orders: Object.freeze(orders),
  });

  return Object.freeze({
    ensureAccount,
    view,
    quote: (taskKind) => QUOTES[taskKind],
    reserve: (input) => {
      ensureAccount(input.accountId);
      const fingerprint = stableFingerprint([input.accountId, input.taskKind, input.goal.trim(), input.workspaceNamespace]);
      const existing = reservations.find((record) => record.idempotencyKey === input.idempotencyKey);
      if (existing) {
        if (existing.requestFingerprint !== fingerprint) return Object.freeze({ status: 'evidence_mismatch' as const, idempotencyKey: input.idempotencyKey });
        return Object.freeze({ status: 'reserved' as const, id: existing.id, idempotencyKey: existing.idempotencyKey, amount: existing.amount });
      }
      const quote = QUOTES[input.taskKind];
      const available = view(input.accountId).availableBalance;
      if (available < quote.amount) return Object.freeze({ status: 'insufficient' as const, required: quote.amount, available });
      const id = `reservation-${stableFingerprint([input.idempotencyKey])}`;
      reservations = [...reservations, Object.freeze({ id, accountId: input.accountId, idempotencyKey: input.idempotencyKey, requestFingerprint: fingerprint, taskKind: input.taskKind, amount: quote.amount, status: 'reserved' as const })];
      return Object.freeze({ status: 'reserved' as const, id, idempotencyKey: input.idempotencyKey, amount: quote.amount });
    },
    settle: (reservationId, runRef) => {
      const existing = reservations.find((record) => record.id === reservationId);
      if (!existing) return Object.freeze({ status: 'not_found' as const });
      const wallet = wallets.find(({ accountId }) => accountId === existing.accountId);
      if (!wallet) return Object.freeze({ status: 'not_found' as const });
      if (existing.status === 'settled' && existing.runRef === runRef) return Object.freeze({ status: 'success' as const, reservationId, balance: wallet.balance });
      if (existing.status !== 'reserved') return Object.freeze({ status: 'invalid_state' as const });
      const balance = wallet.balance - existing.amount;
      if (balance < 0) return Object.freeze({ status: 'invalid_state' as const });
      reservations = reservations.map((record) => record.id === reservationId ? Object.freeze({ ...record, status: 'settled' as const, runRef }) : record);
      updateWallet(existing.accountId, balance);
      ledger = [...ledger, Object.freeze({ id: `ledger-charge-${reservationId}`, accountId: existing.accountId, kind: 'task_charge' as const, amount: -existing.amount, balanceAfter: balance, referenceId: reservationId, truthLabel: '[模拟]' as const })];
      return Object.freeze({ status: 'success' as const, reservationId, balance });
    },
    release: (reservationId) => {
      const existing = reservations.find((record) => record.id === reservationId);
      if (!existing) return Object.freeze({ status: 'not_found' as const });
      const wallet = wallets.find(({ accountId }) => accountId === existing.accountId);
      if (!wallet) return Object.freeze({ status: 'not_found' as const });
      if (existing.status === 'released') return Object.freeze({ status: 'success' as const, reservationId, balance: wallet.balance });
      if (existing.status !== 'reserved') return Object.freeze({ status: 'invalid_state' as const });
      reservations = reservations.map((record) => record.id === reservationId ? Object.freeze({ ...record, status: 'released' as const }) : record);
      ledger = [...ledger, Object.freeze({ id: `ledger-release-${reservationId}`, accountId: existing.accountId, kind: 'reservation_released' as const, amount: 0, balanceAfter: wallet.balance, referenceId: reservationId, truthLabel: '[模拟]' as const })];
      return Object.freeze({ status: 'success' as const, reservationId, balance: wallet.balance });
    },
    createOrder: ({ accountId, planId, idempotencyKey }) => {
      ensureAccount(accountId);
      if (planId === 'free') return Object.freeze({ status: 'plan_not_purchasable' as const });
      const fingerprint = stableFingerprint([accountId, planId]);
      const existing = orders.find((order) => order.idempotencyKey === idempotencyKey);
      if (existing) {
        if (existing.requestFingerprint !== fingerprint) return Object.freeze({ status: 'evidence_mismatch' as const, idempotencyKey });
        return Object.freeze({ status: 'processing' as const, order: existing });
      }
      const order = Object.freeze({ id: `order-${stableFingerprint([idempotencyKey])}`, accountId, planId, idempotencyKey, requestFingerprint: fingerprint, status: 'processing' as const });
      orders = [...orders, order];
      return Object.freeze({ status: 'processing' as const, order });
    },
    completeOrder: (orderId) => {
      const order = orders.find((candidate) => candidate.id === orderId);
      if (!order) return Object.freeze({ status: 'not_found' as const });
      const plan = MEMBERSHIP_PLANS.find(({ id }) => id === order.planId)!;
      const wallet = wallets.find(({ accountId }) => accountId === order.accountId)!;
      const receiptId = order.receiptId ?? `membership-receipt-${order.id}`;
      if (order.status === 'completed') return Object.freeze({ status: 'success' as const, orderId, receiptId, grantedCredits: plan.credits, balance: wallet.balance, truthLabel: '[模拟]' as const });
      const balance = wallet.balance + plan.credits;
      if (!Number.isSafeInteger(balance)) return Object.freeze({ status: 'not_found' as const });
      orders = orders.map((candidate) => candidate.id === orderId ? Object.freeze({ ...candidate, status: 'completed' as const, receiptId }) : candidate);
      updateWallet(order.accountId, balance);
      ledger = [...ledger, Object.freeze({ id: `ledger-grant-${orderId}`, accountId: order.accountId, kind: 'membership_grant' as const, amount: plan.credits, balanceAfter: balance, referenceId: receiptId, truthLabel: '[模拟]' as const })];
      return Object.freeze({ status: 'success' as const, orderId, receiptId, grantedCredits: plan.credits, balance, truthLabel: '[模拟]' as const });
    },
    exportSession,
  });
}
