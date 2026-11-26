<script setup lang="ts">
import { CircleCheck, CircleHelp, Download, FileDown, ImageUp, LoaderCircle, Redo2, RotateCcw, TriangleAlert, Undo2 } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ColourSettings from './components/ColourSettings.vue';
import ExportDialog from './components/ExportDialog.vue';
import GuidanceDialog from './components/GuidanceDialog.vue';
import ImageSettings from './components/ImageSettings.vue';
import MotionSettings from './components/MotionSettings.vue';
import PresetsPanel from './components/PresetsPanel.vue';
import PreviewStage from './components/PreviewStage.vue';
import { exportStill, exportVideo, runExport } from './lib/export';
import { canRedo, canUndo, redo, startHistory, undo } from './lib/history';
import { loadImage, loadImageFromUrl, resetLook, source, state, type Tab } from './lib/state';

const backdrop = ref<HTMLCanvasElement | null>(null);
const stage = ref<InstanceType<typeof PreviewStage>>();

const tabs: { value: Tab; label: string }[] = [
  { value: 'image', label: 'Image' },
  { value: 'colour', label: 'Colour' },
  { value: 'motion', label: 'Motion' },
  { value: 'presets', label: 'Presets' },
];

function selectTab(tab: Tab) {
  state.tab = tab;
  // Motion previews start playing when you open the tab and stop when you leave.
  state.playing = tab === 'motion';
}

