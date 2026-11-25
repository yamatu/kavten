"""Build a MySQL import script for the Kavten catalogue from enginediy_products.xlsx.

Usage:
  python scripts/import_enginediy.py <xlsx> <out.sql> [scripts/data/image_map.json]

With an image map (from scripts/localize_images.py) remote image URLs are
replaced by their local /uploads/media/... copies.
  docker compose exec -T mysql sh -c 'mysql --default-character-set=utf8mb4 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < out.sql
"""
import json
import re
import sys
from collections import defaultdict

import openpyxl

# (id, slug, en name, zh name, parent id, sort, description)
CATEGORIES = [
    (1, 'model-engines', 'Model Engines', '发动机模型', None, 1, "Shop working model engine kits: V8, V12, inline, twin, radial and jet engine models from ENJOMOR, TOYAN, CISON, RETROL and TECHING. Gas, nitro and electric."),
    (11, 'v8-engines', 'V8 Engines', 'V8 发动机', 1, 1, "V8 engine model kits that run: ENJOMOR GS-V8 gasoline engines, TOYAN FS-V800 nitro V8s, CISON V8s and TECHING full-metal V8 assembly kits. Shipped worldwide."),
    (12, 'v12-v6-engines', 'V12 & V6 Engines', 'V12 / V6 发动机', 1, 2, "V12 and V6 engine models from ENJOMOR, RUIFEIYA and TECHING: gasoline DOHC V12s that run and detailed metal assembly kits for collectors."),
    (13, 'inline-twin-engines', 'Inline & Twin Engines', '直列 / 双缸发动机', 1, 3, "Inline-four, single-cylinder and V-twin engine models from CISON, RETROL, ENJOMOR and TECHING. Working gas engines and metal kits for builders."),
    (14, 'gas-nitro-engines', 'Gas & Nitro Engines', '汽油 / 甲醇发动机', 1, 4, "Gasoline and nitro model engines that really run: TOYAN, ENJOMOR, RETROL, CISON and NGH four-stroke engines, radial engines and RC engines."),
    (15, 'jet-turbine-engines', 'Jet & Turbine Engines', '涡喷 / 涡扇发动机', 1, 5, "Turbofan and jet engine model kits from SKYMECH, TECHING and RETROL. Detailed metal aero engine models you build yourself and watch spin."),
    (16, 'more-engine-models', 'More Engine Models', '更多发动机模型', 1, 6, "Hit and miss engines, stationary engines, radial engines and mechanical models from RETROL, TECHING, TOYAN and CISON for collectors and makers."),
    (2, 'stirling-engines', 'Stirling Engines', '斯特林发动机', None, 2, "Stirling engine kits and hot air engine models: single and multi-cylinder, low temperature, vacuum and Stirling-powered vehicles from ENJOMOR and RETROL."),
    (21, 'single-cylinder-stirling', 'Single Cylinder Stirling', '单缸斯特林', 2, 1, "Single cylinder Stirling engine kits and models from ENJOMOR, RETROL and Microcosm. Alcohol-fired hot air engines — a perfect first Stirling engine."),
    (22, 'multi-cylinder-stirling', 'Multi-Cylinder Stirling', '多缸斯特林', 2, 2, "Multi-cylinder Stirling engines from ENJOMOR: twin, V4, four-cylinder and 16-cylinder swash plate hot air engines with smooth, powerful running."),
    (23, 'low-temperature-stirling', 'Low Temperature Stirling', '低温差斯特林', 2, 3, "Low temperature difference Stirling engines that run on a cup of hot water, coffee or the warmth of your hand. No flame needed — ideal desk toys and STEM gifts."),
    (24, 'stirling-vehicles', 'Stirling Vehicles & Gadgets', '斯特林车辆 / 发电机', 2, 4, "Stirling-powered cars, tractors, generators, fans and LED gadgets from ENJOMOR, TECHING and RETROL. Hot air engines that drive something you can see."),
    (25, 'vacuum-engines', 'Vacuum & Flame Eater Engines', '真空 / 吸火发动机', 2, 5, "Flame eater vacuum engine models from RETROL: engines that suck in a flame to run. Horizontal, crossbeam and tractor designs for curious makers."),
    (3, 'steam-engines', 'Steam Engines', '蒸汽机', None, 3, "Live steam model engines and boilers from KACIO, RETROL and ENJOMOR: stationary engines, oscillating engines, steam turbines and kits with boilers."),
    (4, 'rc-vehicles', 'RC Vehicles', 'RC 遥控模型', None, 4, "RC vehicles for enthusiasts: nitro and gas RC cars and crawlers, scale RC helicopters, RC planes, 1/16 RC tanks and RC boats from VRX, HSP, FLISHRC and more."),
    (41, 'rc-cars-trucks', 'RC Cars & Trucks', 'RC 车 / 卡车', 4, 1, "Nitro and gasoline RC cars, 4WD crawlers and RC trucks from VRX, HSP, TOYAN and HUINA, including engine-powered RC kits and RTR models."),
    (42, 'rc-helicopters', 'RC Helicopters', 'RC 直升机', 4, 2, "Scale RC helicopters from FLISHRC, YU XIANG, FLYWING, WOLFBUSH and ROBAN: 450 to 700-class flybarless and GPS models with realistic fuselages."),
    (43, 'rc-airplanes', 'RC Airplanes', 'RC 飞机', 4, 3, "RC airplanes and 3D flight models from YU XIANG, XK and FLYWING: 2.4G brushless and direct-drive models for sport and aerobatic flying."),
    (44, 'rc-tanks', 'RC Tanks', 'RC 坦克', 4, 4, "1/16 scale RC tanks: Leopard 2A7, Merkava IV, T-34 and more with 2.4G control, infrared battle systems, sound and smoke effects."),
    (45, 'rc-boats', 'RC Boats', 'RC 船', 4, 5, "RC boats including GPS bait boats for fishing and electric model warships, with 2.4G control and long-range operation."),
    (5, '3d-metal-model-kits', '3D Metal Model Kits', '3D 金属拼装', None, 5, "3D metal puzzles and mechanical model kits for adults: steampunk animals, kinetic sculptures, orreries and engines from Punkbuild, TECHING and more."),
    (6, 'science-stem-kits', 'Science & STEM Kits', '科教实验', None, 6, "Musical Tesla coils, plasma toys, physics experiment kits, robot kits, desktop CNC machines and astronomy gear for curious minds and classrooms."),
    (61, 'tesla-coils', 'Tesla Coils', '特斯拉线圈', 6, 1, "Musical Tesla coils and plasma arc speakers that play music through sparks, plus plasma globes and arc lighters. High-voltage physics you can hear."),
    (62, 'science-experiments', 'Science Experiments', '科学实验模型', 6, 2, "Physics experiment models, programmable robot kits, desktop mini CNC machines and STEM learning models from TECHING, Punkbuild and more."),
    (63, 'astronomy-gear', 'Astronomy Gear', '天文摄影', 6, 3, "Astrophotography gear: harmonic equatorial mounts, Newtonian telescopes and WandererAstro accessories for deep-sky imaging."),
    (7, 'parts-accessories', 'Parts & Accessories', '配件', None, 7, "Spare parts and upgrades for model engines and RC: starters, clutches, exhausts, ignition for CISON, TOYAN, ENJOMOR, SEMTO, plus Stirling, steam and RC parts."),
    (71, 'engine-parts', 'Engine Parts & Upgrades', '发动机配件', 7, 1, "Starters, clutches, exhausts, carburettors, ignition, cooling kits and stands for TOYAN, CISON, ENJOMOR and SEMTO model engines."),
    (72, 'stirling-steam-parts', 'Stirling & Steam Parts', '斯特林 / 蒸汽配件', 7, 2, "Parts for Stirling and steam engines: alcohol burners, gas tanks, condensate pots, valves and boiler accessories for KACIO, RETROL and ENJOMOR."),
    (73, 'rc-parts', 'RC Parts & Electronics', 'RC 配件', 7, 3, "RC spare parts and electronics: transmitters, flight simulator controllers, servos, chassis parts and engine RC kits from HSP, TOYAN, FLYWING and WOLFBUSH."),
]

