"""WONDERLAND media pipeline.

Input: the approved assets at the project root (FT1-FT8, VD1-VD5), untouched.
Output: public/media/ (web plates + scrub videos) and .media-work/ (masters,
never shipped).

What it does, and nothing more:
  1. Removes only the UI that was baked into the comps (typography, HUD, nav,
     the leaked prompt text, "FRAME 05") plus the floating Cheshire eyes and
     grin the brief forbids. Stills are reconstructed with local OpenCV
     inpainting; video frames reuse the cleaned plate as a patch, wearing the
     frame's own light.
  2. Crops FT frames to the exact 16:9 window the videos use, so stills and
     videos share one coordinate system (swaps never jump).
  3. Re-encodes the videos for scroll scrubbing (keyframe every 8 frames, no
     audio, faststart), per references/ffmpeg-recipes.md.
No pixel is generated; no scene element is redrawn.

Usage: python scripts/media/build_media.py [plates|threshold|videos|all]
                                           [--only=2,3] [--crf=22]
"""
import json
import os
import subprocess
import sys
import time

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from masks import _ellipse, clean, state_mask  # noqa: E402
from zones import FT_CROP  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PUB = os.path.join(ROOT, "public", "media")
WORK = os.path.join(ROOT, ".media-work")
FFMPEG = os.path.join(ROOT, "node_modules", "ffmpeg-static", "ffmpeg.exe")
if not os.path.exists(FFMPEG):
    FFMPEG = os.path.join(ROOT, "node_modules", "ffmpeg-static", "ffmpeg")
os.makedirs(PUB, exist_ok=True)
os.makedirs(WORK, exist_ok=True)

STATE_OF_FT = {1: "threshold", 2: "fall", 3: "disorientation", 4: "landing",
               5: "crossroads", 6: "rabbit", 7: "hatter", 8: "cheshire"}
SLUG = dict(STATE_OF_FT)

# Portrait focal point (normalised x of the 16:9 plate) for the static,
# phone-first layouts. Chosen from each frame's action lane.
FOCAL_X = {1: 0.715, 2: 0.60, 3: 0.64, 4: 0.60, 5: 0.56, 6: 0.60, 7: 0.63, 8: 0.66}

# Frames that carry baked UI, measured with text_alpha.py (the UI's own fade
# in and out inside each approved video), inclusive ranges.
VIDEO_PLAN = {
    1: {"from": "threshold", "to": None, "head": (0, 191), "tail": None, "mode": "static-navy"},
    # VD2's chapter interface arrives with a slight scale change while the
    # camera settles, so its tail mask is taken from several settled frames.
    2: {"from": "threshold", "to": "fall", "head": (0, 72), "tail": (138, 191), "mode": "tracked-head",
        "tail_refs": [191, 180, 170, 158], "tail_grow": 15},
    3: {"from": "fall", "to": "disorientation", "head": (0, 44), "tail": (108, 191)},
    4: {"from": "disorientation", "to": "landing", "head": (0, 50), "tail": (208, 239)},
    # VD5 dissolves from the sunlit plaza to the twilight crossroads over
    # frames ~180-192; the forbidden grin fades in with it, so its removal
    # starts at 180. A large "03" numeral appears during the head.
    5: {"from": "landing", "to": "crossroads", "head": (0, 48), "tail": (218, 239),
        "grin_from": 180, "extra_head": [22, 30]},
}


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def load_ft(i):
    for c in (f"FT{i}.JPEG", f"FT{i}.jpeg"):
        p = os.path.join(ROOT, c)
        if os.path.exists(p):
            return cv2.imread(p)
    raise FileNotFoundError(f"FT{i}")


def ft_crop(i):
    img = load_ft(i)
    x0, x1 = FT_CROP[i]
    return img[:, int(round(x0)):int(round(x1))]


def read_frames(v, idx=None):
    cap = cv2.VideoCapture(os.path.join(ROOT, f"VD{v}.mp4"))
    i = 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        if idx is None or i in idx:
            yield i, fr
        i += 1
    cap.release()


# ---------------------------------------------------------------- stills

