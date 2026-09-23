"""Review helper: overlays the removal mask (red) and the cleaned result for each state."""
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from masks import state_mask, clean, overlay  # noqa: E402
from zones import FT_CROP  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, ".media-review")
os.makedirs(OUT, exist_ok=True)

STATES = {1: "threshold", 2: "fall", 3: "disorientation", 4: "landing", 5: "crossroads",
          6: "rabbit", 7: "hatter", 8: "cheshire"}
ONLY = [int(a) for a in sys.argv[2].split(",")] if len(sys.argv) > 2 else list(STATES)


def load_ft(i):
    for c in (f"FT{i}.JPEG", f"FT{i}.jpeg"):
        p = os.path.join(ROOT, c)
        if os.path.exists(p):
            return cv2.imread(p)
    raise FileNotFoundError(i)


def ft_video_space(i, w=1920, h=1080):
    img = load_ft(i)
    x0, x1 = FT_CROP[i]
    crop = img[:, int(round(x0)):int(round(x1))]
    return cv2.resize(crop, (w, h), interpolation=cv2.INTER_AREA)


for i, st in STATES.items():
    if i not in ONLY:
        continue
    img = ft_video_space(i)
    m = state_mask(img, st)
    vis = overlay(img, m, st)
    cl = clean(img, m)
    both = np.vstack([cv2.resize(vis, (1280, 720)), cv2.resize(cl, (1280, 720))])
    cv2.imwrite(os.path.join(OUT, f"mask_FT{i}.jpg"), both, [cv2.IMWRITE_JPEG_QUALITY, 86])
    print(i, st, "mask px:", int((m > 0).sum()))
