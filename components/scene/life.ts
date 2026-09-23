/**
 * Whisper-level life for every resting frame, built only from the approved
 * plate itself (masked regions of the same image with tiny transforms),
 * soft light, mist and vector wisps. Coordinates are percent of the 16:9
 * plate, measured on the cleaned plates.
 *
 * Loops never share a period: durations are deliberately unrelated and
 * delays are negative so everything is mid-cycle at first paint.
 */
import type { SceneId } from "@/lib/content";

export type Anim =
  | "float"
  | "sway"
  | "breathe"
  | "hesitate"
  | "glance"
  | "twitch"
  | "tick"
  | "flutter"
  | "hatlift";

export interface Region {
  kind: "region";
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** transform origin inside the region, percent */
  ox?: number;
  oy?: number;
  anim: Anim;
  dur: number;
  delay?: number;
  /** amplitudes */
  ax?: number;
  ay?: number;
  ar?: number;
  as?: number;
  /** mask core: share of the ellipse kept fully opaque */
  core?: number;
  /** a vertical slot (percent of region width) left out of the mask */
  hole?: [number, number];
  depth?: "mid" | "fg";
  react?: string;
}

export interface Glow {
  kind: "glow";
  id: string;
  x: number;
  y: number;
  r: number;
  color: string;
  o0: number;
  o1: number;
  dur: number;
  delay?: number;
  flicker?: boolean;
  react?: string;
}

export interface Mist {
  kind: "mist";
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  dur: number;
  delay?: number;
  tint?: string;
  react?: string;
}

export interface Steam {
  kind: "steam";
  id: string;
  x: number;
  y: number;
  size: number;
  dur: number;
  delay?: number;
  react?: string;
}

export interface CatShadow {
  kind: "cat";
  id: string;
  x: number;
  y: number;
  size: number;
  dur: number;
  delay?: number;
  flip?: boolean;
}

export interface Whisper {
  kind: "whisper";
  id: string;
  x: number;
  y: number;
  w: number;
  rot: number;
  text: string;
  dur: number;
  delay?: number;
}

export type Life = Region | Glow | Mist | Steam | CatShadow | Whisper;

const amber = "rgba(232, 164, 88, 1)";
const candle = "rgba(255, 190, 110, 1)";
const teal = "rgba(120, 200, 205, 1)";
const moon = "rgba(170, 196, 230, 1)";

