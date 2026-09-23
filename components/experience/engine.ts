/**
 * ScrubEngine: the scroll-as-timeline controller for the desktop journey.
 *
 * Contract (references/scrub-pipeline.md):
 *  - scroll only writes `target`; a rAF loop eases `shown` toward it with
 *    frame-rate independent smoothing, and rests when converged, when the
 *    track is off screen and when the tab is hidden;
 *  - every video seek goes through a coalescing gate (VideoSlot);
 *  - every DOM write is delta-gated;
 *  - the page is complete without any video: each transition has a
 *    still-image fallback built from the chapter plates.
 */
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

import { track, visitId } from "@/lib/analytics";
import type { StateId } from "@/lib/content";
import { clamp, smoothstep } from "@/lib/math";
import { video as videoEntry, type VideoId } from "@/lib/media";

import {
  computeLayout,
  frameAt,
  HANDOFF_IN_VH,
  HANDOFF_OUT_VH,
  locate,
  type Layout,
  type SegLayout,
  type VideoSeg,
} from "./timeline";
import { VideoSlot } from "./videoSlot";

gsap.registerPlugin(ScrollToPlugin);

export interface EngineRefs {
  root: HTMLElement;
  track: HTMLElement;
  stage: HTMLElement;
  plates: Partial<Record<StateId, HTMLElement>>;
  videos: Partial<Record<VideoId, HTMLVideoElement>>;
  bands: Partial<Record<StateId, HTMLElement>>;
  counter: HTMLElement | null;
  cue: HTMLElement | null;
}

type BandCache = { o: number; k: number; x: number; off: boolean | null };
type PlateCache = { o: number; s: number; live: boolean | null };

const STATES: StateId[] = ["threshold", "fall", "disorientation", "landing", "crossroads"];
const SMOOTHING = 0.14; // share of the gap closed per 60fps frame; tuned by feel
const REST_EPS = 0.00004; // ~1.3px on this track: converged, stop the loop
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

export class ScrubEngine {
  readonly layout: Layout = computeLayout();
  target = 0;
  shown = 0;

  private raf = 0;
  private lastTick = 0;
  private enabled = false;
  private onScreen = true;
  private trackTop = 0;
  private range = 1;
  private slots = new Map<VideoId, VideoSlot>();
  private loading: VideoSlot | null = null;
  private queueStarted = false;
  private bandCache = new Map<StateId, BandCache>();
  private plateCache = new Map<StateId, PlateCache>();
  private videoOn = new Map<VideoId, boolean>();
  private segIndex = -1;
  private chapter: StateId = "threshold";
  private loadK = 0;
  private loadTween: gsap.core.Tween | null = null;
  private labelAt = 0;
  private label = "";
  private depth = -1;
  private attrs = new Map<string, string>();
  private visit = visitId();
  private io?: IntersectionObserver;
  private ro?: ResizeObserver;
  private cutting = false;
  private swapTimer = 0;
  private lastWidth = 0;
  private glide: gsap.core.Tween | null = null;

  constructor(private readonly refs: EngineRefs) {
    for (const [key, el] of Object.entries(refs.videos)) {
      if (!el) continue;
      const id = Number(key) as VideoId;
      const entry = videoEntry(id);
      if (!entry) continue;
      this.slots.set(id, new VideoSlot(id, el, entry.src, entry.bytes, entry.fps, this.onSlot));
    }
  }

  /* ------------------------------------------------------------ lifecycle */

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.bandCache.clear();
    this.plateCache.clear();
    this.videoOn.clear();
    this.attrs.clear();
    this.segIndex = -1;
    this.measure();
    this.target = this.shown = this.readProgress();

