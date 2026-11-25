// Shared homepage defaults used by both public rendering and the admin editor.
// This avoids the admin page starting from an empty state when DB has no rows yet.

export type HeroCTA = { text: string; href: string };
export type HeroSlide = {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  cta: { primary: HeroCTA; secondary: HeroCTA };
};

export type HeroSectionData = {
  autoPlayMs?: number;
  slides: HeroSlide[];
};

export const DEFAULT_HERO_DATA: HeroSectionData = {
  autoPlayMs: 6000,
  slides: [
    {
      id: 1,
      title: 'Kavten — Model Engine & RC Parts Store',
      subtitle: 'CISON, ENJOMOR, TOYAN, RETROL and 15+ engine brands',
      description:
        'Kavten is your one-stop shop for miniature model engines, RC cars, nitro engines, Stirling engines and all the accessories and spare parts enthusiasts need — with worldwide shipping.',
      image: '/uploads/media/703bda657f414f6227d65023c54fa6dbfaf49917eecf280e0db159d5d90e5cfb.jpg',
      cta: {
        primary: { text: 'Shop Now', href: '/products' },
        secondary: { text: 'View Categories', href: '/categories' },
      },
    },
    {
      id: 2,
      title: 'Miniature Engines & DIY Kits for Every Builder',
      subtitle: 'V8, V12, Stirling, Radial, Inline — real working engines at model scale',
      description:
        'From single-cylinder Stirling engines to multi-cylinder nitro powerplants, every engine in our catalog is a working mechanical marvel. Perfect gifts for engineers, hobbyists and collectors.',
      image: '/uploads/media/5b80d6ba136115f3a3f4f1e5fa38d6f04487c2c4b0720ecd7380bbdf55baa824.jpg',
      cta: {
        primary: { text: 'Browse Engines', href: '/products' },
        secondary: { text: 'Get a Quote', href: '/contact?inquiry_type=quote' },
      },
    },
    {
      id: 3,
      title: 'RC Cars, Parts & Accessories',
      subtitle: 'Nitro-powered RC crawlers, spare parts and upgrade kits',
      description:
        'Fuel-powered RC vehicles and a comprehensive selection of spare parts, upgrade kits and accessories. Everything you need to build, run and maintain your RC machine.',
      image: '/uploads/media/69ef060c5b6d10ee6bef5d49e4809819d91b59d5675a68ca1b372dc01a476036.jpg',
      cta: {
        primary: { text: 'RC Vehicles', href: '/products' },
        secondary: { text: 'View All Parts', href: '/products' },
      },
    },
  ],
};

export type CompanyStatItem = {
  id: number;
  icon: string;
  value: number;
  suffix: string;
  label: string;
  description: string;
  color: string;
};

export type CompanyStatsData = {
  headerTitle: string;
  headerDescription: string;
  stats: CompanyStatItem[];
  ctaTitle: string;
  ctaDescription: string;
  ctaPrimary: HeroCTA;
  ctaSecondary: HeroCTA;
};

export const DEFAULT_COMPANY_STATS_DATA: CompanyStatsData = {
  headerTitle: 'Your Model Engine & RC Parts Specialist',
  headerDescription:
    'We carry a wide selection of miniature model engines, RC vehicles, Stirling engines, nitro engines and all the spare parts and accessories engine enthusiasts need.',
  stats: [
    {
      id: 1,
      icon: 'cog',
      value: 1500,
      suffix: '+',
      label: 'Products',
      description: 'Engines, RC vehicles, kits and accessories',
      color: 'text-teal-700',
    },
    {
      id: 2,
      icon: 'shield',
      value: 15,
      suffix: '+',
      label: 'Engine Brands',
      description: 'CISON, ENJOMOR, TOYAN, RETROL, SEMTO and more',
      color: 'text-teal-700',
    },
    {
      id: 3,
      icon: 'truck',
      value: 50,
      suffix: '+',
      label: 'Countries Shipped',
      description: 'Worldwide delivery to engine enthusiasts',
      color: 'text-teal-700',
    },
    {
      id: 4,
      icon: 'users',
      value: 10000,
      suffix: '+',
      label: 'Happy Customers',
      description: 'Hobbyists, collectors and RC enthusiasts',
      color: 'text-teal-700',
    },
    {
      id: 5,
      icon: 'calendar',
      value: 5,
      suffix: '+',
      label: 'Years Serving Hobbyists',
      description: 'Dedicated to the model engine community',
      color: 'text-teal-700',
    },
    {
      id: 6,
      icon: 'building',
      value: 100,
      suffix: '%',
      label: 'Secure Checkout',
      description: 'Safe payments and buyer protection',
      color: 'text-teal-700',
    },
  ],
  ctaTitle: 'Ready to Build Something Amazing?',
  ctaDescription:
    'Browse our full catalog of model engines, RC cars and parts — or contact us for product recommendations and bulk orders.',
  ctaPrimary: { text: 'Shop All Products', href: '/products' },
  ctaSecondary: { text: 'Contact Us', href: '/contact' },
};

