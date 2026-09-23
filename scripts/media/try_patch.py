"""Side-by-side review of the baked-UI reconstruction on real frames:
original | Telea inpainting | cleaned-plate patch with this frame's light."""
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from build_media import patch_clean, read_frames, segment_reference  # noqa: E402
from masks import clean  # noqa: E402

OUT = sys.argv[1]

CASES = [
    (3, "fall", 0, 28),
    (3, "fall", 0, 40),
    (4, "landing", 239, 225),
    (4, "landing", 239, 239),
    (5, "landing", 0, 24),
    (2, "fall", 191, 150),
]
rows = []
for v, state, ref_i, test_i in CASES:
    mask = segment_reference(v, state, [ref_i])
    fr = next(f for i, f in read_frames(v, {test_i}))
    inp = clean(fr, mask)
    pat = patch_clean(fr, mask, state)
    x0, y0, x1, y1 = (96, 250, 860, 640)
    trio = [fr[y0:y1, x0:x1], inp[y0:y1, x0:x1], pat[y0:y1, x0:x1]]
    trio = [cv2.resize(t, (440, 224)) for t in trio]
    for t, lab in zip(trio, [f"VD{v} f{test_i} orig", "inpaint", "plate patch"]):
        cv2.putText(t, lab, (6, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
    rows.append(np.hstack(trio))
cv2.imwrite(OUT, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
print(OUT)
