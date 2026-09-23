"""Open Graph cards (1200x630) cut from the approved comps, which already
carry the designed typography. Resize and crop only."""
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "og")
os.makedirs(OUT, exist_ok=True)

SOURCES = {"wonderland": "FT1.JPEG", "rabbit": "FT6.jpeg", "hatter": "FT7.jpeg", "cheshire": "FT8.jpeg"}
for name, src in SOURCES.items():
    im = Image.open(os.path.join(ROOT, src)).convert("RGB")
    w = 1200
    h = round(im.height * w / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    top = max(0, (h - 630) // 2)
    im.crop((0, top, 1200, top + 630)).save(os.path.join(OUT, f"{name}.jpg"), quality=86, optimize=True, progressive=True)
    print(name, "ok")
