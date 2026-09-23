/**
 * One scrubbed video: streamed Blob loading with honest progress, and a
 * deadlock-safe, coalescing seek gate (references/scrub-pipeline.md).
 *
 * Why a Blob: many hosts lack HTTP Range support, which silently clamps every
 * seek to zero in production. The whole file held in memory seeks anywhere.
 */
export type SlotState = "idle" | "loading" | "ready" | "failed";

const STALL_MS = 20000;

export class VideoSlot {
  state: SlotState = "idle";
  progress = 0;
  private url: string | null = null;
  private seekBusy = false;
  private pending: number | null = null;
  private lastFrame = -1;
  private seekTimer = 0;
  private abort: AbortController | null = null;

  constructor(
    readonly id: number,
    readonly el: HTMLVideoElement,
    readonly src: string,
    readonly bytes: number,
    readonly fps: number,
    private readonly notify: (slot: VideoSlot) => void,
  ) {
    el.addEventListener("seeked", this.onSeeked);
    el.addEventListener("error", this.onError);
  }

  async load(): Promise<void> {
    if (this.state !== "idle") return;
    this.state = "loading";
    this.notify(this);
    const ctrl = new AbortController();
    this.abort = ctrl;
    let watchdog = window.setTimeout(() => ctrl.abort(), STALL_MS);
    try {
      const res = await fetch(this.src, { signal: ctrl.signal, priority: "low" } as RequestInit);
      if (!res.ok || !res.body) throw new Error(`video ${this.id}: HTTP ${res.status}`);
      const total = Number(res.headers.get("Content-Length")) || this.bytes;
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let got = 0;
      let lastNotify = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        window.clearTimeout(watchdog);
        watchdog = window.setTimeout(() => ctrl.abort(), STALL_MS);
        chunks.push(value);
        got += value.length;
        this.progress = Math.min(1, got / total);
        const now = performance.now();
        if (now - lastNotify > 100) {
          lastNotify = now;
          this.notify(this);
        }
      }
      window.clearTimeout(watchdog);
      this.progress = 1;
      this.notify(this);
      const blob = new Blob(chunks as BlobPart[], { type: "video/mp4" });
      chunks.length = 0;
      this.url = URL.createObjectURL(blob);
      await this.attach(this.url);
      this.state = "ready";
      this.notify(this);
    } catch {
      window.clearTimeout(watchdog);
      this.fail();
    } finally {
      this.abort = null;
    }
  }

  private attach(url: string) {
    const el = this.el;
    return new Promise<void>((resolve, reject) => {
      const done = () => {
        el.removeEventListener("loadeddata", done);
        el.removeEventListener("error", bad);
        resolve();
      };
      const bad = () => {
        el.removeEventListener("loadeddata", done);
        el.removeEventListener("error", bad);
        reject(new Error("decode"));
      };
      el.addEventListener("loadeddata", done);
      el.addEventListener("error", bad);
      el.preload = "auto";
      el.src = url;
      el.load();
    });
  }

  /** Seek to a frame. Coalesces to the newest target; never overlaps. */
  seekFrame(frame: number) {
    if (this.state !== "ready") return;
    const f = Math.round(frame);
    if (f === this.lastFrame && !this.seekBusy) return;
    if (this.seekBusy) {
      this.pending = f;
      return;
    }
    this.lastFrame = f;
    this.seekBusy = true;
    const d = this.el.duration;
    const t = (f + 0.25) / this.fps;
    this.el.currentTime = Number.isFinite(d) ? Math.min(t, d - 0.001) : t;
    // safety net: a seek that never reports back must not freeze the gate
    window.clearTimeout(this.seekTimer);
    this.seekTimer = window.setTimeout(this.onSeeked, 600);
  }

  get busy() {
    return this.seekBusy;
  }

  get frame() {
    return this.lastFrame;
  }

  /** Resolves once the current seek (if any) has landed, or after `max` ms. */
  settled(max = 260) {
    return new Promise<void>((resolve) => {
      if (!this.seekBusy) return resolve();
      const t0 = performance.now();
      const check = () => {
        if (!this.seekBusy || performance.now() - t0 > max) resolve();
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  }

  private onSeeked = () => {
    window.clearTimeout(this.seekTimer);
    this.seekBusy = false;
    if (this.pending !== null) {
      const f = this.pending;
      this.pending = null;
      this.seekFrame(f);
    }
  };

  private onError = () => {
    // the deadlock escape: a failed seek must release the gate
    window.clearTimeout(this.seekTimer);
    this.seekBusy = false;
    this.pending = null;
    if (this.state === "ready" || this.state === "loading") this.fail();
  };

  private fail() {
    if (this.state === "failed") return;
    this.state = "failed";
    this.abort?.abort();
    this.el.removeAttribute("src");
    if (this.url) {
      URL.revokeObjectURL(this.url);
      this.url = null;
    }
    this.notify(this);
  }

  dispose() {
    this.abort?.abort();
    window.clearTimeout(this.seekTimer);
    this.el.removeEventListener("seeked", this.onSeeked);
    this.el.removeEventListener("error", this.onError);
    if (this.url) {
      this.el.removeAttribute("src");
      this.el.load();
      URL.revokeObjectURL(this.url);
      this.url = null;
    }
    this.state = "idle";
  }
}
