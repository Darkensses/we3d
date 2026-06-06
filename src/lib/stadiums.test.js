import { describe, it, expect } from 'vitest';
import { STADIUMS, stadiumById } from './stadiums.js';

describe('STADIUMS', () => {
  it('has 17 entries (15 carousel + training + hidden)', () => {
    expect(STADIUMS).toHaveLength(17);
  });

  it('covers every stadium id 0x00..0x10 exactly once', () => {
    const ids = STADIUMS.map((s) => s.id).sort((a, b) => a - b);
    const expected = Array.from({ length: 17 }, (_, i) => i); // 0..16 == 0x00..0x10
    expect(ids).toEqual(expected);
  });

  it('derives each file name from its letter', () => {
    for (const s of STADIUMS) {
      expect(s.file).toBe(`GRDM_${s.letter}.BIN`);
    }
  });

  it('starts the carousel at Sydney (0x0E)', () => {
    expect(STADIUMS[0].id).toBe(0x0e);
    expect(STADIUMS[0].name).toMatch(/Sydney/);
  });

  it('looks up by id', () => {
    expect(stadiumById(0x05).file).toBe('GRDM_A.BIN');
    expect(stadiumById(0xff)).toBeUndefined();
  });
});
