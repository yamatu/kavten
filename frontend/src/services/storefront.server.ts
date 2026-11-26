import type { Category, Product } from '@/types';

const apiBase = () => `${(process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '')}/api/v1/public`;

/**
 * The backend could not be reached (or answered 5xx).
 *
 * Catalog reads are the page's whole point, so this is not the same thing as
 * "this category is empty". Returning `[]` on a failed fetch let an ISR render
 * freeze an empty storefront for the whole revalidate window - a backend
 * restart during deploy was enough to serve "no products" for five minutes.
 * Throwing instead leaves the last good render in place (stale-while-revalidate)
 * and lets the route fail loudly when there is nothing good to serve.
 */
export class StorefrontUnavailableError extends Error {
  constructor(path: string, cause?: unknown) {
    super(`Storefront unavailable: ${path}${cause ? ` (${String(cause)})` : ''}`);
    this.name = 'StorefrontUnavailableError';
  }
}

async function getJSON<T>(path: string, tags: string[], strict = false): Promise<T | null> {
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      next: { revalidate: 300, tags },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new StorefrontUnavailableError(path, `HTTP ${res.status}`);
    const json = (await res.json()) as { success?: boolean; data?: T };
    return json.success === false ? null : (json.data ?? null);
  } catch (error) {
    // The Docker build has no backend; the first runtime request refills the cache.
    if (process.env.NEXT_PHASE === 'phase-production-build') return null;
    console.error('storefront fetch failed', path, error);
    if (strict) {
      throw error instanceof StorefrontUnavailableError ? error : new StorefrontUnavailableError(path, error);
    }
    return null;
  }
}

export async function getStoreCategoryTree(): Promise<Category[]> {
  // Navigation degrades to the static catalog when this fails, so it stays lenient.
  return (await getJSON<Category[]>('/categories', ['categories'])) || [];
}

export type StoreProductPage = { data: Product[]; total: number; page: number; page_size: number; total_pages: number };

export async function getStoreProducts(params: Record<string, string | number>): Promise<StoreProductPage> {
  const entries = Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null);
  const qs = new URLSearchParams({ is_active: 'true', ...Object.fromEntries(entries.map(([k, v]) => [k, String(v)])) });
  const page = await getJSON<Partial<StoreProductPage>>(`/products?${qs.toString()}`, ['all-products'], true);
  return {
    data: (page?.data || []).map(toCardProduct),
    total: page?.total || 0,
    page: page?.page || 1,
    page_size: page?.page_size || Number(params.page_size) || 0,
    total_pages: page?.total_pages || 0,
  };
}

// Cards are client components, so every field passed in is serialized into
// the HTML. Keep only what the card renders.
function toCardProduct(product: Product): Product {
  const images = Array.isArray(product.image_urls) ? product.image_urls.slice(0, 2) : [];
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    short_description: product.short_description,
    price: product.price,
    compare_price: product.compare_price,
    stock_quantity: product.stock_quantity,
    brand: product.brand,
    is_featured: product.is_featured,
    is_active: product.is_active,
    category_id: product.category_id,
    image_urls: images,
    translations: product.translations,
  } as Product;
}
