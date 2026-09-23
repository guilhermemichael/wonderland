"""Worst-frame contrast under every hero text block (WCAG ratio).

The captures already have the glyphs hidden, so what we measure is exactly
what sits behind the words, with every scrim applied. The worst pixel is the
99.5th percentile of luminance inside the block (a stray spark should not
decide the result, but nearly everything else counts).

python legibility.py <dir>
"""
import json
import os
import sys

import numpy as np
from PIL import Image

d = sys.argv[1]
index = json.load(open(os.path.join(d, "index.json")))


def srgb_lum(arr):
    a = arr / 255.0
    a = np.where(a <= 0.03928, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def parse_color(c):
    nums = [float(x) for x in c.replace("rgba(", "").replace("rgb(", "").replace(")", "").split(",")[:3]]
    return np.array(nums)


def dilate(mask, r=2):
    """Grow without wrapping: a glyph at one edge must never leak to the other."""
    h, w = mask.shape
    pad = np.zeros((h + 2 * r, w + 2 * r), bool)
    pad[r : r + h, r : r + w] = mask
    out = np.zeros_like(pad)
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out[r + dy : r + dy + h, r + dx : r + dx + w] |= mask
    return out[r : r + h, r : r + w]


worst = {}
for entry in index:
    im = np.asarray(Image.open(os.path.join(d, entry["file"])).convert("RGB")).astype(np.float32)
    txt = np.asarray(Image.open(os.path.join(d, entry["text"])).convert("RGB")).astype(np.float32)
    lum = srgb_lum(im)
    # where the words actually sit: the type is lighter than what is behind
    # it, and the threshold is high enough that a pulsing light in the scene
    # between the two captures is never mistaken for a glyph
    glyphs = (txt - im).max(axis=2) > 30
    for box in entry["boxes"]:
        x0, y0 = max(0, int(box["x"])), max(0, int(box["y"]))
        x1, y1 = min(im.shape[1], int(box["x"] + box["w"])), min(im.shape[0], int(box["y"] + box["h"]))
        if x1 <= x0 or y1 <= y0:
            continue
        m = dilate(glyphs[y0:y1, x0:x1], 2)
        region = lum[y0:y1, x0:x1][m]
        if region.size < 120:
            continue
        bg = float(np.percentile(region, 99.5))
        text = float(srgb_lum(parse_color(box["color"])[None, None, :])[0, 0])
        hi, lo = max(text, bg), min(text, bg)
        ratio = (hi + 0.05) / (lo + 0.05)
        key = (entry["band"], box["k"])
        if key not in worst or ratio < worst[key][0]:
            worst[key] = (round(ratio, 2), entry["p"], round(bg, 4), round(text, 4))

print(f"{'band':16} {'element':10} {'ratio':>6}  at p     bg      text")
fails = []
for (band, el), (ratio, p, bg, text) in sorted(worst.items()):
    flag = "" if ratio >= 3.5 else "  <-- below 3.5:1"
    if ratio < 3.5:
        fails.append((band, el, ratio))
    print(f"{band:16} {el:10} {ratio:6.2f}  {p:<6} {bg:.4f}  {text:.4f}{flag}")
print("\nFAILS:", fails if fails else "none (every block at or above 3.5:1 on its worst frame)")
