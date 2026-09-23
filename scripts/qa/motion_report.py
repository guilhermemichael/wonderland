"""Where, and how much, a resting scene moves between captures.
python motion_report.py <dir> <out.jpg>"""
import glob
import os
import sys

import cv2
import numpy as np

d, out = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(os.path.join(d, "motion-*.png")))
ims = [cv2.imread(f).astype(np.float32) for f in files]
base = ims[0]
acc = np.zeros(base.shape[:2], np.float32)
peak = 0.0
for im in ims[1:]:
    diff = np.abs(im - base).max(axis=2)
    acc = np.maximum(acc, diff)
    peak = max(peak, float(diff.max()))
print(f"frames={len(ims)} peak_delta={peak:.0f}/255 mean_delta={acc.mean():.2f} moving_px={(acc > 8).mean() * 100:.2f}%")
heat = cv2.applyColorMap(np.clip(acc * 6, 0, 255).astype(np.uint8), cv2.COLORMAP_INFERNO)
vis = cv2.addWeighted(base.astype(np.uint8), 0.55, heat, 0.75, 0)
cv2.imwrite(out, np.vstack([base.astype(np.uint8), vis]), [cv2.IMWRITE_JPEG_QUALITY, 86])
print(out)
