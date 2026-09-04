import { describe, expect, it } from 'vitest';
import { isCastingCode, transitionCasting, type CastingSession, type CastingTarget } from './casting';

const target: CastingTarget = { id: 'screen', name: '2大屏', network: 'Demo', kind: 'device' };

describe('casting session', () => {
  it('accepts only a six digit casting code', () => {
    expect(isCastingCode('246810')).toBe(true);
    expect(isCastingCode('24681')).toBe(false);
    expect(isCastingCode('24A810')).toBe(false);
  });

  it('moves through connecting, connected, and ended', () => {
    const connecting = transitionCasting({ status: 'idle' }, { type: 'CONNECT', target });
    const connected = transitionCasting(connecting, { type: 'SUCCEED', connectedAt: '14:15' });
    expect(connected).toEqual({ status: 'connected', target, connectedAt: '14:15' });
    expect(transitionCasting(connected, { type: 'END' })).toEqual({ status: 'ended', previousTarget: target });
  });

  it('supports deterministic failure and retry while rejecting illegal transitions', () => {
    const connecting = transitionCasting({ status: 'idle' }, { type: 'CONNECT', target });
    const failed = transitionCasting(connecting, { type: 'FAIL', reason: '未响应' });
    expect(transitionCasting(failed, { type: 'RETRY' })).toEqual({ status: 'connecting', target });
    const connected: CastingSession = { status: 'connected', target, connectedAt: '14:15' };
    expect(transitionCasting(connected, { type: 'RETRY' })).toBe(connected);
  });

  it('cancels a connecting session and resets any terminal session', () => {
    const connecting = transitionCasting({ status: 'idle' }, { type: 'CONNECT', target });
    expect(transitionCasting(connecting, { type: 'CANCEL' })).toEqual({ status: 'idle' });
    expect(transitionCasting({ status: 'failed', target, reason: '未响应' }, { type: 'RESET' })).toEqual({ status: 'idle' });
  });

  it('rejects success, failure, cancel, and end outside their owning state', () => {
    const idle: CastingSession = { status: 'idle' };
    expect(transitionCasting(idle, { type: 'SUCCEED', connectedAt: '14:15' })).toBe(idle);
    expect(transitionCasting(idle, { type: 'FAIL', reason: '未响应' })).toBe(idle);
    expect(transitionCasting(idle, { type: 'CANCEL' })).toBe(idle);
    expect(transitionCasting(idle, { type: 'END' })).toBe(idle);
    const connected: CastingSession = { status: 'connected', target, connectedAt: '14:15' };
    expect(transitionCasting(connected, { type: 'CONNECT', target })).toBe(connected);
  });
});
