# Design: Per-Section Scale for MODEL.BIN

**Date:** 2026-04-14
**Scope:** MODEL.BIN only — stadiums and cups are unaffected.

---

## Summary

Add a per-section scale slider to the Tweakpane UI that allows each MODEL.BIN section to be independently scaled. The scale is patch-time only — the Three.js editor view does not change. The scaled coordinates are baked into the downloaded PATCHED.BIN file so the resize is visible in-game.

---

## Requirements

- Scale applies per section (each of the 106 MODEL.BIN sections independently).
- Scale range: `0.1` to `3.0`, default `1.0`.
- Scale is **patch-time only**: editor visualization is unchanged.
- Scale is a **raw coordinate multiply** (Option B — simple, no centroid correction).
- Stadium and cup files (TMD) are completely unaffected.

---

## Data Model

Each entry pushed to `models[]` gains a `scale` property:

```js
models.push({ mesh, points, visible, scale: 1.0 });
```

No changes to `backupModels`, `ModelBINParser`, or `BinaryReader`.

---

## UI — Tweakpane

Inside `renderTMDs`, the per-object folder gains a scale binding **only when `isModelBIN` is true**:

```js
const f = tweakpane.addFolder({ title: `Object ${index + 1}`, expanded: false });
f.addBinding(tmd, 'visible').on('change', (ev) => { ... });

if (isModelBIN) {
  f.addBinding(tmd, 'scale', { min: 0.1, max: 3.0, step: 0.01 })
   .on('change', () => composer.render());
}

f.addButton({ title: 'Focus' })...
f.addButton({ title: 'Reset' })...
```

The slider calls `composer.render()` on change for UI consistency (no geometry update needed).

---

## Download / Patch

In the `buttonDownload` handler, `iScale` changes from a single constant to a per-model value that incorporates `tmd.scale`:

**Before:**
```js
const iScale = 1 / (isModelBIN ? 0.1 : 0.001);
```

**After:**
```js
// iScale is now computed inside the forEach, per tmd
// tmd.scale is always 1.0 for non-MODEL.BIN files, so behaviour is unchanged
const renderScale = isModelBIN ? 0.1 : 0.001;
const iScale = (1 / renderScale) * tmd.scale;
```

`scale: 1.0` is added to every `models.push(...)` call regardless of file type, so `tmd.scale` is always defined. For non-MODEL.BIN files the slider never appears, so `tmd.scale` stays `1.0` and download behaviour is identical to before.

---

## Files Changed

| File | Change |
|------|--------|
| `src/main.js` | Add `scale: 1.0` to `models.push(...)`, add Tweakpane binding, update `iScale` in download handler |

No other files require modification.

---

## Out of Scope

- Centroid-based scaling (scale in place without drift) — deferred to a future iteration.
- Global scale (all sections at once) — deferred to a future iteration.
- Visual scale in the editor — intentionally excluded.
