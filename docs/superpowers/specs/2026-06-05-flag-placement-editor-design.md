# Flag-Placement Editor — Design Spec

**Date:** 2026-06-05
**Project:** we3d (WE2002 PSX model tooling)
**Source task:** psx-we2002 `NEXT_TASKS.md` Task 2

## Purpose

A browser tool to visually place the 10 side-stand flags of a WE2002 stadium and
export a patched `SELECT.BIN`. Flag positions are data in `SELECT.BIN` (per-stadium
table at file offset `0x41770`, stride 228, records 18..27 = the 10 side flags as
int16 LE XYZ). The editor renders the stadium mesh (`GRDM_*.BIN`, standard TMD),
overlays draggable markers at the flag coordinates, and writes edits back to the
SELECT.BIN buffer.

Reference: `psx-we2002/FLAG_HEX_GUIDE.md`, `psx-we2002/STADIUM_MAPPING.md`,
`psx-we2002/select_flags_nostd.psx.pat`.

## Goals (MVP)

- Load stock `SELECT.BIN`, parse the 17 × 228-byte stadium table.
- Pick a stadium from a dropdown (disc-order names); render its `GRDM_*.BIN` mesh.
- Overlay 10 markers at the side-flag XYZ (records 18..27).
- Move a marker via a TransformControls gizmo (drag X/Y/Z) and via a numeric panel.
- Persist edits in the SELECT.BIN buffer across stadium switches in one session.
- Export the patched `SELECT.BIN`.
- Re-editable: a toggle lets the user load their own (possibly already-patched)
  `SELECT.BIN` and a custom `GRDM_*.BIN`, so prior work is not lost.

## Non-goals (MVP)

- Editing records 0..17 (non-visual) or 28..37 (inert/redundant). Write 18..27 only.
- Multi-stadium simultaneous view.
- Undo history beyond per-flag "reset to original".
- Touching the existing vertex editor (`src/main.js`) — it stays unchanged.

## Architecture

Separate Vite page inside we3d. Existing vertex editor untouched.

```
we3d/
  index.html              existing vertex viewer (UNCHANGED)
  flags.html              NEW  editor entry page
  vite.config.js          EDIT add flags.html as a second rollup input
  public/assets/
    SELECT.BIN            NEW  stock copy (300648 bytes)
    GRDM_A.BIN .. (×17)   NEW  stadium meshes
  src/
    flags.js              NEW  editor entry logic
    lib/
      SelectBINParser.js  NEW  flag table read/write
      stadiums.js         NEW  id -> {letter,file,name} map
      TMDParser.v2.js     REUSE mesh parse
      BinaryReader.js     REUSE
    main.js               UNCHANGED
```

Vite multi-page: add `flags.html` to `build.rollupOptions.input`. Binaries live in
`public/assets/` so `fetch('/assets/GRDM_O.BIN')` works in dev and build.

## Components

### SelectBINParser.js — single source of truth

Holds the full SELECT.BIN buffer; all edits mutate it in place.

- `parse(arrayBuffer)` — store buffer + DataView. Reject if length !== 300648 (warn).
- `readFlags(id)` — return 10 `{x,y,z}` read from
  `0x41770 + id*228 + 108`, 60 bytes, int16 little-endian.
- `writeFlags(id, arr)` — write those 60 bytes from `arr` (10 `{x,y,z}`, int16 LE,
  clamped to [-32768, 32767]). No other bytes touched.
- `getBuffer()` — return the full buffer (Uint8Array/ArrayBuffer) for export.

Constants: `TABLE_BASE = 0x41770`, `STRIDE = 228`, `FLAGS_OFFSET = 108`,
`FLAG_COUNT = 10`, `EXPECTED_SIZE = 300648`.

### stadiums.js — stadium metadata table

Authoritative table (carousel slot order; source: STADIUM_MAPPING.md, confirmed by
user). Each record: `{slot, id, letter, file, name, issName}`. The dropdown is
ordered by `slot`; default selection is slot 1 (Sydney, id 0x0E — the game's default
carousel position). The "random" slot 16 has no GRDM file and is **excluded** from
the editable dropdown. Training (0x0D) and Hidden (0x10) appear at the end.