    window.addEventListener("scroll", this.onScroll, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
    this.refs.stage.addEventListener("focusin", this.onFocusIn);
    this.ro = new ResizeObserver(this.onResize);
    this.ro.observe(this.refs.track);
    this.io = new IntersectionObserver(
      ([e]) => {
        this.onScreen = e.isIntersecting;
        if (this.onScreen) this.catchUp();
      },
      { rootMargin: "10% 0px" },
    );
    this.io.observe(this.refs.track);

    const firstBand = this.layout.bands[0];
    if (this.shown < firstBand.outStart && this.loadK < 1) {
      // band one opens assembled: a one-time ramp that hands over to scroll
      this.loadTween = gsap.to(this, {
        loadK: 1,
        duration: 1.9,
        delay: 0.25,
        ease: "power3.out",
        onUpdate: () => this.renderBands(this.shown),
      });
    } else {
      this.loadK = 1;
    }
    this.render();
    this.startLoading();
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    window.removeEventListener("scroll", this.onScroll);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.refs.stage.removeEventListener("focusin", this.onFocusIn);
    this.ro?.disconnect();
    this.io?.disconnect();
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.lastTick = 0;
    this.loadTween?.kill();
    this.loadK = 1;
    this.glide?.kill();
    // static mode owns every chapter: nothing may stay hidden or inert
    for (const el of Object.values(this.refs.bands)) {
      if (!el) continue;
      el.inert = false;
      el.classList.remove("is-off");
      el.style.removeProperty("--o");
      el.style.removeProperty("--k");
      el.style.removeProperty("--x");
    }
    for (const el of Object.values(this.refs.plates)) {
      el?.style.removeProperty("--o");
      el?.style.removeProperty("--s");
      el?.classList.remove("is-dead");
    }
    document.documentElement.removeAttribute("data-intense");
    delete document.documentElement.dataset.chapter;
  }

  destroy() {
    this.disable();
    this.slots.forEach((s) => s.dispose());
    this.slots.clear();
  }

  /* ------------------------------------------------------------ geometry */

  private measure() {
    const r = this.refs.track.getBoundingClientRect();
    this.trackTop = r.top + window.scrollY;
    this.range = Math.max(1, this.refs.track.offsetHeight - window.innerHeight);
    this.lastWidth = window.innerWidth;
  }

  private readProgress() {
    return clamp((window.scrollY - this.trackTop) / this.range);
  }

  progressToScroll(p: number) {
    return this.trackTop + clamp(p) * this.range;
  }

  /* ------------------------------------------------------------ loop */

  private onScroll = () => {
    this.target = this.readProgress();
    this.wake();
  };

