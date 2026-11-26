<script setup lang="ts">
import { Download } from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';
import {
  EXPORT_FORMATS,
  animationEdge,
  PACK_SIZES,
  exportAnimation,
  exportPack,
  exportStill,
  exportVideo,
  runExport,
  type ExportFormat,
} from '@/lib/export';
import { supportedVideoType } from '@/lib/render';
import { mask, state } from '@/lib/state';
import SettingSlider from './SettingSlider.vue';

// tc-dialog renders its body itself: this element is handed to it as `content` once mounted.
const body = ref<HTMLElement>();
const content = ref<HTMLElement | null>(null);
onMounted(() => (content.value = body.value ?? null));

const format = ref<ExportFormat>('png');
const pack = ref(false);
const fps = ref('15');
const sizes = [
  { value: '720', label: '720 px' },
  { value: '1280', label: '1280 px' },
  { value: '1920', label: '1920 px' },
];
const rates = [
  { value: '10', label: '10 fps' },
  { value: '15', label: '15 fps' },
  { value: '24', label: '24 fps' },
];

const options = computed(() =>
  EXPORT_FORMATS.map((f) => ({
    value: f.value,
    label: f.label,
    disabled: (f.needsServer && !state.imageId) || (f.value === 'video' && !supportedVideoType()),
  })),
);
const chosen = computed(() => EXPORT_FORMATS.find((f) => f.value === format.value)!);
const seconds = computed(() => (state.motion.duration * state.videoCycles).toFixed(1));
const edge = computed(() => animationEdge(Number(fps.value)));
const packNote = computed(() =>
  mask.value ? 'Each crop centres on the protected subject.' : 'Each crop centres on the middle of the image. Protect a subject to centre on it.',
);

async function go() {
  const f = format.value;
  state.showExport = false;
  await runExport(async () => {
    if (f === 'gif' || f === 'webp-animated') return exportAnimation(f, Number(fps.value));
    if (f === 'video') return exportVideo();
    const still = f as 'png' | 'jpeg' | 'webp' | 'layer';
    return pack.value ? exportPack(still) : exportStill(still);
  });
}
</script>

<template>
  <tc-dialog
    label="Export"
    description="Download the image, a social pack, or the motion"
    close-label="Cancel"
    size="sm"
    :open="state.showExport"
    :content="content"
    @tc-open-change.self="(e: CustomEvent<{ open: boolean }>) => (state.showExport = e.detail.open)"
  />
  <div class="es-visually-hidden">
    <div ref="body" class="export">
      <tc-radio-group
        label="Format"
        :options="options"
        :value="format"
        @tc-value-change="(e: CustomEvent<{ value: ExportFormat }>) => (format = e.detail.value)"
      />
      <p v-if="format === 'layer'" class="es-note">
        Just the streaks on a transparent background, to put over the photo yourself in a design tool.
      </p>

      <template v-if="chosen.still">
        <tc-switch
          label="All social sizes"
          :description="`${PACK_SIZES.map((s) => s.preset).join(', ')} in one zip. ${packNote}`"
          :value="pack"
          @tc-value-change="(e: CustomEvent<{ value: boolean }>) => (pack = e.detail.value)"
        />
      </template>

      <template v-else>
        <SettingSlider
          v-model="state.videoCycles"
          label="Cycles"
          :min="1"
          :max="6"
          :description="`${seconds} s of motion, looping`"
        />
        <div class="row">
          <span id="export-size" class="es-note">Long edge</span>
          <tc-segmented-control
            size="sm"
            aria-labelledby="export-size"
            :options="sizes"
            :value="String(state.videoLongEdge)"
            @tc-value-change="(e: CustomEvent<{ value: string }>) => (state.videoLongEdge = Number(e.detail.value))"
          />
        </div>
        <div v-if="format !== 'video'" class="row">
          <span id="export-fps" class="es-note">Frame rate</span>
          <tc-segmented-control
            size="sm"
            aria-labelledby="export-fps"
            :options="rates"
            :value="fps"
            @tc-value-change="(e: CustomEvent<{ value: string }>) => (fps = e.detail.value)"
          />
        </div>
        <p v-if="format === 'video'" class="es-note">Recorded in the browser in real time; you can cancel it while it runs.</p>
        <p v-else class="es-note">
          Rendered frame by frame on the server, so every frame is exact.
          <template v-if="edge < state.videoLongEdge">This one will be {{ edge }} px on the long edge, to keep the file a sensible size; fewer cycles or a lower frame rate allow more.</template>
        </p>
      </template>

      <tc-button variant="primary" :label="pack && chosen.still ? 'Download pack' : 'Download'" @click="go">
        <Download slot="icon" />
      </tc-button>
    </div>
  </div>
</template>

<style scoped>
.export {
  display: grid;
  gap: var(--es-space-field);
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--tc-space-3);
}
</style>
