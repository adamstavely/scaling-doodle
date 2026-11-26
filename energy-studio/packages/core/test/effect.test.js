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