export type WorkshopFacilityItem = {
  id: number;
  icon: string;
  title: string;
  description: string;
  image: string;
  features: string[];
};

export type WorkshopCapabilityItem = {
  icon: string;
  title: string;
  description: string;
};

export type WorkshopStatsBlock = {
  items: Array<{ value: string; title: string; subtitle: string }>;
  ctaTitle: string;
  ctaDescription: string;
  ctaPrimary: HeroCTA;
  ctaSecondary: HeroCTA;
};

export type WorkshopSectionData = {
  headerTitle: string;
  headerDescription: string;
  facilities: WorkshopFacilityItem[];
  capabilities: WorkshopCapabilityItem[];
  statsBlock: WorkshopStatsBlock;
};

export const DEFAULT_WORKSHOP_SECTION_DATA: WorkshopSectionData = {
  headerTitle: 'Built for Engine Enthusiasts',
  headerDescription:
    'Every product we carry is chosen for quality, authentic engineering and genuine hobbyist appeal — real engines, real mechanics.',
  facilities: [
    {
      id: 1,
      icon: 'beaker',
      title: 'Quality Control',
      description:
        'Every engine and kit is inspected before dispatch to make sure you get exactly what you ordered.',
      image: '/uploads/media/5b80d6ba136115f3a3f4f1e5fa38d6f04487c2c4b0720ecd7380bbdf55baa824.jpg',
      features: [
        'Pre-shipment inspection',
        'Accurate product descriptions',
        'Complete packing lists verified',
        'Secure protective packaging',
      ],
    },
    {
      id: 2,
      icon: 'archive',
      title: 'Wide Selection',
      description:
        'Over 1,500 products spanning model engines, RC vehicles, Stirling engines, 3D assembly kits and accessories.',
      image: '/uploads/media/703bda657f414f6227d65023c54fa6dbfaf49917eecf280e0db159d5d90e5cfb.jpg',
      features: [
        'V4, V8, V12 engines',
        'Stirling & vacuum engines',
        'Nitro & gasoline RC cars',
        '3D metal assembly models',
      ],
    },
    {
      id: 3,
      icon: 'wrench',
      title: 'Spare Parts Available',
      description:
        'Engine-specific spare parts, upgrade accessories and replacement components for every major brand we carry.',
      image: '/uploads/media/69ef060c5b6d10ee6bef5d49e4809819d91b59d5675a68ca1b372dc01a476036.jpg',
      features: [
        'Brand-matched fitment',
        'Clutch & exhaust systems',
        'Electronic control modules',
        'Fuel system components',
      ],
    },
    {
      id: 4,
      icon: 'truck',
      title: 'Worldwide Delivery',
      description:
        'We ship to 50+ countries with tracked services and secure export packaging for all orders.',
      image: '/uploads/media/db022c123aea59fafe96e18aa177da059392943a42fe9fd19a808b8e0f5d4a6a.jpg',
      features: [
        'Tracked international shipping',
        'Shock-resistant packaging',
        'Email dispatch notification',
        'Import guidance on request',
      ],
    },
  ],
  capabilities: [
    { icon: 'cog', title: 'Real Working Engines', description: 'All engines in our catalog are genuine working mechanical models' },
    { icon: 'clipboard', title: 'Detailed Specifications', description: 'Full specs, packing lists and age ratings on every product page' },
    { icon: 'truck', title: 'Global Shipping', description: 'Worldwide delivery to engine and RC hobbyists in 50+ countries' },
    { icon: 'check', title: 'Secure Payments', description: 'PayPal checkout with full buyer protection on every order' },
  ],
  statsBlock: {
    items: [
      { value: '1,500+', title: 'Products', subtitle: 'Engines, RC vehicles, kits and parts' },
      { value: '15+', title: 'Engine Brands', subtitle: 'CISON, ENJOMOR, TOYAN, RETROL and more' },
      { value: '50+', title: 'Countries', subtitle: 'Worldwide shipping to hobbyists globally' },
    ],
    ctaTitle: 'Find Your Next Build',
    ctaDescription:
      'Browse our full catalog and find the perfect model engine, RC vehicle or kit for your next project.',
    ctaPrimary: { text: 'Shop Now', href: '/products' },
    ctaSecondary: { text: 'All Categories', href: '/categories' },
  },
};

export type ServiceItem = {
  id: number;
  icon: string;
  title: string;
  description: string;
  features: string[];
  color: string;
  href?: string;
};

export type ProcessStep = { step: string; title: string; description: string };

