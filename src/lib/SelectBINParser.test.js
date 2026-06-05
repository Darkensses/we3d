import { describe, it, expect } from 'vitest';
import SelectBINParser from './SelectBINParser.js';

const EXPECTED_SIZE = 300648;
const TABLE_BASE = 0x41770;
const STRIDE = 228;
const FLAGS_OFFSET = 108;

function flagByteOffset(id, i) {
  return TABLE_BASE + id * STRIDE + FLAGS_OFFSET + i * 6;
}

// Build a blank SELECT.BIN-sized buffer with stadium 0x0E flag 0 preset
// to the known fixture (11552, -1147, 16840) from FLAG_HEX_GUIDE.md.
function makeBuffer() {
  const buf = new ArrayBuffer(EXPECTED_SIZE);
  const view = new DataView(buf);
  const o = flagByteOffset(0x0e, 0);
  view.setInt16(o, 11552, true);
  view.setInt16(o + 2, -1147, true);
  view.setInt16(o + 4, 16840, true);
  return buf;
}

describe('SelectBINParser', () => {
  it('reads known flag fixture for stadium 0x0E', () => {
    const p = new SelectBINParser().parse(makeBuffer());
    expect(p.valid).toBe(true);
    const flags = p.readFlags(0x0e);
    expect(flags).toHaveLength(10);
    expect(flags[0]).toEqual({ x: 11552, y: -1147, z: 16840 });
  });

  it('round-trips written flags', () => {
    const p = new SelectBINParser().parse(makeBuffer());
    const next = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i === 0 ? 0 : -i, z: i * 2 }));
    p.writeFlags(0x0e, next);
    expect(p.readFlags(0x0e)).toEqual(next);
  });

  it('changes exactly the 60 target bytes on write', () => {
    const buf = makeBuffer();
    const before = new Uint8Array(buf.slice(0));
    const p = new SelectBINParser().parse(buf);
    const next = Array.from({ length: 10 }, () => ({ x: 1, y: 1, z: 1 }));
    p.writeFlags(0x0e, next);
    const after = new Uint8Array(p.getBuffer());
    const start = flagByteOffset(0x0e, 0);
    for (let i = 0; i < before.length; i++) {
      if (i >= start && i < start + 60) continue;
      expect(after[i]).toBe(before[i]);
    }
  });

  it('clamps int16 overflow on write', () => {
    const p = new SelectBINParser().parse(makeBuffer());
    p.writeFlags(0x0e, Array.from({ length: 10 }, () => ({ x: 40000, y: -40000, z: 0 })));
    expect(p.readFlags(0x0e)[0]).toEqual({ x: 32767, y: -32768, z: 0 });
  });

  it('flags wrong-size buffers as invalid', () => {
    const p = new SelectBINParser().parse(new ArrayBuffer(123));
    expect(p.valid).toBe(false);
  });
});
