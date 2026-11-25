// Storefront navigation tree. IDs and slugs mirror the categories created by
// scripts/import_enginediy.py so links work before the API tree has loaded.

export type StoreSubcategory = { id: number; slug: string };
export type StoreCategory = {
  id: number;
  slug: string;
  emoji: string;
  tone: string;
  children: StoreSubcategory[];
};

export const STORE_CATEGORIES: StoreCategory[] = [
  {
    id: 1, slug: 'model-engines', emoji: '⚙️', tone: '#FDE7E4',
    children: [
      { id: 11, slug: 'v8-engines' },
      { id: 12, slug: 'v12-v6-engines' },
      { id: 13, slug: 'inline-twin-engines' },
      { id: 14, slug: 'gas-nitro-engines' },
      { id: 15, slug: 'jet-turbine-engines' },
      { id: 16, slug: 'more-engine-models' },
    ],
  },
  {
    id: 2, slug: 'stirling-engines', emoji: '🔥', tone: '#FFF1CC',
    children: [
      { id: 21, slug: 'single-cylinder-stirling' },
      { id: 22, slug: 'multi-cylinder-stirling' },
      { id: 23, slug: 'low-temperature-stirling' },
      { id: 24, slug: 'stirling-vehicles' },
      { id: 25, slug: 'vacuum-engines' },
    ],
  },
  { id: 3, slug: 'steam-engines', emoji: '♨️', tone: '#E8EEF5', children: [] },
  {
    id: 4, slug: 'rc-vehicles', emoji: '🏎️', tone: '#E3F3EC',
    children: [
      { id: 41, slug: 'rc-cars-trucks' },
      { id: 42, slug: 'rc-helicopters' },
      { id: 43, slug: 'rc-airplanes' },
      { id: 44, slug: 'rc-tanks' },
      { id: 45, slug: 'rc-boats' },
    ],
  },
  { id: 5, slug: '3d-metal-model-kits', emoji: '🧩', tone: '#EEE8F7', children: [] },
  {
    id: 6, slug: 'science-stem-kits', emoji: '🔬', tone: '#E4F1F8',
    children: [
      { id: 61, slug: 'tesla-coils' },
      { id: 62, slug: 'science-experiments' },
      { id: 63, slug: 'astronomy-gear' },
    ],
  },
  {
    id: 7, slug: 'parts-accessories', emoji: '🔧', tone: '#F1EDE6',
    children: [
      { id: 71, slug: 'engine-parts' },
      { id: 72, slug: 'stirling-steam-parts' },
      { id: 73, slug: 'rc-parts' },
    ],
  },
];

export const STORE_BRANDS = ['CISON', 'ENJOMOR', 'TOYAN', 'RETROL', 'SEMTO', 'TECHING', 'SKYMECH', 'KACIO', 'VRX', 'HSP', 'FLYWING', 'YU XIANG'];

export function categoryHref(parentSlug: string, childSlug?: string): string {
  return childSlug ? `/categories/${parentSlug}/${childSlug}` : `/categories/${parentSlug}`;
}

export function categoryLabelKey(slug: string): string {
  return `cat.${slug}`;
}
