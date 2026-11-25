"""Generate favicon, app icons and the social share image from the Kavten logo."""
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, 'frontend', 'public')
IMAGES = os.path.join(PUBLIC, 'images')
FONTS = r'C:\Windows\Fonts'
INK = (22, 18, 15)
RED = (215, 25, 42)
YELLOW = (255, 194, 26)
CREAM = (251, 246, 238)

logo = Image.open(os.path.join(IMAGES, 'kavten-logo.png')).convert('RGBA')
mark = logo.crop((0, 0, logo.width, 172))
mark = mark.crop(mark.getbbox())


def fit(img, box):
    scale = min(box / img.width, box / img.height)
    return img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)


def tile(size, source, pad, background):
    canvas = Image.new('RGBA', (size, size), background)
    art = fit(source, size - 2 * pad)
    canvas.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return canvas


# Small icons use the piston mark only; the wordmark is unreadable below ~64px.
for size, name in [(16, 'favicon-16x16.png'), (32, 'favicon-32x32.png')]:
    tile(size, mark, max(1, size // 16), (0, 0, 0, 0)).save(os.path.join(PUBLIC, name))
tile(48, mark, 3, (0, 0, 0, 0)).save(os.path.join(PUBLIC, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
tile(180, mark, 22, CREAM + (255,)).convert('RGB').save(os.path.join(PUBLIC, 'apple-touch-icon.png'))
tile(192, mark, 28, CREAM + (255,)).save(os.path.join(PUBLIC, 'android-chrome-192x192.png'))
tile(512, mark, 72, CREAM + (255,)).save(os.path.join(PUBLIC, 'android-chrome-512x512.png'))
tile(512, logo, 48, (255, 255, 255, 255)).save(os.path.join(IMAGES, 'kavten-logo-square.png'))

# Social share card, 1200x630.
W, H = 1200, 630
card = Image.new('RGBA', (W, H), CREAM + (255,))
draw = ImageDraw.Draw(card)
for y in range(10, H, 22):
    for x in range(10, W, 22):
        draw.ellipse((x, y, x + 2, y + 2), fill=(22, 18, 15, 30))
draw.ellipse((W - 330, -260, W + 230, 300), fill=RED)
draw.ellipse((520, H - 120, 760, H + 120), fill=YELLOW)

card.alpha_composite(fit(logo, 300), (70, 56))
headline = ImageFont.truetype(os.path.join(FONTS, 'ariblk.ttf'), 64)
body = ImageFont.truetype(os.path.join(FONTS, 'segoeuib.ttf'), 30)
chip = ImageFont.truetype(os.path.join(FONTS, 'ariblk.ttf'), 22)
draw.text((70, 250), 'Build it. Fire it up.', font=headline, fill=INK)
draw.text((70, 326), 'Watch it run.', font=headline, fill=RED)
draw.text((72, 420), 'Working model engines, Stirling engines,', font=body, fill=(90, 80, 72))
draw.text((72, 458), 'steam engines, RC & 3D metal kits', font=body, fill=(90, 80, 72))

x = 72
for label, bg, fg in [('1,500+ PRODUCTS', INK, YELLOW), ('SHIPS WORLDWIDE', YELLOW, INK)]:
    tw = draw.textlength(label, font=chip)
    draw.rounded_rectangle((x + 5, 530, x + tw + 45, 584), radius=27, fill=INK)
    draw.rounded_rectangle((x, 525, x + tw + 40, 579), radius=27, fill=bg, outline=INK, width=3)
    draw.text((x + 20, 538), label, font=chip, fill=fg)
    x += tw + 70

shots = [os.path.join(ROOT, 'backend', 'uploads', 'media', f) for f in (
    'ccc717b336b0a5be883dfffd84cc8d047a847e014b03aa18fda9d9fdf1d46050.jpg',
)]
picks = [p for p in shots if os.path.exists(p)]
frame = 400
for i, path in enumerate(picks[:1]):
    photo = Image.open(path).convert('RGB')
    side = min(photo.size)
    photo = photo.crop(((photo.width - side) // 2, (photo.height - side) // 2, (photo.width + side) // 2, (photo.height + side) // 2)).resize((frame - 24, frame - 24), Image.LANCZOS)
    fx, fy = 720, 110
    draw.rounded_rectangle((fx + 10, fy + 10, fx + frame + 10, fy + frame + 10), radius=34, fill=INK)
    draw.rounded_rectangle((fx, fy, fx + frame, fy + frame), radius=34, fill=(255, 255, 255), outline=INK, width=4)
    mask = Image.new('L', photo.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, photo.width, photo.height), radius=24, fill=255)
    card.paste(photo, (fx + 12, fy + 12), mask)

card.convert('RGB').save(os.path.join(IMAGES, 'og-image.jpg'), quality=88, optimize=True)
print('brand assets written')
