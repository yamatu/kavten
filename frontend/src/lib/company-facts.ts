export const COMPANY_FACTS = {
  foundingYear: 2019,
  experienceYears: 5,
  productCount: 1500,
  engineBrands: 15,
} as const;

const LEGACY_COPY_REPLACEMENTS: Array<[string, string]> = [
  [
    'Kavten- One-Stop CNC Solution Supplier',
    'Model Engine & RC Parts Store',
  ],
  [
    'Your Trusted Partner Since 2005',
    'CISON, ENJOMOR, TOYAN, RETROL and 15+ engine brands',
  ],
  [
    'Kavten established in 2005 in Kunshan, China. We are selling engine components like System unit, Circuit board, PLC, HMI, Inverter, Encoder, Amplifier, Servomotor, Servodrive etc of AB, ABB, Fanuc, TOYAN, ENJOMOR and other manufacturers.',
    'Kavten stocks miniature model engines, RC vehicles, Stirling engines, 3D assembly kits and spare parts from CISON, ENJOMOR, TOYAN, RETROL, SEMTO, TECHING and 15+ brands — shipped worldwide.',
  ],
  [
    '5,000sqm Workshop Facility',
    '1,500+ Products In Stock',
  ],
  [
    'Top 3 Fanuc Supplier in China',
    'Model engines, RC cars, Stirling engines and accessories',
  ],
  [
    'Especially Fanuc, We are one of the top three suppliers in China. We now have 27 workers, 10 sales and 100,000 items regularly stocked. Daily parcel around 50-100pcs, yearly turnover around 200 million.',
    'We carry over 1,500 products from 15+ engine brands and ship worldwide to hobbyists, collectors and RC enthusiasts.',
  ],
  [
    '20+ Years Professional Service',
    '15+ Engine Brands Stocked',
  ],
  [
    'More than 18 years experience we have ability to coordinate specific strengths into a whole, providing clients with solutions that consider various import and export transportation options.',
    'Our catalog covers CISON, ENJOMOR, TOYAN, RETROL, SEMTO, TECHING, VRX, FLYWING and more — with worldwide shipping on every order.',
  ],
];

export function normalizeLegacyCompanyText(value: unknown): string {
  let text = String(value ?? '');
  for (const [legacy, replacement] of LEGACY_COPY_REPLACEMENTS) {
    text = text.split(legacy).join(replacement);
  }

  return text
    .replace(/\b2005\b/g, String(COMPANY_FACTS.foundingYear))
    .replace(/5,000\s*(?:sqm|m²)?/gi, '1,500+ products')
    .replace(/\b5000\s*(?:sqm|m²)?/gi, '1,500+ products')
    .replace(/\b20\+\s*years?/gi, '15+ engine brands')
    .replace(/more than 20 years/gi, '15+ engine brands');
}

export function normalizeCompanyStat<T extends Record<string, unknown>>(stat: T): T {
  const next = { ...stat } as Record<string, unknown>;
  const context = `${String(stat.label || '')} ${String(stat.description || '')}`.toLowerCase();

  next.label = normalizeLegacyCompanyText(stat.label);
  next.description = normalizeLegacyCompanyText(stat.description);

  if (/years? experience|industry experience/.test(context)) {
    next.value = COMPANY_FACTS.experienceYears;
    next.suffix = '+';
    next.description = 'Dedicated to the model engine community';
  } else if (/workshop|facility|square meters|\bsqm\b/.test(context)) {
    next.value = COMPANY_FACTS.productCount;
    next.suffix = '+';
    next.description = 'Engines, RC vehicles, kits and spare parts';
  } else if (/brands?/.test(context)) {
    next.value = COMPANY_FACTS.engineBrands;
    next.suffix = '+';
    next.description = 'CISON, ENJOMOR, TOYAN, RETROL, SEMTO and more';
  }

  return next as T;
}
