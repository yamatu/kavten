'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { HandThumbUpIcon } from '@heroicons/react/24/outline';
import { HandThumbUpIcon as HandThumbUpSolid } from '@heroicons/react/24/solid';
import TurnstileWidget, { type TurnstileWidgetHandle } from '@/components/common/TurnstileWidget';
import { CommunityService } from '@/services/community.service';
import { TurnstileService } from '@/services/turnstile.service';
import { formatCommunityDate } from '@/lib/community';
import { useCustomer } from '@/store/customer.store';
import type { CommunityComment } from '@/types';

const LIKE_STORAGE_PREFIX = 'kavten.community.liked.';

interface CommunityThreadClientProps {
  slug: string;
  threadTitle: string;
  initialLikes: number;
  initialComments: CommunityComment[];
}

function readLiked(slug: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(`${LIKE_STORAGE_PREFIX}${slug}`) === '1';
  } catch {
    return false;
  }
}

function CommentItem({ comment }: { comment: CommunityComment }) {
  return (
    <li className="rounded-xl border-2 border-[var(--site-line)] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--site-primary-soft)] text-[11px] font-extrabold" aria-hidden>
          {comment.author_name.slice(0, 1).toUpperCase()}
        </span>
        <span className="font-extrabold text-[var(--site-ink)]">{comment.author_name}</span>
        {comment.author_badge ? (
          <span className="rounded-full bg-[var(--site-yellow)] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
            {comment.author_badge}
          </span>
        ) : null}
        <time className="text-xs text-[var(--site-muted)]" dateTime={comment.created_at}>
          {formatCommunityDate(comment.created_at)}
        </time>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#3a332c]">{comment.body}</p>
    </li>
  );
}

