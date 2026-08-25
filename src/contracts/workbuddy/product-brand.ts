/**
 * Product-facing naming for the teacher AI companion.
 *
 * Internal ClassIn routes, storage namespaces and domain types intentionally keep
 * the historical `workbuddy` identifier. The standalone public product uses a
 * branded `/teachbuddy` URL while the legacy `/workbuddy` URL remains redirect-only.
 */
export const TEACHBUDDY_BRAND = Object.freeze({
  officialName: 'ClassIn TeachBuddy',
  shortName: 'TeachBuddy',
  descriptor: 'AI 教学搭档',
  workspaceDescriptor: '教师工作空间',
});

export const STANDALONE_TEACHBUDDY_ROUTES = Object.freeze({
  root: '/teachbuddy',
  login: '/teachbuddy/login',
  register: '/teachbuddy/register',
  app: '/teachbuddy/app',
  newTask: '/teachbuddy/app/new',
  credits: '/teachbuddy/app/credits',
  membership: '/teachbuddy/app/membership',
  classIn: '/teachbuddy/app/classin',
  content: '/teachbuddy/app/content',
  legacyRoot: '/workbuddy',
});

export function isStandaloneTeachBuddyPath(pathname: string): boolean {
  return pathname === STANDALONE_TEACHBUDDY_ROUTES.root
    || pathname.startsWith(`${STANDALONE_TEACHBUDDY_ROUTES.root}/`)
    || pathname === STANDALONE_TEACHBUDDY_ROUTES.legacyRoot
    || pathname.startsWith(`${STANDALONE_TEACHBUDDY_ROUTES.legacyRoot}/`);
}
