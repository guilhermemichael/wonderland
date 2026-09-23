"""Per-frame baked-UI presence for each video, to find where the old UI is gone
and where the new UI starts (prints one compact line per 4 frames)."""
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from masks import state_mask  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PLAN = {
    1: ("threshold", "threshold"),
    2: ("threshold", "fall"),
    3: ("fall", "disorientation"),
    4: ("disorientation", "landing"),
    5: ("landing", "crossroads"),
}
only = [int(a) for a in sys.argv[1].split(",")] if len(sys.argv) > 1 else list(PLAN)
for v in only:
    a, b = PLAN[v]
    cap = cv2.VideoCapture(os.path.join(ROOT, f"VD{v}.mp4"))
    rows = []
    i = 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        small = cv2.resize(fr, (960, 540), interpolation=cv2.INTER_AREA)
        ma = int((state_mask(small, a, only=None) > 0).sum())
        mb = int((state_mask(small, b, only=None) > 0).sum()) if b != a else ma
        rows.append((i, ma, mb))
        i += 1
    print(f"VD{v} {a}->{b} frames={len(rows)}")
    line = []
    for i, ma, mb in rows:
        if i % 4 == 0:
            line.append(f"{i}:{ma//100}/{mb//100}")
    for k in range(0, len(line), 12):
        print("  " + "  ".join(line[k:k + 12]))
