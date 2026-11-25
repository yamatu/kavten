'use client';

import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { usePublicI18n } from '@/lib/i18n/PublicI18nProvider';
import { PUBLIC_LOCALES, type PublicLocale } from '@/lib/i18n/config';
import { useLocaleNavigation } from '@/lib/i18n/useLocaleNavigation';
import { cn } from '@/lib/utils';

export default function LanguageSelector({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { locale, t } = usePublicI18n();
  const changeLocale = useLocaleNavigation();
  const dark = variant === 'dark';

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t('language.label')}</span>
      <GlobeAltIcon
        className={cn('pointer-events-none absolute left-2.5 h-4 w-4', dark ? 'text-[var(--site-yellow)]' : 'text-[var(--site-ink)]')}
        aria-hidden="true"
      />
      <select
        value={locale}
        onChange={(event) => changeLocale(event.target.value as PublicLocale)}
        aria-label={t('language.label')}
        title={t('language.label')}
        className={cn(
          'h-8 cursor-pointer appearance-none rounded-full py-1 pl-8 pr-7 text-xs font-bold outline-none transition-colors',
          dark
            ? 'border border-white/25 bg-white/10 text-white hover:bg-white/20 [&>option]:text-black'
            : 'border-2 border-[var(--site-ink)] bg-white text-[var(--site-ink)] hover:bg-[var(--site-yellow)]',
        )}
      >
        {PUBLIC_LOCALES.map((option) => (
          <option key={option.code} value={option.code}>
            {option.nativeName}
          </option>
        ))}
      </select>
      <span className={cn('pointer-events-none absolute right-2.5 text-[10px]', dark ? 'text-white/70' : 'text-[var(--site-ink)]')}>&#9662;</span>
    </label>
  );
}
