"use client";

import { useEffect, useRef } from "react";

import type { SceneId } from "@/lib/content";
import { REDUCED_MOTION } from "@/lib/gates";
import { pointer } from "@/lib/pointer";

/**
 * Whisper-level motes: dust, paper flecks, pollen, steam or mist, one
 * palette per scene. One 2D canvas (no WebGL context), DPR capped, ~30fps,
 * asleep when hidden, off screen, or under reduced motion.
 */
type Palette = {
  rgb: string;
  count: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  /** pull toward a point (x, y in 0-1), e.g. the portal */
  pull?: [number, number, number];
  orbit?: number;
};

const PALETTES: Record<SceneId, Palette> = {
  threshold: { rgb: "236, 224, 198", count: 46, vx: 0.004, vy: -0.002, alpha: 0.32, size: 1.4, pull: [0.73, 0.5, 0.006] },
  fall: { rgb: "240, 220, 188", count: 58, vx: 0, vy: -0.028, alpha: 0.3, size: 1.5 },
  disorientation: { rgb: "236, 214, 186", count: 54, vx: 0, vy: 0, alpha: 0.28, size: 1.4, orbit: 0.05 },
  landing: { rgb: "226, 226, 204", count: 40, vx: 0.006, vy: -0.004, alpha: 0.26, size: 1.6 },
  crossroads: { rgb: "236, 222, 196", count: 38, vx: 0.005, vy: -0.003, alpha: 0.24, size: 1.5 },
  rabbit: { rgb: "214, 232, 218", count: 36, vx: 0.003, vy: -0.004, alpha: 0.24, size: 1.5 },
  hatter: { rgb: "255, 222, 172", count: 34, vx: 0.002, vy: -0.006, alpha: 0.26, size: 1.4 },
  cheshire: { rgb: "196, 210, 232", count: 22, vx: -0.003, vy: -0.001, alpha: 0.18, size: 1.8 },
};

type Mote = { x: number; y: number; z: number; ph: number; tw: number; s: number };

export function Particles({ scene }: { scene?: SceneId }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia(REDUCED_MOTION);
    const host = canvas.closest<HTMLElement>("[data-chapter]");
    const current = (): SceneId => scene ?? ((host?.dataset.chapter as SceneId) || "threshold");

    let pal = PALETTES[current()];
    let motes: Mote[] = [];
    let W = 0;
    let H = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let visible = true;
    let px = 0;
    let py = 0;
    let fade = 1;

    const seed = () => {
      motes = Array.from({ length: pal.count }, () => ({
        x: Math.random(),
        y: Math.random(),
        z: 0.35 + Math.random() * 0.65,
        ph: Math.random() * Math.PI * 2,
        tw: 0.4 + Math.random() * 0.9,
        s: 0.5 + Math.random(),
      }));
    };
    const resize = () => {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
    };

    const frame = (t: number) => {
      raf = 0;
      if (!running()) return;
      raf = requestAnimationFrame(frame);
      if (t - last < 32) return; // ~30fps is plenty for motes
      const dt = Math.min(0.1, (t - (last || t)) / 1000);
      last = t;
      px += (pointer.x - px) * 0.04;
      py += (pointer.y - py) * 0.04;
      const next = PALETTES[current()];
      if (next !== pal) {
        fade = 0;
        pal = next;
        if (motes.length !== pal.count) seed();
      }
      fade = Math.min(1, fade + dt * 0.8);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const time = t / 1000;
      for (const m of motes) {
        let vx = pal.vx * m.z + Math.sin(time * 0.3 + m.ph) * 0.0015;
        let vy = pal.vy * m.z + Math.cos(time * 0.23 + m.ph) * 0.0012;
        if (pal.pull) {
          vx += (pal.pull[0] - m.x) * pal.pull[2];
          vy += (pal.pull[1] - m.y) * pal.pull[2];
        }
        if (pal.orbit) {
          const dx = m.x - 0.5;
          const dy = m.y - 0.5;
          vx += -dy * pal.orbit * m.z;
          vy += dx * pal.orbit * m.z;
        }
        m.x += vx * dt * 6;
        m.y += vy * dt * 6;
        if (m.x < -0.05) m.x += 1.1;
        if (m.x > 1.05) m.x -= 1.1;
        if (m.y < -0.05) m.y += 1.1;
        if (m.y > 1.05) m.y -= 1.1;
        if (pal.pull && Math.hypot(m.x - pal.pull[0], m.y - pal.pull[1]) < 0.04) {
          m.x = Math.random() < 0.5 ? -0.04 : 1.04;
          m.y = Math.random();
        }
        const a = pal.alpha * m.z * (0.55 + 0.45 * Math.sin(time * m.tw + m.ph)) * fade;
        if (a <= 0.01) continue;
        const x = m.x * W - px * 8 * m.z;
        const y = m.y * H - py * 5 * m.z;
        ctx.fillStyle = `rgba(${pal.rgb}, ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, pal.size * m.s * m.z, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const running = () => visible && !document.hidden && !reduced.matches && W > 0;
    const wake = () => {
      if (!raf && running()) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
      if (!running()) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) resize();
      wake();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => {
      resize();
      wake();
    });
    ro.observe(canvas);
    document.addEventListener("visibilitychange", wake);
    reduced.addEventListener("change", wake);
    resize();
    seed();
    wake();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", wake);
      reduced.removeEventListener("change", wake);
    };
  }, [scene]);

  return <canvas ref={ref} className="motes" aria-hidden="true" />;
}
