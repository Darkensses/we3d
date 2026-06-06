# Flag-Placement Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A separate Vite page in we3d that renders a WE2002 stadium mesh, overlays the 10 side-stand flags as draggable 3D markers, and exports a patched `SELECT.BIN`.

**Architecture:** New `flags.html` + `src/flags.js` entry, isolated from the existing vertex editor (`src/main.js`). Pure logic lives in tested modules: `SelectBINParser.js` (flag table read/write), `coords.js` (PSX↔world transform), `stadiums.js` (id→mesh/name map). The SELECT.BIN buffer is the single source of truth; markers render from it, edits write back to it, export dumps it. Stadium mesh parsed by the existing `TMDParser.v2`.

**Tech Stack:** Vite (multi-page), Three.js 0.171 (+ addons `TransformControls`), camera-controls, tweakpane, vitest (new, for unit tests).

---

## File Structure

- Create `src/lib/coords.js` — PSX↔Three.js coordinate transform + int16 clamp. Pure, tested.
- Create `src/lib/SelectBINParser.js` — parse/read/write the SELECT.BIN flag table. Pure, tested.
- Create `src/lib/stadiums.js` — stadium metadata table + lookup. Pure, tested.
- Create `src/lib/coords.test.js`, `src/lib/SelectBINParser.test.js`, `src/lib/stadiums.test.js` — vitest specs.
- Create `flags.html` — editor page markup (mirrors `index.html` layout).
- Create `src/flags.js` — editor orchestration (scene, dropdown, markers, gizmo, panel, export).
- Modify `vite.config.js` — add `flags.html` as a second rollup input.
- Modify `package.json` — add vitest devDependency + `test` script.
- Create `public/assets/SELECT.BIN` + `public/assets/GRDM_*.BIN` (×17) — bundled originals.
- Reuse `src/lib/TMDParser.v2.js`, `src/lib/BinaryReader.js` — unchanged.
- Leave `src/main.js` unchanged.

Source of bundled binaries: `C:\Users\Darkensses\projects-claude\psx-we2002\ISO_ORIGINAL\` (`SELECT.BIN`, `BIN\GRDM_*.BIN`).

---

## Task 0: Test tooling + vitest

**Files:**
- Modify: `package.json`
- Create: `src/lib/smoke.test.js`

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest`
Expected: vitest added under devDependencies.

- [ ] **Step 2: Add a test script**

Edit `package.json` `scripts` to include:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
```

- [ ] **Step 3: Write a smoke test**

Create `src/lib/smoke.test.js`:

```js
import { describe, it, expect } from 'vitest';