const downloadLabel = computed(() => {
  if (state.busy) return state.busy;
  return state.tab === 'motion' ? 'Download video' : 'Download image';
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

/** The quick download: PNG on the image tabs, a video on the Motion tab. Everything else is under Export. */
function download() {
  runExport(() => (state.tab === 'motion' ? exportVideo() : exportStill('png')));
}

// Leaving the page mid-export would lose it.
watch(
  () => state.busy,
  (busy) => (window.onbeforeunload = busy ? () => true : null),
);

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

function onKey(e: KeyboardEvent) {
  if (typing(e.target)) return;
  const mod = e.metaKey || e.ctrlKey;
  const key = e.key.toLowerCase();
  if (mod && key === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  } else if (mod && key === 'y') {
    e.preventDefault();
    redo();
  } else if (!mod && e.key === '\\' && source.value) {
    state.compare = !state.compare;
  }
}

/** Paste an image, or a link to one, anywhere on the page. */
function onPaste(e: ClipboardEvent) {
  if (typing(e.target)) return;
  const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
  if (file) {
    e.preventDefault();
    loadImage(file, file.name || 'pasted-image.png');
    return;
  }
  const text = e.clipboardData?.getData('text/plain')?.trim();
  if (text && /^https?:\/\/\S+$/i.test(text)) {
    e.preventDefault();
    loadImageFromUrl(text);
  }
}

onMounted(() => {
  startHistory();
  window.addEventListener('keydown', onKey);
  window.addEventListener('paste', onPaste);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('paste', onPaste);
});
</script>

<template>
  <tc-look-provider look="clean">
    <canvas ref="backdrop" class="backdrop" aria-hidden="true" />
    <div class="shell">
      <main class="card">
        <header class="brand">
          <h1 class="wordmark">Energy Studio</h1>
          <div class="history" role="toolbar" aria-label="History">
            <tc-button variant="ghost" size="sm" hide-label label="Undo" title="Undo (⌘Z)" :disabled="!canUndo" @click="undo">
              <Undo2 slot="icon" />
            </tc-button>
            <tc-button variant="ghost" size="sm" hide-label label="Redo" title="Redo (⇧⌘Z)" :disabled="!canRedo" @click="redo">
              <Redo2 slot="icon" />
            </tc-button>
            <tc-button variant="ghost" size="sm" label="Reset look" @click="resetLook">
              <RotateCcw slot="icon" />
            </tc-button>
          </div>
        </header>

        <div class="body">
          <aside class="panel">
            <tc-segmented-control
              kind="tabs"
              variant="underline"
              aria-label="Settings"
              :options="tabs"
              :value="state.tab"
              @tc-value-change="(e: CustomEvent<{ value: Tab }>) => selectTab(e.detail.value)"
            />
            <div class="panel-body" role="tabpanel" :aria-label="tabs.find((t) => t.value === state.tab)?.label">
              <ImageSettings v-if="state.tab === 'image'" />
              <ColourSettings v-else-if="state.tab === 'colour'" />
              <MotionSettings v-else-if="state.tab === 'motion'" />
              <PresetsPanel v-else />
            </div>
          </aside>

          <section class="workspace">
            <div class="preview-area">
              <PreviewStage ref="stage" :backdrop="backdrop" />
            </div>
            <footer class="bar">
              <tc-button
                class="download"
                variant="primary"
                size="lg"
                :label="downloadLabel"
                :disabled="!source || !!state.busy"
                @click="download"
              >
                <Download slot="icon" />
              </tc-button>
              <tc-button
                variant="secondary"
                size="lg"
                label="Export…"
                :disabled="!source || !!state.busy"
                @click="state.showExport = true"
              >
                <FileDown slot="icon" />
              </tc-button>
              <span v-if="syncLabel" class="sync es-note" :class="state.sync">
                <LoaderCircle v-if="state.sync === 'uploading'" class="sync-icon spin" aria-hidden="true" />
                <CircleCheck v-else-if="state.sync === 'synced'" class="sync-icon" aria-hidden="true" />
                <TriangleAlert v-else class="sync-icon" aria-hidden="true" />
                {{ syncLabel }}
              </span>
              <nav class="links" aria-label="More">
                <tc-button v-if="source" variant="ghost" size="sm" label="Upload different source image" @click="stage?.openPicker()">
                  <ImageUp slot="icon" />
                </tc-button>
                <tc-button variant="ghost" size="sm" label="Guidance" @click="state.showGuidance = true">
                  <CircleHelp slot="icon" />
                </tc-button>
              </nav>
            </footer>
          </section>
        </div>
      </main>
    </div>
    <GuidanceDialog />
    <ExportDialog />
  </tc-look-provider>
</template>

<style scoped>
/* A blurred copy of the current image fills the page behind the card. */
.backdrop {
  position: fixed;
  inset: calc(-1 * var(--es-size-backdrop-bleed));
  width: calc(100% + 2 * var(--es-size-backdrop-bleed));
  height: calc(100% + 2 * var(--es-size-backdrop-bleed));
  object-fit: cover;
  opacity: var(--es-effect-backdrop-opacity);
  filter: blur(var(--es-size-backdrop-blur)) saturate(var(--es-effect-backdrop-saturate));
  z-index: -1;
}
.shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  grid-template-columns: minmax(0, 1fr);
  padding: var(--es-space-page);
}
.card {
  width: min(var(--es-size-card-max-width), 100%);
  height: min(var(--es-size-card-max-height), calc(100vh - 2 * var(--es-space-page)));
  min-height: var(--es-size-card-min-height);
  display: grid;
  grid-template-rows: auto 1fr;
  background: var(--es-color-card);
  border-radius: var(--es-radius-card);
  box-shadow: var(--es-shadow-card);
  overflow: hidden;
}
.brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--tc-space-4);
  padding: var(--es-space-card) var(--es-space-card) 0;
}
.history {
  display: flex;
  align-items: center;
  gap: var(--tc-space-1);
}
.wordmark {
  font-size: var(--es-font-wordmark-size);
  font-weight: var(--es-font-wordmark-weight);
  line-height: var(--es-font-wordmark-line-height);
  color: var(--tc-text-strong);
}
.body {
  display: grid;
  grid-template-columns: minmax(var(--es-size-panel-min-width), var(--es-size-panel-max-width)) minmax(0, 1fr);
  gap: var(--es-space-card);
  padding: var(--es-space-card);
  min-height: 0;
}
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--es-space-panel);
  min-height: 0;
  padding: var(--es-space-panel);
  background: var(--es-color-panel);
  border-radius: var(--es-radius-panel);
}
.panel-body {
  overflow-y: auto;
  margin: 0 calc(-1 * var(--tc-space-2));
  padding: var(--tc-space-1) var(--tc-space-2) var(--tc-space-2);
  scrollbar-width: thin;
}
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr); /* lets the preview shrink with the window */
  grid-template-rows: 1fr auto;
  gap: var(--tc-space-4);
  min-height: 0;
}
.preview-area {
  min-height: 0;
  padding: var(--es-space-preview);
}
.bar {
  display: flex;
  align-items: center;
  gap: var(--tc-space-4);
  flex-wrap: wrap;
  padding: var(--tc-space-2) var(--tc-space-4) var(--tc-space-2) var(--tc-space-2);
  background: var(--es-color-panel);
  border-radius: var(--es-radius-panel);
}
.download {
  min-width: var(--es-size-download-min-width);
}
.sync {
  display: inline-flex;
  align-items: center;
  gap: var(--tc-space-1-5);
}
.sync.offline {
  color: var(--tc-status-warning-fg);
}
.sync.synced .sync-icon {
  color: var(--tc-status-success-fg);
}
.sync-icon {
  width: var(--es-size-status-icon);
  height: var(--es-size-status-icon);
}
.spin {
  animation: spin var(--tc-duration-shimmer) linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(1turn);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spin {
    animation: none;
  }
}
.links {
  margin-left: auto;
  display: flex;
  gap: var(--tc-space-1);
}

@media (max-width: 900px) {
  .shell {
    padding: var(--es-space-page-narrow);
  }
  .card {
    height: auto;
    min-height: 0;
  }
  .brand {
    padding: var(--es-space-card-narrow) var(--es-space-card-narrow) 0;
  }
  .body {
    grid-template-columns: minmax(0, 1fr);
    padding: var(--es-space-card-narrow);
  }
  .workspace {
    order: -1;
  }
  .preview-area {
    padding: 0;
  }
  .bar {
    padding: var(--tc-space-2-5);
  }
  .download {
    width: 100%;
  }
  .links {
    margin-left: 0;
    flex-wrap: wrap;
  }
}
</style>
