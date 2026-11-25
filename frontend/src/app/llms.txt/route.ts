import { getRequestBaseUrl } from '@/lib/request-url';
import { getStoreCategoryTree } from '@/services/storefront.server';
import { getCommercePolicyCached } from '@/services/commerce-policy.server';
import { isCommercePolicyConfirmed } from '@/lib/commerce-policy';
import { BRAND_DESCRIPTION } from '@/lib/structured-data';
import { getCategorySeo } from '@/lib/category-seo';
import { STORE_BRANDS } from '@/lib/store-catalog';
import { SITE_NAME } from '@/lib/seo';

export const revalidate = 3600;

/**
 * /llms.txt — a compact, plain-text map of the store for AI answer engines.
 * It only restates facts the site itself publishes.
 */
export async function GET() {
  const baseUrl = await getRequestBaseUrl();
  const [tree, policy] = await Promise.all([getStoreCategoryTree(), getCommercePolicyCached()]);
  const total = tree.reduce((sum, node) => sum + (node.product_count || 0), 0);

  const categoryLines = tree.flatMap((node) => {
    const seo = getCategorySeo(node.slug);
    const lines = [`- [${seo?.h1 || node.name}](${baseUrl}/categories/${node.path || node.slug}) (${node.product_count || 0} products): ${seo?.description || node.description}`];
    for (const child of node.children || []) {
      const childSeo = getCategorySeo(child.slug);
      lines.push(`  - [${childSeo?.h1 || child.name}](${baseUrl}/categories/${child.path || child.slug}) (${child.product_count || 0})`);
    }
    return lines;
  });

  const lines: string[] = [
    `# ${SITE_NAME}`,
    '',
    `> ${BRAND_DESCRIPTION}`,
    '',
    `Kavten (kavten.com) lists ${total > 0 ? `${total.toLocaleString('en-US')} ` : ''}products across the categories below. Brands carried include ${STORE_BRANDS.join(', ')}.`,
    '',
    '## How to read this site',
    '- Product pages live at `/products/{product-slug}` and start with a "Key facts" box: power source, build (kit or assembled), recommended age, number of parts, size and weight, followed by the full description, specifications and a product FAQ.',
    '- Category pages live at `/categories/{category-path}` and include a buying guide and FAQ for that type of engine or model.',
    '- Gas and nitro engines burn fuel; Stirling and vacuum engines run on heat; steam engines need a boiler; many metal assembly kits are electric-driven display models. Each product page states which applies.',
    `- Full product list: ${baseUrl}/sitemap.xml`,
    '',
    '## Categories',
    ...(categoryLines.length > 0 ? categoryLines : ['- (category list unavailable)']),
    '',
    '## Ordering',
    '- Prices are in USD. Payment by PayPal or card at checkout.',
    '- Kavten ships worldwide with tracking; the shipping cost for each country is calculated at checkout.',
    ...(isCommercePolicyConfirmed(policy)
      ? [
          `- Order handling: ${policy.shipping_handling_time_text}; typical transit: ${policy.shipping_transit_time_text}.`,
          `- Warranty: ${policy.default_warranty_period}. Returns: ${policy.return_window_text}.`,
        ]
      : []),
    '',
    '## Key pages',
    `- Home: ${baseUrl}/`,
    `- All products: ${baseUrl}/products`,
    `- About Kavten: ${baseUrl}/about`,
    `- FAQ: ${baseUrl}/faq`,
    `- Shipping policy: ${baseUrl}/shipping-policy`,
    `- Returns: ${baseUrl}/returns`,
    `- Warranty: ${baseUrl}/warranty-policy`,
    `- Contact: ${baseUrl}/contact (flora@kavten.com)`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
