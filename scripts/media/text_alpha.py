"""Estimates the opacity of the baked UI in each frame of a video segment,
relative to a reference frame where the UI is fully visible.

alpha_i = contrast(glyphs vs. their immediate surroundings in frame i)
          / contrast(same, in the reference frame)
Usage: python text_alpha.py <video> <state> <ref_frame> <first> <last>
"""
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from masks import _ellipse, state_mask  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def frames(v, idx):
    cap = cv2.VideoCapture(os.path.join(ROOT, f"VD{v}.mp4"))
    i = 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        if i in idx:
            yield i, fr
        i += 1


def reference(v, state, ref):
    fr = next(f for _, f in frames(v, {ref}))
    m = state_mask(fr, state, strength=1.25)
    core = cv2.erode(m, _ellipse(3))  # glyph cores, away from anti-aliasing
    ring = cv2.dilate(m, _ellipse(9)) & ~cv2.dilate(m, _ellipse(4))
    return m, core > 0, ring > 0


def contrast(fr, core, ring):
    g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    return float(g[core].mean() - g[ring].mean())


def curve(v, state, ref, first, last):
    m, core, ring = reference(v, state, ref)
    ref_fr = next(f for _, f in frames(v, {ref}))
    c0 = contrast(ref_fr, core, ring)
    out = []
    for i, fr in frames(v, set(range(first, last + 1))):
        out.append((i, contrast(fr, core, ring) / max(1e-3, c0)))
    return m, out


if __name__ == "__main__":
    v, state, ref, a, b = int(sys.argv[1]), sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
    _, out = curve(v, state, ref, a, b)
    print(f"VD{v} {state} ref={ref}")
    print("  " + "  ".join(f"{i}:{x:.2f}" for i, x in out))