describe('vitest wiring', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run it**

Run: `npm test`
Expected: PASS, 1 test passed.

- [ ] **Step 5: Delete the smoke test and commit tooling**

```bash
rm src/lib/smoke.test.js
git add package.json package-lock.json
git commit -m "chore: add vitest test runner"
```

---

## Task 1: coords.js — PSX ↔ world transform

The stadium mesh is rendered as `vertex × 0.001` then rotated about X by `-π`
(negates Y and Z). Markers must use the IDENTICAL transform so they land on the
mesh. Export inverts it back to int16. These are pure functions on plain `{x,y,z}`.

**Files:**
- Create: `src/lib/coords.js`
- Test: `src/lib/coords.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/lib/coords.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/coords.test.js`
Expected: FAIL — cannot resolve `./coords.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/coords.js`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/coords.test.js`
Expected: PASS, all cases green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/coords.js src/lib/coords.test.js
git commit -m "feat: add PSX<->world coordinate transform"
```

---

## Task 2: SelectBINParser — flag table read/write

**Files:**
- Create: `src/lib/SelectBINParser.js`
- Test: `src/lib/SelectBINParser.test.js`

Layout: table base `0x41770`, stride 228, flags at `+108`, 10 flags × 6 bytes
(int16 LE x,y,z). Expected file size 300648.

- [ ] **Step 1: Write the failing test**

Create `src/lib/SelectBINParser.test.js`:

```js
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
    const next = Array.from({ length: 10 }, (_, i) => ({ x: i, y: -i, z: i * 2 }));
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/SelectBINParser.test.js`
Expected: FAIL — cannot resolve `./SelectBINParser.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/SelectBINParser.js`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/SelectBINParser.test.js`
Expected: PASS, 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/SelectBINParser.js src/lib/SelectBINParser.test.js
git commit -m "feat: add SELECT.BIN flag table parser"
```

---

## Task 3: stadiums.js — stadium metadata

**Files:**
- Create: `src/lib/stadiums.js`
- Test: `src/lib/stadiums.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/lib/stadiums.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/stadiums.test.js`
Expected: FAIL — cannot resolve `./stadiums.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/stadiums.js`:

```js
// Stadium metadata, carousel-slot order. Source: psx-we2002/STADIUM_MAPPING.md.
// The random carousel slot (16) has no GRDM mesh and is omitted.
// id = disc-order index (also the SELECT.BIN table slot index).

export const STADIUMS = [
  { slot: 1,  id: 0x0e, letter: 'O',  file: 'GRDM_O.BIN',  name: 'Olympic Stadium, Sydney',        issName: 'Key Square Stadium' },
  { slot: 2,  id: 0x0f, letter: 'V',  file: 'GRDM_V.BIN',  name: 'King Baudouin Stadium, Brussels', issName: 'Royal Palace Stadium' },
  { slot: 3,  id: 0x00, letter: 'D',  file: 'GRDM_D.BIN',  name: 'Stade de France, Saint-Denis',    issName: 'Flying Disk Stadium' },
  { slot: 4,  id: 0x01, letter: 'F',  file: 'GRDM_F.BIN',  name: 'Olympic Stadium, Berlin',         issName: 'Twin Towers Stadium' },
  { slot: 5,  id: 0x02, letter: 'J',  file: 'GRDM_J.BIN',  name: 'Wembley, London',                 issName: 'Apex Stadium' },
  { slot: 6,  id: 0x03, letter: 'S',  file: 'GRDM_S.BIN',  name: 'San Siro, Milano',                issName: 'White Stadium' },
  { slot: 7,  id: 0x04, letter: 'M',  file: 'GRDM_M.BIN',  name: 'Olympic Stadium, Munchen',        issName: 'Imperial Stadium' },
  { slot: 8,  id: 0x05, letter: 'A',  file: 'GRDM_A.BIN',  name: 'Amsterdam Arena',                 issName: 'Arena Stadium' },
  { slot: 9,  id: 0x06, letter: 'P',  file: 'GRDM_P.BIN',  name: 'Parc des Princes, Paris',         issName: 'Masters Stadium' },
  { slot: 10, id: 0x07, letter: 'C',  file: 'GRDM_C.BIN',  name: 'Estadio Nacional, Santiago',      issName: 'Pacific Plaza Stadium' },
  { slot: 11, id: 0x08, letter: 'H',  file: 'GRDM_H.BIN',  name: 'Saitama Stadium',                 issName: 'National Stadium' },
  { slot: 12, id: 0x09, letter: 'T',  file: 'GRDM_T.BIN',  name: 'Old Trafford, Manchester',        issName: 'Legends Stadium' },
  { slot: 13, id: 0x0a, letter: 'GJ', file: 'GRDM_GJ.BIN', name: 'International Stadium, Yokohama',  issName: 'International Stadium' },
  { slot: 14, id: 0x0b, letter: 'MJ', file: 'GRDM_MJ.BIN', name: 'Nagai Stadium, Osaka',            issName: 'Arc Stadium' },
  { slot: 15, id: 0x0c, letter: 'RJ', file: 'GRDM_RJ.BIN', name: 'Olympic Stadium, Tokyo',          issName: 'Oval Stadium' },
  { slot: 'training', id: 0x0d, letter: 'I', file: 'GRDM_I.BIN', name: 'Training Stadium',          issName: 'Club House Stadium' },
  { slot: 'hidden',   id: 0x10, letter: 'B', file: 'GRDM_B.BIN', name: 'Hidden Stadium',            issName: 'Hidden Stadium' },
];

export function stadiumById(id) {
  return STADIUMS.find((s) => s.id === id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/stadiums.test.js`
Expected: PASS, 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stadiums.js src/lib/stadiums.test.js
git commit -m "feat: add stadium metadata table"
```

---

## Task 4: Bundle assets + multi-page Vite + page skeleton

**Files:**
- Create: `public/assets/SELECT.BIN`, `public/assets/GRDM_*.BIN` (×17)
- Modify: `vite.config.js`
- Create: `flags.html`
- Create: `src/flags.js`

- [ ] **Step 1: Copy the binaries into public/assets**

Run (PowerShell, from the we3d repo root):

```powershell
$src = 'C:\Users\Darkensses\projects-claude\psx-we2002\ISO_ORIGINAL'
New-Item -ItemType Directory -Force public\assets | Out-Null
Copy-Item "$src\SELECT.BIN" public\assets\SELECT.BIN
Copy-Item "$src\BIN\GRDM_*.BIN" public\assets\
Get-ChildItem public\assets | Select-Object Name,Length
```

Expected: `SELECT.BIN` (300648) + 17 `GRDM_*.BIN` listed.

- [ ] **Step 2: Add flags.html as a second Vite input**

Replace `vite.config.js` with:

```js
import { defineConfig } from 'vite'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        flags: resolve(__dirname, 'flags.html'),
      },
    },
  },
})
```

- [ ] **Step 3: Create the page markup**

Create `flags.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WE3D — Flag Placement Editor</title>
  </head>
  <body class="bg-black">
    <div class="flex flex-col h-screen">
      <div class="text-[#00ff00] w-full flex flex-col items-center pt-4 pb-2">
        <p class="text-xs">WE2002 Side-Stand Flag Placement Editor</p>
      </div>

      <div class="w-full flex flex-wrap justify-center items-center gap-4 pb-2 text-[#00ff00] text-xs">
        <label>Stadium:
          <select id="stadiumSelect" class="bg-black border border-[#00ff00] text-[#00ff00] p-1"></select>
        </label>

        <label><input type="checkbox" id="useOwnFiles" /> Load my own files</label>

        <span id="ownFiles" class="hidden flex gap-2 items-center">
          <label>SELECT.BIN <input type="file" id="selectInput" class="text-[#00ff00]" /></label>
          <label>GRDM <input type="file" id="grdmInput" class="text-[#00ff00]" /></label>
        </span>

        <button id="exportBtn" class="bg-[#00ff00] p-2 cursor-pointer text-black">Export SELECT.BIN</button>
        <span id="status"></span>
      </div>

      <div id="editor" class="relative flex-grow border-2 border-[#00ff00] flex items-stretch">
        <div id="toolpane" class="h-full absolute right-[4px] overflow-y-auto z-10"></div>
        <canvas id="webgl"></canvas>
      </div>
    </div>
    <script type="module" src="/src/flags.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Create a boot stub that loads SELECT.BIN and the dropdown**

