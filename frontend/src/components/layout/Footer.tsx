'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaPaypal, FaXTwitter } from 'react-icons/fa6';
import { queryKeys } from '@/lib/react-query';
import type { SocialMediaURLKey } from '@/lib/social-media';
import type { SocialMediaSettings } from '@/types';
import { SocialMediaService } from '@/services/social-media.service';
import { usePublicI18n } from '@/lib/i18n/PublicI18nProvider';
import { STORE_CATEGORIES, categoryHref, categoryLabelKey } from '@/lib/store-catalog';

const socialPlatforms: Array<{ key: SocialMediaURLKey; name: string; Icon: typeof FaXTwitter }> = [
  { key: 'x_url', name: 'X', Icon: FaXTwitter },
  { key: 'facebook_url', name: 'Facebook', Icon: FaFacebookF },
  { key: 'instagram_url', name: 'Instagram', Icon: FaInstagram },
  { key: 'linkedin_url', name: 'LinkedIn', Icon: FaLinkedinIn },
];

export function Footer({ initialSocialSettings }: { initialSocialSettings?: SocialMediaSettings | null }) {
  const { t, href } = usePublicI18n();
  const [email, setEmail] = useState('');
  const { data: socialSettings } = useQuery({
    queryKey: queryKeys.socialMedia.public(),
    queryFn: () => SocialMediaService.getPublic(),
    initialData: initialSocialSettings || undefined,
    initialDataUpdatedAt: initialSocialSettings ? Date.now() : undefined,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const socialLinks = socialPlatforms.flatMap((platform) => {
    const url = String(socialSettings?.[platform.key] || '').trim();
    return url ? [{ ...platform, url }] : [];
  });

  const subscribe = (event: React.FormEvent) => {
    event.preventDefault();
    const qs = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : '';
    window.location.href = href(`/contact${qs}`);
  };

  const help = [
    { label: t('store.footer.shipping'), path: '/shipping-policy' },
    { label: t('store.footer.returns'), path: '/returns' },
    { label: t('store.footer.warranty'), path: '/warranty-policy' },
    { label: t('store.footer.faq'), path: '/faq' },
    { label: t('store.footer.track'), path: '/track-order' },
    { label: t('store.contact'), path: '/contact' },
  ];
  const company = [
    { label: t('store.about'), path: '/about' },
    { label: t('store.footer.blog'), path: '/blog' },
    { label: t('store.footer.privacy'), path: '/privacy' },
    { label: t('store.footer.terms'), path: '/terms' },
  ];

  return (
    <footer className="mt-auto bg-[var(--site-ink)] text-white">
      <div className="border-y-2 border-[var(--site-ink)] bg-[var(--site-yellow)] text-[var(--site-ink)]">
        <div className="kv-container flex flex-col items-start justify-between gap-5 py-8 md:flex-row md:items-center">
          <div>
            <p className="kv-display text-3xl font-extrabold">{t('store.footer.newsTitle')}</p>
            <p className="mt-1 text-sm font-medium">{t('store.footer.newsText')}</p>
          </div>
          <form onSubmit={subscribe} className="flex w-full max-w-md items-center rounded-full border-2 border-[var(--site-ink)] bg-white p-1.5 shadow-[4px_4px_0_var(--site-ink)]">
            <EnvelopeIcon className="ml-3 h-5 w-5 shrink-0" aria-hidden />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('store.footer.email')}
              aria-label={t('store.footer.email')}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm font-medium outline-none"
            />
            <button type="submit" className="rounded-full bg-[var(--site-primary)] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[var(--site-primary-strong)]">
              {t('store.footer.join')}
            </button>
          </form>
        </div>
      </div>

      <div className="kv-dots-light">
        <div className="kv-container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.8fr]">
          <div>
            <Link href={href('/')} aria-label="Kavten">
              <Image src="/images/kavten-logo-white.png" alt="Kavten" width={220} height={116} className="h-16 w-auto" />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/70">{t('store.footer.tagline')}</p>
            <div className="mt-5 space-y-2 text-sm text-white/80">
              <a href="mailto:flora@kavten.com" className="flex items-center gap-2 hover:text-[var(--site-yellow)]">
                <EnvelopeIcon className="h-4 w-4" /> flora@kavten.com
              </a>
              <a href="tel:+8613301553506" className="flex items-center gap-2 hover:text-[var(--site-yellow)]">
                <PhoneIcon className="h-4 w-4" /> +86 133 0155 3506
              </a>
            </div>
            {socialLinks.length > 0 ? (
              <div className="mt-5 flex gap-2">
                {socialLinks.map(({ key, name, url, Icon }) => (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer" aria-label={name} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 hover:border-[var(--site-yellow)] hover:text-[var(--site-yellow)]">
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <p className="kv-display mb-4 text-lg font-extrabold text-[var(--site-yellow)]">{t('store.footer.shop')}</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link href={href('/products')} className="text-white/80 hover:text-white">{t('store.allProducts')}</Link></li>
              {STORE_CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <Link href={href(categoryHref(category.slug))} className="text-white/80 hover:text-white">{t(categoryLabelKey(category.slug))}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="kv-display mb-4 text-lg font-extrabold text-[var(--site-yellow)]">{t('store.footer.help')}</p>
            <ul className="space-y-2.5 text-sm">
              {help.map((item) => (
                <li key={item.path}><Link href={href(item.path)} className="text-white/80 hover:text-white">{item.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="kv-display mb-4 text-lg font-extrabold text-[var(--site-yellow)]">{t('store.footer.company')}</p>
            <ul className="space-y-2.5 text-sm">
              {company.map((item) => (
                <li key={item.path}><Link href={href(item.path)} className="text-white/80 hover:text-white">{item.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="kv-container flex flex-col items-center justify-between gap-3 py-5 text-xs text-white/60 sm:flex-row">
          <p>© {new Date().getFullYear()} Kavten. {t('store.footer.rights')}</p>
          <div className="flex items-center gap-2">
            <span>{t('footer.weAccept')}</span>
            <span className="flex items-center gap-1 rounded-md bg-white px-2 py-1 font-bold text-[#003087]"><FaPaypal className="h-3.5 w-3.5" /> PayPal</span>
            <span className="rounded-md bg-white px-2 py-1 font-extrabold italic text-[#1a1f71]">VISA</span>
            <span className="rounded-md bg-white px-2 py-1 font-bold text-[#eb001b]">Mastercard</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
