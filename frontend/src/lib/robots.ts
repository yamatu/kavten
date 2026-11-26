export const PUBLIC_CONTENT_SIGNAL_POLICY = 'search=yes, ai-input=yes, ai-train=yes, use=reference';

export const PRIVATE_ROBOTS_PATHS = [
  '/admin',
  '/api/',
  // Session, cart and checkout URLs render per-visitor state (or an empty
  // shell for crawlers) and only waste crawl budget.
  '/account',
  '/cart',
  '/checkout',
  '/login',
  '/register',
  '/forgot-password',
  '/orders/track',
] as const;

/**
 * Assistants and AI search engines that cite sources back to the store. They
 * are listed explicitly, with the same rules as everyone else, for two reasons:
 * the block documents that the shop wants to be quoted in AI answers, and
 * named groups survive a future change to the `*` group (group rules do not
 * inherit, so an operator tightening the default would otherwise lock these
 * crawlers out by accident).
 */
export const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bytespider',
  'meta-externalagent',
  'CCBot',
] as const;

export function buildRobotsTxt(siteUrl: string): string {
  const site = siteUrl.replace(/\/+$/, '');
  const crawlRules = ['Allow: /', ...PRIVATE_ROBOTS_PATHS.map((path) => `Disallow: ${path}`)];
  return [
    // All crawlers share the same policy. Content signals stay in the HTTP
    // header so robots.txt contains only standard crawl directives.
    'User-agent: *',
    ...crawlRules,
    '',
    ...AI_CRAWLERS.flatMap((agent) => [`User-agent: ${agent}`, ...crawlRules, '']),
    `Sitemap: ${site}/sitemap.xml`,
  ].join('\n') + '\n';
}