export type ServicesSectionData = {
  headerTitle: string;
  headerDescription: string;
  services: ServiceItem[];
  processTitle: string;
  processDescription: string;
  processSteps: ProcessStep[];
  ctaTitle: string;
  ctaDescription: string;
  ctaPrimary: HeroCTA;
  ctaSecondary: HeroCTA;
  ctaBadges: string[];
};

export const DEFAULT_SERVICES_SECTION_DATA: ServicesSectionData = {
  headerTitle: 'Everything an Engine Enthusiast Needs',
  headerDescription:
    'From working model engines to RC vehicles, spare parts and DIY kits — Kavten supports builders, collectors and hobbyists at every level.',
  services: [
    {
      id: 1,
      icon: 'cog',
      title: 'Model Engines',
      description:
        'Working miniature engines — V8, V12, radial, inline, Stirling and nitro — from leading brands like CISON, ENJOMOR, TOYAN and RETROL.',
      features: ['Real working engines', 'Multiple cylinder configs', 'Desktop display ready', 'Age 16+ builds'],
      color: 'bg-teal-600',
      href: '/products',
    },
    {
      id: 2,
      icon: 'wrench',
      title: 'Spare Parts & Accessories',
      description:
        'Full range of engine spare parts, upgrade kits, exhaust systems, clutches, Bluetooth controllers and mounting accessories.',
      features: ['OEM-compatible parts', 'Engine-specific fitment', 'Clutch & drivetrain', 'Electronic modules'],
      color: 'bg-green-500',
      href: '/products',
    },
    {
      id: 3,
      icon: 'truck',
      title: 'RC Vehicles',
      description:
        'Nitro-powered RC cars and crawlers with real fuel engines, 4WD chassis and water-cooling systems for the serious RC enthusiast.',
      features: ['Nitro & gasoline powered', '4WD off-road capable', '2.4GHz remote control', 'RTR & kit versions'],
      color: 'bg-orange-500',
      href: '/products',
    },
    {
      id: 4,
      icon: 'phone',
      title: 'Customer Support',
      description:
        'Our team of engine enthusiasts is ready to help with product selection, technical questions and after-sales support.',
      features: ['Pre-sale consultation', 'Build guidance', 'Troubleshooting help', 'Worldwide shipping'],
      color: 'bg-purple-500',
      href: '/contact',
    },
  ],
  processTitle: 'How to Order',
  processDescription:
    'Simple steps from browsing to delivery — get your engine running fast.',
  processSteps: [
    {
      step: '01',
      title: 'Browse & Select',
      description:
        'Find your engine, RC vehicle or spare part from our catalog of 1,500+ products across 15+ brands.',
    },
    {
      step: '02',
      title: 'Add to Cart',
      description:
        'Choose your variant — engine configuration, kit or RTR version — and add to cart.',
    },
    {
      step: '03',
      title: 'Secure Checkout',
      description:
        'Pay securely via PayPal. All transactions are protected with buyer guarantee.',
    },
    {
      step: '04',
      title: 'Fast Dispatch',
      description:
        'Orders are packed securely and dispatched promptly with tracking provided by email.',
    },
    {
      step: '05',
      title: 'Build & Enjoy',
      description:
        'Follow the included instructions and enjoy your model engine. Contact support anytime you need help.',
    },
  ],
  ctaTitle: 'Ready to Start Your Build?',
  ctaDescription:
    'Browse over 1,500 products — model engines, RC vehicles, kits and spare parts — shipped worldwide.',
  ctaPrimary: { text: 'Shop All Products', href: '/products' },
  ctaSecondary: { text: 'View Categories', href: '/categories' },
  ctaBadges: ['Worldwide Shipping', 'Secure Payments', '1,500+ Products'],
};

export type FeaturedProductsSectionData = {
  headerTitle: string;
  headerDescription: string;
  ctaText: string;
  ctaHref: string;
};

export const DEFAULT_FEATURED_PRODUCTS_SECTION_DATA: FeaturedProductsSectionData = {
  headerTitle: 'Featured Products',
  headerDescription:
    'Hand-picked model engines, RC vehicles and accessories — the most popular builds and parts from our catalog.',
  ctaText: 'View All Products',
  ctaHref: '/products',
};

export function getDefaultDataBySectionKey(key: string): unknown | null {
  if (key === 'hero_section') return DEFAULT_HERO_DATA;
  if (key === 'company_stats') return DEFAULT_COMPANY_STATS_DATA;
  if (key === 'workshop_section') return DEFAULT_WORKSHOP_SECTION_DATA;
  if (key === 'services_section') return DEFAULT_SERVICES_SECTION_DATA;
  if (key === 'featured_products') return DEFAULT_FEATURED_PRODUCTS_SECTION_DATA;
  if (key === 'brands_section') return { brands: [] };
  if (key === 'repair_capabilities') return { capabilities: [] };
  if (key === 'home_blog') return { source: 'featured_blog_articles', limit: 3 };
  return null;
}
