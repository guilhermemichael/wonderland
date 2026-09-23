"""UI zones baked into the approved comps (FT1-FT8) and videos (VD1-VD5).

All rectangles are in VIDEO-normalized percent coordinates [x0, y0, x1, y1]
(0-100 of the 16:9 video frame). FT frames are mapped into video space with
the crop measured by registration (see FT_CROP). The zones are deliberately
generous rectangles; the actual removal mask is computed per image inside
them (thin bright strokes only), so scene pixels inside a zone survive.
"""

# Horizontal crop (in FT pixels) that the video generator applied to each FT:
# video frame == FT[:, x0:x1] resized to 1920x1080. Measured with ORB +
# estimateAffinePartial2D (scale ~0.703, rotation < 0.05 deg).
FT_CROP = {
    1: (5.3, 1370.6),
    2: (10.4, 2741.7),
    3: (8.3, 2739.1),
    4: (42.4, 2773.5),
    5: (42.3, 2772.5),
    # FT6-FT8 have no video; they get the same 16:9 center crop as FT2.
    6: (10.4, 2741.7),
    7: (10.4, 2741.7),
    8: (10.4, 2741.7),
}

# Zones per narrative state. "kind" controls the mask recipe:
#   text  -> cream text strokes (white top-hat + low saturation + bright)
#   faint -> low-contrast typographic watermark (lower thresholds)
#   glow  -> bright glowing shapes of any colour (local-background delta)
ZONES = {
    "threshold": [  # FT1 / VD1 / VD2 head
        ("nav-brand", "text", [2.3, 3.2, 19.8, 8.3]),
        ("nav-menu", "text", [37.2, 3.2, 63.2, 8.3]),
        ("nav-icon", "rect", [94.6, 3.0, 98.4, 8.6]),
        ("rail-top", "rect", [1.6, 21.0, 4.8, 36.0]),
        ("rail-bottom", "rect", [1.6, 58.0, 4.8, 97.6]),
        ("kicker", "text", [6.0, 17.3, 37.6, 21.2]),
        ("watermark", "faint", [6.0, 11.0, 31.0, 35.0]),
        ("headline", "text", [6.0, 22.0, 44.2, 56.2]),
        ("counter", "text", [40.0, 22.3, 45.8, 30.8]),
        ("paragraph", "text", [6.0, 57.3, 39.6, 69.2]),
        ("cta", "text", [6.0, 71.3, 38.6, 77.3]),
        ("chapter", "text", [87.4, 15.8, 97.6, 21.6]),
        ("scroll", "text", [89.4, 89.2, 98.6, 96.8]),
    ],
    "fall": [  # FT2 / VD2 tail / VD3 head
        ("label-top", "text", [1.4, 2.8, 8.0, 5.6]),
        ("telemetry-top", "text", [57.8, 2.4, 99.0, 5.8]),
        ("kicker", "text", [8.4, 29.4, 32.2, 32.6]),
        ("headline", "text", [8.4, 33.8, 36.2, 40.8]),
        ("paragraph", "text", [8.4, 41.4, 34.2, 56.8]),
        ("cue", "text", [8.4, 58.8, 22.4, 62.2]),
        ("label-bottom", "text", [1.8, 94.2, 8.0, 97.8]),
        ("telemetry-bottom", "text", [30.8, 94.2, 70.2, 97.8]),
        ("scroll", "text", [90.8, 92.2, 98.6, 97.8]),
    ],
    "disorientation": [  # FT3 / VD3 tail / VD4 head
        ("label-top", "text", [1.4, 2.4, 13.4, 5.8]),
        ("telemetry-top", "text", [60.8, 2.2, 99.0, 7.6]),
        ("kicker", "text", [8.4, 29.4, 26.8, 32.6]),
        ("headline", "text", [8.4, 34.2, 31.8, 45.2]),
        ("paragraph", "text", [8.4, 45.4, 33.4, 56.8]),
        ("cue", "text", [8.4, 58.8, 22.4, 62.2]),
        ("telemetry-bottom", "text", [32.2, 89.8, 68.8, 93.2]),
        ("title-bottom", "text", [34.8, 93.0, 65.8, 98.4]),
        ("label-bottom", "text", [1.8, 94.2, 12.8, 97.8]),
        ("scroll", "text", [90.8, 92.2, 98.6, 97.8]),
    ],
    "landing": [  # FT4 / VD4 tail / VD5 head
        ("label-top", "text", [1.2, 2.8, 11.8, 6.2]),
        ("telemetry-top", "text", [80.8, 2.4, 99.0, 12.2]),
        ("numeral", "text", [3.4, 19.0, 11.0, 29.0]),
        ("kicker", "text", [3.4, 29.4, 20.8, 32.8]),
        ("headline", "text", [3.4, 34.2, 28.8, 47.4]),
        ("paragraph", "text", [3.4, 50.2, 27.8, 62.8]),
        ("cta", "text", [3.4, 64.8, 22.4, 68.8]),
        ("prompt-leak", "text", [3.4, 72.2, 13.4, 77.8]),
    ],
    "crossroads": [  # FT5 / VD5 tail
        ("frame-label", "text", [92.4, 3.8, 99.6, 7.8]),
        ("kicker", "text", [4.4, 13.8, 24.2, 17.2]),
        ("headline", "text", [3.6, 17.4, 38.2, 28.8]),
        ("paragraph", "text", [4.4, 30.4, 36.2, 42.8]),
        ("cheshire-grin", "cheshire", [83.2, 17.0, 93.4, 31.0]),
    ],
    "rabbit": [  # FT6 (no video)
        ("label-top", "text", [1.8, 2.4, 13.2, 6.2]),
        ("brand", "text", [42.0, 2.2, 58.0, 6.6]),
        ("telemetry-top", "text", [84.6, 2.2, 98.8, 11.4]),
        ("kicker", "text", [4.4, 27.2, 22.8, 31.4]),
        ("headline", "text", [4.4, 32.2, 32.6, 55.6]),
        ("paragraph", "text", [4.4, 56.8, 32.2, 67.6]),
        ("cta", "text", [4.4, 70.2, 18.2, 74.8]),
    ],
    "hatter": [  # FT7 (no video)
        ("label-top", "text", [1.8, 3.0, 13.8, 6.4]),
        ("telemetry-top", "text-warm", [85.8, 3.0, 98.6, 12.6]),
        ("kicker", "text-warm", [5.2, 25.4, 22.6, 29.0]),
        ("headline", "text-warm", [5.2, 30.0, 31.2, 45.0]),
        ("paragraph", "text", [5.2, 47.0, 30.4, 59.4]),
        ("cta", "text-warm", [5.2, 62.4, 18.4, 66.4]),
    ],
    "cheshire": [  # FT8 (no video)
        ("label-top", "text", [3.6, 3.4, 14.8, 6.6]),
        ("telemetry-top", "text", [85.8, 3.4, 98.2, 11.0]),
        ("kicker", "text", [3.6, 21.2, 18.0, 24.4]),
        ("headline", "text", [3.6, 25.4, 27.4, 40.2]),
        ("paragraph", "text", [3.6, 42.6, 21.8, 61.0]),
        ("cta", "text", [3.6, 65.0, 15.0, 68.6]),
    ],
}
