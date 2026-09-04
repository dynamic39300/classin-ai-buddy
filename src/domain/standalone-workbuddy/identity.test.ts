import { describe, expect, it } from 'vitest';
import { createStandaloneTeacherIdentityModule, isStandaloneIdentitySession } from './identity';

describe('StandaloneTeacherIdentityModule', () => {
  it('normalizes a teacher account and restores its signed-in session', () => {
    const identity = createStandaloneTeacherIdentityModule();
    const result = identity.register({ name: ' 林老师 ', email: 'LIN@EXAMPLE.COM ', password: 'teaching88' });
    expect(result).toMatchObject({ ok: true, teacher: { name: '林老师', email: 'lin@example.com' } });
    expect(identity.exportSession().accounts[0]?.credentialFingerprint).not.toContain('teaching88');
    const restored = createStandaloneTeacherIdentityModule(identity.exportSession());
    expect(restored.view()).toMatchObject({ status: 'signed_in', teacher: { email: 'lin@example.com' } });
  });

  it('rejects invalid and duplicate registration plus wrong credentials', () => {
    const identity = createStandaloneTeacherIdentityModule();
    expect(identity.register({ name: '林', email: 'bad', password: 'short' })).toEqual({ ok: false, reason: 'invalid_name' });
    identity.register({ name: '林老师', email: 'lin@example.com', password: 'teaching88' });
    identity.logout();
    expect(identity.login({ email: 'lin@example.com', password: 'incorrect' })).toEqual({ ok: false, reason: 'invalid_credentials' });
    expect(identity.register({ name: '另一位老师', email: 'LIN@example.com', password: 'teaching99' })).toEqual({ ok: false, reason: 'email_exists' });
  });

  it('fails closed for a session whose signed-in teacher does not exist', () => {
    const invalid = { version: 1, accounts: [], signedInTeacherId: 'missing' };
    expect(isStandaloneIdentitySession(invalid)).toBe(false);
  });

  it('fails closed when persisted identity evidence is not bound to the normalized email', () => {
    const identity = createStandaloneTeacherIdentityModule();
    identity.register({ name: '林老师', email: 'lin@example.com', password: 'teaching88' });
    const session = identity.exportSession();
    expect(isStandaloneIdentitySession({
      ...session,
      accounts: session.accounts.map((account) => ({ ...account, teacher: { ...account.teacher, id: 'standalone-teacher-tampered' } })),
    })).toBe(false);
    expect(isStandaloneIdentitySession({
      ...session,
      accounts: session.accounts.map((account) => ({ ...account, credentialFingerprint: 'demo-fingerprint-not-hex' })),
    })).toBe(false);
  });
});
