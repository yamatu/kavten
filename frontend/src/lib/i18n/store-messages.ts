import type { PublicLocale } from './config';
import { storeEn } from './store-messages-en';
import { storeZh } from './store-messages-zh';
import { storeEsDeFr } from './store-messages-eu';
import { storeItPtRu } from './store-messages-eu2';
import { storeJaKoAr } from './store-messages-asia';

const STORE_KEYS = Object.keys(storeEn);

function zip(values: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  STORE_KEYS.forEach((key, index) => {
    if (values[index]) out[key] = values[index];
  });
  return out;
}

// Storefront copy has priority over the legacy dictionaries in messages.ts.
export const storeMessages: Record<PublicLocale, Record<string, string>> = {
  en: storeEn,
  zh: storeZh,
  es: zip(storeEsDeFr.es),
  de: zip(storeEsDeFr.de),
  fr: zip(storeEsDeFr.fr),
  it: zip(storeItPtRu.it),
  pt: zip(storeItPtRu.pt),
  ru: zip(storeItPtRu.ru),
  ja: zip(storeJaKoAr.ja),
  ko: zip(storeJaKoAr.ko),
  ar: zip(storeJaKoAr.ar),
};
