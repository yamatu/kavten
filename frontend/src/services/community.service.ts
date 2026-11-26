import { apiClient } from '@/lib/api';
import type {
  APIResponse,
  CommunityComment,
  CommunityCommentInput,
  CommunityFeed,
  CommunityPost,
  CommunityPostInput,
  PaginationResponse,
} from '@/types';

export interface CommunityFilters {
  page?: number;
  page_size?: number;
  category?: string;
  sort?: 'latest' | 'popular' | 'discussed';
  search?: string;
  featured?: boolean;
}

function buildQuery(filters: CommunityFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) return;
    params.append(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export class CommunityService {
  static async getPosts(filters: CommunityFilters = {}): Promise<CommunityFeed> {
    const response = await apiClient.get<APIResponse<CommunityFeed>>(`/public/community/posts${buildQuery(filters)}`);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to load community threads');
  }

  static async getPost(slug: string): Promise<CommunityPost> {
    const response = await apiClient.get<APIResponse<CommunityPost>>(`/public/community/posts/${encodeURIComponent(slug)}`);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Thread not found');
  }

  static async createPost(payload: CommunityPostInput): Promise<CommunityPost> {
    const response = await apiClient.post<APIResponse<CommunityPost>>('/public/community/posts', payload);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to publish thread');
  }

  static async createComment(slug: string, payload: CommunityCommentInput): Promise<CommunityComment> {
    const response = await apiClient.post<APIResponse<CommunityComment>>(
      `/public/community/posts/${encodeURIComponent(slug)}/comments`,
      payload,
    );
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to post reply');
  }

  static async likePost(slug: string): Promise<number> {
    const response = await apiClient.post<APIResponse<{ likes_count: number }>>(
      `/public/community/posts/${encodeURIComponent(slug)}/like`,
    );
    if (response.data.success && response.data.data) return response.data.data.likes_count;
    throw new Error(response.data.message || 'Failed to like thread');
  }
}

export interface AdminCommunityFilters {
  page?: number;
  page_size?: number;
  status?: string;
  search?: string;
}

export class CommunityAdminService {
  static async listPosts(filters: AdminCommunityFilters = {}): Promise<PaginationResponse<CommunityPost>> {
    const response = await apiClient.get<APIResponse<PaginationResponse<CommunityPost>>>(
      `/admin/community/posts${buildQuery(filters as CommunityFilters)}`,
    );
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to load threads');
  }

  static async updatePost(
    id: number,
    payload: { status?: string; is_pinned?: boolean; is_featured?: boolean; category?: string; title?: string },
  ): Promise<CommunityPost> {
    const response = await apiClient.put<APIResponse<CommunityPost>>(`/admin/community/posts/${id}`, payload);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to update thread');
  }

  static async deletePost(id: number): Promise<void> {
    const response = await apiClient.delete<APIResponse<null>>(`/admin/community/posts/${id}`);
    if (!response.data.success) throw new Error(response.data.message || 'Failed to delete thread');
  }

  static async listComments(filters: AdminCommunityFilters = {}): Promise<PaginationResponse<CommunityComment>> {
    const response = await apiClient.get<APIResponse<PaginationResponse<CommunityComment>>>(
      `/admin/community/comments${buildQuery(filters as CommunityFilters)}`,
    );
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to load replies');
  }

  static async updateComment(id: number, status: string): Promise<CommunityComment> {
    const response = await apiClient.put<APIResponse<CommunityComment>>(`/admin/community/comments/${id}`, { status });
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to update reply');
  }

  static async deleteComment(id: number): Promise<void> {
    const response = await apiClient.delete<APIResponse<null>>(`/admin/community/comments/${id}`);
    if (!response.data.success) throw new Error(response.data.message || 'Failed to delete reply');
  }
}
