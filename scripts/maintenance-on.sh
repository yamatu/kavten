#!/usr/bin/env bash
# 服务器端：把 kavten.com 切成「临时下线（503 + Retry-After）」状态。
# 幂等：重复执行不会重复插入 include。
set -euo pipefail

SNIP=/etc/nginx/snippets/kavten-maintenance.conf
VHOST=/etc/nginx/sites-enabled/kavten.com.conf
WEBROOT=/var/www/maintenance

mkdir -p "$WEBROOT"
cat > "$WEBROOT/__maintenance.html" <<'HTML'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Kavten — temporarily offline</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#0f1115;color:#e7e9ee;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  main{max-width:34rem;padding:2rem;text-align:center}
  h1{font-size:1.5rem;margin:0 0 .75rem}
  p{margin:.5rem 0;color:#a7adba}
  code{color:#8ab4f8}
</style>
</head>
<body>
<main>
  <h1>Kavten is temporarily offline</h1>
  <p>We are performing scheduled maintenance and the store is unavailable right now.</p>
  <p>Please check back shortly.</p>
  <p><code>kavten.com</code></p>
</main>
</body>
</html>
HTML

cat > "$SNIP" <<'CONF'
# Maintenance switch. Included at server level by kavten.com.conf:
# present  -> every request answers 503 + Retry-After (Google keeps the URLs
#             indexed and retries, unlike 404/410 which drop them);
# removed  -> site is back online.
#
# NOTE: `error_page 503` does NOT intercept a response produced by `return 503`
# (nginx only routes module-generated errors through error_page), so the
# maintenance page is delivered as headers + nginx's built-in 503 body.
return 503;
add_header Retry-After 86400 always;
add_header Cache-Control "no-store" always;
add_header X-Kavten-Maintenance 1 always;
CONF

cp -a "$VHOST" "/root/kavten.com.conf.online"

python3 - "$VHOST" <<'PY'
import io, re, sys
path = sys.argv[1]
include = '    include /etc/nginx/snippets/kavten-maintenance.conf;\n'
text = io.open(path, encoding='utf-8').read()

if 'kavten-maintenance.conf' in text:
    print('maintenance include already present')
else:
    out = []
    for line in text.splitlines(keepends=True):
        out.append(line)
        # One include per http server block; `server {` is always followed by the
        # listen lines and nginx does not care about directive order inside a block.
        if re.match(r'^server\s*\{', line):
            out.append(include)
    io.open(path, 'w', encoding='utf-8', newline='').write(''.join(out))
    print('maintenance include inserted into', sum(1 for l in out if 'kavten-maintenance.conf' in l), 'server blocks')
PY

nginx -t
systemctl reload nginx

echo "--- local checks ---"
for u in http://127.0.0.1:3010/ ; do :; done
curl -sk -o /dev/null -D - -H 'Host: kavten.com' --resolve kavten.com:8444:127.0.0.1 https://kavten.com:8444/ \
  | grep -iE '^HTTP|^retry-after|^cache-control|^x-kavten' | tr -d '\r'
echo "MAINTENANCE_ON"
