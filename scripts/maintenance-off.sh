#!/usr/bin/env bash
# 服务器端：撤销「临时下线」，恢复到正常服务。
# 会先去掉 maintenance include，再重建/启动容器，最后给出线上自检结果。
set -euo pipefail

VHOST=/etc/nginx/sites-enabled/kavten.com.conf

python3 - "$VHOST" <<'PY'
import io, sys
path = sys.argv[1]
text = io.open(path, encoding='utf-8').read()
lines = [l for l in text.splitlines(keepends=True) if 'kavten-maintenance.conf' not in l]
io.open(path, 'w', encoding='utf-8', newline='').write(''.join(lines))
print('maintenance include removed')
PY

nginx -t
systemctl reload nginx

cd /root/kavten
docker compose up -d mysql redis
docker compose up -d --no-deps backend frontend
for i in $(seq 1 40); do
  c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3010/ || true)
  if [ "$c" = "200" ]; then echo "frontend 200 after ${i}x2s"; break; fi
  sleep 2
done
echo "MAINTENANCE_OFF"