ACCESSORY_TYPES = {'Accessories', 'All Accessories', 'Engine Model accessories', 'Stirling Accessories', 'Motor Vehicle Parts'}
ENGINE_TYPE_EN = {
    'V8 发动机': 'V8', 'V12 发动机': 'V12', 'V6 发动机': 'V6', '单缸/直列': 'Single / Inline',
    '双缸/V缸': 'Twin Cylinder', '直列四缸': 'Inline 4', '汽油/甲醇机': 'Gas / Nitro',
    '斯特林发动机': 'Stirling', '蒸汽机/锅炉': 'Steam', '涡扇/涡喷': 'Turbofan / Turbojet',
    '特斯拉线圈': 'Tesla Coil', '发电机': 'Generator', '冲击式(Hit&Miss)': 'Hit & Miss', '柴油机': 'Diesel',
}
FUEL_EN = {'蒸汽': 'Steam', '汽油': 'Gasoline', '电动': 'Electric', '硝基甲醇': 'Nitro Methanol', '甲醇': 'Methanol', '酒精': 'Alcohol'}
COMPETITOR = re.compile(r'engine\s*diy', re.I)
KNOWN_BRANDS = {
    'ENJOMOR': 'ENJOMOR', 'RETROL': 'RETROL', 'TOYAN': 'TOYAN', 'CISON': 'CISON', 'YU XIANG': 'YU XIANG',
    'YUXIANG': 'YU XIANG', 'TECHING': 'TECHING', 'VRX': 'VRX', 'SKYMECH': 'SKYMECH', 'SKYMECHMAN': 'SKYMECH',
    'KACIO': 'KACIO', 'SEMTO': 'SEMTO', 'FLISHRC': 'FLISHRC', 'HSP': 'HSP', 'FLYWING': 'FLYWING',
    'WOLFBUSH': 'WOLFBUSH', 'MUSA': 'MUSA', 'MICROCOSM': 'Microcosm', 'PUNKBUILD': 'Punkbuild', 'EPHIL': 'EPHIL',
    'WL': 'WLtoys', 'NGH': 'NGH', 'HOWIN': 'HOWIN', 'HUINA': 'HUINA', 'GOOSKY': 'GOOSKY', 'XK': 'XK',
    'RUIFEIYA': 'RUIFEIYA', 'HEEWING': 'HEEWING', 'ROBAN': 'ROBAN', 'WANDERERASTRO': 'WandererAstro', 'TWOLF': 'TWOLF',
}


