# MODEL.BIN Format — Reverse Engineering Notes

> These notes document what was learned by analyzing `MODEL.BIN` from
> **Winning Eleven** (PSX) through hex inspection, cross-referencing with
> the official PSX TMD specification (`Filefrmt_tmd.pdf`), and mathematical
> derivation. No emulator was required.

---

## Context

`MODEL.BIN` is a binary file from the Winning Eleven ROM that contains all
the 3D geometry for player models. It does **not** use the standard TMD
format (which `CGAF.BIN` and `GRDM_A.BIN` do). Instead, it uses a custom,
simplified binary layout designed to be loaded directly into PSX RAM and
referenced through a pointer table.

---

## File Layout

```
[ 0x000 – 0x717 ]  Pointer Table   (1816 bytes)
[ 0x718 – EOF   ]  Geometry Data   (106 sections, contiguous)
```

The pointer table and geometry sections are both part of the same file.
Five 8-byte null separators (all zeroes) appear at offsets `0xa5b0`,
`0xa8d8`, `0xe818`, `0xf018`, and `0xf638` inside the geometry area —
they divide sections into groups but carry no structural meaning for
rendering.

---

## The PSX Base Address (BASE)

### What is BASE?

When the PSX loads `MODEL.BIN` from disc into RAM, byte `0` of the file
lands at a specific RAM address. On PSX, all RAM addresses begin with
`0x80`. That starting address is called **BASE**.

The pointer table stores RAM addresses — not file offsets. To convert any
pointer back to a position inside the file:

```
file_offset = psx_address - BASE
```

### How BASE was derived (no emulator needed)

The pointer table contains ~124 RAM addresses. Geometry sections were also
parsed independently, yielding their file offsets. Then a brute-force
cross-reference was run: for every `(table address, section offset)` pair,
a candidate BASE was computed as `address - section_offset`. The value
`0x8016E800` produced **55 matches out of 55 sections** — every section
mapped to an address that existed in the table. That is mathematically
conclusive.

```
BASE = 0x8016E800

Verification:
  Section 0  →  file offset 0x0718  →  PSX addr 0x8016EF18  ✓ (found at table offset 0x04C)
  Section 1  →  file offset 0x12B8  →  PSX addr 0x8016FAB8  ✓ (found at table offset 0x05C)
```

---

## Geometry Sections

### What is a section?

A **section** is one self-contained 3D mesh — one body part (head, torso,
arm, leg, etc.). The file contains **106 sections** stored back-to-back
starting at offset `0x718`.

### Section binary format

```
Offset  Size    Field
------  ------  -----------------------------------------------
0       4       numVertex    (uint32, little-endian)
4       4       numPrimitive (uint32, little-endian)
8       24 × numPrimitive   Primitive block (see below)
8 + numPrimitive×24         Vertex block (see below)
```

### Primitive block (24 bytes each)

Each primitive is one quadrilateral face (4 vertices). It maps to a
**4-vertex Gradation No-Texture No-Light** packet from the TMD spec
(`mode = 0x39`, `flag = 0x01`) — but with the 4-byte `olen/ilen/flag/mode`
header stripped out. All primitives in MODEL.BIN are the same type, so the
header is implicit.

```
Offset  Size  Field
------  ----  ----------------------------------------
0       4     Color vertex 0  (B, G, R, pad)
4       4     Color vertex 1  (B, G, R, pad)
8       4     Color vertex 2  (B, G, R, pad)
12      4     Color vertex 3  (B, G, R, pad)
16      2     Vertex index 1  (uint16)
18      2     Vertex index 0  (uint16)
20      2     Vertex index 3  (uint16)
22      2     Vertex index 2  (uint16)
```

> Vertex index order follows TMD convention: `v1, v0, v3, v2`.
> When building triangles for rendering, split the quad as:
> `(v0, v1, v2)` and `(v1, v3, v2)`.

### Vertex block (8 bytes each)

```
Offset  Size  Field
------  ----  ----------------------
0       2     x  (int16, signed)
2       2     y  (int16, signed)
4       2     z  (int16, signed)
6       2     pad (always 0x0000)
```

Coordinates are PSX fixed integers. To render at a visible scale in
Three.js, multiply by `0.001` and rotate `−π` on the X axis.

### Known sections (first few)

| Index | File offset | numVertex | numPrimitive | Notes                   |
|-------|-------------|-----------|--------------|-------------------------|
| 0     | `0x0718`    | 107       | 88           | Ball / head variant A   |
| 1     | `0x12B8`    | 50        | 48           | Ball / head variant B   |
| 2     | `0x18D0`    | 33        | 22           | Body type A             |
| 3     | `0x1BF0`    | 8         | 5            | Body part (small)       |
| 11    | (varies)    | —         | —            | Shared part (all builds)|
| 12    | (varies)    | —         | —            | Shared part (all builds)|