Create `src/flags.js`:

```js
import './style.css';
import { STADIUMS } from './lib/stadiums.js';
import SelectBINParser from './lib/SelectBINParser.js';

const statusEl = document.getElementById('status');
function setStatus(msg) { statusEl.textContent = msg; }

const parser = new SelectBINParser();

async function loadBundledSelect() {
  const res = await fetch('/assets/SELECT.BIN');
  const buf = await res.arrayBuffer();
  parser.parse(buf);
  setStatus(parser.valid ? 'SELECT.BIN loaded' : 'SELECT.BIN wrong size!');
}

function fillDropdown() {
  const select = document.getElementById('stadiumSelect');
  select.innerHTML = '';
  for (const s of STADIUMS) {
    const opt = document.createElement('option');
    opt.value = String(s.id);
    const slot = typeof s.slot === 'number' ? `${s.slot}.` : `${s.slot}:`;
    opt.textContent = `${slot} ${s.name}  (0x${s.id.toString(16).toUpperCase()}, ${s.letter})`;
    opt.title = `ISS Pro: ${s.issName}`;
    select.appendChild(opt);
  }
}

async function main() {
  fillDropdown();
  await loadBundledSelect();
  console.log('flags for 0x0E:', parser.readFlags(0x0e));
}

main();
```

- [ ] **Step 5: Verify in the dev server**

