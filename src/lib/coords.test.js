import { describe, it, expect } from 'vitest';
import { SCALE, clampInt16, psxToWorld, worldToPsx } from './coords.js';

describe('clampInt16', () => {
  it('passes values in range', () => {
    expect(clampInt16(11552)).toBe(11552);
    expect(clampInt16(-1147)).toBe(-1147);
  });
  it('clamps out-of-range values', () => {
    expect(clampInt16(40000)).toBe(32767);
    expect(clampInt16(-40000)).toBe(-32768);
  });
});

describe('psxToWorld', () => {
  it('scales by SCALE and negates Y and Z', () => {
    const w = psxToWorld({ x: 11552, y: -1147, z: 16840 });
    expect(w.x).toBeCloseTo(11552 * SCALE);
    expect(w.y).toBeCloseTo(1147 * SCALE);   // -(-1147)
    expect(w.z).toBeCloseTo(-16840 * SCALE);
  });
});

describe('worldToPsx', () => {
  it('inverts psxToWorld and rounds to int16', () => {
    const original = { x: 928, y: -1088, z: 16872 };
    const round = worldToPsx(psxToWorld(original));
    expect(round).toEqual(original);
  });
  it('clamps overflow on the way back', () => {
    const p = worldToPsx({ x: 40, y: 0, z: 0 }); // 40 / 0.001 = 40000
    expect(p.x).toBe(32767);
  });
});
