<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue';
import GuidanceDialog from './components/GuidanceDialog.vue';
import ImageSettings from './components/ImageSettings.vue';
import MotionSettings from './components/MotionSettings.vue';
import PreviewStage from './components/PreviewStage.vue';
import { renderImage } from './lib/api';
import { downloadBlob, recordVideo, renderImageLocally } from './lib/render';
import { source, state, type Tab } from './lib/state';

const backdrop = ref<HTMLCanvasElement | null>(null);
const stage = ref<InstanceType<typeof PreviewStage>>();

function selectTab(tab: Tab) {
  state.tab = tab;
  // Motion previews start playing when you open the tab and stop when you leave.
  state.playing = tab === 'motion';
}

const downloadLabel = computed(() => {
  if (state.busy) return state.busy;
  return state.tab === 'motion' ? 'Download Video' : 'Download Image';
});

const syncLabel = computed(
  () =>
    ({
      none: '',
      uploading: 'Uploading source…',
      synced: 'Full-resolution render ready',
      offline: 'Server unavailable — rendering in browser',
    })[state.sync],
);

async function download() {
  const src = source.value;
  if (!src || state.busy) return;
  state.error = null;
  try {
    if (state.tab === 'image') await downloadImage();
    else await downloadVideo();
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e);
  } finally {
    state.busy = null;
  }
}

async function downloadImage() {
  state.busy = 'Rendering…';
  const effect = toRaw(state.effect);
  const aspect = toRaw(state.aspect);
  let blob: Blob | null = null;
  if (state.imageId) {
    try {
      blob = await renderImage({ imageId: state.imageId, effect, aspect, format: 'png' });
    } catch (e) {
      console.warn('Server render failed, rendering in browser', e);
    }
  }
  blob ??= await renderImageLocally(source.value!, aspect, effect);
  downloadBlob(blob, `energy-studio-${Date.now()}.png`);
}

async function downloadVideo() {
  const wasPlaying = state.playing;
  state.playing = false; // free the CPU for the recorder
  state.busy = 'Recording 0%';
  try {
    const { blob, ext } = await recordVideo({
      src: source.value!,
      aspect: toRaw(state.aspect),
      effect: toRaw(state.effect),
      motion: toRaw(state.motion),
      seconds: state.motion.duration * state.videoCycles,
      longEdge: state.videoLongEdge,
      onProgress: (f) => (state.busy = `Recording ${Math.round(f * 100)}%`),
    });
    downloadBlob(blob, `energy-studio-${Date.now()}.${ext}`);
  } finally {
    state.playing = wasPlaying;
  }
}

// Leaving the page mid-recording would lose the video.
watch(
  () => state.busy,
  (busy) => (window.onbeforeunload = busy ? () => true : null),
);
</script>

<template>
  <canvas ref="backdrop" class="backdrop" aria-hidden="true" />
  <div class="shell">
    <main class="card">
      <header class="brand">
        <h1 class="wordmark">ENERGY STUDIO</h1>
      </header>

      <div class="body">
        <aside class="panel">
          <nav class="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              :aria-selected="state.tab === 'image'"
              :class="{ active: state.tab === 'image' }"
              @click="selectTab('image')"
            >
              Image Settings
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="state.tab === 'motion'"
              :class="{ active: state.tab === 'motion' }"
              @click="selectTab('motion')"
            >
              Motion Settings
            </button>
          </nav>
          <div class="panel-body" role="tabpanel">
            <ImageSettings v-if="state.tab === 'image'" />
            <MotionSettings v-else />
          </div>
        </aside>

        <section class="workspace">
          <div class="preview">
            <PreviewStage ref="stage" :backdrop="backdrop" />
          </div>
          <footer class="bar">
            <button type="button" class="download" :disabled="!source || !!state.busy" @click="download">
              {{ downloadLabel }}
            </button>
            <span class="sync" :class="state.sync">{{ syncLabel }}</span>
            <nav class="links">
              <button v-if="source" type="button" @click="stage?.openPicker()">Upload different source image</button>
              <button type="button" @click="state.showGuidance = true">Guidance</button>
            </nav>
          </footer>
        </section>
      </div>
    </main>
  </div>
  <GuidanceDialog />
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: -40px;
  width: calc(100% + 80px);
  height: calc(100% + 80px);
  object-fit: cover;
  filter: blur(18px) saturate(1.25) brightness(0.9);
  z-index: -1;
}
.shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  grid-template-columns: minmax(0, 1fr);
  padding: clamp(12px, 4vw, 56px);
}
.card {
  width: min(1480px, 100%);
  height: min(900px, calc(100vh - 2 * clamp(16px, 4vw, 56px)));
  min-height: 640px;
  display: grid;
  grid-template-rows: auto 1fr;
  background: var(--card);
  border-radius: 24px;
  box-shadow: 0 50px 120px -40px rgba(5, 3, 40, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  overflow: hidden;
}
.brand {
  padding: 24px 32px 8px;
}
.wordmark {
  margin: 0;
  font-family: var(--display);
  font-weight: 700;
  font-size: clamp(30px, 3.4vw, 52px);
  letter-spacing: -0.01em;
  line-height: 1;
  color: var(--brand);
}
.body {
  display: grid;
  grid-template-columns: minmax(330px, 400px) minmax(0, 1fr);
  gap: 24px;
  padding: 16px 24px 24px;
  min-height: 0;
}
.panel {
  background: var(--panel);
  border-radius: 20px;
  padding: 22px 22px 28px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.tabs {
  display: flex;
  gap: 22px;
  margin-bottom: 22px;
}
.tabs button {
  border: none;
  background: none;
  padding: 0 0 4px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ink-faint);
  border-bottom: 2px solid transparent;
  cursor: pointer;
}
.tabs button.active {
  color: var(--ink);
  border-bottom-color: var(--ink);
}
.panel-body {
  overflow-y: auto;
  margin: 0 -8px;
  padding: 4px 8px 8px;
  scrollbar-width: thin;
}
.workspace {
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 16px;
  min-height: 0;
}
.preview {
  min-height: 0;
  padding: 24px;
}
.bar {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--panel);
  border-radius: 999px;
  padding: 8px 20px 8px 8px;
  flex-wrap: wrap;
}
.download {
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 14px 52px;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  cursor: pointer;
  min-width: 260px;
  box-shadow: 0 12px 24px -14px var(--brand);
  transition: transform 0.1s, opacity 0.2s;
}
.download:hover:not(:disabled) {
  transform: translateY(-1px);
}
.download:disabled {
  opacity: 0.55;
  cursor: default;
}
.sync {
  font-size: 12px;
  color: var(--ink-soft);
}
.sync.offline {
  color: #8a5a00;
}
.links {
  margin-left: auto;
  display: flex;
  gap: 22px;
}
.links button {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 12px;
  color: var(--brand);
  cursor: pointer;
}
.links button:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .card {
    height: auto;
    min-height: 0;
  }
  .brand {
    padding: 20px 20px 4px;
  }
  .body {
    grid-template-columns: minmax(0, 1fr);
    padding: 8px 12px 12px;
  }
  .panel {
    padding: 18px 16px 22px;
  }
  .workspace {
    order: -1;
  }
  .preview {
    height: 56vw;
    min-height: 260px;
    padding: 0;
  }
  .bar {
    border-radius: 20px;
    padding: 10px;
  }
  .download {
    width: 100%;
    min-width: 0;
  }
  .links {
    margin-left: 0;
    flex-wrap: wrap;
    gap: 8px 18px;
  }
}
</style>
