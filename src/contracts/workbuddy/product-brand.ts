/**
 * Product-facing naming for the teacher AI companion.
 *
 * Internal ClassIn routes, storage namespaces and domain types intentionally keep
 * the historical `workbuddy` identifier. The standalone public product keeps
 * the pre-rename `/teachbuddy` URL for compatibility while `/workbuddy` remains
 * redirect-only. URL migration requires a separate compatibility decision.
 */
export const TEACHERIN_BRAND = Object.freeze({
  officialName: 'ClassIn TeacherIn',
  shortName: 'TeacherIn',
  descriptor: 'AI 教学搭档',
  workspaceDescriptor: '教师工作空间',
});

export const STANDALONE_TEACHERIN_ROUTES = Object.freeze({
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

export function isStandaloneTeacherInPath(pathname: string): boolean {
  return pathname === STANDALONE_TEACHERIN_ROUTES.root
    || pathname.startsWith(`${STANDALONE_TEACHERIN_ROUTES.root}/`)
    || pathname === STANDALONE_TEACHERIN_ROUTES.legacyRoot
    || pathname.startsWith(`${STANDALONE_TEACHERIN_ROUTES.legacyRoot}/`);
}
