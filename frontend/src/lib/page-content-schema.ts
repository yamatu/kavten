import { enMessages } from '@/lib/i18n/messages-en';
import { storeEn } from '@/lib/i18n/store-messages-en';
import { PAGE_SECTION_KEYS, type EditablePage, type PageField, type PageSchema } from '@/lib/page-content';

const en = (key: string): string => storeEn[key] || (enMessages as Record<string, string>)[key] || '';

function text(key: string, zh: string, label: string, i18nKey: string, type: 'text' | 'textarea' = 'text'): PageField {
  return { key, type, zh, en: label, fallback: en(i18nKey), i18nKey };
}

function plain(key: string, zh: string, label: string, fallback: string, type: 'text' | 'textarea' = 'text'): PageField {
  return { key, type, zh, en: label, fallback };
}

function image(key: string, zh: string, label: string, fallback = ''): PageField {
  return { key, type: 'image', zh, en: label, fallback };
}

export const ABOUT_PAGE_SCHEMA: PageSchema = {
  page: 'about',
  sectionKey: PAGE_SECTION_KEYS.about,
  path: '/about',
  zh: '关于我们',
  en: 'About page',
  groups: [
    {
      zh: '页面顶部',
      en: 'Hero',
      fields: [
        text('heroKicker', '小标签', 'Kicker', 'nav.about'),
        text('heroTitle', '大标题', 'Title', 'about.title'),
        text('heroSubtitle', '副标题', 'Subtitle', 'store.hero.kicker'),
        text('heroText', '介绍文字', 'Intro text', 'store.hero.text', 'textarea'),
        image('heroImage', '右侧图片', 'Side image', '/images/kavten-logo.png'),
      ],
    },
    {
      zh: '品牌故事（填写后显示）',
      en: 'Our story (shown when filled)',
      fields: [
        { ...plain('storyTitle', '故事标题', 'Story title', ''), hint: { zh: '标题或正文任填一项，页面就会出现这个区块。', en: 'The section appears once the title or text is filled in.' } },
        plain('storyText', '故事正文', 'Story text', '', 'textarea'),
        image('storyImage', '故事配图', 'Story image'),
      ],
    },
    {
      zh: '分类区',
      en: 'Categories',
      fields: [
        text('catsTitle', '标题', 'Title', 'store.cats.title'),
        text('catsText', '说明', 'Text', 'store.cats.text', 'textarea'),
      ],
    },
    {
      zh: '选择我们的理由',
      en: 'Why Kavten',
      fields: [
        text('whyTitle', '标题', 'Title', 'store.why.title'),
        ...[1, 2, 3, 4].flatMap((n) => [
          text(`why${n}Title`, `理由 ${n} 标题`, `Reason ${n} title`, `store.why.${n}.title`),
          text(`why${n}Text`, `理由 ${n} 说明`, `Reason ${n} text`, `store.why.${n}.text`, 'textarea'),
        ]),
      ],
    },
    {
      zh: '礼品推荐横幅',
      en: 'Gift banner',
      fields: [
        text('giftTitle', '标题', 'Title', 'store.gift.title'),
        text('giftText', '说明', 'Text', 'store.gift.text', 'textarea'),
        text('giftCta', '按钮文字', 'Button text', 'store.gift.cta'),
      ],
    },
  ],
};

export const CONTACT_PAGE_SCHEMA: PageSchema = {
  page: 'contact',
  sectionKey: PAGE_SECTION_KEYS.contact,
  path: '/contact',
  zh: '联系我们',
  en: 'Contact page',
  groups: [
    {
      zh: '页面顶部',
      en: 'Hero',
      fields: [
        text('heroKicker', '小标签', 'Kicker', 'contact.kicker'),
        text('heroTitle', '大标题', 'Title', 'contact.title'),
        text('heroText', '介绍文字', 'Intro text', 'contact.description', 'textarea'),
        image('heroImage', '顶部背景图（可选）', 'Background image (optional)'),
      ],
    },
    {
      zh: '联系方式',
      en: 'Contact details',
      fields: [
        text('infoTitle', '区块标题', 'Section title', 'contact.getInTouch'),
        plain('address', '地址', 'Address', 'Kunshan, Jiangsu Province\nChina', 'textarea'),
        plain('phone', '电话', 'Phone', '+86 13301553506'),
        plain('email', '邮箱', 'Email', 'flora@kavten.com'),
        plain('hours', '营业时间', 'Business hours', 'Monday - Friday: 8:00 AM - 6:00 PM\nSaturday: 9:00 AM - 5:00 PM\nSunday: Closed', 'textarea'),
        { ...plain('facility', '仓库 / 设施（可选）', 'Facility (optional)', ''), hint: { zh: '留空则不显示这一行。', en: 'Leave empty to hide this row.' } },
        text('serviceArea', '服务范围', 'Service area', 'product.worldwideShipping'),
      ],
    },
    {
      zh: '留言表单',
      en: 'Message form',
      fields: [text('formTitle', '表单标题', 'Form title', 'contact.sendTitle')],
    },
    {
      zh: '选择我们的理由',
      en: 'Why choose us',
      fields: [
        text('whyTitle', '标题', 'Title', 'contact.whyChoose'),
        text('why1Title', '理由 1 标题', 'Reason 1 title', 'contact.fastResponse'),
        text('why1Text', '理由 1 说明', 'Reason 1 text', 'contact.fastResponseDescription', 'textarea'),
        text('why2Title', '理由 2 标题', 'Reason 2 title', 'store.why.2.title'),
        text('why2Text', '理由 2 说明', 'Reason 2 text', 'store.why.2.text', 'textarea'),
        text('why3Title', '理由 3 标题', 'Reason 3 title', 'contact.globalShipping'),
        text('why3Text', '理由 3 说明', 'Reason 3 text', 'contact.globalShippingDescription', 'textarea'),
      ],
    },
  ],
};

export const PAGE_SCHEMAS: Record<EditablePage, PageSchema> = {
  about: ABOUT_PAGE_SCHEMA,
  contact: CONTACT_PAGE_SCHEMA,
};