def save_variants(img_bgr, name, widths, portrait_focal=None):
    """AVIF, WebP and JPEG at each width, plus the 4:5 portrait crop."""
    out = {"name": name, "w": img_bgr.shape[1], "h": img_bgr.shape[0], "widths": []}
    rgb = Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
    for w in widths:
        if w > rgb.width:
            continue
        h = round(rgb.height * w / rgb.width)
        im = rgb.resize((w, h), Image.LANCZOS)
        im.save(os.path.join(PUB, f"{name}-{w}.avif"), quality=58, speed=4)
        im.save(os.path.join(PUB, f"{name}-{w}.webp"), quality=80, method=6)
        im.save(os.path.join(PUB, f"{name}-{w}.jpg"), quality=84, optimize=True, progressive=True)
        out["widths"].append(w)
    if portrait_focal is not None:
        H = rgb.height
        cw = round(H * 4 / 5)
        cx = round(portrait_focal * rgb.width)
        x0 = min(max(0, cx - cw // 2), rgb.width - cw)
        crop = rgb.crop((x0, 0, x0 + cw, H))
        out["portrait"] = {"x0": x0 / rgb.width, "x1": (x0 + cw) / rgb.width, "widths": []}
        for w in (1080, 720):
            if w > crop.width:
                continue
            im = crop.resize((w, round(w * 5 / 4)), Image.LANCZOS)
            im.save(os.path.join(PUB, f"{name}-p{w}.avif"), quality=58, speed=4)
            im.save(os.path.join(PUB, f"{name}-p{w}.webp"), quality=80, method=6)
            im.save(os.path.join(PUB, f"{name}-p{w}.jpg"), quality=84, optimize=True, progressive=True)
            out["portrait"]["widths"].append(w)
    return out


def threshold_reference_mask():
    """Static glyph mask for the Threshold UI in video space (1920x1080),
    from a temporal median of VD1 so flying cards never pollute it."""
    frames = [fr for _, fr in read_frames(1, set(range(0, 192, 8)))]
    med = np.median(np.stack(frames), axis=0).astype(np.uint8)
    m = state_mask(med, "threshold", strength=1.25)
    # the comp painted a soft dark shadow under the type: cover it too
    m = cv2.dilate(m, _ellipse(9))
    return med, m


def navy_gate(frame, mask, k=41):
    """True where the pixel's neighbourhood is the dark navy backdrop, i.e.
    the UI plane is visible (not covered by a card, the portal or a trail).
    Pixels of the glyph mask itself are excluded from the neighbourhood so
    dense display type cannot brighten its own background estimate."""
    v = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)[..., 2].copy()
    v[mask > 0] = 24
    nb = cv2.medianBlur(v, k)
    return (nb < 72).astype(np.uint8) * 255


def load_manifest():
    p = os.path.join(WORK, "plates.json")
    return json.load(open(p)) if os.path.exists(p) else {}


def build_threshold_plate():
    """VD1 frame 0 is ~4x sharper than FT1 (1376px) and is the approved
    opening frame of both VD1 and VD2."""
    manifest = load_manifest()
    _, ref = threshold_reference_mask()
    f0 = next(fr for _, fr in read_frames(1, {0}))
    fm = cv2.dilate(state_mask(f0, "threshold", strength=1.25), _ellipse(9))
    m = ref | fm
    m &= navy_gate(f0, m)
    p1 = clean(f0, m)
    cv2.imwrite(os.path.join(WORK, "plate-threshold.png"), p1)
    manifest["threshold"] = save_variants(p1, "plate-threshold", (1920, 1280), FOCAL_X[1])
    with open(os.path.join(WORK, "plates.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    log("plate threshold")


def build_plates():
    build_threshold_plate()
    manifest = load_manifest()
    for i in range(2, 9):
        img = ft_crop(i)
        m = state_mask(img, STATE_OF_FT[i])
        cl = clean(img, m)
        cv2.imwrite(os.path.join(WORK, f"plate-{SLUG[i]}.png"), cl)
        manifest[SLUG[i]] = save_variants(cl, f"plate-{SLUG[i]}", (2560, 1920, 1280), FOCAL_X[i])
        log("plate", SLUG[i], cl.shape)
    with open(os.path.join(WORK, "plates.json"), "w") as f:
        json.dump(manifest, f, indent=1)


# ---------------------------------------------------------------- videos

class Encoder:
    """Raw frames in, scrub-ready H.264 out (ffmpeg-recipes.md)."""

    def __init__(self, path, w, h, fps=24, crf=22, gop=8, scale_w=None):
        vf = ["-vf", f"scale={scale_w}:-2:flags=lanczos"] if scale_w and scale_w != w else []
        self.p = subprocess.Popen(
            [FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
             "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
             *vf,
             "-c:v", "libx264", "-preset", "slow", "-crf", str(crf),
             "-g", str(gop), "-keyint_min", str(gop), "-sc_threshold", "0",
             "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", path],
            stdin=subprocess.PIPE)

    def write(self, fr):
        self.p.stdin.write(np.ascontiguousarray(fr).tobytes())

    def close(self):
        self.p.stdin.close()
        self.p.wait()
        if self.p.returncode:
            raise RuntimeError("ffmpeg failed")


def segment_reference(v, state, frames, strength=1.25, grow=11):
    """Glyph mask taken where the UI is fully visible. Never a union across a
    moving camera: that would swallow scenery. Grown enough to cover the soft
    shadow the video type carries."""
    ref = None
    for _, fr in read_frames(v, set(frames)):
        m = state_mask(fr, state, strength=strength)
        ref = m if ref is None else (ref | m)
    return cv2.dilate(ref, _ellipse(grow)) if grow else ref


_PLATES = {}


def plate_patch(state):
    """The cleaned plate in video space: the truest reconstruction of what the
    baked type was covering."""
    if state not in _PLATES:
        img = cv2.imread(os.path.join(WORK, f"plate-{state}.png"))
        _PLATES[state] = cv2.resize(img, (1920, 1080), interpolation=cv2.INTER_AREA)
    return _PLATES[state]


def patch_clean(fr, mask, state):
    """Paste the plate under the mask, wearing this frame's own light.

    Inpainting alone samples the type's dark shadow and leaves a ghost of the
    words. The light here is estimated by normalised convolution over the
    pixels OUTSIDE the mask, so the type being removed can never darken its
    own replacement.
    """
    p = plate_patch(state).astype(np.float32)
    valid = (mask == 0).astype(np.float32)
    sigma = 26
    norm = cv2.GaussianBlur(valid, (0, 0), sigma) + 1e-5
    fb = cv2.GaussianBlur(fr.astype(np.float32) * valid[..., None], (0, 0), sigma) / norm[..., None]
    pb = cv2.GaussianBlur(p * valid[..., None], (0, 0), sigma) / norm[..., None]
    corrected = np.clip(p + (fb - pb), 0, 255)
    w = cv2.GaussianBlur((mask > 0).astype(np.float32), (0, 0), 2.5)[..., None]
    return (fr.astype(np.float32) * (1 - w) + corrected * w).astype(np.uint8)


def grin_reference(v, first, last):
    idx = set(range(first, last + 1, 6)) | {last}
    ref = None
    for _, fr in read_frames(v, idx):
        m = state_mask(fr, "crossroads", only={"cheshire-grin"})
        ref = m if ref is None else (ref | m)
    return ref


def find_cut(v, lo, hi):
    """Frame with the largest change: the peak of VD5's day-to-twilight dissolve."""
    prev = None
    best = (0, None)
    for i, fr in read_frames(v, set(range(lo, hi + 1))):
        g = cv2.cvtColor(cv2.resize(fr, (320, 180)), cv2.COLOR_BGR2GRAY).astype(np.float32)
        if prev is not None:
            d = float(np.abs(g - prev).mean())
            if d > best[0]:
                best = (d, i)
        prev = g
    return best[1], best[0]


def track_threshold_masks(frame0_mask, v=2, last=72):
    """Similarity transform of the UI plane, frame 0 -> frame i, from ORB
    features on the glyphs themselves (the Threshold type travels with the
    camera as it pushes into the portal)."""
    orb = cv2.ORB_create(2600, fastThreshold=12)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING)
    k0 = d0 = None
    Ts = {}
    last_T = np.float32([[1, 0, 0], [0, 1, 0]])
    feat_region = cv2.dilate(frame0_mask, _ellipse(15))
    for i, fr in read_frames(v, set(range(0, last + 1))):
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
        if i == 0:
            k0, d0 = orb.detectAndCompute(g, feat_region)
            Ts[0] = last_T
            continue
        region = np.zeros_like(g)
        region[:, : int(g.shape[1] * 0.62)] = 255
        k1, d1 = orb.detectAndCompute(g, region)
        T = None
        if d1 is not None and len(k1) > 20:
            m = bf.knnMatch(d0, d1, k=2)
            good = [a for a, b in (x for x in m if len(x) == 2) if a.distance < 0.78 * b.distance]
            if len(good) >= 14:
                p0 = np.float32([k0[a.queryIdx].pt for a in good])
                p1 = np.float32([k1[a.trainIdx].pt for a in good])
                T, inl = cv2.estimateAffinePartial2D(p0, p1, method=cv2.RANSAC, ransacReprojThreshold=2.5)
                if T is None or inl.sum() < 12:
                    T = None
        if T is None:
            T = last_T
        Ts[i] = T
        last_T = T
    return Ts


def process_video(v, crf=22, scale_w=None, suffix=""):
    plan = VIDEO_PLAN[v]
    t0 = time.time()
    out = os.path.join(PUB, f"scrub-{v}{suffix}.mp4")
    enc = Encoder(out, 1920, 1080, crf=crf, scale_w=scale_w)

    head = plan.get("head")
    tail = plan.get("tail")
    mode = plan.get("mode")
    head_ref = tail_ref = grin_ref = None
    Ts = None
    grin_from = None

    if mode == "static-navy":
        _, head_ref = threshold_reference_mask()
    elif mode == "tracked-head":
        _, head_ref = threshold_reference_mask()
        Ts = track_threshold_masks(head_ref, v, head[1])
    elif head:
        head_ref = segment_reference(v, plan["from"], [head[0], *plan.get("extra_head", [])])
    if tail:
        tail_ref = segment_reference(v, plan["to"], plan.get("tail_refs", [tail[1]]),
                                     grow=plan.get("tail_grow", 11))
    if plan.get("grin_from") is not None:
        peak, strength = find_cut(v, 170, 200)
        log(f"VD{v} dissolve peak at frame {peak} (delta {strength:.1f})")
        grin_ref = grin_reference(v, max(peak, 192), 239)
        grin_from = plan["grin_from"]

    prev_out = None
    prev_mask = None
    for i, fr in read_frames(v):
        o = fr
        used = np.zeros(fr.shape[:2], np.uint8)
        smooth = False
        if head and head[0] <= i <= head[1]:
            if mode == "static-navy":
                m = head_ref & navy_gate(fr, head_ref)
                if m.any():
                    o = clean(o, m)
                    used |= m
                smooth = True
            elif mode == "tracked-head":
                T = Ts[i]
                shift = float(np.hypot(*(T[:, 2] - Ts[max(0, i - 1)][:, 2])))
                wm = cv2.warpAffine(head_ref, T, (fr.shape[1], fr.shape[0]), flags=cv2.INTER_NEAREST)
                if shift > 0.6:
                    wm = cv2.dilate(wm, _ellipse(3 + 2 * shift))
                m = wm & navy_gate(fr, wm)
                if m.any():
                    o = clean(o, m)
                    used |= m
                smooth = shift < 0.6
            else:
                o = patch_clean(o, head_ref, plan["from"])
                used |= head_ref
        if tail and tail[0] <= i <= tail[1]:
            o = patch_clean(o, tail_ref, plan["to"])
            used |= tail_ref
            smooth = True
        if grin_ref is not None and i >= grin_from:
            o = clean(o, grin_ref)
            used |= grin_ref
            smooth = True

        if used.any() and smooth and prev_out is not None and prev_mask is not None:
            both = (used > 0) & (prev_mask > 0)
            # temporal smoothing inside the reconstructed pixels only
            o = o.copy()
            o[both] = (0.55 * o[both] + 0.45 * prev_out[both]).astype(np.uint8)
        prev_out, prev_mask = (o, used) if used.any() else (None, None)
        enc.write(o)
        if i in (0, 24, 36, 48, 72, 96, 120, 144, 168, 191, 210, 225, 239):
            cv2.imwrite(os.path.join(WORK, f"v{v}-f{i:03d}.jpg"), o, [cv2.IMWRITE_JPEG_QUALITY, 88])
    enc.close()
    size = os.path.getsize(out) / 1e6
    log(f"scrub-{v}{suffix}.mp4 {size:.2f} MB crf={crf} ({time.time() - t0:.0f}s)")
    return out


def extract_boundary_frames():
    """First and last frame of every processed video, as handoff references."""
    for v in range(1, 6):
        p = os.path.join(PUB, f"scrub-{v}.mp4")
        if not os.path.exists(p):
            continue
        for which in ("first", "last"):
            dst = os.path.join(WORK, f"scrub-{v}-{which}.png")
            pre = ["-sseof", "-0.05"] if which == "last" else []
            post = ["-update", "1", "-frames:v", "1"] if which == "last" else ["-frames:v", "1"]
            subprocess.run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error", *pre, "-i", p, *post, dst],
                           check=False)


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    only = None
    crf = 22
    for a in sys.argv[2:]:
        if a.startswith("--only="):
            only = [int(x) for x in a.split("=")[1].split(",")]
        if a.startswith("--crf="):
            crf = int(a.split("=")[1])
    if what == "threshold":
        build_threshold_plate()
    if what in ("plates", "all"):
        build_plates()
    if what in ("videos", "all"):
        for v in (only or [1, 2, 3, 4, 5]):
            process_video(v, crf=crf)
        extract_boundary_frames()
