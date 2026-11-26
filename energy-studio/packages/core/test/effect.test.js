const test = require('node:test');
const assert = require('node:assert/strict');
const { applyEnergy, DEFAULT_EFFECT, coverCrop, outputSize, paramsAtTime, DEFAULT_MOTION } = require('../dist');

/** Image where every pixel encodes its own x in R and y in G. */
function gradient(w, h) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      px[i] = x; px[i + 1] = y; px[i + 2] = 0; px[i + 3] = 255;
    }
  return px;
}
const at = (px, w, x, y) => Array.from(px.slice((y * w + x) * 4, (y * w + x) * 4 + 4));

test('straight/left copies the axis column across the left side only', () => {
  const w = 11, h = 5, src = gradient(w, h);
  const out = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, area: 'left', axis: 0.5, blending: 0 });
  for (let y = 0; y < h; y++) {
    assert.deepEqual(at(out, w, 0, y), [5, y, 0, 255]);
    assert.deepEqual(at(out, w, 4, y), [5, y, 0, 255]);
    assert.deepEqual(at(out, w, 8, y), [8, y, 0, 255]); // untouched
  }
});

test('right and bottom affect the opposite side; top streaks vertically', () => {
  const w = 11, h = 11, src = gradient(w, h);
  const right = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, area: 'right', axis: 0.5, blending: 0 });
  assert.deepEqual(at(right, w, 10, 3), [5, 3, 0, 255]);
  assert.deepEqual(at(right, w, 1, 3), [1, 3, 0, 255]);
  const top = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, area: 'top', axis: 0.3, blending: 0 });
  assert.deepEqual(at(top, w, 7, 0), [7, 3, 0, 255]);
  assert.deepEqual(at(top, w, 7, 9), [7, 9, 0, 255]);
  const bottom = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, area: 'bottom', axis: 0.3, blending: 0 });
  assert.deepEqual(at(bottom, w, 7, 10), [7, 3, 0, 255]);
});

test('full streaks both sides', () => {
  const w = 11, h = 3, src = gradient(w, h);
  const out = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, area: 'full', axis: 0.2, blending: 0 });
  assert.equal(at(out, w, 0, 1)[0], 2);
  assert.equal(at(out, w, 10, 1)[0], 2);
});

test('blending fades from the original near the axis', () => {
  const w = 101, h = 2, src = gradient(w, h);
  const out = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, area: 'right', axis: 0, blending: 0.5 });
  assert.equal(at(out, w, 100, 0)[0], 0); // fully streaked far away
  const mid = at(out, w, 25, 0)[0];
  assert.ok(mid > 0 && mid < 25, `expected partial blend, got ${mid}`);
});

test('angle mode tilts the sampled row with distance', () => {
  const w = 21, h = 21, src = gradient(w, h);
  const out = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, mode: 'angle', angle: 45, area: 'left', axis: 0.5, blending: 0 });
  // 10px left of the axis with tan(45)=1 samples 10 rows above.
  assert.deepEqual(at(out, w, 0, 15), [10, 5, 0, 255]);
});

test('flare mode converges toward the centre far from the axis', () => {
  const w = 21, h = 21, src = gradient(w, h);
  const out = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, mode: 'flare', flare: 1, area: 'left', axis: 0.5, blending: 0 });
  const g = at(out, w, 0, 0)[1];
  assert.ok(g > 0 && g < 10, `expected row sampled toward centre, got ${g}`);
});

test('accepts plain Uint8Array (sharp buffers)', () => {
  const src = new Uint8Array(gradient(4, 4));
  const out = applyEnergy(src, 4, 4, DEFAULT_EFFECT);
  assert.equal(out.length, 64);
});

test('aspect helpers', () => {
  assert.deepEqual(coverCrop({ width: 400, height: 400 }, 16 / 9), { sx: 0, sy: 88, sw: 400, sh: 225 });
  assert.deepEqual(outputSize({ preset: '1:1', customWidth: 0, customHeight: 0 }, { width: 4000, height: 3000 }, 1000), { width: 1000, height: 1000 });
  assert.deepEqual(outputSize({ preset: 'custom', customWidth: 1200, customHeight: 628 }, { width: 4000, height: 3000 }, 4096), { width: 1200, height: 628 });
});

test('motion sweep stays within bounds and returns to start each cycle', () => {
  const base = { ...DEFAULT_EFFECT, axis: 0.5 };
  const motion = { ...DEFAULT_MOTION, type: 'sweep', amount: 1, duration: 2 };
  for (let t = 0; t < 4; t += 0.1) {
    const a = paramsAtTime(base, motion, t).axis;
    assert.ok(a >= 0 && a <= 1);
  }
  assert.equal(paramsAtTime(base, motion, 0).axis, paramsAtTime(base, motion, 2).axis);
});

// ---- Features added with the creative controls ----
const { normalizeEffect, MAX_EXTRA_AXES, keyframeOf, cropFor } = require('../dist');
const solid = (w, h, rgb) => {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) px.set([...rgb, 255], i * 4);
  return px;
};

test('length stops the streaks partway; the photo shows past them', () => {
  const w = 101, h = 2, src = gradient(w, h);
  const out = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, area: 'right', axis: 0, blending: 0, length: 0.5 });
  assert.equal(at(out, w, 40, 0)[0], 0); // streaked (axis column is x=0)
  assert.equal(at(out, w, 80, 0)[0], 80); // beyond the length: original
});

test('fade thins the streaks towards their end', () => {
  const w = 101, h = 2, src = gradient(w, h);
  const out = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, area: 'right', axis: 0, blending: 0, fade: 1 });
  assert.equal(at(out, w, 2, 0)[0] < 3, true); // nearly pure streak near the axis
  assert.ok(at(out, w, 95, 0)[0] > 85, 'far end is almost the photo again');
});