Run: `npm run dev`
Open `http://localhost:5173/flags.html`.
Expected: dropdown populated (Sydney first), status reads "SELECT.BIN loaded", console logs 10 flags with flag 0 = `{x:11552,y:-1147,z:16840}`. Stop the server (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add vite.config.js flags.html src/flags.js public/assets
git commit -m "feat: bundle assets, add flags page skeleton and boot"
```

---

## Task 5: Render the selected stadium mesh

Add a Three.js scene and render the dropdown's stadium mesh (no markers yet),
using the same `× 0.001` + `rotateX(-π)` transform as the vertex editor.

**Files:**
- Modify: `src/flags.js`

- [ ] **Step 1: Add scene setup and mesh rendering**

Replace the entire contents of `src/flags.js` with:

```js
import './style.css';
import * as THREE from 'three';
import CameraControls from 'camera-controls';
import { STADIUMS, stadiumById } from './lib/stadiums.js';
import SelectBINParser from './lib/SelectBINParser.js';
import TMDParser from './lib/TMDParser.v2.js';
import BinaryReader from './lib/BinaryReader.js';
import { SCALE } from './lib/coords.js';

CameraControls.install({ THREE });

const statusEl = document.getElementById('status');
function setStatus(msg) { statusEl.textContent = msg; }

const parser = new SelectBINParser();
const canvas = document.querySelector('canvas#webgl');
const divEditor = document.querySelector('div#editor');

const scene = new THREE.Scene();
const sizes = { width: divEditor.clientWidth, height: divEditor.clientHeight };
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.01, 1000);
camera.position.set(0, 8, 30);
const cameraControls = new CameraControls(camera, renderer.domElement);
cameraControls.maxDistance = 200;

