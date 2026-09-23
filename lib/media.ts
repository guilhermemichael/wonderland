import manifest from "./media-manifest.json";
import type { SceneId } from "./content";

type PlateEntry = { widths: number[]; portrait: number[] };
type VideoEntry = { src: string; bytes: number; frames: number; fps: number };

const plates = manifest.plates as Record<string, PlateEntry>;
const videos = manifest.videos as Record<string, VideoEntry>;

export type VideoId = 1 | 2 | 3 | 4 | 5;

export const FORMATS = [
  { ext: "avif", type: "image/avif" },
  { ext: "webp", type: "image/webp" },
] as const;

export function plateSrcSet(scene: SceneId, ext: string, portrait = false) {
  const p = plates[scene];
  if (!p) return "";
  const list = portrait ? p.portrait : p.widths;
  return list.map((w) => `/media/plate-${scene}-${portrait ? "p" : ""}${w}.${ext} ${w}w`).join(", ");
}

export function plateFallback(scene: SceneId, portrait = false) {
  const p = plates[scene];
  const list = portrait ? p.portrait : p.widths;
  const w = list.includes(1920) ? 1920 : list.includes(1080) ? 1080 : list[list.length - 1];
  return `/media/plate-${scene}-${portrait ? "p" : ""}${w}.jpg`;
}

export function video(id: VideoId): VideoEntry {
  return videos[String(id)];
}