SLUG_TAIL_STOPWORDS = {'with', 'and', 'for', 'the', 'of', 'a', 'an', 'to', 'in', 'from', 'by', 'or', 'that', 'your'}


def make_slug(handle, taken):
    words = re.sub(r'[^a-z0-9]+', '-', str(handle).lower()).strip('-').split('-')
    seen, kept = set(), []
    for word in words:
        if not word or word == 'enginediy' or (len(word) > 2 and word in seen):
            continue
        seen.add(word)
        kept.append(word)
    picked = []
    for word in kept:
        if len('-'.join(picked + [word])) > 75:
            break
        picked.append(word)
    truncated = len(picked) < len(kept)
    while truncated and len(picked) > 3 and (picked[-1] in SLUG_TAIL_STOPWORDS or (len(picked[-1]) <= 2 and not picked[-1].isdigit())):
        picked.pop()
    base = '-'.join(picked)
    slug, n = base, 2
    while slug in taken:
        slug = f'{base}-{n}'
        n += 1
    taken.add(slug)
    return slug


def has(text, *words):
    t = text.lower()
    return any(w in t for w in words)


def classify(r):
    title = r['title'] or ''
    ptype = r['product_type'] or ''
    site = r['site_category'] or ''
    major = r['major_class'] or ''
    etype = r['engine_type'] or ''

    if ptype in ACCESSORY_TYPES or site in ('配件', 'Stirling Accessories', 'Motor Vehicle Parts'):
        if has(title, 'stirling', 'steam', 'boiler', 'burner', 'alcohol lamp'):
            return 72
        if has(title, 'engine', 'starter', 'clutch', 'exhaust', 'spark', 'glow', 'carburetor', 'ignition', 'cdi', 'fuel'):
            return 71
        if has(title, 'rc ', 'remote', 'transmitter', 'receiver', 'servo', 'battery', 'esc', 'chassis', 'tire', 'wheel', 'propeller', 'blade'):
            return 73
        return 71
    if site.startswith('RC ') and site != 'RC 发动机' or ptype in {'RC Car', 'RC Truck', 'helicopter', 'Helicopter Model', 'RC Airplane', 'RC Airplanes', 'RC Tank', 'RC Boat'}:
        if has(title, 'simulator', 'chair', 'transmitter', 'radio controller', 'remote controller'):
            return 73
        if site == 'RC 直升机' or ptype in ('helicopter', 'Helicopter Model'):
            return 42
        if site == 'RC 飞机' or ptype in ('RC Airplane', 'RC Airplanes'):
            return 43
        if site == 'RC 坦克' or ptype == 'RC Tank':
            return 44
        if site == 'RC 船' or ptype == 'RC Boat':
            return 45
        return 41
    if site == '3D 金属拼装模型' or ptype == '3D Puzzle Model Kit':
        return 5
    if 'stirling' in (site + ptype + title).lower() or '斯特林' in site or etype == '斯特林发动机' or has(ptype + title, 'vacuum engine', 'flame eater'):
        if has(ptype + title, 'vacuum', 'flame eater', 'flame-eater'):
            return 25
        if has(ptype + title, 'low temperature', 'ltd ', 'palm', 'hand-held', 'coffee'):
            return 23
        if ptype == 'Stirling Engine Vehicle' or has(title, 'car', 'boat', 'vehicle', 'generator', 'led', 'fan', 'tractor', 'locomotive'):
            return 24
        if ptype == 'Multi-Cylinder Stirling Engine' or has(title, 'multi', 'twin', '2 cylinder', '2-cylinder', '4 cylinder', '4-cylinder', 'v-', 'v4', 'v8', '6 cylinder', '8 cylinder', 'double', 'dual'):
            return 22
        return 21
    if site == '蒸汽机' or ptype == 'Steam Engine' or etype == '蒸汽机/锅炉':
        return 3
    if site in ('科教实验模型', 'STEM Models', 'CNC Model', '天文摄影设备') or ptype in ('Experiment Model', 'STEM Models', 'CNC Model', 'Astrophotography Equipment') or etype == '特斯拉线圈':
        if site == '天文摄影设备' or ptype == 'Astrophotography Equipment':
            return 63
        if etype == '特斯拉线圈' or has(title, 'tesla'):
            return 61
        return 62
    if site == 'warranty' or ptype == 'warranty':
        return None
    # Everything else is a complete engine model.
    if etype == 'V8 发动机':
        return 11
    if etype in ('V12 发动机', 'V6 发动机'):
        return 12
    if etype == '涡扇/涡喷' or site == '航发/涡扇' or ptype == 'Aero Engine':
        return 15
    if etype == '汽油/甲醇机' or site == 'RC 发动机' or ptype in ('RC Engine', 'Toyan Engine', 'Toyan engine') or (r['fuel'] or '') in ('汽油', '硝基甲醇', '甲醇'):
        return 14
    if etype in ('单缸/直列', '双缸/V缸', '直列四缸', '柴油机'):
        return 13
    if major in ('发动机配件/零件',):
        return 71
    return 16


