// Verifies that <title> and <link rel="canonical"> land inside <head> for every
// crawlable page shape, for bot and browser user-agents alike. Read-only.
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const HOST = process.env.AUDIT_HOST || 'kavten.com';
const PATHS = ['/', '/products', '/categories', '/about', '/faq', '/privacy', '/returns',
  '/shipping-policy', '/warranty-policy', '/terms', '/contact', '/products?page=2'];
const UAS = {
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  browser: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
};

async function probe(path, ua) {
  const res = await fetch(BASE + path, { headers: { host: HOST, 'user-agent': ua } });
  const html = await res.text();
  const headEnd = html.indexOf('</head>');
  const titleAt = html.indexOf('<title');
  const canonAt = html.search(/rel="canonical"/i);
  return {
    status: res.status,
    title: titleAt > 0 && titleAt < headEnd ? html.slice(titleAt, html.indexOf('</title>', titleAt) + 8)
      .replace(/<[^>]+>/g, '').slice(0, 44) : null,
    canonicalInHead: canonAt > 0 && canonAt < headEnd,
    escaped: titleAt > headEnd && headEnd > 0,
  };
}

let failures = 0;
for (const path of PATHS) {
  const row = await probe(path, UAS.googlebot);
  const browser = await probe(path, UAS.browser);
  const bad = !row.title || !row.canonicalInHead || !browser.title || !browser.canonicalInHead;
  if (bad) failures += 1;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${path}  status=${row.status}  title="${row.title || ''}"  canonInHead=${row.canonicalInHead}/${browser.canonicalInHead}`);
}
console.log(failures === 0 ? 'META_HEAD_OK' : `META_HEAD_FAILURES=${failures}`);
process.exit(failures === 0 ? 0 : 1);
