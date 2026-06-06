import { clampInt16 } from './coords.js';

const TABLE_BASE = 0x41770;
const STRIDE = 228;
const FLAGS_OFFSET = 108;
const FLAG_COUNT = 10;
const EXPECTED_SIZE = 300648;

export default class SelectBINParser {
  parse(arrayBuffer) {
    this.buffer = arrayBuffer;
    this.view = new DataView(arrayBuffer);
    this.valid = arrayBuffer.byteLength === EXPECTED_SIZE;
    return this;
  }

  #flagOffset(id, i) {
    return TABLE_BASE + id * STRIDE + FLAGS_OFFSET + i * 6;
  }

  readFlags(id) {
    const flags = [];
    for (let i = 0; i < FLAG_COUNT; i++) {
      const o = this.#flagOffset(id, i);
      flags.push({
        x: this.view.getInt16(o, true),
        y: this.view.getInt16(o + 2, true),
        z: this.view.getInt16(o + 4, true),
      });
    }
    return flags;
  }

  writeFlags(id, flags) {
    for (let i = 0; i < FLAG_COUNT; i++) {
      const o = this.#flagOffset(id, i);
      const f = flags[i];
      this.view.setInt16(o, clampInt16(f.x), true);
      this.view.setInt16(o + 2, clampInt16(f.y), true);
      this.view.setInt16(o + 4, clampInt16(f.z), true);
    }
  }

  getBuffer() {
    return this.buffer;
  }
}
