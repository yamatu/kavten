'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import AdminLayout from '@/components/admin/AdminLayout';
import { CommunityAdminService } from '@/services/community.service';
import { COMMUNITY_CATEGORIES, communityCategoryLabel, formatCommunityDate } from '@/lib/community';
import type { CommunityComment, CommunityPost } from '@/types';

type Tab = 'posts' | 'comments';

const STATUS_STYLE: Record<string, string> = {
  published: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  hidden: 'bg-gray-200 text-gray-700',
};

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'pending', label: 'Pending' },
  { value: 'hidden', label: 'Hidden' },
];

export default function AdminCommunityPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('posts');
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const filters = { page, page_size: 20, status, search };

  const postsQuery = useQuery({
    queryKey: ['admin', 'community', 'posts', filters],
    queryFn: () => CommunityAdminService.listPosts(filters),
    enabled: tab === 'posts',
    placeholderData: keepPreviousData,
  });

  const commentsQuery = useQuery({
    queryKey: ['admin', 'community', 'comments', filters],
    queryFn: () => CommunityAdminService.listComments(filters),
    enabled: tab === 'comments',
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'community'] });
  };

  const updatePost = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof CommunityAdminService.updatePost>[1] }) =>
      CommunityAdminService.updatePost(id, payload),
    onSuccess: () => {
      toast.success('Thread updated');
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deletePost = useMutation({
    mutationFn: (id: number) => CommunityAdminService.deletePost(id),
    onSuccess: () => {
      toast.success('Thread deleted');
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateComment = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: string }) =>
      CommunityAdminService.updateComment(id, nextStatus),
    onSuccess: () => {
      toast.success('Reply updated');
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteComment = useMutation({
    mutationFn: (id: number) => CommunityAdminService.deleteComment(id),
    onSuccess: () => {
      toast.success('Reply deleted');
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeQuery = tab === 'posts' ? postsQuery : commentsQuery;
  const rows = (activeQuery.data?.data || []) as Array<CommunityPost | CommunityComment>;
  const total = activeQuery.data?.total || 0;
  const totalPages = activeQuery.data?.total_pages || 1;

  const confirmDeletePost = (post: CommunityPost) => {
    if (!window.confirm(`Delete “${post.title}” and all of its replies? This cannot be undone.`)) return;
    deletePost.mutate(post.id);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Builders’ Workshop</h1>
            <p className="mt-1 text-sm text-gray-500">
              {total} {tab === 'posts' ? 'threads' : 'replies'} · guest posts publish instantly, so keep an eye on links and
              contact details.
            </p>
          </div>
          <Link
            href="/community"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowTopRightOnSquareIcon className="mr-2 h-5 w-5" />
            View board
          </Link>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-md border border-gray-300 p-1">
              {(['posts', 'comments'] as Tab[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTab(value);
                    setPage(1);
                  }}
                  className={`rounded px-3 py-1.5 text-sm font-medium capitalize ${
                    tab === value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {value === 'posts' ? 'Threads' : 'Replies'}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_TABS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setStatus(option.value);
                    setPage(1);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    status === option.value
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="relative sm:w-72">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={tab === 'posts' ? 'Search title or author' : 'Search reply text'}
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {activeQuery.isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              No {tab === 'posts' ? 'threads' : 'replies'} match this filter yet.
            </p>
          ) : tab === 'posts' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Thread</th>
                    <th className="px-4 py-3">Board</th>
                    <th className="px-4 py-3">Author</th>
                    <th className="px-4 py-3">Engagement</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(rows as CommunityPost[]).map((post) => (
                    <tr key={post.id} className="align-top">
                      <td className="max-w-md px-4 py-3">
                        <Link href={`/community/${post.slug}`} target="_blank" rel="noopener" className="font-semibold text-gray-900 hover:text-blue-600">
                          {post.title}
                        </Link>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{post.excerpt}</p>
                        <p className="mt-1 text-xs text-gray-400">{formatCommunityDate(post.created_at)}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{communityCategoryLabel(post.category)}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-800">{post.author_name}</span>
                        {post.author_badge ? <span className="ml-1 text-xs text-gray-500">({post.author_badge})</span> : null}
                        {post.author_location ? <p className="text-xs text-gray-400">{post.author_location}</p> : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                        <div>{post.likes_count} likes</div>
                        <div>{post.comments_count} replies</div>
                        <div>{post.views_count} views</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[post.status] || 'bg-gray-100 text-gray-700'}`}>
                          {post.status}
                        </span>
                        <div className="mt-1 flex gap-1 text-[11px] text-gray-500">
                          {post.is_pinned ? <span>pinned</span> : null}
                          {post.is_featured ? <span>featured</span> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1">
                          <button
                            type="button"
                            title={post.status === 'published' ? 'Hide thread' : 'Publish thread'}
                            onClick={() =>
                              updatePost.mutate({
                                id: post.id,
                                payload: { status: post.status === 'published' ? 'hidden' : 'published' },
                              })
                            }
                            className="rounded border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50"
                          >
                            {post.status === 'published' ? <EyeSlashIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            title={post.is_pinned ? 'Unpin' : 'Pin to top'}
                            onClick={() => updatePost.mutate({ id: post.id, payload: { is_pinned: !post.is_pinned } })}
                            className={`rounded border p-1.5 ${post.is_pinned ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                          >
                            <StarIconSolid className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title={post.is_featured ? 'Remove from featured' : 'Feature on the board'}
                            onClick={() => updatePost.mutate({ id: post.id, payload: { is_featured: !post.is_featured } })}
                            className={`rounded border p-1.5 ${post.is_featured ? 'border-amber-500 bg-amber-50 text-amber-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                          >
                            <StarIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Delete thread"
                            onClick={() => confirmDeletePost(post)}
                            className="rounded border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <select
                          value={post.category}
                          onChange={(event) => updatePost.mutate({ id: post.id, payload: { category: event.target.value } })}
                          className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                          aria-label="Move thread to board"
                        >
                          {COMMUNITY_CATEGORIES.map((category) => (
                            <option key={category.slug} value={category.slug}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {(rows as CommunityComment[]).map((comment) => (
                <li key={comment.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {comment.author_name}
                      {comment.author_badge ? <span className="ml-2 text-xs font-normal text-gray-500">{comment.author_badge}</span> : null}
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[comment.status] || 'bg-gray-100 text-gray-700'}`}>
                        {comment.status}
                      </span>
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{comment.body}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Post #{comment.post_id} · {formatCommunityDate(comment.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateComment.mutate({
                          id: comment.id,
                          nextStatus: comment.status === 'published' ? 'hidden' : 'published',
                        })
                      }
                      className="rounded border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50"
                      title={comment.status === 'published' ? 'Hide reply' : 'Publish reply'}
                    >
                      {comment.status === 'published' ? <EyeSlashIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this reply? This cannot be undone.')) deleteComment.mutate(comment.id);
                      }}
                      className="rounded border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                      title="Delete reply"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} · {total} total
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AdminLayout>
  );
}
