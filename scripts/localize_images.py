"""Download every remote catalogue image into the local media library.

Files land in backend/uploads/media/<sha256>.<ext> (served at /uploads/media/...,
thumbnails at /media-thumb/media/...) and are registered in media_assets so they
show up in the admin media library.

Usage (from the repo root, with the docker stack running):
  python scripts/localize_images.py download   # resumable; re-run to retry failures
  python scripts/localize_images.py sql        # writes tmp/localize.sql
  docker compose exec -T mysql sh -c 'mysql --default-character-set=utf8mb4 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < tmp/localize.sql
"""
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA_DIR = os.path.join(ROOT, 'backend', 'uploads', 'media')
MAP_PATH = os.path.join(ROOT, 'scripts', 'data', 'image_map.json')
SQL_PATH = os.path.join(ROOT, 'tmp', 'localize.sql')
EXT = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif'}
PIL_MIME = {'JPEG': 'image/jpeg', 'PNG': 'image/png', 'WEBP': 'image/webp', 'GIF': 'image/gif'}
COMPETITOR = re.compile(r'engine\s*diy', re.I)


def mysql_rows(query):
    cmd = ['docker', 'compose', 'exec', '-T', 'mysql', 'sh', '-c',
           'mysql --default-character-set=utf8mb4 -N --batch -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"']
    out = subprocess.run(cmd, input=query.encode('utf-8'), capture_output=True, cwd=ROOT, check=True).stdout
    return [line.split('\t') for line in out.decode('utf-8').splitlines() if line]


def remote_urls():
    rows = mysql_rows("SELECT url FROM product_images WHERE url LIKE 'http%' "
                      "UNION SELECT image_url FROM categories WHERE image_url LIKE 'http%';")
    return sorted({r[0] for r in rows})


def load_map():
    if os.path.exists(MAP_PATH):
        with open(MAP_PATH, encoding='utf-8') as f:
            return json.load(f)
    return {}


def fetch(url):
    last = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (KavtenImageLocalizer)', 'Accept': 'image/jpeg,image/png,image/*;q=0.8'})
            with urllib.request.urlopen(req, timeout=60) as res:
                data = res.read()
            img = Image.open(io.BytesIO(data))
            fmt = img.format
            width, height = img.size
            img.verify()
            mime = PIL_MIME.get(fmt)
            if not mime:
                raise ValueError(f'unsupported format {fmt}')
            return data, mime, width, height
        except Exception as exc:  # network hiccups and truncated bodies are retried
            last = exc
            time.sleep(1.5 * (attempt + 1))
    raise last


def download():
    os.makedirs(MEDIA_DIR, exist_ok=True)
    mapping = load_map()
    urls = [u for u in remote_urls() if u not in mapping or not os.path.exists(os.path.join(ROOT, 'backend', 'uploads', mapping[u]['rel']))]
    print(f'{len(urls)} images to download ({len(mapping)} already local)')
    lock = threading.Lock()
    failures = []
    done = 0

    def work(url):
        data, mime, width, height = fetch(url)
        sha = hashlib.sha256(data).hexdigest()
        rel = f'media/{sha}{EXT[mime]}'
        path = os.path.join(ROOT, 'backend', 'uploads', rel)
        if not os.path.exists(path):
            # Distinct URLs can share identical bytes, so temp names must be per-thread.
            tmp = f'{path}.{threading.get_ident()}.part'
            with open(tmp, 'wb') as f:
                f.write(data)
            try:
                os.replace(tmp, path)
            except OSError:
                if not os.path.exists(path):
                    raise
                os.remove(tmp)
        name = os.path.basename(url.split('?', 1)[0])
        return url, {'rel': rel, 'sha': sha, 'mime': mime, 'size': len(data), 'w': width, 'h': height,
                     'name': COMPETITOR.sub('kavten', name)}

    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = {pool.submit(work, u): u for u in urls}
        for fut in as_completed(futures):
            url = futures[fut]
            try:
                key, entry = fut.result()
                with lock:
                    mapping[key] = entry
                    done += 1
                    if done % 250 == 0:
                        save_map(mapping)
                        print(f'  {done}/{len(urls)}', flush=True)
            except Exception as exc:
                failures.append((url, str(exc)))
    save_map(mapping)
    print(f'downloaded {done}, failed {len(failures)}')
    for url, err in failures[:20]:
        print('  FAIL', url, err)
    return 1 if failures else 0


def save_map(mapping):
    tmp = MAP_PATH + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, ensure_ascii=False)
    os.replace(tmp, MAP_PATH)


def q(value):
    if value is None:
        return 'NULL'
    if isinstance(value, (int, float)):
        return str(value)
    s = str(value).replace('\\', '\\\\').replace("'", "\\'").replace('\n', ' ')
    return f"'{s}'"


def build_sql():
    mapping = load_map()
    local = lambda url: '/uploads/' + mapping[url]['rel'] if url in mapping else url
    out = ['SET NAMES utf8mb4;', 'START TRANSACTION;']

    image_rows = mysql_rows(
        "SELECT pi.id, pi.url, p.sku, p.name, COALESCE(parent.slug, c.slug) FROM product_images pi "
        "JOIN products p ON p.id = pi.product_id JOIN categories c ON c.id = p.category_id "
        "LEFT JOIN categories parent ON parent.id = c.parent_id ORDER BY pi.product_id, pi.sort_order;")
    assets = {}
    missing = 0
    for image_id, url, sku, name, top in image_rows:
        if not url.startswith('http'):
            continue
        if url not in mapping:
            missing += 1
            continue
        entry = mapping[url]
        out.append(f"UPDATE product_images SET url={q(local(url))}, filename={q(os.path.basename(entry['rel']))}, "
                   f"original_name={q(entry['name'][:255])} WHERE id={image_id};")
        assets.setdefault(entry['sha'], (entry, name, sku, top))

    for pid, raw in mysql_rows("SELECT id, image_urls FROM products WHERE image_urls LIKE '%http%';"):
        urls = json.loads(raw)
        out.append(f"UPDATE products SET image_urls={q(json.dumps([local(u) for u in urls]))} WHERE id={pid};")

    for cid, url in mysql_rows("SELECT id, image_url FROM categories WHERE image_url LIKE 'http%';"):
        out.append(f'UPDATE categories SET image_url={q(local(url))} WHERE id={cid};')

    for sha, (entry, name, sku, top) in assets.items():
        out.append(
            'INSERT INTO media_assets (original_name,file_name,relative_path,sha256,mime_type,size_bytes,title,alt_text,folder,tags,created_at,updated_at) VALUES ('
            f"{q(entry['name'][:255])},{q(os.path.basename(entry['rel']))},{q(entry['rel'])},{q(sha)},{q(entry['mime'])},{entry['size']},"
            f"{q(name[:255])},{q(name[:500])},{q('products/' + top)},{q(sku)},NOW(3),NOW(3)) "
            'ON DUPLICATE KEY UPDATE updated_at=NOW(3);')
    out.append('COMMIT;')
    with open(SQL_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out) + '\n')
    print(f'wrote {SQL_PATH}: {len(assets)} media assets, {missing} images without a local copy')
    return 1 if missing else 0


if __name__ == '__main__':
    command = sys.argv[1] if len(sys.argv) > 1 else ''
    if command == 'download':
        sys.exit(download())
    if command == 'sql':
        sys.exit(build_sql())
    print(__doc__)
    sys.exit(2)
