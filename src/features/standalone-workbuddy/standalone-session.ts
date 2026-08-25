import {
  isStandaloneCommerceSession,
  type StandaloneCommerceSession,
} from '@domain/standalone-workbuddy/commerce';
import {
  isStandaloneIdentitySession,
  type StandaloneIdentitySession,
} from '@domain/standalone-workbuddy/identity';
import {
  isStandaloneContentSession,
  type StandaloneContentSession,
} from '@domain/standalone-workbuddy/content';

const IDENTITY_KEY = 'classin-ai-buddy:standalone-teacher:identity:v1';
const COMMERCE_KEY = 'classin-ai-buddy:standalone-teacher:commerce:v1';
const CONTENT_KEY = 'classin-ai-buddy:standalone-teacher:content:v1';

function readJson(key: string): unknown {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function loadStandaloneIdentitySession(): StandaloneIdentitySession | undefined {
  const value = readJson(IDENTITY_KEY);
  if (isStandaloneIdentitySession(value)) return value;
  if (value !== null && typeof window !== 'undefined') window.localStorage.removeItem(IDENTITY_KEY);
  return undefined;
}

export function saveStandaloneIdentitySession(session: StandaloneIdentitySession): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(session));
}

export function loadStandaloneCommerceSession(): StandaloneCommerceSession | undefined {
  const value = readJson(COMMERCE_KEY);
  if (isStandaloneCommerceSession(value)) return value;
  if (value !== null && typeof window !== 'undefined') window.localStorage.removeItem(COMMERCE_KEY);
  return undefined;
}

export function saveStandaloneCommerceSession(session: StandaloneCommerceSession): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(COMMERCE_KEY, JSON.stringify(session));
}

export function loadStandaloneContentSession(): StandaloneContentSession | undefined {
  const value = readJson(CONTENT_KEY);
  if (isStandaloneContentSession(value)) return value;
  if (value !== null && typeof window !== 'undefined') window.localStorage.removeItem(CONTENT_KEY);
  return undefined;
}

export function saveStandaloneContentSession(session: StandaloneContentSession): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(CONTENT_KEY, JSON.stringify(session));
}
