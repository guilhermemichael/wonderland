export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);

export const smoothstep = (p: number, e0: number, e1: number) => {
  if (e1 === e0) return p >= e1 ? 1 : 0;
  const t = clamp((p - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Piecewise-linear lookup through sorted [x, y] knots. */
export function piecewise(knots: ReadonlyArray<readonly [number, number]>, x: number) {
  if (x <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [x1, y1] = knots[i];
    if (x <= x1) {
      const [x0, y0] = knots[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
    }
  }
  return knots[knots.length - 1][1];
}

/** Inverse of piecewise() for monotonic knots: y -> x. */
export function piecewiseInverse(knots: ReadonlyArray<readonly [number, number]>, y: number) {
  return piecewise(
    knots.map(([a, b]) => [b, a] as const),
    y,
  );
}

/** Deterministic pseudo-random generator (Numerical Recipes LCG). */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

export function hashString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
