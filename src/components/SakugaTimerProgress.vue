<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from 'vue';
import { useTheme } from '@/composables/theme';

interface SakugaProgressElement extends HTMLElement {
  set: (value: number, instant?: boolean) => void;
}

const props = defineProps<{
  value: number;
  label: string;
  fallbackClass: string;
  fallbackFillClass: string;
}>();

const progressRef = useTemplateRef<SakugaProgressElement>('progressRef');
const { theme } = useTheme();

function updateProgress(instant = false) {
  progressRef.value?.set(Math.min(1, Math.max(0, props.value / 100)), instant);
}

onMounted(() => updateProgress(true));
watch(() => props.value, () => updateProgress());
</script>

<template>
  <sakuga-progress v-if="theme === 'sakuga'" ref="progressRef" :value="value / 100" :label="label" />
  <span v-else :class="fallbackClass" aria-hidden="true"><span :class="fallbackFillClass" :style="{ width: `${value}%` }" /></span>
</template>