Sections **11** and **12** appear in 11 out of 14 player definitions —
they are globally shared parts, likely boots or shorts.

---

## Pointer Table Structure

The pointer table (bytes `0x000`–`0x717`) is organized as follows:

```
[ 0x000 – 0x04F ]  18 RAM addresses → pointers into the table itself
[ 0x050 – 0x05F ]  Standalone entries: sections 0 and 1 (balls)
[ 0x060 – 0x167 ]  Long array of section RAM addresses (body part variants)
[ 0x168 – 0x717 ]  14 player model definitions
```

### Player model definition block

Each player definition starts with `0x00000080` and ends with
`0x000000FF` followed by `0x00000000`:

```
[0x80]                 marker
[RAM address]          points to a body-part variant list in 0x060–0x167
[0x02][sect addr] × 11 eleven body-part slots: count(2) + section pointer
[0xFF][0x00]           terminator
```

### 14 player model definitions

Each player is built from exactly **11 section slots**. `?` means the slot
is null (no geometry for that slot on this player variant).

```
Player  0: [65, 66, 67, 68, 69, 70, 72, 11, 71, 73, 12]
Player  1: [65,103,104,103,105, 70, 72, 11, 71, 73, 12]
Player  2: [13, 14, 16, 15, 17, 18, 20, 11, 19, 21, 12]
Player  3: [13, 14, 16, 15, 17, 18, 22,  ?, 19, 23,  ?]
Player  4: [ 2,  3,  5,  4,  6,  7,  9, 11,  8, 10, 12]
Player  5: [56, 57, 58, 59, 60, 61, 63,  ?, 62, 64,  ?]
Player  6: [13, 14, 16, 92, 17, 18, 20, 11, 19, 21, 12]
Player  7: [13, 14, 16, 92, 17, 18, 22,  ?, 19, 23,  ?]
Player  8: [ 2,  3,  5, 90,  6,  7,  9, 11,  8, 10, 12]
Player  9: [56, 57, 58, 91, 60, 61, 63,  ?, 62, 64,  ?]
Player 10: [ 2, 95, 96, 97, 98,  7,  9, 11,  8, 10, 12]
Player 11: [56, 99,101,100,102, 61, 63,  ?, 62, 64,  ?]
Player 12: [ 2, 95, 96, 93, 98,  7,  9, 11,  8, 10, 12]
Player 13: [56, 99,101, 94,102, 61, 63,  ?, 62, 64,  ?]
```

### The 11 body part slots

The exact slot-to-body-part mapping is not yet confirmed (would require
running the game and watching draw order), but the pattern from the data
suggests:

| Slot | Likely part            | Evidence                                      |
|------|------------------------|-----------------------------------------------|
| 0    | Head shape             | Different across player groups                |
| 1    | Hair mesh              | Swapped between similar players               |
| 2    | Face                   | Swapped between similar players               |
| 3    | Torso / jersey         | Swapped to change skin/kit                    |
| 4    | Left arm               | —                                             |
| 5    | Right arm              | —                                             |
| 6    | Left leg               | —                                             |
| 7    | Shared (section 11)    | Present in 11/14 players                      |
| 8    | Right leg              | —                                             |
| 9    | Foot / boot            | —                                             |
| 10   | Shared (section 12)    | Present in 11/14 players                      |

### Variant system

Players reuse most sections and only swap specific slots. For example,
players 4 and 8 are identical except slot 3 (section `4` → `90`), which
is likely a different jersey or skin tone. This is how the game represents
a full squad efficiently — define the base geometry once, vary only what
changes.

---

## Connection to the TMD Spec

The `Filefrmt_tmd.pdf` in this repository is the official Sony PSX
documentation for the TMD format. It does not describe MODEL.BIN directly,
but it defines the primitive packet types. MODEL.BIN uses the **4-vertex
Gradation No-Texture No-Light** packet (`mode 0x39`) — stripped of its
4-byte header — as its universal primitive type. Every single face in every
section is the same packet type, which is why MODEL.BIN can use a fixed
24-byte stride instead of the variable-length packets that standard TMD uses.

---

## References

- `Filefrmt_tmd.pdf` — Official Sony PSX file format reference (TMD section)
- `src/lib/TMDParser.v2.js` — Parser for standard TMD files (CGAF.BIN, GRDM_A.BIN)
- `src/model.bin.js` — Original PoC with hardcoded offsets (superseded by this analysis)
- https://github.com/rickomax/psxprev — PSXPrev, reference C# TMD parser