def clean_line(line):
    line = line.strip()
    line = re.sub(r'^[.•·\-*]+\s*', '', line)
    return COMPETITOR.sub('Kavten', line)


def parse_description(raw, title):
    raw = (raw or '').replace('\r', '')
    lines = [clean_line(l) for l in raw.split('\n')]
    lines = [l for l in lines if l]
    if lines and lines[0].strip().lower() == title.strip().lower():
        lines = lines[1:]
    sections = {'intro': [], 'features': [], 'specs': [], 'packing': []}
    current = 'intro'
    for l in lines:
        key = l.rstrip(':').strip().lower()
        if key in ('features', 'feature', 'product features'):
            current = 'features'; continue
        if key in ('specifications', 'specification', 'specs', 'parameters'):
            current = 'specs'; continue
        if key in ('packing list', 'package list', 'package includes', 'package contents', 'in the box'):
            current = 'packing'; continue
        sections[current].append(l)

    # Features are usually "Heading:" lines followed by a paragraph; merge them.
    features = []
    pending = None
    for l in sections['features']:
        if l.endswith(':') and len(l) < 80:
            pending = l.rstrip(':')
            continue
        if pending:
            features.append(f'{pending}: {l}')
            pending = None
        else:
            features.append(l)
    if pending:
        features.append(pending)

    specs = {}
    for l in sections['specs']:
        if ':' in l:
            k, v = l.split(':', 1)
            k, v = k.strip(), v.strip()
            if k and v and len(k) <= 60:
                specs[k] = v

    parts = []
    if sections['intro']:
        parts.append('\n'.join(sections['intro']))
    if features:
        parts.append('Highlights\n' + '\n'.join('• ' + f for f in features))
    if sections['packing']:
        parts.append("What's in the Box\n" + '\n'.join('• ' + p for p in sections['packing']))
    description = '\n\n'.join(parts).strip()
    short = ''
    for candidate in features + sections['intro']:
        text = candidate.split(': ', 1)[-1]
        if len(text) > 40:
            short = text
            break
    if len(short) > 220:
        short = short[:217].rsplit(' ', 1)[0] + '...'
    return description, short, specs


