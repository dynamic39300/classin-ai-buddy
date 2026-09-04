function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (trimmed === '' || trimmed === '/') return '/';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`;
}

export function publicAssetUrl(assetPath: string, baseUrl = import.meta.env.BASE_URL): string {
  return `${normalizeBaseUrl(baseUrl)}${assetPath.replace(/^\/+/, '')}`;
}

export function applicationBasename(baseUrl = import.meta.env.BASE_URL): string | undefined {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized === '/' ? undefined : normalized.slice(0, -1);
}