| Slot | ID   | Letter | File        | WE2002 Name (venue)                     | ISS Pro Name          |
|------|------|--------|-------------|-----------------------------------------|-----------------------|
| 1    | 0x0E | O      | GRDM_O.BIN  | Olympic Stadium, Sydney (Australia)     | Key Square Stadium    |
| 2    | 0x0F | V      | GRDM_V.BIN  | King Baudouin Stadium, Brussels         | Royal Palace Stadium  |
| 3    | 0x00 | D      | GRDM_D.BIN  | Stade de France, Saint-Denis (Paris)    | Flying Disk Stadium   |
| 4    | 0x01 | F      | GRDM_F.BIN  | Olympic Stadium, Berlin                 | Twin Towers Stadium   |
| 5    | 0x02 | J      | GRDM_J.BIN  | Wembley, London                         | Apex Stadium          |
| 6    | 0x03 | S      | GRDM_S.BIN  | San Siro, Milano                        | White Stadium         |
| 7    | 0x04 | M      | GRDM_M.BIN  | Olympic Stadium, München                | Imperial Stadium      |
| 8    | 0x05 | A      | GRDM_A.BIN  | Amsterdam Arena                         | Arena Stadium         |
| 9    | 0x06 | P      | GRDM_P.BIN  | Parc des Princes, Paris                 | Masters Stadium       |
| 10   | 0x07 | C      | GRDM_C.BIN  | Estadio Nacional, Santiago (Chile)      | Pacific Plaza Stadium |
| 11   | 0x08 | H      | GRDM_H.BIN  | Saitama Stadium (Japan)                 | National Stadium      |
| 12   | 0x09 | T      | GRDM_T.BIN  | Old Trafford, Manchester                | Legends Stadium       |
| 13   | 0x0A | GJ     | GRDM_GJ.BIN | International Stadium, Yokohama          | International Stadium |
| 14   | 0x0B | MJ     | GRDM_MJ.BIN | Nagai Stadium, Osaka                    | Arc Stadium           |
| 15   | 0x0C | RJ     | GRDM_RJ.BIN | Olympic Stadium, Tokyo                  | Oval Stadium          |
| 16   | —    | —      | (random)    | (random pick — no mesh)                 | (random pick)         |
| hid. | 0x0D | I      | GRDM_I.BIN  | Training Stadium (training mode only)   | Club House Stadium    |
| un.  | 0x10 | B      | GRDM_B.BIN  | Hidden Stadium (Konami-locked)          | Hidden Stadium        |

GDC day/night assets (`GDC_xD`/`GDC_xN`) are not needed by the editor — flags come
from SELECT.BIN, mesh from GRDM. Listed in STADIUM_MAPPING.md if needed later.

Dropdown label format: `"<slot>. <WE2002 name>  (0x<id>, <letter>)"`, e.g.
`"1. Olympic Stadium, Sydney  (0x0E, O)"`. ISS Pro name shown as a secondary
tooltip/subtitle.

### flags.js — orchestration

Boot:
1. `fetch('/assets/SELECT.BIN')` → `parser.parse()`.
2. Build dropdown from `stadiums.js`. Default selection 0x0E (Sydney).
3. Set up Three.js scene/camera/renderer/controls (mirror `main.js` setup;
   camera tuned for stadium scale).

Stadium select (id):
1. `fetch('/assets/GRDM_<letter>.BIN')` (or use manually-loaded GRDM in Load-files
   mode) → `BinaryReader` → `TMDParser.v2.parse()` → build mesh.
2. Apply we3d transform: vertices `× 0.001`, then `rotateX(-π)`.
3. `parser.readFlags(id)` → create/replace 10 sphere markers at transformed
   positions. Tag each marker with its flag index.
4. Rebuild the tweakpane flag panel (10 entries, live X/Y/Z, reset button each).

Marker interaction:
- Click on canvas → raycast against markers → select → attach `TransformControls`.
- On gizmo drag / numeric input change:
  - Read marker world position → inverse transform (`rotateX(+π)`, `× 1000`,
    `Math.round`, clamp int16) → PSX XYZ.
  - `parser.writeFlags(id, currentTenFlags)`.
  - Sync the numeric panel.