export const LIFE: Partial<Record<SceneId, Life[]>> = {
  threshold: [
    { kind: "region", id: "portal", x: 45, y: 4, w: 54, h: 94, anim: "breathe", dur: 11.3, delay: -4, as: 1.006, core: 0.94 },
    { kind: "region", id: "watch", x: 56.5, y: 44, w: 6.5, h: 14, ox: 50, oy: 4, anim: "sway", dur: 5.3, delay: -1.2, ar: 2.2, core: 0.78, depth: "mid" },
    { kind: "region", id: "ears", x: 69, y: 53, w: 8, h: 12, ox: 45, oy: 92, anim: "twitch", dur: 12.7, delay: -6, ar: 2.4, core: 0.7 },
    { kind: "region", id: "card-top", x: 51.5, y: 21, w: 10, h: 17, anim: "float", dur: 13.1, delay: -3, ax: 2, ay: -3, ar: 1.2, core: 0.74, depth: "fg" },
    { kind: "region", id: "card-left", x: 45, y: 59, w: 14, h: 16, anim: "float", dur: 9.7, delay: -7.5, ax: -2, ay: 3, ar: -1.4, core: 0.72, depth: "fg" },
    { kind: "region", id: "strip", x: 46.5, y: 30.5, w: 9, h: 11, anim: "flutter", dur: 7.9, delay: -2.4, ar: 3, core: 0.7, depth: "fg" },
    { kind: "region", id: "card-low", x: 25, y: 85, w: 19, h: 15, anim: "float", dur: 15.7, delay: -9, ax: 3, ay: -4, ar: 1, core: 0.7, depth: "fg" },
    { kind: "glow", id: "core", x: 76.7, y: 50.6, r: 6.5, color: amber, o0: 0.18, o1: 0.5, dur: 7.1, delay: -2 },
    { kind: "glow", id: "rim", x: 72, y: 50, r: 28, color: "rgba(208, 156, 94, 1)", o0: 0.02, o1: 0.09, dur: 17.3, delay: -8 },
  ],
  fall: [
    { kind: "region", id: "core", x: 37, y: 27, w: 26, h: 46, anim: "sway", dur: 26.3, delay: -9, ar: 1.1, core: 0.8 },
    { kind: "region", id: "rabbit", x: 60, y: 40, w: 20, h: 55, anim: "float", dur: 6.2, delay: -1.5, ax: 0, ay: -3, ar: 0.4, core: 0.8, depth: "mid" },
    { kind: "region", id: "watch", x: 72, y: 5, w: 10, h: 12, ox: 45, oy: 0, anim: "sway", dur: 5.2, delay: -3.1, ar: 2.4, core: 0.74 },
    { kind: "region", id: "paper-tr", x: 86, y: 8, w: 14, h: 30, anim: "float", dur: 9.1, delay: -4, ax: 4, ay: -6, ar: 1.3, core: 0.74, depth: "fg" },
    { kind: "region", id: "paper-br", x: 82, y: 65, w: 18, h: 35, anim: "float", dur: 11.3, delay: -2, ax: -3, ay: -5, ar: -1.1, core: 0.74, depth: "fg" },
    { kind: "region", id: "card-bl", x: 3, y: 60, w: 27, h: 38, anim: "float", dur: 13.7, delay: -6, ax: 3, ay: -4, ar: 0.8, core: 0.76, depth: "fg" },
    { kind: "glow", id: "l1", x: 33, y: 22, r: 5.5, color: amber, o0: 0.1, o1: 0.32, dur: 7.3, delay: -1 },
    { kind: "glow", id: "l2", x: 79, y: 27, r: 8, color: amber, o0: 0.08, o1: 0.26, dur: 11.1, delay: -5 },
    { kind: "glow", id: "l3", x: 37, y: 61, r: 4.5, color: amber, o0: 0.1, o1: 0.3, dur: 9.4, delay: -3, flicker: true },
    { kind: "glow", id: "l4", x: 66, y: 74, r: 4.5, color: amber, o0: 0.08, o1: 0.28, dur: 13.9, delay: -7 },
    { kind: "glow", id: "core-light", x: 50, y: 50, r: 5, color: candle, o0: 0.18, o1: 0.42, dur: 5.7, delay: -2 },
  ],
  disorientation: [
    { kind: "region", id: "core", x: 38, y: 29, w: 24, h: 42, anim: "sway", dur: 31.1, delay: -12, ar: 2.4, core: 0.8 },
    { kind: "region", id: "rabbit", x: 48, y: 20, w: 47, h: 75, anim: "float", dur: 8.4, delay: -3, ax: 0, ay: -3, ar: 0.35, core: 0.86, depth: "mid" },
    { kind: "region", id: "watch", x: 56.5, y: 30, w: 10, h: 19, ox: 55, oy: 6, anim: "sway", dur: 3.9, delay: -0.8, ar: 2.8, core: 0.74, depth: "mid" },
    { kind: "region", id: "paper-tr", x: 86, y: 8, w: 14, h: 30, anim: "float", dur: 10.3, delay: -2, ax: 5, ay: -4, ar: 1.8, core: 0.74, depth: "fg" },
    { kind: "region", id: "paper-br", x: 82, y: 65, w: 18, h: 35, anim: "float", dur: 12.7, delay: -8, ax: -4, ay: -5, ar: -1.6, core: 0.74, depth: "fg" },
    { kind: "region", id: "card-bl", x: 3, y: 60, w: 27, h: 38, anim: "float", dur: 14.9, delay: -4, ax: 4, ay: -3, ar: 1.4, core: 0.76, depth: "fg" },
    { kind: "glow", id: "l1", x: 33, y: 22, r: 5.5, color: amber, o0: 0.1, o1: 0.3, dur: 8.3, delay: -2 },
    { kind: "glow", id: "l2", x: 79, y: 27, r: 8, color: amber, o0: 0.06, o1: 0.24, dur: 12.1, delay: -6 },
    { kind: "glow", id: "watch", x: 63.5, y: 42.5, r: 3.2, color: candle, o0: 0.05, o1: 0.3, dur: 6.1, delay: -1 },
    { kind: "glow", id: "core-light", x: 50, y: 50, r: 5, color: candle, o0: 0.16, o1: 0.4, dur: 6.7, delay: -3 },
  ],
  landing: [
    { kind: "region", id: "astrolabe", x: 40.5, y: 27, w: 19, h: 33, anim: "sway", dur: 19.3, delay: -7, ar: 0.9, core: 0.84 },
    { kind: "region", id: "rabbit", x: 73, y: 50, w: 19, h: 49, anim: "float", dur: 4.7, delay: -2, ax: 0, ay: -2, ar: 0.3, core: 0.8, depth: "mid" },
    { kind: "region", id: "fern-l", x: 12, y: 64, w: 20, h: 24, ox: 50, oy: 100, anim: "sway", dur: 7.3, delay: -3, ar: 0.9, core: 0.72, depth: "fg" },
    { kind: "region", id: "vine", x: 64, y: 34, w: 8, h: 34, ox: 50, oy: 0, anim: "sway", dur: 9.1, delay: -5, ar: 0.7, core: 0.7 },
    { kind: "mist", id: "ground", x: 18, y: 58, w: 64, h: 24, opacity: 0.2, dur: 41, delay: -12 },
    { kind: "mist", id: "ground-2", x: 44, y: 66, w: 44, h: 18, opacity: 0.14, dur: 53, delay: -30 },
    { kind: "glow", id: "door", x: 59.6, y: 54.5, r: 5, color: amber, o0: 0.12, o1: 0.34, dur: 8.1, delay: -2 },
    { kind: "glow", id: "watch", x: 76, y: 70.5, r: 2.2, color: candle, o0: 0.05, o1: 0.35, dur: 3.3, delay: -1 },
    { kind: "glow", id: "sky", x: 70, y: 40, r: 26, color: "rgba(222, 176, 120, 1)", o0: 0.03, o1: 0.1, dur: 23.7, delay: -9 },
  ],
  crossroads: [
    // the rabbit: breath, a leg that will not keep still, a glance now and then
    { kind: "region", id: "torso", x: 64.5, y: 30, w: 9, h: 19, ox: 50, oy: 100, anim: "breathe", dur: 4.8, delay: -1.1, as: 1.008, core: 0.74 },
    { kind: "region", id: "legs", x: 63.5, y: 47.5, w: 8, h: 14, ox: 50, oy: 6, anim: "sway", dur: 6.4, delay: -2.3, ar: 1.6, core: 0.7 },
    { kind: "region", id: "head", x: 62.5, y: 17, w: 10, h: 18, ox: 52, oy: 92, anim: "glance", dur: 14.3, delay: -5, ar: 1.8, core: 0.76, react: "look" },
    { kind: "region", id: "watch", x: 61.8, y: 33.5, w: 3.8, h: 6, anim: "tick", dur: 11.1, delay: -4, ar: 7, core: 0.66, react: "watch" },
    // the compass cannot choose
    { kind: "region", id: "compass", x: 48, y: 66, w: 40, h: 32, anim: "hesitate", dur: 17.7, delay: -6, ar: 0.9, core: 0.84, hole: [48, 57] },
    // hatter path
    { kind: "region", id: "hat", x: 38.5, y: 36.5, w: 7.5, h: 11.5, ox: 50, oy: 100, anim: "hatlift", dur: 29.3, delay: -11, ay: -4, core: 0.72, react: "hat" },
    { kind: "steam", id: "cups", x: 43.4, y: 51.2, size: 3.4, dur: 8.5, delay: -2, react: "steam" },
    { kind: "steam", id: "pot", x: 52.6, y: 41.8, size: 2.6, dur: 11.3, delay: -6, react: "steam" },
    { kind: "glow", id: "arch", x: 41.5, y: 21.5, r: 6, color: amber, o0: 0.1, o1: 0.3, dur: 9.3, delay: -4, react: "hatter" },
    // rabbit path
    { kind: "region", id: "foliage", x: 0, y: 68, w: 13, h: 32, ox: 40, oy: 100, anim: "sway", dur: 8.2, delay: -3, ar: 0.9, core: 0.7, depth: "fg" },
    { kind: "glow", id: "path-end", x: 13, y: 50, r: 9, color: teal, o0: 0.05, o1: 0.16, dur: 12.4, delay: -5, react: "rabbit" },
    { kind: "glow", id: "key-1", x: 20.2, y: 83.2, r: 1.6, color: candle, o0: 0, o1: 0.35, dur: 6.3, delay: -1, flicker: true },
    { kind: "glow", id: "key-2", x: 27.6, y: 82.3, r: 1.6, color: candle, o0: 0, o1: 0.3, dur: 9.7, delay: -4, flicker: true },
    // cheshire path
    { kind: "mist", id: "cheshire-fog", x: 70, y: 30, w: 30, h: 50, opacity: 0.2, dur: 37, delay: -14, tint: "rgba(150, 170, 220, 1)", react: "fog" },
    { kind: "region", id: "cat", x: 85.5, y: 37, w: 10, h: 17, ox: 50, oy: 100, anim: "breathe", dur: 13.1, delay: -3, as: 1.012, core: 0.72, react: "cat" },
    { kind: "glow", id: "cat-mist", x: 90, y: 45, r: 9, color: moon, o0: 0.06, o1: 0.17, dur: 15.1, delay: -8, react: "cheshire" },
    { kind: "cat", id: "wanderer", x: 75.4, y: 44, size: 3.4, dur: 38.3, delay: -12 },
    { kind: "whisper", id: "sure", x: 62.2, y: 49.1, w: 12.5, rot: -4.5, text: "ARE YOU SURE?", dur: 43.7, delay: -21 },
    { kind: "glow", id: "sky", x: 58, y: 16, r: 30, color: "rgba(230, 170, 120, 1)", o0: 0.02, o1: 0.09, dur: 61, delay: -20 },
  ],
  rabbit: [
    { kind: "region", id: "clock", x: 52, y: 9, w: 17.5, h: 59, ox: 66, oy: 2, anim: "sway", dur: 6.8, delay: -2.1, ar: 0.7, core: 0.9, react: "clock" },
    { kind: "region", id: "keys", x: 85.5, y: 41, w: 5, h: 13, ox: 40, oy: 4, anim: "sway", dur: 4.4, delay: -1, ar: 2.2, core: 0.72 },
    { kind: "region", id: "note", x: 86, y: 9.5, w: 11, h: 30, ox: 50, oy: 3, anim: "flutter", dur: 5.7, delay: -3, ar: 0.8, core: 0.8 },
    { kind: "region", id: "note-l", x: 32, y: 25, w: 5, h: 17, ox: 40, oy: 4, anim: "flutter", dur: 6.9, delay: -4.4, ar: 1.4, core: 0.74 },
    { kind: "region", id: "leaves-bl", x: 0, y: 70, w: 30, h: 30, ox: 20, oy: 100, anim: "sway", dur: 7.4, delay: -2.6, ar: 0.7, core: 0.74, depth: "fg" },
    { kind: "region", id: "plants-r", x: 72, y: 60, w: 28, h: 40, ox: 60, oy: 100, anim: "sway", dur: 8.8, delay: -5.2, ar: 0.6, core: 0.74, depth: "fg" },
    { kind: "region", id: "fern", x: 32, y: 54, w: 15, h: 25, ox: 70, oy: 100, anim: "sway", dur: 6.1, delay: -1.7, ar: 0.9, core: 0.72 },
    { kind: "glow", id: "flame", x: 71.8, y: 69.6, r: 2.6, color: candle, o0: 0.25, o1: 0.6, dur: 2.3, delay: -1, flicker: true },
    { kind: "glow", id: "lantern", x: 71.8, y: 69, r: 8, color: amber, o0: 0.06, o1: 0.2, dur: 5.1, delay: -2, flicker: true },
    { kind: "glow", id: "door", x: 49.6, y: 47, r: 4.2, color: amber, o0: 0.12, o1: 0.34, dur: 9.2, delay: -4, react: "door" },
    { kind: "glow", id: "puddle", x: 56, y: 86, r: 7, color: moon, o0: 0.02, o1: 0.09, dur: 7.3, delay: -3 },
  ],
  hatter: [
    { kind: "region", id: "chandelier", x: 42, y: 5, w: 16, h: 30, ox: 50, oy: 0, anim: "sway", dur: 9.3, delay: -3, ar: 0.5, core: 0.82 },
    { kind: "region", id: "ribbon", x: 77.5, y: 31, w: 10, h: 11, ox: 18, oy: 20, anim: "flutter", dur: 7.1, delay: -2, ar: 2.4, core: 0.72, react: "ribbon" },
    { kind: "region", id: "hat", x: 70, y: 18, w: 13, h: 21, ox: 50, oy: 100, anim: "hatlift", dur: 31.7, delay: -17, ay: -3, core: 0.78, react: "hat" },
    { kind: "region", id: "clock-1", x: 38.2, y: 55.3, w: 2, h: 3.6, anim: "tick", dur: 7.7, delay: -1, ar: 9, core: 0.6 },
    { kind: "region", id: "clock-2", x: 46.1, y: 56.4, w: 2, h: 3.4, anim: "tick", dur: 10.3, delay: -5, ar: -11, core: 0.6 },
    { kind: "region", id: "clock-3", x: 53.2, y: 54.8, w: 1.8, h: 3.2, anim: "tick", dur: 13.9, delay: -8, ar: 7, core: 0.6 },
    { kind: "region", id: "curtain-l", x: 25, y: 16, w: 10, h: 40, ox: 50, oy: 0, anim: "flutter", dur: 11.3, delay: -4, ar: 0.35, core: 0.8 },
    { kind: "steam", id: "cup-c", x: 54.2, y: 72.5, size: 4, dur: 8.5, delay: -2, react: "steam" },
    { kind: "steam", id: "cup-f", x: 81.5, y: 86.5, size: 5.5, dur: 10.7, delay: -6, react: "steam" },
    { kind: "steam", id: "cup-l", x: 31.2, y: 74, size: 3.2, dur: 12.9, delay: -9, react: "steam" },
    { kind: "glow", id: "candle", x: 97.8, y: 62.8, r: 3, color: candle, o0: 0.3, o1: 0.62, dur: 2.9, delay: -1, flicker: true },
    { kind: "glow", id: "chand-1", x: 47, y: 12, r: 3, color: candle, o0: 0.15, o1: 0.4, dur: 3.7, delay: -2, flicker: true },
    { kind: "glow", id: "chand-2", x: 54, y: 12.5, r: 3, color: candle, o0: 0.12, o1: 0.38, dur: 4.3, delay: -1, flicker: true },
    { kind: "glow", id: "lamp", x: 37.5, y: 47, r: 4, color: amber, o0: 0.12, o1: 0.3, dur: 6.7, delay: -3 },
    { kind: "glow", id: "window", x: 82, y: 30, r: 16, color: "rgba(255, 214, 160, 1)", o0: 0.03, o1: 0.1, dur: 14.1, delay: -6 },
  ],
  cheshire: [
    { kind: "mist", id: "ground", x: 18, y: 66, w: 72, h: 28, opacity: 0.22, dur: 44, delay: -10, tint: "rgba(160, 185, 215, 1)" },
    { kind: "mist", id: "mid", x: 38, y: 20, w: 34, h: 44, opacity: 0.1, dur: 57, delay: -31, tint: "rgba(170, 195, 225, 1)" },
    { kind: "region", id: "branch", x: 47, y: 10, w: 15, h: 36, ox: 90, oy: 10, anim: "sway", dur: 9.7, delay: -3, ar: 0.6, core: 0.78 },
    { kind: "region", id: "cat", x: 68.5, y: 49, w: 9, h: 18, ox: 50, oy: 100, anim: "breathe", dur: 12.9, delay: -4, as: 1.013, core: 0.7, react: "cat" },
    { kind: "region", id: "bell", x: 91.5, y: 70, w: 4, h: 9, ox: 50, oy: 0, anim: "sway", dur: 6.2, delay: -2, ar: 2.6, core: 0.7 },
    { kind: "glow", id: "mirror", x: 60.5, y: 64, r: 6, color: moon, o0: 0.03, o1: 0.14, dur: 11.9, delay: -5, react: "mirror" },
    { kind: "glow", id: "mist-light", x: 50, y: 38, r: 16, color: moon, o0: 0.04, o1: 0.12, dur: 17.3, delay: -7 },
    { kind: "cat", id: "wanderer", x: 43.8, y: 58, size: 3.6, dur: 41.9, delay: -19, flip: true },
  ],
};
