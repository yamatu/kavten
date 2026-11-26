'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CheckCircleIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import TurnstileWidget, { type TurnstileWidgetHandle } from '@/components/common/TurnstileWidget';
import { CommunityService } from '@/services/community.service';
import { TurnstileService } from '@/services/turnstile.service';
import { ProductService } from '@/services/product.service';
import { COMMUNITY_CATEGORIES } from '@/lib/community';
import type { CommunityCategory } from '@/types';

const MAX_IMAGES = 3;
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export default function CommunityShareForm() {
  const router = useRouter();
  const [category, setCategory] = useState<CommunityCategory>('build-log');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorLocation, setAuthorLocation] = useState('');
  const [buildHours, setBuildHours] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [images, setImages] = useState<string[]>(['']);
  const [videoUrl, setVideoUrl] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const widgetRef = useRef<TurnstileWidgetHandle>(null);

  // Kit linking is optional but valuable: it puts the thread on the product page
  // path and gives the reader a "view this kit" link in the sidebar.
  const [kitQuery, setKitQuery] = useState('');
  const [kit, setKit] = useState<{ slug: string; name: string } | null>(null);
  const [debouncedKit, setDebouncedKit] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKit(kitQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [kitQuery]);

  const { data: kitResults, isFetching: kitLoading } = useQuery({
    queryKey: ['community-kit-search', debouncedKit],
    queryFn: () => ProductService.searchProducts(debouncedKit, { page: 1, page_size: 6 }),
    enabled: debouncedKit.length > 1 && !kit,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: captcha } = useQuery({
    queryKey: ['turnstile', 'public-config'],
    queryFn: () => TurnstileService.getPublicConfig(),
    staleTime: 10 * 60_000,
    retry: false,
  });
  const captchaEnabled = Boolean(captcha?.enabled && captcha.site_key);

  const updateImage = (index: number, value: string) => {
    setImages((current) => current.map((url, position) => (position === index ? value : url)));
  };

  const addImage = () => {
    if (images.length >= MAX_IMAGES) return;
    setImages((current) => [...current, '']);
  };

  const removeImage = (index: number) => {
    setImages((current) => (current.length === 1 ? [''] : current.filter((_, position) => position !== index)));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (title.trim().length < 8) {
      setError('Give the thread a title someone could search for, for example “Stirling V2 runs rough above 3000 RPM”.');
      return;
    }
    if (body.trim().length < 80) {
      setError('Add a little more detail - at least a short paragraph so other builders can follow what you did.');
      return;
    }
    if (authorName.trim().length < 2) {
      setError('Add the name you want the thread credited to.');
      return;
    }
    if (captchaEnabled && !token) {
      setError('Please complete the human verification first.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await CommunityService.createPost({
        title: title.trim(),
        body: body.trim(),
        category,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
        author_name: authorName.trim(),
        author_email: authorEmail.trim() || undefined,
        author_location: authorLocation.trim() || undefined,
        image_urls: images.map((url) => url.trim()).filter(Boolean),
        video_url: videoUrl.trim() || undefined,
        product_slug: kit?.slug,
        product_name: kit?.name,
        build_hours: buildHours.trim() || undefined,
        difficulty: difficulty || undefined,
        turnstile_token: captchaEnabled ? token : undefined,
      });
      router.push(`/community/${created.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish the thread. Please try again.');
      widgetRef.current?.reset();
      setToken('');
      setSubmitting(false);
    }
  };

  const inputClass =
    'mt-1 w-full rounded-lg border-2 border-[var(--site-ink)] px-3 py-2 text-sm font-medium outline-none focus:border-[var(--site-primary)]';
  const labelClass = 'block text-sm font-bold text-[var(--site-ink)]';

  return (
    <form onSubmit={submit} className="kv-card space-y-6 p-5 sm:p-7">
      <fieldset>
        <legend className={labelClass}>Pick a board</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {COMMUNITY_CATEGORIES.map((option) => (
            <button
              key={option.slug}
              type="button"
              onClick={() => setCategory(option.slug)}
              aria-pressed={category === option.slug}
              className={`kv-chip ${category === option.slug ? 'kv-chip-active' : ''}`}
            >
              <span aria-hidden>{option.emoji}</span>
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--site-muted)]">{COMMUNITY_CATEGORIES.find((option) => option.slug === category)?.blurb}</p>
      </fieldset>

      <label className={labelClass}>
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={160}
          required
          className={inputClass}
          placeholder="What did you build, and what should people know?"
        />
        <span className="mt-1 block text-xs font-medium text-[var(--site-muted)]">{title.length}/160 characters</span>
      </label>

      <div>
        <label className={labelClass} htmlFor="kit-search">
          Which kit is this about? <span className="font-medium text-[var(--site-muted)]">(optional)</span>
        </label>
        {kit ? (
          <div className="mt-1 flex items-center justify-between gap-3 rounded-lg border-2 border-[var(--site-primary)] bg-white px-3 py-2 text-sm font-bold">
            <span className="truncate">{kit.name}</span>
            <button
              type="button"
              onClick={() => {
                setKit(null);
                setKitQuery('');
              }}
              className="shrink-0 text-[var(--site-muted)] hover:text-[var(--site-primary)]"
              aria-label="Clear selected kit"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <input
              id="kit-search"
              value={kitQuery}
              onChange={(event) => setKitQuery(event.target.value)}
              className={inputClass}
              placeholder="Search our kits by name or model"
              autoComplete="off"
            />
            {debouncedKit.length > 1 ? (
              <div className="mt-2 overflow-hidden rounded-lg border-2 border-[var(--site-line)] bg-white">
                {kitLoading ? (
                  <p className="px-3 py-2 text-xs text-[var(--site-muted)]">Searching…</p>
                ) : kitResults?.data?.length ? (
                  <ul className="divide-y-2 divide-[var(--site-line)]">
                    {kitResults.data.map((product) => (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setKit({ slug: product.slug, name: product.name });
                            setKitQuery(product.name);
                          }}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-[var(--site-yellow)]"
                        >
                          <span className="truncate">{product.name}</span>
                          <span className="shrink-0 text-xs font-medium text-[var(--site-muted)]">{product.sku}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-xs text-[var(--site-muted)]">No kit matched. You can still post - just name the kit in the title.</p>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>

      <label className={labelClass}>
        Your build log
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={12}
          maxLength={12000}
          required
          className={inputClass}
          placeholder={`What you built, in your own words.\n\nMarkdown works: **bold**, - bullet lists, ## headings.\n\nNumbers help: fuel or voltage, ambient temperature, RPM, break-in hours.`}
        />
        <span className="mt-1 block text-xs font-medium text-[var(--site-muted)]">
          {body.trim().split(/\s+/).filter(Boolean).length} words - markdown supported
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Build time <span className="font-medium text-[var(--site-muted)]">(optional)</span>
          <input value={buildHours} onChange={(event) => setBuildHours(event.target.value)} maxLength={40} className={inputClass} placeholder="e.g. 6 hours over a weekend" />
        </label>
        <label className={labelClass}>
          Difficulty <span className="font-medium text-[var(--site-muted)]">(optional)</span>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className={inputClass}>
            <option value="">Not sure</option>
            {DIFFICULTIES.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className={labelClass}>Photos <span className="font-medium text-[var(--site-muted)]">(direct image links, up to {MAX_IMAGES})</span></span>
        <div className="mt-1 space-y-2">
          {images.map((url, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={url}
                onChange={(event) => updateImage(index, event.target.value)}
                className="w-full rounded-lg border-2 border-[var(--site-ink)] px-3 py-2 text-sm font-medium outline-none focus:border-[var(--site-primary)]"
                placeholder="https://…/your-photo.jpg"
                inputMode="url"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="shrink-0 rounded-lg border-2 border-[var(--site-ink)] p-2 hover:bg-[var(--site-primary-soft)]"
                aria-label="Remove photo field"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {images.length < MAX_IMAGES ? (
          <button type="button" onClick={addImage} className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-[var(--site-primary)]">
            <PlusIcon className="h-4 w-4" /> Add another photo
          </button>
        ) : null}
      </div>

      <label className={labelClass}>
        Video link <span className="font-medium text-[var(--site-muted)]">(optional, YouTube or Vimeo)</span>
        <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} className={inputClass} placeholder="https://youtu.be/…" inputMode="url" />
      </label>

      <label className={labelClass}>
        Tags <span className="font-medium text-[var(--site-muted)]">(optional, comma separated, up to 8)</span>
        <input value={tags} onChange={(event) => setTags(event.target.value)} maxLength={200} className={inputClass} placeholder="stirling, break-in, needle-setting" />
      </label>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className={`${labelClass} mb-1`}>Credit</legend>
        <label className={labelClass}>
          Name
          <input value={authorName} onChange={(event) => setAuthorName(event.target.value)} maxLength={60} required className={inputClass} placeholder="Shown on the thread" />
        </label>
        <label className={labelClass}>
          Location <span className="font-medium text-[var(--site-muted)]">(optional)</span>
          <input value={authorLocation} onChange={(event) => setAuthorLocation(event.target.value)} maxLength={60} className={inputClass} placeholder="e.g. Leeds, UK" />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Email <span className="font-medium text-[var(--site-muted)]">(private, optional - for reply notifications)</span>
          <input type="email" value={authorEmail} onChange={(event) => setAuthorEmail(event.target.value)} maxLength={120} className={inputClass} placeholder="Never shown publicly" />
        </label>
      </fieldset>

      {captchaEnabled ? (
        <TurnstileWidget
          ref={widgetRef}
          siteKey={captcha!.site_key}
          onToken={setToken}
          onError={() => setError('Verification could not load. Please refresh and try again.')}
        />
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg bg-[var(--site-primary-soft)] px-4 py-3 text-sm font-semibold text-[var(--site-primary)]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t-2 border-dashed border-[var(--site-line)] pt-5">
        <button type="submit" disabled={submitting} className="kv-btn kv-btn-red disabled:opacity-60">
          <CheckCircleIcon className="h-4 w-4" />
          {submitting ? 'Publishing…' : 'Publish thread'}
        </button>
        <p className="text-xs text-[var(--site-muted)]">
          By posting you agree to keep it civil and on topic. Threads are public and indexed by search engines.
        </p>
      </div>
    </form>
  );
}
