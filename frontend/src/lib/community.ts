import type { CommunityCategory } from '@/types';

export interface CommunityCategoryMeta {
  slug: CommunityCategory;
  label: string;
  short: string;
  emoji: string;
  blurb: string;
  tone: string;
}

// Order is the filter-bar order on /community: the two entry points people look
// for first (finished builds, first starts) come before the help-oriented boards.
export const COMMUNITY_CATEGORIES: CommunityCategoryMeta[] = [
  {
    slug: 'show-tell',
    label: 'Show & Tell',
    short: 'Show & Tell',
    emoji: '🏁',
    blurb: 'Finished builds, paint jobs, display shelves and the videos that made them worth building.',
    tone: '#FFF1CC',
  },
  {
    slug: 'build-log',
    label: 'Build Logs',
    short: 'Build Logs',
    emoji: '🧰',
    blurb: 'Step-by-step diaries from unboxing to the last screw, including the mistakes.',
    tone: '#FDE7E4',
  },
  {
    slug: 'first-start',
    label: 'First Start',
    short: 'First Start',
    emoji: '🔥',
    blurb: 'The moment it catches. Fuel, timing, temperature and break-in notes that got it running.',
    tone: '#FFE8D2',
  },
  {
    slug: 'mods-upgrades',
    label: 'Mods & Upgrades',
    short: 'Mods',
    emoji: '⚙️',
    blurb: 'Machined parts, bearings, ignition swaps and the modifications that were worth the bench time.',
    tone: '#E4F1F8',
  },
  {
    slug: 'troubleshooting',
    label: 'Troubleshooting',
    short: 'Troubleshooting',
    emoji: '🛠️',
    blurb: 'It turns but will not run. Post the numbers and let the workshop work it out with you.',
    tone: '#E3F3EC',
  },
];

export const COMMUNITY_SORTS = [
  { value: 'latest', label: 'Latest' },
  { value: 'popular', label: 'Most liked' },
  { value: 'discussed', label: 'Most discussed' },
] as const;

export type CommunitySort = (typeof COMMUNITY_SORTS)[number]['value'];

export function isCommunityCategory(value?: string | null): value is CommunityCategory {
  return Boolean(value) && COMMUNITY_CATEGORIES.some((category) => category.slug === value);
}

export function communityCategory(slug?: string | null): CommunityCategoryMeta {
  return COMMUNITY_CATEGORIES.find((category) => category.slug === slug) ?? COMMUNITY_CATEGORIES[1];
}

export function communityCategoryLabel(slug?: string | null): string {
  return communityCategory(slug).label;
}

export function normalizeCommunitySort(value?: string | null): CommunitySort {
  return COMMUNITY_SORTS.find((sort) => sort.value === value)?.value ?? 'latest';
}

export function communityPostPath(slug: string): string {
  return `/community/${slug}`;
}

/**
 * Format a thread timestamp for display.
 *
 * The listing is rendered on the server and hydrated on the client, so the same
 * input must produce the same string in both places. Pinning the time zone to UTC
 * removes the "renders 30 Nov on the server, 29 Nov in the browser" mismatch.
 */
export function formatCommunityDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
