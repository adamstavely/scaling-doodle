import { computed, ref, watch } from 'vue';
import { mask, maskBytes, maskFromBytes, clearMask, source, state } from './state';

/** One point in the undo history: the settings, plus the mask when there is one. */
interface Snapshot {
  settings: string;
  mask: { bytes: Uint8Array; width: number; height: number } | null;
}

const LIMIT = 60;
/** Changes closer together than this (a slider drag, a brush stroke) become one undo step. */
const SETTLE_MS = 400;

const past = ref<Snapshot[]>([]);
const future = ref<Snapshot[]>([]);
let current: Snapshot | null = null;
let restoring = false;
let timer: ReturnType<typeof setTimeout> | undefined;

const settingsJson = () => JSON.stringify({ aspect: state.aspect, effect: state.effect, motion: state.motion });

function take(previous: Snapshot | null): Snapshot {
  const canvas = mask.value;
  let m: Snapshot['mask'] = null;
  if (canvas) {
    const bytes = maskBytes()!;
    const same =
      previous?.mask && previous.mask.width === canvas.width && previous.mask.bytes.length === bytes.length &&
      previous.mask.bytes.every((v, i) => v === bytes[i]);
    // Unchanged masks share one copy, so history stays small.
    m = same ? previous!.mask : { bytes, width: canvas.width, height: canvas.height };
  }
  return { settings: settingsJson(), mask: m };
}

function record() {
  const next = take(current);
  if (current && next.settings === current.settings && next.mask === current.mask) return;
  if (current) past.value.push(current);
  if (past.value.length > LIMIT) past.value.shift();
  future.value = [];
  current = next;
}

function restore(s: Snapshot) {
  restoring = true;
  const { aspect, effect, motion } = JSON.parse(s.settings);
  Object.assign(state.aspect, aspect);
  Object.assign(state.effect, effect);
  // keyframes may be absent: assign it explicitly so an undo removes it too.
  Object.assign(state.motion, { keyframes: undefined }, motion);
  if (s.mask) maskFromBytes(s.mask.bytes, s.mask.width, s.mask.height);
  else if (mask.value) clearMask();
  current = s;
  // Let the watchers below see the change before recording resumes.
  setTimeout(() => (restoring = false));
}

export const canUndo = computed(() => past.value.length > 0);
export const canRedo = computed(() => future.value.length > 0);

export function undo() {
  clearTimeout(timer);
  const prev = past.value.pop();
  if (!prev || !current) return;
  future.value.push(current);
  restore(prev);
}

export function redo() {
  clearTimeout(timer);
  const next = future.value.pop();
  if (!next || !current) return;
  past.value.push(current);
  restore(next);
}

/** Starts recording. A new source image starts a fresh history. */
export function startHistory() {
  watch(
    () => [settingsJson(), state.maskVersion],
    () => {
      if (restoring) return;
      clearTimeout(timer);
      timer = setTimeout(record, SETTLE_MS);
    },
  );
  watch(source, () => {
    clearTimeout(timer);
    past.value = [];
    future.value = [];
    current = take(null);
  });
  current = take(null);
}