- Per-flag "reset" restores that flag's original XYZ (captured at stadium load).

Export:
- `new Blob([parser.getBuffer()], {type:'application/octet-stream'})` → download
  as `SELECT.BIN`.

### Source toggle

- **Bundled** (default): SELECT.BIN + GRDM fetched from `/assets/`.
- **Load files**: reveal two file inputs.
  - SELECT.BIN input → `parser.parse(userBuffer)` (reads existing/patched values).
  - GRDM input → parse + render; slot still chosen by the dropdown.
- Switching to Load-files preserves the current buffer until the user supplies a new
  SELECT.BIN.

## Coordinate transform

PSX convention: X = pitch width (signed), Y = height (negative = up),
Z = pitch depth. we3d world space mirrors `main.js`:

- Forward (PSX → world): `p_world = (PSX × 0.001)` then rotate about X by `-π`
  (negates Y and Z). Result: Y-up positive in Three.js, marker sits above pitch.
- Inverse (world → PSX, for export): rotate about X by `+π`, `× 1000`,
  `Math.round`, clamp to int16.

The stadium mesh uses the identical transform, so markers and mesh share one space
and flags render at their true positions.

## Error handling

- SELECT.BIN length ≠ 300648 → warn in UI, do not parse.
- GRDM parse throws → show message, keep previously rendered mesh.
- Export int16 overflow → clamp to [-32768, 32767], warn once.
- Missing `/assets/` file (fetch 404) → message telling the user to use Load-files.

## Testing

Unit (`SelectBINParser`, plain JS test runner / node):
- `readFlags(0x0E)[0]` === `{x:11552, y:-1147, z:16840}` (fixture from FLAG_HEX_GUIDE).
- `writeFlags` then `readFlags` round-trips identical values.
- `getBuffer().length === 300648`.
- After one `writeFlags(0x0E, ...)`, exactly the 60 bytes at
  `0x41770 + 0x0E*228 + 108` differ from the source; all other bytes unchanged.
- int16 clamp: writing `40000` stores `32767`.

Integration (manual, against known-good tool):
- Apply a preset in the editor (e.g. all flags to a tower X/Z), export, byte-diff
  against `psx-we2002/patch_select_bin_side_flags.py` output for the same preset.
  Bytes must match.
- Live: import patched SELECT.BIN into the ISO (CDmage), boot stadium 0x0E,
  confirm flags moved.

## Build order

1. `SelectBINParser.js` + unit tests (TDD).
2. `stadiums.js` map.
3. Copy 17 GRDM + SELECT.BIN into `public/assets/`; add `flags.html` to vite config.
4. `flags.html` skeleton + `flags.js` scene bootstrap (render one stadium, no markers).
5. Markers from `readFlags`, correct transform (verify against mesh visually).
6. TransformControls + raycast selection + numeric panel + write-back.
7. Source toggle (bundled / load-files).
8. Export button.
9. Integration byte-diff test vs python patcher.

## Stretch (post-MVP)

- Presets (mirror to opposite side, behind-goals, centerfield).
- Optional mirror to records 28..37 (experiment toggle).
- Per-stadium preset JSON, shareable.
- **Real (1:1) game coordinates instead of `× 0.001` scale.** Render the scene in
  raw PSX units so marker positions ARE the int16 values stored in SELECT.BIN.
  Benefits: removes the forward (`× 0.001`) / inverse (`× 1000`, round) transform
  pair, eliminates rounding error on export, and lets the numeric panel and the
  stored bytes share one number space (less code, easier to reason about). Cost:
  the camera `near`/`far` planes and `CameraControls` min/max distances must scale
  up to the ~30000-unit world (e.g. `near` ~10, `far` ~200000, dolly range widened),
  and the Y-up flip (`rotateX(-π)`) stays. Applies to the stadium mesh too, so it
  would also simplify the existing vertex editor's coordinate handling if unified
  later. Defer to post-MVP to avoid retuning the camera while core editing is being
  built.