window.addEventListener('resize', () => {
  sizes.width = divEditor.clientWidth;
  sizes.height = divEditor.clientHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

let stadiumMesh = null;

function buildStadiumMesh(tmd) {
  const geometry = new THREE.BufferGeometry();
  const rotationX = -Math.PI;
  const vertices = new Float32Array(tmd.objects[0].vertex.flatMap(({ x, y, z }) => {
    const sx = x * SCALE, sy = y * SCALE, sz = z * SCALE;
    const rY = sy * Math.cos(rotationX) - sz * Math.sin(rotationX);
    const rZ = sy * Math.sin(rotationX) + sz * Math.cos(rotationX);
    return [sx, rY, rZ];
  }));
  const indices = [];
  const vi = tmd.objects[0].vertexIdx;
  for (let i = 0; i < vi.length; i += 4) {
    indices.push(vi[i], vi[i + 1], vi[i + 2]);
    indices.push(vi[i + 1], vi[i + 3], vi[i + 2]);
  }
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  const material = new THREE.MeshBasicMaterial({ color: 0x00aa00, wireframe: true });
  return new THREE.Mesh(geometry, material);
}

async function fetchGrdmTmd(file) {
  const res = await fetch(`/assets/${file}`);
  if (!res.ok) throw new Error(`missing /assets/${file}`);
  const buf = await res.arrayBuffer();
  const reader = new BinaryReader(buf);
  const tmds = new TMDParser().parse(reader);
  return tmds[0];
}

async function showStadium(id) {
  const meta = stadiumById(id);
  setStatus(`loading ${meta.file}…`);
  try {
    const tmd = await fetchGrdmTmd(meta.file);
    if (stadiumMesh) {
      scene.remove(stadiumMesh);
      stadiumMesh.geometry.dispose();
      stadiumMesh.material.dispose();
    }
    stadiumMesh = buildStadiumMesh(tmd);
    scene.add(stadiumMesh);
    cameraControls.fitToSphere(stadiumMesh, true);
    setStatus(`${meta.name}`);
  } catch (err) {
    setStatus(`error: ${err.message}`);
  }
}

function fillDropdown() {
  const select = document.getElementById('stadiumSelect');
  select.innerHTML = '';
  for (const s of STADIUMS) {
    const opt = document.createElement('option');
    opt.value = String(s.id);
    const slot = typeof s.slot === 'number' ? `${s.slot}.` : `${s.slot}:`;
    opt.textContent = `${slot} ${s.name}  (0x${s.id.toString(16).toUpperCase()}, ${s.letter})`;
    opt.title = `ISS Pro: ${s.issName}`;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => showStadium(Number(select.value)));
}

async function loadBundledSelect() {
  const res = await fetch('/assets/SELECT.BIN');
  parser.parse(await res.arrayBuffer());
}

const clock = new THREE.Clock();
function animate() {
  const delta = clock.getDelta();
  cameraControls.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

async function main() {
  fillDropdown();
  await loadBundledSelect();
  await showStadium(0x0e);
  animate();
}

main();
```

- [ ] **Step 2: Verify in the dev server**

Run: `npm run dev`
Open `http://localhost:5173/flags.html`.
Expected: green wireframe Sydney stadium renders and fits to view; changing the dropdown swaps the mesh; status shows the stadium name. Orbit/zoom works. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add src/flags.js
git commit -m "feat: render selected stadium mesh on flags page"
```

---

## Task 6: Overlay the 10 flag markers

**Files:**
- Modify: `src/flags.js`

- [ ] **Step 1: Add marker state and rendering**

In `src/flags.js`, update the imports line for coords to include the transform:

```js
import { SCALE, psxToWorld } from './lib/coords.js';
```

Add module-level state near `let stadiumMesh = null;`:

```js
let currentId = 0x0e;
let flagsState = [];        // 10 × {x,y,z} PSX coords (source of truth for UI)
const markers = [];         // 10 × THREE.Mesh spheres
const markerGroup = new THREE.Group();
scene.add(markerGroup);

const MARKER_RADIUS = 0.4;
const markerGeo = new THREE.SphereGeometry(MARKER_RADIUS, 12, 12);
const markerMat = new THREE.MeshBasicMaterial({ color: 0xff3366 });
```

Add a function to (re)build markers from the parser:

```js
function buildMarkers(id) {
  markers.forEach((m) => markerGroup.remove(m));
  markers.length = 0;
  flagsState = parser.readFlags(id);
  flagsState.forEach((flag, i) => {
    const mesh = new THREE.Mesh(markerGeo, markerMat);
    const w = psxToWorld(flag);
    mesh.position.set(w.x, w.y, w.z);
    mesh.userData.flagIndex = i;
    markerGroup.add(mesh);
    markers.push(mesh);
  });
}
```

In `showStadium`, set `currentId` and build markers after the mesh is added.
Change the body of `showStadium` so that after `scene.add(stadiumMesh);` it also does:

```js
    currentId = id;
    buildMarkers(id);
```

(Place these two lines immediately after `scene.add(stadiumMesh);` and before
`cameraControls.fitToSphere(...)`.)

- [ ] **Step 2: Verify in the dev server**

Run: `npm run dev`
Open `http://localhost:5173/flags.html`.
Expected: 10 red spheres appear arranged along the side stands of the stadium,
above the pitch (Y up). Switching stadiums rebuilds the markers. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add src/flags.js
git commit -m "feat: overlay 10 flag markers from SELECT.BIN"
```

---

## Task 7: Select a marker + TransformControls gizmo

Click a marker to attach a 3D gizmo; dragging it writes the new PSX coords back to
the buffer. Disable camera-controls while dragging the gizmo.

**Files:**
- Modify: `src/flags.js`

- [ ] **Step 1: Add gizmo, raycast selection, and write-back**

Add imports at the top of `src/flags.js`:

```js
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { worldToPsx } from './lib/coords.js';
```

(Combine the `coords.js` import into one line:
`import { SCALE, psxToWorld, worldToPsx } from './lib/coords.js';`)

After `cameraControls` is created, add the gizmo:

```js
const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.setSize(0.8);
scene.add(transformControls.getHelper());

transformControls.addEventListener('dragging-changed', (e) => {
  cameraControls.enabled = !e.value;
});

let selectedIndex = -1;

transformControls.addEventListener('objectChange', () => {
  if (selectedIndex < 0) return;
  const m = markers[selectedIndex];
  flagsState[selectedIndex] = worldToPsx(m.position);
  parser.writeFlags(currentId, flagsState);
  onFlagChanged?.(selectedIndex); // panel hook, defined in Task 8
});
```

Add a `let onFlagChanged = null;` declaration above (placeholder until Task 8).

Add raycast-based selection:

```js
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function selectMarker(index) {
  selectedIndex = index;
  if (index < 0) {
    transformControls.detach();
  } else {
    transformControls.attach(markers[index]);
  }
}

canvas.addEventListener('pointerdown', (e) => {
  if (transformControls.dragging) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(markers, false);
  if (hits.length > 0) {
    selectMarker(hits[0].object.userData.flagIndex);
  }
});
```

In `buildMarkers`, detach the gizmo and reset selection at the start (markers are
rebuilt on stadium switch). Add as the first lines of `buildMarkers`:

```js
  selectedIndex = -1;
  transformControls.detach();
```

- [ ] **Step 2: Verify in the dev server**

Run: `npm run dev`
Open `http://localhost:5173/flags.html`.
Expected: clicking a red sphere shows an X/Y/Z arrow gizmo on it. Dragging an axis
moves the flag; camera does not orbit while dragging. Console: run
`parser.readFlags(0x0e)` is not available globally, so instead verify by dragging,
switching stadium away and back — the moved flag returns to its dragged position
(proves write-back to the buffer). Stop the server.

- [ ] **Step 3: Commit**

```bash
git add src/flags.js
git commit -m "feat: select and drag flag markers via TransformControls"
```

---

## Task 8: Numeric panel (tweakpane) + reset

**Files:**
- Modify: `src/flags.js`

- [ ] **Step 1: Build a tweakpane folder per flag**

Add import:

```js
import { Pane } from 'tweakpane';
```

Add module state:

```js
let pane = null;
const originalFlags = []; // snapshot per stadium load, for reset
```

Add a function that builds the panel from `flagsState`:

```js
function buildPanel() {
  if (pane) pane.dispose();
  pane = new Pane({ container: document.getElementById('toolpane'), title: 'Side Flags', expanded: true });

  flagsState.forEach((flag, i) => {
    const f = pane.addFolder({ title: `Flag ${i}`, expanded: false });
    f.addBinding(flag, 'x', { step: 1 }).on('change', () => applyPanel(i));
    f.addBinding(flag, 'y', { step: 1 }).on('change', () => applyPanel(i));
    f.addBinding(flag, 'z', { step: 1 }).on('change', () => applyPanel(i));
    f.addButton({ title: 'Reset' }).on('click', () => {
      flagsState[i] = { ...originalFlags[i] };
      applyPanel(i);
      pane.refresh();
    });
  });
}

// flagsState[i] (PSX) was edited via panel -> move marker + write buffer.
function applyPanel(i) {
  const w = psxToWorld(flagsState[i]);
  markers[i].position.set(w.x, w.y, w.z);
  parser.writeFlags(currentId, flagsState);
}
```

Wire the gizmo→panel hook: replace the `onFlagChanged?.(selectedIndex);` line's
backing variable by assigning, after `buildPanel` exists:

```js
onFlagChanged = (i) => pane && pane.refresh();
```

Note the gizmo path mutates `flagsState[i]` by reassignment in Task 7
(`flagsState[selectedIndex] = worldToPsx(...)`). Because tweakpane binds to the
object reference, rebuild bindings on stadium change (panel is rebuilt) and call
`pane.refresh()` from `onFlagChanged`. To keep the binding reference stable during
gizmo drags, change the Task 7 `objectChange` handler to mutate in place instead of
reassigning:

```js
transformControls.addEventListener('objectChange', () => {
  if (selectedIndex < 0) return;
  const p = worldToPsx(markers[selectedIndex].position);
  const f = flagsState[selectedIndex];
  f.x = p.x; f.y = p.y; f.z = p.z;
  parser.writeFlags(currentId, flagsState);
  onFlagChanged?.(selectedIndex);
});
```

In `buildMarkers`, after `flagsState = parser.readFlags(id);`, snapshot originals:

```js
  originalFlags.length = 0;
  flagsState.forEach((f) => originalFlags.push({ ...f }));
```

In `showStadium`, after `buildMarkers(id);` add `buildPanel();`.

- [ ] **Step 2: Verify in the dev server**

Run: `npm run dev`
Open `http://localhost:5173/flags.html`.
Expected: a "Side Flags" panel with 10 folders. Editing X/Y/Z numbers moves the
corresponding sphere live. Dragging the gizmo updates the panel numbers. "Reset"
returns a flag to its original position. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add src/flags.js
git commit -m "feat: numeric flag panel with live edit and reset"
```

---

## Task 9: Source toggle (bundled vs load-your-own)

**Files:**
- Modify: `src/flags.js`

- [ ] **Step 1: Wire the checkbox, file inputs, and custom-GRDM path**

Add module state:

```js
let useOwnGrdm = false;
let ownGrdmTmd = null;
```

Add toggle + file-input handling (call this from `main`):

```js
function wireSourceToggle() {
  const useOwn = document.getElementById('useOwnFiles');
  const ownFiles = document.getElementById('ownFiles');
  const selectInput = document.getElementById('selectInput');
  const grdmInput = document.getElementById('grdmInput');

  useOwn.addEventListener('change', () => {
    ownFiles.classList.toggle('hidden', !useOwn.checked);
  });

  selectInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    parser.parse(await file.arrayBuffer());
    setStatus(parser.valid ? 'custom SELECT.BIN loaded' : 'wrong size — not 300648 bytes');
    if (parser.valid) showStadium(currentId);
  });

  grdmInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new BinaryReader(await file.arrayBuffer());
    ownGrdmTmd = new TMDParser().parse(reader)[0];
    useOwnGrdm = true;
    showStadium(currentId);
  });
}
```

Update `showStadium` to honor a manually-loaded GRDM. Replace the
`const tmd = await fetchGrdmTmd(meta.file);` line with:

```js
    const tmd = useOwnGrdm && ownGrdmTmd ? ownGrdmTmd : await fetchGrdmTmd(meta.file);
