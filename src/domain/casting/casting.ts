export type CastingTarget = { id: string; name: string; network: string; kind: 'device' | 'code' };

export type CastingSession =
  | { status: 'idle' }
  | { status: 'connecting'; target: CastingTarget }
  | { status: 'connected'; target: CastingTarget; connectedAt: string }
  | { status: 'failed'; target: CastingTarget; reason: string }
  | { status: 'ended'; previousTarget: CastingTarget };

export type CastingEvent =
  | { type: 'CONNECT'; target: CastingTarget }
  | { type: 'SUCCEED'; connectedAt: string }
  | { type: 'FAIL'; reason: string }
  | { type: 'CANCEL' }
  | { type: 'RETRY' }
  | { type: 'END' }
  | { type: 'RESET' };

export function isCastingCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export function transitionCasting(session: CastingSession, event: CastingEvent): CastingSession {
  switch (event.type) {
    case 'CONNECT':
      return session.status === 'idle' || session.status === 'ended' || session.status === 'failed'
        ? { status: 'connecting', target: event.target }
        : session;
    case 'SUCCEED':
      return session.status === 'connecting'
        ? { status: 'connected', target: session.target, connectedAt: event.connectedAt }
        : session;
    case 'FAIL':
      return session.status === 'connecting'
        ? { status: 'failed', target: session.target, reason: event.reason }
        : session;
    case 'CANCEL':
      return session.status === 'connecting' ? { status: 'idle' } : session;
    case 'RETRY':
      return session.status === 'failed' ? { status: 'connecting', target: session.target } : session;
    case 'END':
      return session.status === 'connected' ? { status: 'ended', previousTarget: session.target } : session;
    case 'RESET':
      return { status: 'idle' };
  }
}