  private wake() {
    if (!this.raf && this.enabled && this.onScreen && !document.hidden) {
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  private tick = (now: number) => {
    const dt = Math.min(100, now - (this.lastTick || now));
    this.lastTick = now;
    this.shown += (this.target - this.shown) * (1 - Math.pow(1 - SMOOTHING, dt / 16.667));
    if (Math.abs(this.target - this.shown) < REST_EPS) {
      this.shown = this.target;
      this.raf = 0;
      this.lastTick = 0;
    } else {
      this.raf = requestAnimationFrame(this.tick);
    }
    this.render(now);
  };

  private onVisibility = () => {
    if (document.hidden) {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.lastTick = 0;
    } else {
      this.catchUp();
    }
  };

  /** Coming back from a hidden tab or from far off screen: take the reader's
   *  current position instead of scrubbing the whole way there. */
  private catchUp() {
    this.target = this.readProgress();
    if (Math.abs(this.target - this.shown) > 0.02) {
      this.shown = this.target;
      this.render();
    }
    this.wake();
  }

  private onResize = () => {
    const widthChanged = window.innerWidth !== this.lastWidth;
    const keep = this.shown;
    this.measure();
    if (widthChanged) {
      // keep the reader where they were in the story, not at the same pixel
      window.scrollTo({ top: this.progressToScroll(keep), behavior: "instant" as ScrollBehavior });
    }
    this.target = this.shown = this.readProgress();
    this.render();
  };

  /* ------------------------------------------------------------ render */

  render(now = performance.now()) {
    const p = this.shown;
    const { s, local } = locate(this.layout, p);
    if (s.index !== this.segIndex) this.onSegment(s);
    this.renderMedia(s, local);
    this.renderBands(p);
    this.renderHud(p, s, local, now);
    this.milestones(p);
  }

  private onSegment(s: SegLayout) {
    this.segIndex = s.index;
    // park every other ready video at the edge the reader will meet it from
    for (const other of this.layout.segs) {
      if (other.seg.kind !== "video" || other.index === s.index) continue;
      const slot = this.slots.get(other.seg.video);
      if (!slot || slot.state !== "ready") continue;
      slot.seekFrame(other.index < s.index ? other.seg.frames - 1 : 0);
    }
    this.pump();
  }

  private renderMedia(s: SegLayout, local: number) {
    const want: Partial<Record<StateId, { o: number; s: number }>> = {};
    const seg = s.seg;
    let activeVideo: VideoId | null = null;

    if (seg.kind === "rest") {
      want[seg.state] = { o: 1, s: 1 };
    } else {
      const slot = this.slots.get(seg.video);
      if (slot && slot.state === "ready") {
        activeVideo = seg.video;
        slot.seekFrame(frameAt(seg, local));
        const fromO = 1 - smoothstep(local, 0, HANDOFF_IN_VH / seg.vh);
        const toO = smoothstep(local, 1 - HANDOFF_OUT_VH / seg.vh, 1);
        if (seg.from === seg.to) want[seg.from] = { o: Math.max(fromO, toO), s: 1 };
        else {
          want[seg.from] = { o: fromO, s: 1 };
          want[seg.to] = { o: toO, s: 1 };
        }
      } else {
        this.stillJourney(seg, local, want);
      }
    }

    for (const st of STATES) {
      const el = this.refs.plates[st];
      if (!el) continue;
      const w = want[st] ?? { o: 0, s: 1 };
      let c = this.plateCache.get(st);
      if (!c) this.plateCache.set(st, (c = { o: -1, s: -1, live: null }));
      if (Math.abs(w.o - c.o) > 0.003 || ((w.o === 0 || w.o === 1) && w.o !== c.o)) {
        c.o = w.o;
        el.style.setProperty("--o", w.o.toFixed(3));
      }
      if (Math.abs(w.s - c.s) > 0.0005) {
        c.s = w.s;
        el.style.setProperty("--s", w.s.toFixed(4));
      }
      const live = w.o > 0.001;
      if (live !== c.live) {
        c.live = live;
        el.classList.toggle("is-dead", !live);
      }
    }

    for (const [id, slot] of this.slots) {
      const on = id === activeVideo;
      if (this.videoOn.get(id) !== on) {
        this.videoOn.set(id, on);
        slot.el.classList.toggle("is-on", on);
      }
    }
  }

  /** The complete journey without video: push into the old frame, settle into the new. */
  private stillJourney(seg: VideoSeg, local: number, want: Partial<Record<StateId, { o: number; s: number }>>) {
    if (seg.from === seg.to) {
      want[seg.from] = { o: 1, s: 1 + 0.06 * smoothstep(local, 0, 1) };
      return;
    }
    const x = smoothstep(local, 0.36, 0.72);
    want[seg.from] = { o: x < 0.999 ? 1 : 0, s: 1 + 0.16 * smoothstep(local, 0, 0.78) };
    want[seg.to] = { o: x, s: 1.1 - 0.1 * smoothstep(local, 0.36, 1) };
  }

  renderBands(p: number) {
    let best: StateId = this.chapter;
    let bestO = 0.3;
    for (const b of this.layout.bands) {
      const el = this.refs.bands[b.id];
      if (!el) continue;
      let o: number;
      let k: number;
      let x: number;
      if (b.first) {
        x = smoothstep(p, b.outStart, b.b);
        o = 1 - x;
        k = this.loadK;
      } else {
        x = b.last ? 0 : smoothstep(p, b.outStart, b.b);
        o = smoothstep(p, b.a, b.inEnd) * (1 - x);
        k = clamp((p - b.a) / Math.max(1e-6, b.settled - b.a));
      }
      let c = this.bandCache.get(b.id);
      if (!c) this.bandCache.set(b.id, (c = { o: -1, k: -1, x: -1, off: null }));
      if (Math.abs(o - c.o) > 0.003 || ((o === 0 || o === 1) && o !== c.o)) {
        c.o = o;
        el.style.setProperty("--o", o.toFixed(3));
      }
      if (Math.abs(k - c.k) > 0.006 || ((k === 0 || k === 1) && k !== c.k)) {
        c.k = k;
        el.style.setProperty("--k", k.toFixed(3));
      }
      if (Math.abs(x - c.x) > 0.006 || ((x === 0 || x === 1) && x !== c.x)) {
        c.x = x;
        el.style.setProperty("--x", x.toFixed(3));
      }
      const off = o < 0.01;
      if (off !== c.off) {
        c.off = off;
        el.classList.toggle("is-off", off);
        el.inert = off;
      }
      if (o > bestO) {
        bestO = o;
        best = b.id;
      }
    }
    if (best !== this.chapter) {
      this.chapter = best;
      this.setAttr("chapter", best);
      document.documentElement.dataset.chapter = best;
      window.dispatchEvent(new CustomEvent("wonderland:chapter", { detail: best }));
    }
    const cross = this.bandCache.get("crossroads");
    this.setAttr("choose", cross && cross.o > 0.55 ? "on" : "off");
  }

  private renderHud(p: number, s: SegLayout, local: number, now: number) {
    // depth readout: ~10Hz and only when the string changes
    if (this.refs.counter && now - this.labelAt > 100) {
      const text = (p * 100).toFixed(2).padStart(5, "0");
      if (text !== this.label) {
        this.label = text;
        this.labelAt = now;
        this.refs.counter.textContent = text;
      }
    }
    if (Math.abs(p - this.depth) > 0.0015 || (p === 1 && this.depth !== 1)) {
      this.depth = p;
      this.refs.root.style.setProperty("--depth", p.toFixed(4));
    }
    const intense = s.seg.kind === "video" && local > 0.06 && local < 0.94;
    if (this.attrs.get("intense") !== (intense ? "1" : "0")) {
      document.documentElement.toggleAttribute("data-intense", intense);
    }
    this.setAttr("intense", intense ? "1" : "0");
    this.renderCue(s);
  }

  private renderCue(s: SegLayout) {
    const cue = this.refs.cue;
    if (!cue) return;
    let need: VideoSlot | undefined;
    for (let i = s.index; i < this.layout.segs.length; i++) {
      const seg = this.layout.segs[i].seg;
      if (seg.kind === "video") {
        need = this.slots.get(seg.video);
        break;
      }
    }
    const loading = !!need && (need.state === "loading" || need.state === "idle") && this.queueStarted;
    this.setAttr("loading", loading ? "1" : "0");
    if (loading && need) {
      const v = need.progress.toFixed(2);
      if (cue.dataset.ld !== v) {
        cue.dataset.ld = v;
        cue.style.setProperty("--ld", v);
      }
    }
  }

  private setAttr(name: string, value: string) {
    if (this.attrs.get(name) === value) return;
    this.attrs.set(name, value);
    this.refs.root.setAttribute(`data-${name}`, value);
  }

  private milestones(p: number) {
    const L = this.layout;
    if (p > L.byId.v1.start + 0.004) track("rabbit_hole_started", {}, this.visit);
    for (const q of [25, 50, 75, 100]) {
      if (p * 100 >= q - 0.001) track("scroll_depth", { percent: q }, `${this.visit}:${q}`);
    }
    const cross = L.bands[L.bands.length - 1];
    if (p >= cross.settled) track("rabbit_hole_completed", {}, this.visit);
  }

  /* ------------------------------------------------------------ media loading */

  private startLoading() {
    if (this.queueStarted) {
      this.pump();
      return;
    }
    const img = this.refs.plates.threshold?.querySelector("img");
    let started = false;
    const go = () => {
      if (started || !this.enabled) return;
      started = true;
      this.queueStarted = true;
      this.activatePlates();
      this.pump();
      this.render();
    };
    // the poster wins the bandwidth race; a hung poster never blocks forever
    if (!img || (img.complete && img.naturalWidth > 0)) go();
    else {
      img.addEventListener("load", go, { once: true });
      img.addEventListener("error", go, { once: true });
      window.setTimeout(go, 4000);
    }
  }

  private activatePlates() {
    const order = [...STATES].sort(
      (a, b) => Math.abs(this.layout.chapterAt[a] - this.shown) - Math.abs(this.layout.chapterAt[b] - this.shown),
    );
    for (const st of order) {
      const wrap = this.refs.plates[st];
      if (wrap) activatePicture(wrap);
    }
  }

  private pump() {
    if (!this.enabled || !this.queueStarted || this.loading) return;
    const here = locate(this.layout, this.shown).s.index;
    const next = this.layout.segs
      .filter((s) => s.seg.kind === "video")
      .sort((a, b) => rank(a.index, here) - rank(b.index, here))
      .map((s) => this.slots.get((s.seg as VideoSeg).video))
      .find((slot) => slot && slot.state === "idle");
    if (!next) return;
    this.loading = next;
    next.load().finally(() => {
      this.loading = null;
      this.pump();
    });
  }

  private onSlot = (slot: VideoSlot) => {
    if (slot.state === "ready" || slot.state === "failed") {
      const { s } = locate(this.layout, this.shown);
      const active = s.seg.kind === "video" && s.seg.video === slot.id;
      if (slot.state === "ready" && !active) {
        const idx = this.layout.segs.findIndex((g) => g.seg.kind === "video" && g.seg.video === slot.id);
        slot.seekFrame(idx < s.index ? (this.layout.segs[idx].seg as VideoSeg).frames - 1 : 0);
      }
      if (active) {
        // the still journey hands over to the film without a jump
        this.refs.stage.classList.add("is-swapping");
        window.clearTimeout(this.swapTimer);
        this.swapTimer = window.setTimeout(() => this.refs.stage.classList.remove("is-swapping"), 520);
      }
      this.refs.root.setAttribute(`data-v${slot.id}`, slot.state);
    }
    if (this.enabled) {
      if (this.raf) return;
      requestAnimationFrame(() => this.render());
    }
  };

  /* ------------------------------------------------------------ navigation */

  /** A long jump: dip to the canvas, move, land on the exact frame, lift. */
  async cutTo(p: number) {
    if (this.cutting || !this.enabled) return;
    this.cutting = true;
    this.glide?.kill();
    this.refs.stage.classList.add("is-cut");
    await wait(240);
    this.measure();
    window.scrollTo({ top: this.progressToScroll(p), behavior: "instant" as ScrollBehavior });
    this.target = this.shown = this.readProgress();
    this.render();
    const { s } = locate(this.layout, this.shown);
    if (s.seg.kind === "video") await this.slots.get(s.seg.video)?.settled(320);
    this.refs.stage.classList.remove("is-cut");
    this.cutting = false;
  }

  /** A guided descent the reader can interrupt at any moment by scrolling. */
  glideTo(p: number, duration: number) {
    if (!this.enabled) return;
    this.glide?.kill();
    this.measure();
    this.glide = gsap.to(window, {
      duration,
      ease: "power2.inOut",
      scrollTo: { y: this.progressToScroll(p), autoKill: true },
    });
  }

  chapterProgress(id: StateId) {
    return this.layout.chapterAt[id];
  }

  private onFocusIn = (e: FocusEvent) => {
    const band = (e.target as HTMLElement).closest<HTMLElement>("[data-band]");
    if (!band) return;
    const id = band.dataset.band as StateId;
    const c = this.bandCache.get(id);
    if (c && c.o < 0.5) void this.cutTo(this.layout.chapterAt[id]);
  };
}

function rank(index: number, here: number) {
  return index >= here ? index - here : 100 + (here - index);
}

/** Moves data-srcset/data-src to live attributes so an image starts loading. */
export function activatePicture(root: HTMLElement) {
  root.querySelectorAll<HTMLSourceElement>("source[data-srcset]").forEach((s) => {
    s.srcset = s.dataset.srcset!;
    s.removeAttribute("data-srcset");
  });
  root.querySelectorAll<HTMLImageElement>("img[data-src]").forEach((img) => {
    if (img.dataset.srcset) {
      img.srcset = img.dataset.srcset;
      img.removeAttribute("data-srcset");
    }
    img.src = img.dataset.src!;
    img.removeAttribute("data-src");
  });
}