export default function CommunityThreadClient({
  slug,
  threadTitle,
  initialLikes,
  initialComments,
}: CommunityThreadClientProps) {
  const [comments, setComments] = useState<CommunityComment[]>(initialComments);
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(() => readLiked(slug));

  const pathname = usePathname();
  const { isAuthenticated, customer } = useCustomer();
  // Zustand rehydrates from localStorage before the first client render, so the
  // gate is read only after mount: the server and the first client pass agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const canReply = mounted && isAuthenticated;
  const replyAs = customer?.full_name?.trim() || customer?.email?.split('@')[0] || 'your account';

  const [body, setBody] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const widgetRef = useRef<TurnstileWidgetHandle>(null);

  const { data: captcha } = useQuery({
    queryKey: ['turnstile', 'public-config'],
    queryFn: () => TurnstileService.getPublicConfig(),
    staleTime: 10 * 60_000,
    retry: false,
  });
  const captchaEnabled = Boolean(captcha?.enabled && captcha.site_key);

  // Replies are stored flat with an optional parent id; nesting them one level
  // keeps the list scannable without letting a long thread run off the page.
  const { roots, repliesByParent } = useMemo(() => {
    const byParent = new Map<number, CommunityComment[]>();
    const top: CommunityComment[] = [];
    comments.forEach((comment) => {
      if (comment.parent_id) {
        const bucket = byParent.get(comment.parent_id) ?? [];
        bucket.push(comment);
        byParent.set(comment.parent_id, bucket);
      } else {
        top.push(comment);
      }
    });
    return { roots: top, repliesByParent: byParent };
  }, [comments]);

  const like = async () => {
    if (liked) return;
    setLiked(true);
    setLikes((current) => current + 1);
    try {
      const total = await CommunityService.likePost(slug);
      setLikes(total);
      try {
        window.localStorage.setItem(`${LIKE_STORAGE_PREFIX}${slug}`, '1');
      } catch {
        /* private mode: the like still counts, it just is not remembered */
      }
    } catch {
      setLiked(false);
      setLikes((current) => Math.max(0, current - 1));
    }
  };

  const share = async () => {
    const url = typeof window === 'undefined' ? '' : window.location.href;
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: threadTitle, url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!canReply) {
      setError('Sign in to reply.');
      return;
    }
    if (body.trim().length < 10) {
      setError('A reply needs at least a sentence so it is useful to the next reader.');
      return;
    }
    if (captchaEnabled && !token) {
      setError('Please complete the human verification first.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await CommunityService.createComment(slug, {
        body: body.trim(),
        turnstile_token: captchaEnabled ? token : undefined,
      });
      setComments((current) => [...current, created]);
      setBody('');
      setToken('');
      setSubmitted(true);
      widgetRef.current?.reset();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(
        status === 401
          ? 'Your session ended. Sign in again to post this reply.'
          : err instanceof Error
            ? err.message
            : 'Could not post the reply. Please try again.',
      );
      widgetRef.current?.reset();
      setToken('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="replies"
      aria-labelledby="replies-heading"
      className="space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="replies-heading" className="kv-display text-2xl font-extrabold">
          {comments.length === 0 ? 'Replies' : `${comments.length} ${comments.length === 1 ? 'reply' : 'replies'}`}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={like}
            aria-pressed={liked}
            className={`kv-btn kv-btn-sm ${liked ? 'kv-btn-yellow' : 'kv-btn-white'} border-2`}
          >
            {liked ? <HandThumbUpSolid className="h-4 w-4" aria-hidden /> : <HandThumbUpIcon className="h-4 w-4" aria-hidden />}
            {likes}
            <span className="sr-only">Helpful</span>
          </button>
          <button type="button" onClick={share} className="kv-btn kv-btn-sm kv-btn-white">
            Share
          </button>
        </div>
      </div>

      {comments.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-[var(--site-line)] bg-white p-5 text-sm text-[var(--site-muted)]">
          No replies yet. If you have run this kit, your notes are the most useful thing you can add.
        </p>
      ) : (
        <ul className="space-y-3">
          {roots.map((comment) => (
            <li key={comment.id} className="space-y-3">
              <ul className="space-y-3">
                <CommentItem comment={comment} />
              </ul>
              {repliesByParent.get(comment.id)?.length ? (
                <ul className="ml-6 space-y-3 border-l-2 border-[var(--site-line)] pl-4">
                  {repliesByParent.get(comment.id)!.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} />
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canReply ? (
        <form onSubmit={submit} className="kv-card space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="kv-display text-lg font-extrabold">Add a reply</h3>
            <p className="text-xs font-semibold text-[var(--site-muted)]">Replying as {replyAs}</p>
          </div>

          {submitted ? (
            <p className="rounded-lg bg-[#e3f3ec] px-4 py-3 text-sm font-semibold text-[#1f6f4d]">
              Thanks - your reply is live below.
            </p>
          ) : null}

          <label className="block text-sm font-bold text-[var(--site-ink)]">
            Reply
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              maxLength={4000}
              required
              className="mt-1 w-full rounded-lg border-2 border-[var(--site-ink)] px-3 py-2 text-sm font-medium outline-none focus:border-[var(--site-primary)]"
              placeholder="What did you try, and what happened? Numbers and part names help."
            />
          </label>

          {captchaEnabled ? (
            <TurnstileWidget
              ref={widgetRef}
              siteKey={captcha!.site_key}
              onToken={setToken}
              onError={() => setError('Verification could not load. Please refresh and try again.')}
            />
          ) : null}

          {error ? <p className="text-sm font-semibold text-[var(--site-primary)]">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={submitting} className="kv-btn kv-btn-red disabled:opacity-60">
              {submitting ? 'Posting…' : 'Post reply'}
            </button>
            <p className="text-xs text-[var(--site-muted)]">
              Posted with your account name. Links and contact details are held for review.
            </p>
          </div>
        </form>
      ) : (
        <div className="kv-card space-y-4 p-5 sm:p-6">
          <h3 className="kv-display text-lg font-extrabold">Add a reply</h3>
          <p className="max-w-2xl text-sm leading-6 text-[var(--site-muted)]">
            Replies come from members with a Kavten account. It takes a minute to sign up, keeps the board free of
            spam, and puts your name on the notes you leave for the next builder. Threads stay open to read without
            an account.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/login?returnUrl=${encodeURIComponent(pathname || '/community')}`}
              className="kv-btn kv-btn-red"
            >
              Sign in to reply
            </Link>
            <Link href="/register" className="kv-btn kv-btn-white">
              Create an account
            </Link>
          </div>
          <p className="text-xs text-[var(--site-muted)]">
            Your email stays private. Only the replies you post are published.
          </p>
        </div>
      )}
    </section>
  );
}