```

Reset `useOwnGrdm` to `false` when the dropdown changes (a dropdown pick means "use
the bundled mesh for that stadium"). In `fillDropdown`'s change listener, set
`useOwnGrdm = false;` before calling `showStadium`:

```js
  select.addEventListener('change', () => { useOwnGrdm = false; showStadium(Number(select.value)); });
```

Call `wireSourceToggle();` inside `main()` before `await loadBundledSelect();`.

- [ ] **Step 2: Verify in the dev server**

Run: `npm run dev`
Open `http://localhost:5173/flags.html`.
Expected: ticking "Load my own files" reveals two file inputs. Loading the stock
`ISO_ORIGINAL/SELECT.BIN` keeps flags identical; loading a previously-patched
SELECT.BIN shows the patched flag positions. Loading a `GRDM_*.BIN` renders that
mesh. Picking a stadium from the dropdown reverts to the bundled mesh. Stop the
server.

- [ ] **Step 3: Commit**

```bash
git add src/flags.js
git commit -m "feat: toggle to load custom SELECT.BIN and GRDM files"
```

---

## Task 10: Export patched SELECT.BIN + integration check

**Files:**
- Modify: `src/flags.js`

- [ ] **Step 1: Wire the export button**

Add to `src/flags.js` a function and call it from `main`:

