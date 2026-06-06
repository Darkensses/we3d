// PSX stadium coords <-> Three.js world coords.
// Forward: world = PSX * SCALE, then rotateX(-PI) which negates Y and Z.
// Inverse: PSX = round(world / SCALE) with Y and Z negated, clamped to int16.

export const SCALE = 0.001;

export function clampInt16(n) {
  return Math.max(-32768, Math.min(32767, n));
}

export function psxToWorld({ x, y, z }) {
  return { x: x * SCALE, y: -y * SCALE, z: -z * SCALE };
}

export function worldToPsx({ x, y, z }) {
  return {
    x: clampInt16(Math.round(x / SCALE)),
    y: clampInt16(Math.round(-y / SCALE)),
    z: clampInt16(Math.round(-z / SCALE)),
  };
}
