import type {
  ConversationRunCommand,
  ConversationRunCommandReceipt,
  ConversationRunEvent,
  ConversationRunListener,
  ConversationRunModule,
  ConversationRunProjection,
} from '@contracts/workbuddy/conversation-run';

type Subscriber = Readonly<{ listener: ConversationRunListener }>;

function freezeProjection(projection: ConversationRunProjection): ConversationRunProjection {
  return Object.freeze({ ...projection, events: Object.freeze([...projection.events]), allowedCommands: Object.freeze([...projection.allowedCommands]) });
}

function cursorIndex(cursor: string | null, max: number): number {
  if (cursor === null) return 0;
  const parsed = Number.parseInt(cursor, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(max, parsed));
}

export function createDeterministicConversationRunModule(
  initialProjections: readonly ConversationRunProjection[],
): ConversationRunModule {
  const projections = new Map(initialProjections.map((projection) => [projection.runRef, freezeProjection(projection)]));
  const processedCommands = new Set<string>();
  const subscribers = new Map<string, Set<Subscriber>>();
  const commandSequences = new Map<string, number>();

  const notify = (runRef: string, events: readonly ConversationRunEvent[], projection: ConversationRunProjection) => {
    for (const subscriber of subscribers.get(runRef) ?? []) subscriber.listener(events, projection);
  };

  return Object.freeze({
    open: (runRef: string) => projections.get(runRef) ?? null,
    nextCommandId: (runRef: string) => {
      const sequence = (commandSequences.get(runRef) ?? 0) + 1;
      commandSequences.set(runRef, sequence);
      return `${runRef}:teacher-command:${String(sequence).padStart(4, '0')}`;
    },
    dispatch: (runRef: string, command: ConversationRunCommand): ConversationRunCommandReceipt => {
      const current = projections.get(runRef);
      if (!current) return Object.freeze({ commandId: command.id, status: 'rejected', cursor: '0', reason: 'run-not-found' });
      if (processedCommands.has(command.id)) {
        return Object.freeze({ commandId: command.id, status: 'duplicate', cursor: current.cursor });
      }
      if (command.type !== 'supplement' || !current.allowedCommands.includes(command.type) || !command.text.trim()) {
        return Object.freeze({ commandId: command.id, status: 'rejected', cursor: current.cursor, reason: 'command-not-allowed' });
      }
      processedCommands.add(command.id);
      const sequence = current.events.length + 1;
      const event: ConversationRunEvent = Object.freeze({
        id: command.id,
        runRef,
        sequence,
        occurredAt: `deterministic:${String(sequence).padStart(3, '0')}`,
        updatedAt: `deterministic:${String(sequence).padStart(3, '0')}`,
        actor: 'teacher',
        kind: 'teacher_message',
        state: 'completed',
        title: '补充要求',
        summary: command.text.trim(),
        objectRefs: Object.freeze([]),
        allowedCommands: Object.freeze([]),
      });
      const next = freezeProjection({ ...current, events: [...current.events, event], cursor: String(sequence) });
      projections.set(runRef, next);
      notify(runRef, [event], next);
      return Object.freeze({ commandId: command.id, status: 'accepted', cursor: next.cursor });
    },
    subscribe: (runRef: string, cursor: string | null, listener: ConversationRunListener) => {
      const current = projections.get(runRef);
      const subscriber = Object.freeze({ listener });
      const set = subscribers.get(runRef) ?? new Set<Subscriber>();
      set.add(subscriber);
      subscribers.set(runRef, set);
      if (current) {
        const replay = current.events.slice(cursorIndex(cursor, current.events.length));
        if (replay.length) listener(replay, current);
      }
      return () => {
        set.delete(subscriber);
        if (set.size === 0) subscribers.delete(runRef);
      };
    },
  });
}
