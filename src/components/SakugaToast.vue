<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useTheme } from '@/composables/theme';

interface SakugaToastElement extends HTMLElement {
  show: (message: string) => void;
}

const { theme } = useTheme();
const toastRef = useTemplateRef<SakugaToastElement>('toastRef');

function show(message: string) {
  toastRef.value?.show(message);
}

defineExpose({ show });
</script>

<template>
  <sakuga-toast v-if="theme === 'sakuga'" ref="toastRef" class="sakuga-toast" duration="3" />
</template>

<style scoped>
.sakuga-toast {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 60;
}
</style>