test('a protect mask keeps the photo where it is set', () => {
  const w = 11, h = 2, src = gradient(w, h);
  const mask = new Uint8Array(w * h);
  mask[2] = 255;
  const out = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, area: 'left', axis: 0.5, blending: 0 }, undefined, { mask });
  assert.equal(at(out, w, 2, 0)[0], 2); // protected
  assert.equal(at(out, w, 1, 0)[0], 5); // streaked
});

test('layer output is just the streaks, transparent elsewhere', () => {
  const w = 11, h = 2, src = gradient(w, h);
  const out = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, area: 'left', axis: 0.5, blending: 0 }, undefined, { layer: true });
  assert.deepEqual(at(out, w, 1, 0), [5, 0, 0, 255]);
  assert.equal(at(out, w, 9, 0)[3], 0);
});

test('extra axes streak too, and are capped', () => {
  const w = 21, h = 2, src = gradient(w, h);
  const out = applyEnergy(src, w, h, {
    ...DEFAULT_EFFECT, area: 'left', axis: 0.25, blending: 0, extraAxes: [{ area: 'right', axis: 0.75 }],
  });
  assert.equal(at(out, w, 0, 0)[0], 5);
  assert.equal(at(out, w, 20, 0)[0], 15);
  assert.equal(at(out, w, 10, 0)[0], 10); // between the axes: untouched
  const many = Array.from({ length: 6 }, () => ({ area: 'left', axis: 0.5 }));
  assert.equal(normalizeEffect({ extraAxes: many }).extraAxes.length, MAX_EXTRA_AXES);
});

test('burst leaves the inside of the ring alone and streaks outside it', () => {
  const w = 41, h = 41, src = gradient(w, h);
  const out = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, mode: 'burst', axis: 0.2, blending: 0 });
  assert.deepEqual(at(out, w, 20, 20), [20, 20, 0, 255]);
  // Straight right of the centre, far out: sampled from the ring at radius ≈ 0.2 × half diagonal ≈ 5.8 px.
  const r = at(out, w, 40, 20)[0];
  assert.ok(r >= 25 && r <= 27, `expected the ring colour, got ${r}`);
});

test('mirror reflects the other side of the axis', () => {
  const w = 21, h = 2, src = gradient(w, h);
  const out = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, mode: 'mirror', area: 'left', axis: 0.5, blending: 0 });
  assert.ok(at(out, w, 9, 0)[0] >= 10, 'just left of the axis shows what is just right of it');
});

test('wave and colour settings change the streaks', () => {
  const w = 31, h = 31;
  const src = gradient(w, h);
  const plain = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, area: 'left', axis: 0.9, blending: 0 });
  const wave = applyEnergy(src, w, h, { ...DEFAULT_EFFECT, mode: 'wave', wave: 1, area: 'left', axis: 0.9, blending: 0 });
  assert.notDeepEqual(Array.from(plain), Array.from(wave));
  const grey = solid(4, 2, [128, 128, 128]);
  const tinted = applyEnergy(grey, 4, 2, { ...DEFAULT_EFFECT, area: 'left', axis: 1, blending: 0, tintAmount: 1, tintStart: '#ff0000', tintEnd: '#ff0000' });
  assert.ok(at(tinted, 4, 0, 0)[0] > 200 && at(tinted, 4, 0, 0)[1] < 10, 'grey takes the tint');
  const desat = applyEnergy(solid(4, 2, [255, 0, 0]), 4, 2, { ...DEFAULT_EFFECT, area: 'left', axis: 1, blending: 0, saturation: 0 });
  const [r, g] = at(desat, 4, 0, 0);
  assert.ok(Math.abs(r - g) < 2, 'saturation 0 is grey');
  const glow = applyEnergy(grey, 4, 2, { ...DEFAULT_EFFECT, area: 'left', axis: 1, blending: 0, glow: 1 });
  assert.ok(at(glow, 4, 3, 0)[0] > 128, 'glow brightens near the axis');
});

test('older settings without the new fields render as before', () => {
  const w = 11, h = 5, src = gradient(w, h);
  const { mode, area, axis, blending, angle, flare, sampleOffset } = DEFAULT_EFFECT;
  const old = applyEnergy(src, w, h, { mode, area, axis, blending, angle, flare, sampleOffset });
  assert.deepEqual(Array.from(old), Array.from(applyEnergy(src, w, h, DEFAULT_EFFECT)));
});

test('keyframes move from the start look to the end look', () => {
  const motion = { ...DEFAULT_MOTION, type: 'keyframes', loop: 'loop', easing: false, duration: 2,
    keyframes: { from: { axis: 0.2, hue: 0 }, to: { axis: 0.8, hue: 90 } } };
  const mid = paramsAtTime(DEFAULT_EFFECT, motion, 1);
  assert.ok(Math.abs(mid.axis - 0.5) < 1e-9);
  assert.ok(Math.abs(mid.hue - 45) < 1e-9);
  assert.equal(paramsAtTime(DEFAULT_EFFECT, motion, 0).axis, 0.2);
  assert.equal(keyframeOf(DEFAULT_EFFECT).axis, DEFAULT_EFFECT.axis);
});

test('crops centre on the focus point as far as the image allows', () => {
  const src = { width: 2000, height: 1000 };
  assert.equal(coverCrop(src, 1).sx, 500);
  assert.equal(coverCrop(src, 1, 0.9, 0.5).sx, 1000); // clamped to the right edge
  assert.equal(coverCrop(src, 1, 0.3, 0.5).sx, 100);
  assert.equal(cropFor({ preset: '1:1', customWidth: 1, customHeight: 1, focusX: 0 }, src).sx, 0);
});
