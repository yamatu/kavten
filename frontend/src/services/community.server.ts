import { cache } from 'react';
import { isAxiosError } from 'axios';
import { notFound } from 'next/navigation';
import { CommunityService, type CommunityFilters } from './community.service';
import type { CommunityFeed, CommunityPost } from '@/types';

const EMPTY_FEED: CommunityFeed = {
  data: [],
  page: 1,
  page_size: 12,
  total: 0,
  total_pages: 1,
  stats: { total_posts: 0, total_comments: 0, categories: {} },
};

/**
 * A missing thread is a real 404, but a backend hiccup must stay a server error:
 * answering 404 for an outage tells crawlers to drop every thread from the index.
 */
export const getCommunityPost = cache(async (slug: string): Promise<CommunityPost> => {
  try {
    return await CommunityService.getPost(slug);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) notFound();
    throw error;
  }
});

export const getCommunityFeed = cache(async (filters: CommunityFilters): Promise<CommunityFeed> => {
  try {
    const feed = await CommunityService.getPosts(filters);
    // Normalise instead of trusting the shape: a null `data` or a missing
    // `stats` block would otherwise crash the whole board render.
    return {
      ...feed,
      data: Array.isArray(feed?.data) ? feed.data : [],
      page: feed?.page || filters.page || 1,
      page_size: feed?.page_size || filters.page_size || 12,
      total: feed?.total || 0,
      total_pages: feed?.total_pages || 1,
      stats: {
        total_posts: feed?.stats?.total_posts || 0,
        total_comments: feed?.stats?.total_comments || 0,
        categories: feed?.stats?.categories || {},
      },
    };
  } catch (error) {
    console.error('Failed to load community feed', error);
    return { ...EMPTY_FEED, page: filters.page || 1, page_size: filters.page_size || 12 };
  }
});
