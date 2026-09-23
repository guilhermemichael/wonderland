/**
 * The route veil: a short exposure dip between the Crossroads and a path
 * (200-450ms), then the destination reveals itself. Lives in the root
 * layout so it survives client navigations.
 */
import { REDUCED_MOTION } from "./gates";

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

function veil() {
  return document.getElementById("veil");
}

export async function coverVeil() {
  const v = veil();
  if (!v || window.matchMedia(REDUCED_MOTION).matches) return;
  v.dataset.state = "cover";
  await wait(300);
}

export function revealVeil() {
  const v = veil();
  if (!v) return;
  if (v.dataset.state !== "cover") return;
  requestAnimationFrame(() => {
    v.dataset.state = "reveal";
    window.setTimeout(() => {
      if (v.dataset.state === "reveal") v.dataset.state = "idle";
    }, 700);
  });
}
