"""Contact sheet of QA screenshots: python sheet.py <dir> <out.jpg> [cols] [thumbw] [glob]"""
import glob
import os
import sys

from PIL import Image, ImageDraw

d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
tw = int(sys.argv[4]) if len(sys.argv) > 4 else 480
pattern = sys.argv[5] if len(sys.argv) > 5 else "*.jpg"
files = sorted(glob.glob(os.path.join(d, pattern)))
ims = [Image.open(f) for f in files]
th = round(tw * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * th), (20, 20, 20))
dr = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * tw, (i // cols) * th
    sheet.paste(im.convert("RGB").resize((tw, th), Image.LANCZOS), (x, y))
    dr.rectangle([x, y, x + 64, y + 14], fill=(0, 0, 0))
    dr.text((x + 3, y + 1), os.path.basename(f)[:-4], fill=(255, 90, 90))
sheet.save(out, quality=84)
print(out, len(ims))
