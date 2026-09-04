export type StandaloneTeacher = Readonly<{
  id: string;
  name: string;
  email: string;
  version: number;
}>;

export type IdentityState =
  | Readonly<{ status: 'signed_out' }>
  | Readonly<{ status: 'signed_in'; teacher: StandaloneTeacher }>;

export type StandaloneTeacherAccount = Readonly<{
  teacher: StandaloneTeacher;
  credentialFingerprint: string;
}>;

export type StandaloneIdentitySession = Readonly<{
  version: 1;
  accounts: readonly StandaloneTeacherAccount[];
  signedInTeacherId: string | null;
}>;

export type RegisterResult =
  | Readonly<{ ok: true; teacher: StandaloneTeacher }>
  | Readonly<{ ok: false; reason: 'invalid_name' | 'invalid_email' | 'weak_password' | 'email_exists' }>;

export type LoginResult =
  | Readonly<{ ok: true; teacher: StandaloneTeacher }>
  | Readonly<{ ok: false; reason: 'invalid_credentials' }>;

export type StandaloneTeacherIdentityModule = Readonly<{
  view: () => IdentityState;
  register: (input: Readonly<{ name: string; email: string; password: string }>) => RegisterResult;
  login: (input: Readonly<{ email: string; password: string }>) => LoginResult;
  logout: () => void;
  exportSession: () => StandaloneIdentitySession;
}>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

function stableFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return `demo-fingerprint-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function createTeacherId(email: string): string {
  return `standalone-teacher-${stableFingerprint(email).slice(-8)}`;
}

export function isStandaloneIdentitySession(value: unknown): value is StandaloneIdentitySession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StandaloneIdentitySession>;
  if (candidate.version !== 1 || !Array.isArray(candidate.accounts)) return false;
  if (candidate.signedInTeacherId !== null && typeof candidate.signedInTeacherId !== 'string') return false;
  const teacherIds = new Set<string>();
  const emails = new Set<string>();
  for (const account of candidate.accounts) {
    if (!account || typeof account !== 'object') return false;
    const typed = account as Partial<StandaloneTeacherAccount>;
    const teacher = typed.teacher;
    if (!teacher || typeof teacher !== 'object') return false;
    if (typeof teacher.id !== 'string' || !teacher.id || typeof teacher.name !== 'string' || !teacher.name.trim()) return false;
    if (typeof teacher.email !== 'string' || normalizeEmail(teacher.email) !== teacher.email || !EMAIL_PATTERN.test(teacher.email)) return false;
    if (!Number.isSafeInteger(teacher.version) || teacher.version < 1) return false;
    if (typeof typed.credentialFingerprint !== 'string' || !/^demo-fingerprint-[0-9a-f]{8}$/.test(typed.credentialFingerprint)) return false;
    if (teacher.id !== createTeacherId(teacher.email)) return false;
    if (teacherIds.has(teacher.id) || emails.has(teacher.email)) return false;
    teacherIds.add(teacher.id);
    emails.add(teacher.email);
  }
  return candidate.signedInTeacherId === null || teacherIds.has(candidate.signedInTeacherId);
}

export function createStandaloneTeacherIdentityModule(
  initialSession?: StandaloneIdentitySession,
): StandaloneTeacherIdentityModule {
  let accounts = [...(initialSession?.accounts ?? [])];
  let signedInTeacherId = initialSession?.signedInTeacherId ?? null;

  const findSignedInTeacher = () => accounts.find(({ teacher }) => teacher.id === signedInTeacherId)?.teacher;
  const exportSession = (): StandaloneIdentitySession => Object.freeze({
    version: 1,
    accounts: Object.freeze(accounts.map((account) => Object.freeze({ ...account, teacher: Object.freeze({ ...account.teacher }) }))),
    signedInTeacherId,
  });

  return Object.freeze({
    view: () => {
      const teacher = findSignedInTeacher();
      return teacher
        ? Object.freeze({ status: 'signed_in' as const, teacher })
        : Object.freeze({ status: 'signed_out' as const });
    },
    register: ({ name, email, password }) => {
      const normalizedName = name.trim();
      const normalizedEmail = normalizeEmail(email);
      if (normalizedName.length < 2) return Object.freeze({ ok: false as const, reason: 'invalid_name' as const });
      if (!EMAIL_PATTERN.test(normalizedEmail)) return Object.freeze({ ok: false as const, reason: 'invalid_email' as const });
      if (password.length < 8) return Object.freeze({ ok: false as const, reason: 'weak_password' as const });
      if (accounts.some(({ teacher }) => teacher.email === normalizedEmail)) {
        return Object.freeze({ ok: false as const, reason: 'email_exists' as const });
      }
      const teacher = Object.freeze({ id: createTeacherId(normalizedEmail), name: normalizedName, email: normalizedEmail, version: 1 });
      accounts = [...accounts, Object.freeze({ teacher, credentialFingerprint: stableFingerprint(`${normalizedEmail}:${password}`) })];
      signedInTeacherId = teacher.id;
      return Object.freeze({ ok: true as const, teacher });
    },
    login: ({ email, password }) => {
      const normalizedEmail = normalizeEmail(email);
      const account = accounts.find(({ teacher }) => teacher.email === normalizedEmail);
      if (!account || account.credentialFingerprint !== stableFingerprint(`${normalizedEmail}:${password}`)) {
        return Object.freeze({ ok: false as const, reason: 'invalid_credentials' as const });
      }
      signedInTeacherId = account.teacher.id;
      return Object.freeze({ ok: true as const, teacher: account.teacher });
    },
    logout: () => { signedInTeacherId = null; },
    exportSession,
  });
}
