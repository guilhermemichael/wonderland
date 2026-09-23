/**
 * The beat map. Distances are in vh of scroll (never seconds): a scroll
 * site is read in flicks. Every number is a starting point validated by the
 * flick test (references/scrub-pipeline.md).
 *
 * Band anchors are expressed as video frames: each approved video already
 * choreographs when the previous chapter's interface leaves and when the
 * next one arrives, so the live text is pinned to those exact moments.
 */
import type { StateId } from "@/lib/content";
import type { VideoId } from "@/lib/media";
import { clamp, piecewise, piecewiseInverse } from "@/lib/math";

export type RestSeg = { id: StateId; kind: "rest"; state: StateId; vh: number };
export type VideoSeg = {
  id: string;
  kind: "video";
  video: VideoId;
  from: StateId;
  to: StateId;
  vh: number;
  frames: number;
  fps: number;
  /** local progress (0-1) -> frame index; stretches or compresses moments */
  knots?: ReadonlyArray<readonly [number, number]>;
};
export type Seg = RestSeg | VideoSeg;

export const SEGMENTS: Seg[] = [
  { id: "threshold", kind: "rest", state: "threshold", vh: 45 },
  // VD1: the world stirs while the invitation is still on screen (attraction)
  { id: "v1", kind: "video", video: 1, from: "threshold", to: "threshold", vh: 300, frames: 192, fps: 24 },
  // VD2: the portal becomes the environment; the fall
  { id: "v2", kind: "video", video: 2, from: "threshold", to: "fall", vh: 560, frames: 192, fps: 24 },
  { id: "fall", kind: "rest", state: "fall", vh: 120 },
  // VD3: gravity comes undone
  { id: "v3", kind: "video", video: 3, from: "fall", to: "disorientation", vh: 520, frames: 192, fps: 24 },
  { id: "disorientation", kind: "rest", state: "disorientation", vh: 120 },
  // VD4: out of the hole, light takes over, landing
  { id: "v4", kind: "video", video: 4, from: "disorientation", to: "landing", vh: 620, frames: 240, fps: 24 },
  { id: "landing", kind: "rest", state: "landing", vh: 120 },
  // VD5: arrival becomes choice. Frames 176-194 hold the dissolve from day
  // to the crossroads twilight, given extra room so it reads as the light
  // of Wonderland changing rather than a cut.
  {
    id: "v5",
    kind: "video",
    video: 5,
    from: "landing",
    to: "crossroads",
    vh: 640,
    frames: 240,
    fps: 24,
    knots: [
      [0, 0],
      [0.62, 176],
      [0.8, 194],
      [1, 239],
    ],
  },
  { id: "crossroads", kind: "rest", state: "crossroads", vh: 90 },
];

type FrameAnchor = { seg: string; frame: number };
type ProgressAnchor = { seg: string; at: number };
type Anchor = FrameAnchor | ProgressAnchor;

interface BandSpec {
  id: StateId;
  in?: Anchor;
  settled?: Anchor;
  outStart?: Anchor;
  out?: Anchor;
}

export const BAND_SPECS: BandSpec[] = [
  { id: "threshold", outStart: { seg: "v2", frame: 20 }, out: { seg: "v2", frame: 60 } },
  {
    id: "fall",
    in: { seg: "v2", frame: 146 },
    settled: { seg: "v2", frame: 178 },
    outStart: { seg: "v3", frame: 20 },
    out: { seg: "v3", frame: 46 },
  },
  {
    id: "disorientation",
    in: { seg: "v3", frame: 112 },
    settled: { seg: "v3", frame: 148 },
    outStart: { seg: "v4", frame: 16 },
    out: { seg: "v4", frame: 50 },
  },
  {
    id: "landing",
    in: { seg: "v4", frame: 208 },
    settled: { seg: "v4", frame: 234 },
    outStart: { seg: "v5", frame: 14 },
    out: { seg: "v5", frame: 50 },
  },
  // after the light of Wonderland has settled, not during the dissolve
  { id: "crossroads", in: { seg: "v5", frame: 214 }, settled: { seg: "v5", frame: 236 } },
];

/** Opacity ramps are short trim around a long plateau. */
const RAMP_IN_VH = 24;
/** Plate <-> video hand-off windows at segment edges. */
export const HANDOFF_IN_VH = 10;
export const HANDOFF_OUT_VH = 16;

export interface SegLayout {
  seg: Seg;
  index: number;
  start: number;
  end: number;
}

export interface BandLayout {
  id: StateId;
  first: boolean;
  last: boolean;
  a: number;
  inEnd: number;
  settled: number;
  outStart: number;
  b: number;
}

export interface Layout {
  totalVh: number;
  segs: SegLayout[];
  bands: BandLayout[];
  byId: Record<string, SegLayout>;
  /** progress where each chapter reads best (plateau middle), for jumps */
  chapterAt: Record<StateId, number>;
}

export function frameAt(seg: VideoSeg, local: number) {
  const knots = seg.knots ?? [
    [0, 0],
    [1, seg.frames - 1],
  ];
  return piecewise(knots, clamp(local));
}

export function localAtFrame(seg: VideoSeg, frame: number) {
  const knots = seg.knots ?? [
    [0, 0],
    [1, seg.frames - 1],
  ];
  return piecewiseInverse(knots, frame);
}

export function computeLayout(): Layout {
  const totalVh = SEGMENTS.reduce((s, g) => s + g.vh, 0);
  let acc = 0;
  const segs: SegLayout[] = SEGMENTS.map((seg, index) => {
    const start = acc / totalVh;
    acc += seg.vh;
    return { seg, index, start, end: acc / totalVh };
  });
  const byId = Object.fromEntries(segs.map((s) => [s.seg.id, s]));

  const resolve = (a: Anchor) => {
    const s = byId[a.seg];
    const local = "frame" in a ? localAtFrame(s.seg as VideoSeg, a.frame) : a.at;
    return s.start + (s.end - s.start) * local;
  };

  const bands: BandLayout[] = BAND_SPECS.map((spec, i) => {
    const first = i === 0;
    const last = i === BAND_SPECS.length - 1;
    const a = spec.in ? resolve(spec.in) : 0;
    const settled = spec.settled ? resolve(spec.settled) : 0;
    const inEnd = first ? 0 : Math.min(settled, a + RAMP_IN_VH / totalVh);
    const outStart = spec.outStart ? resolve(spec.outStart) : 1;
    const b = spec.out ? resolve(spec.out) : 1;
    return { id: spec.id, first, last, a, inEnd, settled, outStart, b };
  });

  const chapterAt = {} as Record<StateId, number>;
  for (const band of bands) {
    const rest = byId[band.id];
    chapterAt[band.id] = band.first ? 0 : rest ? (rest.start + rest.end) / 2 : band.settled;
  }
  return { totalVh, segs, bands, byId, chapterAt };
}

export function locate(layout: Layout, p: number): { s: SegLayout; local: number } {
  const segs = layout.segs;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (p < s.end || i === segs.length - 1) {
      return { s, local: clamp((p - s.start) / (s.end - s.start)) };
    }
  }
  return { s: segs[segs.length - 1], local: 1 };
}
