import { DEFAULT_MOTION, normalizeEffect, type EffectParams, type MotionParams } from '@energy-studio/core';
import { ref } from 'vue';

export interface Look {
  id: string;
  name: string;
  effect: Partial<EffectParams>;
  motion?: Partial<MotionParams>;
}

/** Looks that ship with the studio: starting points that show off what the settings can do. */
export const BUILT_IN_LOOKS: Look[] = [
  {
    id: 'light-speed',
    name: 'Light speed',
    effect: { mode: 'straight', area: 'left', axis: 0.45, blending: 0.12, glow: 0.45, fade: 0.15 },
    motion: { type: 'flow', amount: 0.4 },
  },
  {
    id: 'neon-drift',
    name: 'Neon drift',
    effect: { mode: 'angle', area: 'right', axis: 0.55, angle: 24, tintAmount: 0.65, tintStart: '#ff3fd2', tintEnd: '#2ee6ff', glow: 0.3 },
    motion: { type: 'sweep', amount: 0.3 },
  },
  {
    id: 'shockwave',
    name: 'Shockwave',
    effect: { mode: 'burst', axis: 0.14, blending: 0.08, glow: 0.4, fade: 0.35 },
    motion: { type: 'pulse', amount: 0.5 },
  },
  {
    id: 'mirror-world',
    name: 'Mirror world',
    effect: { mode: 'mirror', area: 'right', axis: 0.5, blending: 0.05 },
    motion: { type: 'sweep', amount: 0.2 },
  },
  {
    id: 'heat-haze',
    name: 'Heat haze',
    effect: { mode: 'wave', area: 'bottom', axis: 0.62, wave: 0.55, tintAmount: 0.45, tintStart: '#ffb020', tintEnd: '#ff3b2f', length: 0.8, fade: 0.4 },
    motion: { type: 'flow', amount: 0.5 },
  },
  {
    id: 'monochrome-rush',
    name: 'Monochrome rush',
    effect: { mode: 'straight', area: 'full', axis: 0.5, saturation: 0, length: 0.7, fade: 0.55, blending: 0.05 },
    motion: { type: 'flow', amount: 0.3 },
  },
  {
    id: 'twin-trails',
    name: 'Twin trails',
    effect: { mode: 'straight', area: 'left', axis: 0.3, extraAxes: [{ area: 'right', axis: 0.7 }], blending: 0.1, glow: 0.2 },
    motion: { type: 'sweep', amount: 0.15 },
  },
  {
    id: 'solar-flare',
    name: 'Solar flare',
    effect: { mode: 'flare', area: 'right', axis: 0.4, flare: 0.8, tintAmount: 0.5, tintStart: '#ffd54a', tintEnd: '#ff6a00', glow: 0.6 },
    motion: { type: 'pulse', amount: 0.4 },
  },
];

const STORAGE_KEY = 'energy-studio:looks';

function readSaved(): Look[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((l) => l && typeof l.name === 'string' && l.effect) : [];
  } catch {
    return [];
  }
}

/** Looks the person saved, kept in this browser. */
export const savedLooks = ref<Look[]>(readSaved());

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLooks.value));
}

export function saveLook(name: string, effect: EffectParams, motion: MotionParams): Look {
  const look: Look = {
    id: `saved-${Date.now().toString(36)}`,
    name: name.trim() || `Look ${savedLooks.value.length + 1}`,
    effect: JSON.parse(JSON.stringify(effect)),
    motion: JSON.parse(JSON.stringify(motion)),
  };
  savedLooks.value = [look, ...savedLooks.value];
  persist();
  return look;
}

export function deleteLook(id: string) {
  savedLooks.value = savedLooks.value.filter((l) => l.id !== id);
  persist();
}

const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
const between = (lo: number, hi: number, digits = 2) => Number((lo + Math.random() * (hi - lo)).toFixed(digits));
const randomHex = () =>
  `#${Array.from({ length: 3 }, () => Math.floor(between(40, 255, 0)).toString(16).padStart(2, '0')).join('')}`;

/** A random look within ranges that tend to look good. Keeps the axis near where it is, so the framing holds. */
export function surpriseLook(current: EffectParams): Look {
  const mode = pick(['straight', 'angle', 'flare', 'wave', 'mirror', 'burst'] as const);
  const tinted = Math.random() < 0.6;
  return {
    id: 'surprise',
    name: 'Surprise',
    effect: normalizeEffect({
      mode,
      area: pick(['left', 'right', 'top', 'bottom', 'full'] as const),
      axis: mode === 'burst' ? between(0.08, 0.25) : Math.min(0.9, Math.max(0.1, current.axis + between(-0.15, 0.15))),
      blending: between(0, 0.3),
      angle: between(-40, 40, 0),
      flare: between(0.2, 1),
      wave: between(0.2, 0.8),
      length: Math.random() < 0.5 ? 1 : between(0.4, 0.95),
      fade: between(0, 0.6),
      centerX: current.centerX,
      centerY: current.centerY,
      hue: Math.random() < 0.3 ? between(-90, 90, 0) : 0,
      saturation: between(0.7, 1.5),
      tintAmount: tinted ? between(0.3, 0.75) : 0,
      tintStart: randomHex(),
      tintEnd: randomHex(),
      glow: between(0, 0.6),
      extraAxes: [],
    }),
    motion: { ...DEFAULT_MOTION, type: pick(['sweep', 'flow', 'pulse'] as const), amount: between(0.2, 0.6) },
  };
}
