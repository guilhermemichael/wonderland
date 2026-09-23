"""Glyph masks for the UI that is baked into the approved comps and videos.

Only pixels that look like overlaid UI typography (thin, bright, low
saturation strokes) inside the known UI zones are selected, so the scenery
inside a zone is preserved. Removal is plain OpenCV inpainting (Telea): a
local, deterministic reconstruction from neighbouring pixels. Nothing is
generated.
"""
import cv2
import numpy as np

from zones import ZONES


def zone_px(rect, w, h):
    x0, y0, x1, y1 = rect
    return (int(round(x0 / 100 * w)), int(round(y0 / 100 * h)),
            int(round(x1 / 100 * w)), int(round(y1 / 100 * h)))


def _ellipse(k):
    k = max(3, int(k) | 1)
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))


def text_strokes(img, rect, strength=1.0, max_sat=95):
    """Cream UI strokes inside rect. Returns a full-size uint8 mask."""
    h, w = img.shape[:2]
    x0, y0, x1, y1 = zone_px(rect, w, h)
    roi = img[y0:y1, x0:x1]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    k = 0.017 * w
    tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, _ellipse(k))
    t = 20 / strength
    m = (tophat > t) & (hsv[..., 2] > 70) & (hsv[..., 1] < max_sat)
    m = m.astype(np.uint8) * 255
    # grow over anti-aliasing and the soft glow the generator painted
    m = cv2.dilate(m, _ellipse(0.0036 * w))
    out = np.zeros((h, w), np.uint8)
    out[y0:y1, x0:x1] = m
    return out


def faint_strokes(img, rect):
    """Large, low-contrast typographic watermark (the ghost 'W')."""
    h, w = img.shape[:2]
    x0, y0, x1, y1 = zone_px(rect, w, h)
    roi = img[y0:y1, x0:x1]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY).astype(np.float32)
    bg = cv2.GaussianBlur(gray, (0, 0), 0.03 * w)
    d = gray - bg
    m = (cv2.GaussianBlur(d, (0, 0), 0.0015 * w) > 3.2).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, _ellipse(0.002 * w))
    m = cv2.dilate(m, _ellipse(0.004 * w))
    out = np.zeros((h, w), np.uint8)
    out[y0:y1, x0:x1] = m
    return out


def glow_shapes(img, rect):
    """Bright glowing shapes of any colour (eyes, teeth, icon rims) plus halo."""
    h, w = img.shape[:2]
    x0, y0, x1, y1 = zone_px(rect, w, h)
    roi = img[y0:y1, x0:x1]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY).astype(np.float32)
    bg = cv2.medianBlur(cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY), max(3, int(0.02 * w) | 1)).astype(np.float32)
    m = ((gray - bg) > 16).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, _ellipse(0.0012 * w))
    m = cv2.dilate(m, _ellipse(0.0075 * w))
    out = np.zeros((h, w), np.uint8)
    out[y0:y1, x0:x1] = m
    return out


def rect_mask(img, rect):
    h, w = img.shape[:2]
    x0, y0, x1, y1 = zone_px(rect, w, h)
    out = np.zeros((h, w), np.uint8)
    out[y0:y1, x0:x1] = 255
    return out


def cheshire_mask(img, rect):
    """The floating eyes and grin: every warm-tinted or white pixel inside a
    zone whose background is cold blue mist, closed into solid shapes and
    grown over the glow halo."""
    h, w = img.shape[:2]
    x0, y0, x1, y1 = zone_px(rect, w, h)
    roi = img[y0:y1, x0:x1].astype(np.int16)
    b, g, r = roi[..., 0], roi[..., 1], roi[..., 2]
    v = roi.max(axis=2)
    warm = (r - b) > -6
    bright_white = (v > 150) & ((roi.max(axis=2) - roi.min(axis=2)) < 70)
    m = ((warm & (v > 45)) | bright_white).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, _ellipse(0.0015 * w))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, _ellipse(0.012 * w))
    m = cv2.dilate(m, _ellipse(0.009 * w))
    # whisker tips: thin bright sparks the colour test misses
    gray = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY)
    th = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, _ellipse(0.008 * w))
    sparks = (th > 22).astype(np.uint8) * 255
    m |= cv2.dilate(sparks, _ellipse(0.005 * w))
    out = np.zeros((h, w), np.uint8)
    out[y0:y1, x0:x1] = m
    return out


def state_mask(img, state, only=None, strength=1.0):
    h, w = img.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    for name, kind, rect in ZONES[state]:
        if only and name not in only:
            continue
        if kind == "text":
            mask |= text_strokes(img, rect, strength)
        elif kind == "text-warm":
            mask |= text_strokes(img, rect, strength, max_sat=185)
        elif kind == "faint":
            mask |= faint_strokes(img, rect)
        elif kind == "glow":
            mask |= glow_shapes(img, rect)
        elif kind == "rect":
            mask |= rect_mask(img, rect)
        elif kind == "cheshire":
            mask |= cheshire_mask(img, rect)
    return mask


def clean(img, mask, radius=None):
    h, w = img.shape[:2]
    r = radius or max(3, int(0.004 * w))
    return cv2.inpaint(img, mask, r, cv2.INPAINT_TELEA)


def overlay(img, mask, zones_state=None):
    vis = img.copy()
    red = np.zeros_like(vis)
    red[..., 2] = 255
    sel = mask > 0
    vis[sel] = (0.45 * vis[sel] + 0.55 * red[sel]).astype(np.uint8)
    if zones_state:
        h, w = img.shape[:2]
        for name, kind, rect in ZONES[zones_state]:
            x0, y0, x1, y1 = zone_px(rect, w, h)
            cv2.rectangle(vis, (x0, y0), (x1, y1), (0, 255, 255), 1)
    return vis