def q(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return '1' if value else '0'
    if isinstance(value, (int, float)):
        return repr(value)
    s = str(value)
    s = s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n').replace('\r', '').replace('\x00', '').replace('\x1a', '')
    return "'" + s + "'"


def rows_of(ws):
    it = ws.iter_rows(values_only=True)
    header = next(it)
    for row in it:
        if row and any(v is not None for v in row):
            yield dict(zip(header, row))


def main(xlsx_path, out_path, image_map_path=None):
    image_map = {}
    if image_map_path:
        with open(image_map_path, encoding='utf-8') as f:
            image_map = json.load(f)
    wb = openpyxl.load_workbook(xlsx_path, read_only=True)
    products = list(rows_of(wb['01_产品总表']))
    descriptions = {r['handle']: r['description'] for r in rows_of(wb['07_描述全文'])}
    images = defaultdict(list)
    for r in rows_of(wb['03_图片清单']):
        images[r['handle']].append((int(r['position'] or 0), r['image_url']))
    variants = defaultdict(list)
    for r in rows_of(wb['02_变体明细']):
        variants[r['handle']].append(r)

    out = ['SET NAMES utf8mb4;', 'SET FOREIGN_KEY_CHECKS=0;', 'START TRANSACTION;',
           'DELETE FROM product_images;', 'DELETE FROM product_attributes;', 'DELETE FROM products;',
           'DELETE FROM category_translations;', 'DELETE FROM categories;']
    for cid, slug, name, zh, parent, sort, desc in CATEGORIES:
        out.append(
            'INSERT INTO categories (id,name,slug,description,image_url,parent_id,sort_order,is_active,created_at,updated_at) VALUES '
            f'({cid},{q(name)},{q(slug)},{q(desc)},\'\',{q(parent)},{sort},1,NOW(3),NOW(3));')
        out.append(
            'INSERT INTO category_translations (category_id,language_code,name,slug,description,created_at,updated_at) VALUES '
            f'({cid},\'zh\',{q(zh)},{q(slug)},NULL,NOW(3),NOW(3));')

    seen_sku, seen_slug, seen_slugs = set(), set(), set()
    per_cat = defaultdict(int)
    category_cover = {}
    featured_pool = []
    pid = 0
    for r in products:
        cat = classify(r)
        if cat is None:
            continue
        handle = r['handle']
        if not handle or handle in seen_slug:
            continue
        seen_slug.add(handle)
        sku = str(r['sku_first'] or '').strip()
        if not sku or sku in seen_sku or not re.fullmatch(r'[A-Za-z0-9._-]+', sku):
            sku = f"KV{r['product_id']}"
        seen_sku.add(sku)
        pid += 1
        title = re.sub(r'\s*[-–|]\s*engine\s*diy\s*$', '', str(r['title']).strip(), flags=re.I)
        title = COMPETITOR.sub('Kavten', title)
        desc, short, specs = parse_description(descriptions.get(handle) or '', title)
        imgs = [u for _, u in sorted(images.get(handle, []))][:12] or ([r['image_main']] if r['image_main'] else [])
        imgs = [('/uploads/' + image_map[u]['rel']) if u in image_map else u for u in imgs]
        price = float(r['price_min_usd'] or 0)
        compare = r['compare_at_usd']
        compare = float(compare) if compare and float(compare) > price else None
        in_stock = r['in_stock'] == 'Y'
        weight = round(float(r['weight_g']) / 1000, 2) if r['weight_g'] else None
        brand = KNOWN_BRANDS.get((r['brand_guess'] or '').strip().upper(), '')
        if not brand:
            upper_title = f' {title.upper()} '
            brand = next((v for k, v in KNOWN_BRANDS.items() if len(k) > 2 and re.search('(?<![A-Z0-9])' + re.escape(k) + '(?![A-Z0-9])', upper_title)), '')

        attrs = []
        if brand:
            attrs.append(('Brand', brand))
        if r['engine_type'] in ENGINE_TYPE_EN:
            attrs.append(('Engine Type', ENGINE_TYPE_EN[r['engine_type']]))
        if r['cylinders']:
            attrs.append(('Cylinders', str(int(r['cylinders']))))
        if r['displacement_cc']:
            attrs.append(('Displacement', f"{r['displacement_cc']} cc"))
        if r['fuel'] in FUEL_EN:
            attrs.append(('Power Source', FUEL_EN[r['fuel']]))
        if r['options']:
            attrs.append(('Options', str(r['options']).replace('|', ' / ')))
        vs = variants.get(handle, [])
        if len(vs) > 1:
            listing = '; '.join(f"{v['variant_title']} - ${float(v['price_usd']):.2f}" for v in vs[:20] if v.get('price_usd') is not None)
            if listing:
                attrs.append(('Versions & Prices', listing))

        out.append(
            'INSERT INTO products (id,sku,name,slug,short_description,description,price,compare_price,stock_quantity,weight,brand,model,part_number,'
            'category_id,is_active,is_featured,meta_title,meta_description,image_urls,manufacturer,technical_specs,condition_type,created_at,updated_at) VALUES ('
            f"{pid},{q(sku)},{q(title[:255])},{q(make_slug(handle, seen_slugs))},{q(short)},{q(desc)},{price:.2f},{q(round(compare, 2) if compare else None)},"
            f"{20 if in_stock else 0},{q(weight)},{q(brand[:100])},'',{q(sku)},{cat},1,0,{q(title[:255])},{q(short[:300])},"
            f"{q(json.dumps(imgs))},{q(brand[:100])},{q(json.dumps(specs, ensure_ascii=False) if specs else None)},'new',NOW(3),NOW(3));")
        for i, url in enumerate(imgs):
            out.append(
                'INSERT INTO product_images (product_id,url,filename,original_name,alt_text,sort_order,is_primary,created_at,updated_at) VALUES '
                f"({pid},{q(url)},'','',{q(title[:255])},{i},{1 if i == 0 else 0},NOW(3),NOW(3));")
        for i, (k, v) in enumerate(attrs):
            out.append(
                'INSERT INTO product_attributes (product_id,attribute_name,attribute_value,sort_order,created_at) VALUES '
                f'({pid},{q(k)},{q(v)},{i},NOW(3));')

        per_cat[cat] += 1
        top = next(c[4] or c[0] for c in CATEGORIES if c[0] == cat)
        score = int(r['collections_count'] or 0) + len(imgs)
        if in_stock and len(imgs) >= 3 and price >= 60 and top != 7 and not has(title, 'stand', 'cart', 'base', 'upgrade', 'replacement'):
            featured_pool.append((score, pid, top))
        if in_stock and imgs:
            for cid in (cat, top):
                if cid not in category_cover or score > category_cover[cid][0]:
                    category_cover[cid] = (score, imgs[0])

    featured, per_top = [], defaultdict(int)
    for score, p, top in sorted(featured_pool, reverse=True):
        if per_top[top] < 2:
            featured.append(p)
            per_top[top] += 1
        if len(featured) >= 16:
            break
    out.append(f"UPDATE products SET is_featured=1 WHERE id IN ({','.join(map(str, featured))});")
    for cid, (_, url) in category_cover.items():
        out.append(f'UPDATE categories SET image_url={q(url)} WHERE id={cid};')
    out.append('COMMIT;')
    out.append('SET FOREIGN_KEY_CHECKS=1;')

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out) + '\n')
    names = {c[0]: c[2] for c in CATEGORIES}
    print(f'products: {pid}, featured: {len(featured)}')
    for cid in sorted(per_cat):
        print(f'  {cid:>3} {names[cid]:<32} {per_cat[cid]}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