```js
function wireExport() {
  document.getElementById('exportBtn').addEventListener('click', () => {
    const blob = new Blob([parser.getBuffer()], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'SELECT.BIN';
    link.click();
    URL.revokeObjectURL(link.href);
  });
}
```

Call `wireExport();` inside `main()`.

- [ ] **Step 2: Verify export round-trips through the parser**

Run: `npm run dev`
Open `http://localhost:5173/flags.html`. Move flag 0 of Sydney with the gizmo, click
"Export SELECT.BIN", save the file. Stop the server.

- [ ] **Step 3: Integration byte-diff against the known-good python patcher**

The python patcher `psx-we2002/patch_select_bin_side_flags.py` is the ground-truth
tool. Confirm the editor's export differs from the stock file ONLY inside flag
regions and is a valid 300648-byte file.

Run (PowerShell, point `$exported` at your downloaded file):

```powershell
$stock = 'C:\Users\Darkensses\projects-claude\psx-we2002\ISO_ORIGINAL\SELECT.BIN'
$exported = "$env:USERPROFILE\Downloads\SELECT.BIN"
$a = [System.IO.File]::ReadAllBytes($stock)
$b = [System.IO.File]::ReadAllBytes($exported)
"stock=$($a.Length) exported=$($b.Length)"
$diff = 0..($a.Length-1) | Where-Object { $a[$_] -ne $b[$_] }
"changed byte offsets (hex):"; $diff | ForEach-Object { '0x{0:X}' -f $_ }
```

Expected: both lengths 300648; every changed offset falls inside
`0x41770 + 0x0E*228 + 108` .. `+60` (i.e. `0x42454`..`0x4248F`). No bytes outside a
flag region changed.

- [ ] **Step 4: Run the full unit suite**

Run: `npm test`
Expected: all `coords`, `SelectBINParser`, `stadiums` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/flags.js
git commit -m "feat: export patched SELECT.BIN"
```

---

## Done criteria

- `npm test` green (coords, SelectBINParser, stadiums).
- `flags.html` renders any of the 17 stadiums, overlays 10 draggable flags, edits via
  gizmo and numeric panel, resets per flag, toggles to custom files, exports a valid
  300648-byte SELECT.BIN whose only diffs are inside flag regions.
- Existing vertex editor (`index.html` / `src/main.js`) unchanged.

## Notes for the implementer

- Records 18..27 only (the 10 side flags). Do NOT touch records 0..17 or 28..37.
- Y is negative-up in PSX; `coords.js` handles the flip — never hand-roll it elsewhere.
- The SELECT.BIN buffer in `parser` accumulates edits across stadium switches; export
  carries every change made in the session.
- TransformControls in three 0.171 is not an Object3D — add `getHelper()` to the
  scene (already in the plan), not the controls object itself.
