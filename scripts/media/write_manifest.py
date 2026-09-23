"""Writes lib/media-manifest.json from the files in public/media (real byte
sizes, available widths, video frame counts). Run after build_media.py."""
import json
import os
import re

import cv2

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PUB = os.path.join(ROOT, "public", "media")

plates = {}
for f in sorted(os.listdir(PUB)):
    m = re.match(r"plate-([a-z]+)-(p?)(\d+)\.avif$", f)
    if not m:
        continue
    name, portrait, w = m.group(1), m.group(2), int(m.group(3))
    p = plates.setdefault(name, {"widths": [], "portrait": []})
    (p["portrait"] if portrait else p["widths"]).append(w)
for p in plates.values():
    p["widths"].sort()
    p["portrait"].sort()

videos = {}
for v in range(1, 6):
    f = os.path.join(PUB, f"scrub-{v}.mp4")
    if not os.path.exists(f):
        continue
    cap = cv2.VideoCapture(f)
    videos[str(v)] = {
        "src": f"/media/scrub-{v}.mp4",
        "bytes": os.path.getsize(f),
        "frames": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        "fps": round(cap.get(cv2.CAP_PROP_FPS), 3),
    }
    cap.release()

out = {"plates": plates, "videos": videos}
with open(os.path.join(ROOT, "lib", "media-manifest.json"), "w") as fh:
    json.dump(out, fh, indent=2)
print(json.dumps(out, indent=1))
